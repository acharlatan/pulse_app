import Papa from "papaparse";
import { z } from "zod";
import {
  categories,
  priorities,
  stages,
  contactSchema,
  organizationSchema,
  stamp,
  type Contact,
  type Organization,
  type Interaction,
  type ImportBatch,
} from "../data/models";
export const importFields = [
  "ignore",
  "name",
  "firstName",
  "lastName",
  "email",
  "phone",
  "role",
  "company",
  "industry",
  "website",
  "location",
  "category",
  "stage",
  "priority",
  "tags",
  "notes",
  "lastContact",
] as const;
export type ImportField = (typeof importFields)[number];
export interface CsvData {
  headers: string[];
  rows: string[][];
}
export function parseCsv(text: string): CsvData {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw new Error("CSV limit is 2 MB. Split larger files before importing.");
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length)
    throw new Error("Malformed CSV: " + parsed.errors[0].message);
  const [header, ...rows] = parsed.data;
  if (!header?.length || !rows.length)
    throw new Error("Include a header and at least one data row.");
  if (header.length > 40 || rows.length > 2000)
    throw new Error("Import up to 40 columns and 2,000 rows at a time.");
  const headers = header.map((h) => h.trim());
  if (headers.some((h) => !h || h.length > 150))
    throw new Error("Headers must be named and shorter than 150 characters.");
  if (new Set(headers.map((h) => h.toLowerCase())).size !== headers.length)
    throw new Error("Duplicate column headers. Rename them before import.");
  if (rows.some((r) => r.length !== headers.length))
    throw new Error(
      "Some rows have a different number of columns. Check quotes and delimiters.",
    );
  return { headers, rows };
}
export function suggestMapping(headers: string[]): ImportField[] {
  const aliases: Partial<Record<ImportField, string[]>> = {
    name: ["name", "fullname", "contactname"],
    firstName: ["firstname", "givenname"],
    lastName: ["lastname", "surname", "familyname"],
    email: ["email", "emailaddress", "email1value"],
    phone: ["phone", "phonenumber", "telephone", "phone1value"],
    role: ["role", "title", "jobtitle"],
    company: ["company", "organization", "organisation", "companyname"],
    industry: ["industry"],
    website: ["website", "companywebsite"],
    location: ["location", "city"],
    category: ["category", "relationship"],
    stage: ["stage", "lifecyclestage"],
    priority: ["priority"],
    tags: ["tags", "labels"],
    notes: ["notes", "note"],
    lastContact: ["lastcontact", "lastcontactdate"],
  };
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const key = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    const field = (Object.entries(aliases).find(([, values]) =>
      values!.includes(key),
    )?.[0] || "ignore") as ImportField;
    if (used.has(field)) return "ignore";
    used.add(field);
    return field;
  });
}
export const normalizeName = (v: string) =>
  v.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
const phoneKey = (v: string) => v.replace(/\D/g, "");
const host = (v: string) => {
  try {
    return new URL(v).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
export const mergeFields = [
  "name",
  "emails",
  "phones",
  "role",
  "organizationId",
  "category",
  "stage",
  "priority",
  "tags",
  "lastContact",
  "notes",
] as const;
export type MergeField = (typeof mergeFields)[number];
export interface RowDecision {
  mode: "skip" | "create" | "update";
  targetId?: string;
  fields: MergeField[];
}
export interface ImportPerson {
  companyKey: string;
  row: number;
  values: Partial<Record<ImportField, string>>;
  errors: string[];
  matches: {
    id: string;
    name: string;
    confidence: "Strong match" | "Possible match";
    reason: string;
    existing: Contact;
  }[];
  fileDuplicate: boolean;
}
export interface CompanyMatch {
  website: string;
  key: string;
  name: string;
  matches: Organization[];
  reason: string;
}
export interface ImportPlan {
  batch: ImportBatch;
  contacts: Contact[];
  organizations: Organization[];
  notes: Interaction[];
  sourceDigest: string;
  rows: ImportPerson[];
  companies: CompanyMatch[];
  decisions: Record<number, RowDecision>;
  organizationChoices: Record<string, string>;
}
export function sourceDigest(
  contacts: Contact[],
  organizations: Organization[],
) {
  return JSON.stringify([
    contacts.slice().sort((a, b) => a.id.localeCompare(b.id)),
    organizations.slice().sort((a, b) => a.id.localeCompare(b.id)),
  ]);
}
function dateValue(value: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + "T00:00:00");
    if (
      !Number.isFinite(d.getTime()) ||
      [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-") !== value
    )
      throw new Error("Last contact date is not a valid calendar date.");
    return d.toISOString();
  }
  if (!z.string().datetime({ offset: true }).safeParse(value).success)
    throw new Error(
      "Last contact must be YYYY-MM-DD or an ISO timestamp with timezone.",
    );
  const d = new Date(value);
  if (!Number.isFinite(d.getTime()) || d.getTime() > Date.now())
    throw new Error("Last contact cannot be in the future.");
  return d.toISOString();
}
function canonical(
  value: string,
  allowed: readonly string[],
  fallback: string,
) {
  if (!value) return fallback;
  const found = allowed.find((v) => v.toLowerCase() === value.toLowerCase());
  if (!found)
    throw new Error(`Unsupported value: ${value}. Use ${allowed.join(", ")}.`);
  return found;
}
function personFrom(
  values: ImportPerson["values"],
  organizationId: string | null,
  batch: ImportBatch,
  base?: Contact,
): Contact {
  const get = (f: ImportField) => values[f]?.trim() || "";
  return contactSchema.parse({
    ...stamp(),
    ...base,
    name:
      get("name") ||
      [get("firstName"), get("lastName")].filter(Boolean).join(" "),
    preferredName: base?.preferredName || "",
    role: get("role"),
    organizationId,
    emails: get("email")
      .split(";")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
    phones: get("phone") ? [get("phone")] : [],
    links: base?.links || [],
    avatar: base?.avatar || "",
    category: canonical(get("category"), categories, "Prospect"),
    stage: canonical(get("stage"), stages, "New"),
    priority: canonical(get("priority"), priorities, "Normal"),
    availability: base?.availability || "Available",
    timeoutUntil: base?.timeoutUntil || null,
    tags: get("tags")
      .split(/[;|]/)
      .map((v) => v.trim())
      .filter(Boolean),
    nextFollowUp: base?.nextFollowUp || null,
    importProvenance: {
      batchId: batch.id,
      fileName: batch.fileName,
      importedAt: batch.createdAt,
      lastContactAt: dateValue(get("lastContact")),
    },
  });
}
export function inspectCsv(
  csv: CsvData,
  mapping: ImportField[],
  contacts: Contact[],
  organizations: Organization[],
): {
  rows: ImportPerson[];
  companies: CompanyMatch[];
  decisions: Record<number, RowDecision>;
  organizationChoices: Record<string, string>;
} {
  if (
    mapping.length !== csv.headers.length ||
    mapping.some((f) => !importFields.includes(f))
  )
    throw new Error("Invalid field mapping.");
  const selected = mapping.filter((f) => f !== "ignore");
  if (new Set(selected).size !== selected.length)
    throw new Error("Each PULSE field may be mapped only once.");
  if (!selected.includes("name") && !selected.includes("firstName"))
    throw new Error("Map Full name or First name before continuing.");
  const orgById = new Map(organizations.map((o) => [o.id, o]));
  const emailIndex = new Map<string, Contact[]>(),
    phoneIndex = new Map<string, Contact[]>(),
    nameIndex = new Map<string, Contact[]>();
  const put = (m: Map<string, Contact[]>, key: string, c: Contact) => {
    if (key) m.set(key, [...(m.get(key) || []), c]);
  };
  for (const c of contacts) {
    for (const e of c.emails) put(emailIndex, e.trim().toLowerCase(), c);
    for (const v of c.phones)
      if (phoneKey(v).length >= 7) put(phoneIndex, phoneKey(v), c);
    put(
      nameIndex,
      normalizeName(c.name) +
        "|" +
        normalizeName(orgById.get(c.organizationId || "")?.name || ""),
      c,
    );
  }
  const seen = new Set<string>(),
    companies = new Map<string, CompanyMatch>(),
    decisions: Record<number, RowDecision> = {},
    organizationChoices: Record<string, string> = {};
  const domains = new Map<string, Set<string>>(),
    companyColumn = mapping.indexOf("company"),
    websiteColumn = mapping.indexOf("website");
  for (const cells of csv.rows) {
    const name = normalizeName(cells[companyColumn] || ""),
      domain = host(cells[websiteColumn] || "");
    if (name && domain) {
      const seenDomains = domains.get(name) || new Set<string>();
      seenDomains.add(domain);
      domains.set(name, seenDomains);
    }
  }
  const rows = csv.rows.map((cells, index) => {
    const values: ImportPerson["values"] = {};
    mapping.forEach((f, i) => {
      if (f !== "ignore") values[f] = cells[i].trim();
    });
    const errors: string[] = [];
    try {
      for (const [field, value] of Object.entries(values))
        if (
          value.length >
          (field === "notes"
            ? 20000
            : field === "name" || field === "company"
              ? 200
              : 1000)
        )
          throw new Error(`${field} is too long.`);
      personFrom(values, null, {
        ...stamp(),
        fileName: "preview",
      } as ImportBatch);
      if (
        values.phone &&
        (phoneKey(values.phone).length < 7 ||
          phoneKey(values.phone).length > 18)
      )
        throw new Error("Check the phone number (7–18 digits).");
      if (values.website && !/^https?:\/\//i.test(values.website))
        throw new Error("Company website must start with http:// or https://.");
      if (values.website && !z.string().url().safeParse(values.website).success)
        throw new Error("Invalid company website.");
      if (
        values.lastContact &&
        Date.parse(dateValue(values.lastContact)!) > Date.now()
      )
        throw new Error("Last contact cannot be in the future.");
    } catch (e) {
      errors.push(
        e instanceof z.ZodError
          ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          : e instanceof Error
            ? e.message
            : "Invalid row.",
      );
    }
    const company = values.company || "",
      companyNameKey = normalizeName(company),
      companyKey = JSON.stringify([
        companyNameKey,
        (domains.get(companyNameKey)?.size || 0) > 1
          ? host(values.website || "")
          : "",
      ]);
    if (company && !errors.length && !companies.has(companyKey)) {
      const exact = organizations.filter(
          (o) => normalizeName(o.name) === companyNameKey,
        ),
        possible = values.website
          ? organizations.filter(
              (o) =>
                host(o.website) && host(o.website) === host(values.website!),
            )
          : [];
      const conflict = exact.some(
        (o) =>
          values.website &&
          host(o.website) &&
          host(o.website) !== host(values.website),
      );
      const ambiguousDomains =
        (domains.get(companyNameKey)?.size || 0) > 1 &&
        !exact.some(
          (o) =>
            host(o.website) && host(o.website) === host(values.website || ""),
        );
      const matches = exact.length ? exact : possible;
      companies.set(companyKey, {
        key: companyKey,
        name: company,
        website: values.website || "",
        matches,
        reason: ambiguousDomains
          ? "Possible match · conflicting domains in this file"
          : conflict
            ? "Possible match · same name but different website"
            : exact.length
              ? "Exact company name (case and spacing normalized)"
              : possible.length
                ? "Possible match · same website hostname"
                : "No match",
      });
      organizationChoices[companyKey] =
        exact.length === 1 && !conflict && !ambiguousDomains
          ? exact[0].id
          : "new";
    }
    const matches = new Map<string, ImportPerson["matches"][number]>();
    const add = (
      c: Contact,
      confidence: "Strong match" | "Possible match",
      reason: string,
    ) => {
      if (matches.get(c.id)?.confidence === "Strong match") return;
      matches.set(c.id, {
        id: c.id,
        name: c.name,
        existing: c,
        confidence,
        reason,
      });
    };
    for (const e of (values.email || "").split(";"))
      for (const c of emailIndex.get(e.trim().toLowerCase()) || [])
        add(c, "Strong match", "Exact normalized email");
    for (const c of phoneIndex.get(phoneKey(values.phone || "")) || [])
      add(c, "Possible match", "Exact digits; country codes are not inferred");
    const name =
      values.name ||
      [values.firstName, values.lastName].filter(Boolean).join(" ");
    for (const c of nameIndex.get(normalizeName(name) + "|" + companyNameKey) ||
      [])
      add(c, "Possible match", "Same name and company");
    const tokens = [
      ...(values.email || "")
        .split(";")
        .filter(Boolean)
        .map((e) => "email:" + e.trim().toLowerCase()),
      ...(phoneKey(values.phone || "").length >= 7
        ? ["phone:" + phoneKey(values.phone!)]
        : []),
      "name:" + normalizeName(name) + "|" + companyNameKey,
    ];
    const fileDuplicate = tokens.some((t) => seen.has(t));
    tokens.forEach((t) => seen.add(t));
    const row = index + 2;
    decisions[row] = {
      mode: matches.size || fileDuplicate || errors.length ? "skip" : "create",
      targetId: matches.values().next().value?.id,
      fields: [],
    };
    return {
      companyKey,
      row,
      values,
      errors,
      matches: [...matches.values()],
      fileDuplicate,
    };
  });
  return {
    rows,
    companies: [...companies.values()],
    decisions,
    organizationChoices,
  };
}
export function buildImportPlan(
  input: ReturnType<typeof inspectCsv>,
  contacts: Contact[],
  organizations: Organization[],
  interactions: Interaction[],
  fileName: string,
  fillCompanies = false,
): ImportPlan {
  const batch: ImportBatch = {
    ...stamp(),
    fileName: fileName.slice(0, 300),
    createdContacts: 0,
    updatedContacts: 0,
    createdOrganizations: 0,
    updatedOrganizations: 0,
    skipped: 0,
    invalid: 0,
  };
  const orgWrites = new Map<string, Organization>(),
    contactWrites = new Map<string, Contact>(),
    notes: Interaction[] = [],
    companyIds = new Map<string, string>(),
    usedTargets = new Set<string>();
  for (const row of input.rows) {
    if (row.errors.length) {
      batch.invalid++;
      continue;
    }
    const d = input.decisions[row.row];
    if (!d || d.mode === "skip") {
      batch.skipped++;
      continue;
    }
    const v = row.values,
      companyKey = row.companyKey;
    let organizationId: string | null = null;
    if (
      v.company?.trim() &&
      (d.mode === "create" || d.fields.includes("organizationId"))
    ) {
      if (!companyIds.has(companyKey)) {
        const choice = input.organizationChoices[companyKey];
        if (!choice) throw new Error("Choose how to match each company.");
        const old =
          choice === "new"
            ? undefined
            : organizations.find((o) => o.id === choice);
        if (choice !== "new" && !old)
          throw new Error("Company match no longer exists.");
        const o = organizationSchema.parse({
          ...stamp(),
          ...old,
          name: old?.name || v.company,
          industry:
            old?.industry || (fillCompanies || !old ? v.industry || "" : ""),
          website:
            old?.website || (fillCompanies || !old ? v.website || "" : ""),
          location:
            old?.location || (fillCompanies || !old ? v.location || "" : ""),
          description: old?.description || "",
          tags: old?.tags || [],
          avatar: old?.avatar || "",
          customFields: old?.customFields || {},
        });
        companyIds.set(companyKey, o.id);
        if (!old) {
          orgWrites.set(o.id, o);
          batch.createdOrganizations++;
        } else if (
          fillCompanies &&
          (o.industry !== old.industry ||
            o.website !== old.website ||
            o.location !== old.location)
        ) {
          o.updatedAt = batch.createdAt;
          orgWrites.set(o.id, o);
          batch.updatedOrganizations++;
        }
      }
      organizationId = companyIds.get(companyKey)!;
    }
    if (d.mode === "update" && !d.fields.length)
      throw new Error(
        `Row ${row.row}: select at least one imported field to update, or choose Skip.`,
      );
    const target =
      d.mode === "update"
        ? contacts.find((c) => c.id === d.targetId)
        : undefined;
    if (d.mode === "update" && !target)
      throw new Error(`Row ${row.row}: choose an existing contact.`);
    if (target && usedTargets.has(target.id))
      throw new Error(
        `Rows update the same contact twice. Skip one duplicate row.`,
      );
    if (target) usedTargets.add(target.id);
    const candidate = personFrom(v, organizationId, batch, target);
    let result = candidate;
    if (target) {
      result = { ...target, updatedAt: batch.createdAt };
      for (const field of d.fields) {
        if (field === "notes") continue;
        if (field === "lastContact") {
          if (v.lastContact)
            result.importProvenance = candidate.importProvenance;
          continue;
        }
        const source =
          field === "organizationId"
            ? "company"
            : field === "emails"
              ? "email"
              : field === "phones"
                ? "phone"
                : field;
        if (
          !v[source as ImportField]?.trim() &&
          !(field === "name" && (v.firstName || v.lastName))
        )
          continue;
        switch (field) {
          case "emails":
            result.emails = candidate.emails;
            break;
          case "phones":
            result.phones = candidate.phones;
            break;
          case "tags":
            result.tags = [...new Set([...target.tags, ...candidate.tags])];
            break;
          case "organizationId":
            result.organizationId = candidate.organizationId;
            break;
          case "category":
            result.category = candidate.category;
            break;
          case "stage":
            result.stage = candidate.stage;
            break;
          case "priority":
            result.priority = candidate.priority;
            break;
          case "name":
            result.name = candidate.name;
            break;
          case "role":
            result.role = candidate.role;
            break;
        }
      }
      if (!target.importProvenance)
        result.importProvenance = {
          ...candidate.importProvenance!,
          lastContactAt: d.fields.includes("lastContact")
            ? candidate.importProvenance!.lastContactAt
            : null,
        };
      batch.updatedContacts++;
    } else batch.createdContacts++;
    contactWrites.set(result.id, contactSchema.parse(result));
    if (
      v.notes &&
      (d.mode === "create" || d.fields.includes("notes")) &&
      !interactions.some(
        (i) =>
          i.contactId === result.id &&
          i.type === "Note" &&
          i.summary === v.notes,
      )
    )
      notes.push({
        ...stamp(),
        contactId: result.id,
        organizationId: result.organizationId,
        type: "Note",
        summary: v.notes,
        outcome: "",
        occurredAt: batch.createdAt,
        opportunityId: null,
        followUpId: null,
        source: `CSV import · ${batch.fileName}`,
      });
  }
  return {
    ...input,
    batch,
    contacts: [...contactWrites.values()],
    organizations: [...orgWrites.values()],
    notes,
    sourceDigest: sourceDigest(contacts, organizations),
  };
}
