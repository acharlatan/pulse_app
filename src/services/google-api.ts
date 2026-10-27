import { z } from "zod";
import { googleRequest } from "./google-session";
import type { CsvData } from "./csv-import";
const personSchema = z.object({
  resourceName: z.string(),
  names: z.array(z.object({ displayName: z.string().optional() })).optional(),
  emailAddresses: z
    .array(z.object({ value: z.string().optional() }))
    .optional(),
  phoneNumbers: z.array(z.object({ value: z.string().optional() })).optional(),
  organizations: z
    .array(
      z.object({ name: z.string().optional(), title: z.string().optional() }),
    )
    .optional(),
});
const pageSchema = z.object({
  connections: z.array(personSchema).optional(),
  nextPageToken: z.string().optional(),
});
export type GooglePerson = z.infer<typeof personSchema>;
/** Bounded, user-initiated, read-only import; no photos or profile data. */
export async function readGoogleContacts(workspace: string) {
  const contacts: GooglePerson[] = [];
  let pageToken = "";
  const seen = new Set<string>();
  do {
    const query = new URLSearchParams({
      personFields: "names,emailAddresses,phoneNumbers,organizations",
      pageSize: "200",
      sources: "READ_SOURCE_TYPE_CONTACT",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const response = await googleRequest(
      "contacts",
      workspace,
      `https://people.googleapis.com/v1/people/me/connections?${query}`,
    );
    const page = pageSchema.parse(await response.json());
    contacts.push(...(page.connections || []));
    pageToken = page.nextPageToken || "";
    if (pageToken && seen.has(pageToken))
      throw new Error("Google returned a repeated page token.");
    seen.add(pageToken);
    if (contacts.length > 2000 || (pageToken && contacts.length >= 2000))
      throw new Error(
        "More than 2,000 contacts. Import a smaller selection through CSV instead.",
      );
  } while (pageToken);
  return contacts;
}
export function googleContactsCsv(people: GooglePerson[]): CsvData {
  return {
    headers: ["name", "email", "phone", "company", "role"],
    rows: people.map((p) => [
      p.names?.[0]?.displayName || "",
      p.emailAddresses?.[0]?.value || "",
      p.phoneNumbers?.[0]?.value || "",
      p.organizations?.[0]?.name || "",
      p.organizations?.[0]?.title || "",
    ]),
  };
}
let transfer: { workspace: string; data: CsvData } | undefined;
export function queueGoogleImport(workspace: string, data: CsvData) {
  transfer = { workspace, data };
}
export function takeGoogleImport(workspace: string) {
  return transfer?.workspace === workspace ? transfer.data : undefined;
}
export function clearGoogleImport() {
  transfer = undefined;
}
export type GoogleEvent = {
  id: string;
  summary: string;
  description: string;
  start: { date: string } | { dateTime: string };
  end: { date: string } | { dateTime: string };
};
export function makeGoogleEvent(
  id: string,
  title: string,
  description: string,
  localStart: string,
  minutes: number,
  allDay: boolean,
): GoogleEvent {
  if (
    !/^[a-v0-9]{5,1024}$/.test(id) ||
    !title.trim() ||
    title.length > 300 ||
    description.length > 10000 ||
    !Number.isInteger(minutes) ||
    minutes < 5 ||
    minutes > 1440
  )
    throw new Error("Check the event title and duration.");
  const date = localStart.slice(0, 10),
    at = new Date(localStart);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localStart) ||
    !Number.isFinite(at.getTime()) ||
    !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
    new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date
  )
    throw new Error("Choose a valid start date and time.");
  const rendered = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}T${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  if (!allDay && rendered !== localStart)
    throw new Error("This local time does not exist. Choose another time.");
  if (allDay)
    return {
      id,
      summary: title.trim(),
      description,
      start: { date },
      end: {
        date: new Date(Date.parse(date + "T00:00:00Z") + 86400000)
          .toISOString()
          .slice(0, 10),
      },
    };
  return {
    id,
    summary: title.trim(),
    description,
    start: { dateTime: at.toISOString() },
    end: { dateTime: new Date(at.getTime() + minutes * 60000).toISOString() },
  };
}
const eventResponse = z.object({
  id: z.string(),
  htmlLink: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        ["calendar.google.com", "www.google.com"].includes(url.hostname)
      );
    })
    .optional(),
});
export async function createGoogleEvent(workspace: string, event: GoogleEvent) {
  const response = await googleRequest(
    "calendar",
    workspace,
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
  return eventResponse.parse(await response.json());
}

export async function googleEventId(
  source: string,
  workspace: string,
  another = "",
) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify(["pulse-calendar-v1", workspace, source, another]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export async function getGoogleEvent(workspace: string, id: string) {
  if (!/^[a-v0-9]{5,1024}$/.test(id))
    throw new Error("Invalid event identifier.");
  const response = await googleRequest(
    "calendar",
    workspace,
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`,
  );
  return eventResponse.parse(await response.json());
}
