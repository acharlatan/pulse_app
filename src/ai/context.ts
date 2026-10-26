import type { PipelineStage } from "../services/pipelines";
import type {
  Contact,
  Organization,
  Interaction,
  Task,
  Opportunity,
  Restriction,
  Permission,
} from "../data/models";
import { restrictionReasons } from "../services/recommendations";
import { contextSchema, type AIContext } from "./contracts";
export interface ContextData {
  pipelineStages?: PipelineStage[];
  contacts: Contact[];
  organizations: Organization[];
  interactions: Interaction[];
  tasks: Task[];
  opportunities: Opportunity[];
  restrictions: Restriction[];
  permissions: Permission[];
}
export interface ContextOptions {
  identity: boolean;
  organization: boolean;
  interactions: boolean;
  notes: boolean;
  tasks: boolean;
  opportunities: boolean;
  values: boolean;
  channels: boolean;
  from: string;
  keyword: string;
  channel: "Email" | "WhatsApp" | "General";
  purpose: "Relationship" | "Marketing";
}
export function outreachReasons(
  c: Contact,
  permissions: Permission[],
  restrictions: Restriction[],
  channel: ContextOptions["channel"],
  purpose: ContextOptions["purpose"],
) {
  const reasons = restrictionReasons(c, permissions, restrictions);
  const relevant = permissions.filter(
    (p) =>
      p.contactId === c.id &&
      p.purpose === purpose &&
      (p.channel === "All" ||
        p.channel ===
          (channel === "WhatsApp"
            ? "Message"
            : channel === "General"
              ? "All"
              : "Email")),
  );
  if (relevant.some((p) => ["Denied", "Withdrawn"].includes(p.status)))
    reasons.push(`${purpose} permission denied or withdrawn for this channel.`);
  if (purpose === "Marketing" && !relevant.some((p) => p.status === "Granted"))
    reasons.push(
      "Explicit marketing permission is not recorded for this channel.",
    );
  return [...new Set(reasons)];
}
export function buildContext(
  data: ContextData,
  scope: AIContext["scope"],
  id: string,
  o: ContextOptions,
  timezone: string,
  now = Date.now(),
): AIContext {
  const contact = data.contacts.find((c) => c.id === id),
    org = data.organizations.find((c) => c.id === id),
    deal = data.opportunities.find((d) => d.id === id);
  const personIds =
    scope === "contact"
      ? [id]
      : scope === "opportunity"
        ? deal?.contactIds || []
        : data.contacts.filter((c) => c.organizationId === id).map((c) => c.id);
  const orgId =
    scope === "organization"
      ? id
      : scope === "contact"
        ? contact?.organizationId
        : deal?.organizationId;
  const company = data.organizations.find((c) => c.id === orgId),
    people = data.contacts.filter((c) => personIds.includes(c.id));
  if (
    (scope === "contact" && !contact) ||
    (scope === "organization" && !org) ||
    (scope === "opportunity" && !deal)
  )
    throw new Error("Choose an existing profile or opportunity.");
  const label = o.identity
    ? scope === "contact"
      ? contact!.name
      : scope === "organization"
        ? org!.name
        : deal!.title
    : `Selected ${scope}`;
  const records: AIContext["records"] = [];
  if (o.identity)
    for (const c of people.slice(0, 3))
      records.push({
        id: `contact:${c.id}`,
        kind: "contact",
        text: `${c.name} · ${c.role} · ${c.category} · ${c.stage}`.slice(
          0,
          1500,
        ),
        at: null,
      });
  if (o.channels)
    for (const c of people.slice(0, 3))
      records.push({
        id: `channels:${c.id}`,
        kind: "contact",
        text: [...c.emails, ...c.phones].join("; ").slice(0, 1500),
        at: null,
      });
  if (o.organization && company)
    records.push({
      id: `organization:${company.id}`,
      kind: "organization",
      text: [company.name, company.industry, company.description]
        .join(" · ")
        .slice(0, 1500),
      at: null,
    });
  const inScope = (r: {
    contactId: string | null;
    organizationId: string | null;
  }) =>
    scope === "organization"
      ? r.organizationId === id
      : scope === "contact"
        ? r.contactId === id
        : personIds.includes(r.contactId || "") ||
          (!!orgId && r.organizationId === orgId);
  const history = data.interactions
    .filter((i) =>
      scope === "opportunity" ? i.opportunityId === id : inScope(i),
    )
    .filter(
      (i) =>
        (i.type === "Note" ? o.notes : o.interactions) &&
        (!o.from || i.occurredAt.slice(0, 10) >= o.from) &&
        (!o.keyword ||
          `${i.summary} ${i.outcome}`
            .toLowerCase()
            .includes(o.keyword.toLowerCase().trim())),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  for (const i of history)
    records.push({
      id: `interaction:${i.id}`,
      kind: i.type === "Note" ? "note" : "interaction",
      text: `${i.type}: ${i.summary} ${i.outcome ? "Outcome: " + i.outcome : ""}`.slice(
        0,
        1500,
      ),
      at: i.occurredAt,
    });
  if (o.tasks)
    for (const t of data.tasks
      .filter((t) => inScope(t) && !t.completedAt)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .slice(0, 5))
      records.push({
        id: `task:${t.id}`,
        kind: "task",
        text: `${t.title} · ${t.description}`.slice(0, 1500),
        state: "Open",
        at: t.dueAt,
      });
  if (o.opportunities)
    for (const d of data.opportunities
      .filter((d) =>
        scope === "opportunity"
          ? d.id === id
          : scope === "organization"
            ? d.organizationId === id
            : d.contactIds.includes(id),
      )
      .slice(0, 3))
      records.push({
        id: `opportunity:${d.id}`,
        kind: "opportunity",
        text: `${d.title} · ${d.notes}`.slice(0, 1500),
        state: `${data.pipelineStages?.find((s) => s.id === d.stageId)?.name || d.stageId} · ${d.status}`,
        at: d.expectedCloseAt,
        ...(o.values
          ? {
              value:
                d.value === null ? "Unspecified" : `${d.currency} ${d.value}`,
            }
          : {}),
      });
  return contextSchema.parse({
    scope,
    targetId: id,
    label,
    now: new Date(now).toISOString(),
    timezone,
    restricted:
      scope === "contact"
        ? outreachReasons(
            contact!,
            data.permissions,
            data.restrictions,
            o.channel,
            o.purpose,
          ).length > 0
        : true,
    records: records
      .sort(
        (a, b) =>
          [
            "contact",
            "organization",
            "task",
            "opportunity",
            "interaction",
            "note",
          ].indexOf(a.kind) -
          [
            "contact",
            "organization",
            "task",
            "opportunity",
            "interaction",
            "note",
          ].indexOf(b.kind),
      )
      .slice(0, 15),
    omitted: Math.max(0, records.length - 15),
    dateFrom: o.from,
  });
}
