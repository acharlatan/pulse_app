import { z } from "zod";
export function emailLink(email: string, subject: string, body: string) {
  if (!z.string().email().safeParse(email).success)
    throw new Error("Choose a valid email address.");
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject.replace(/[\r\n]/g, " "))}&body=${encodeURIComponent(body)}`;
  if (url.length > 1800)
    throw new Error(
      "This draft is too long for a reliable email link. Copy it instead.",
    );
  return url;
}
export function whatsappLink(phone: string, body: string) {
  if (!/^\+[1-9][\d ()-]{7,22}$/.test(phone))
    throw new Error(
      "Use a full international number beginning with +. PULSE will not guess the country code.",
    );
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15)
    throw new Error("Check the international phone number.");
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
  if (url.length > 3000) throw new Error("Copy this longer message instead.");
  return url;
}
const escape = (s: string) =>
  s
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
const utc = (s: string) => {
  if (!z.string().datetime().safeParse(s).success)
    throw new Error("Invalid event time.");
  return s.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};
function fold(line: string) {
  let out = "",
    part = "";
  for (const char of line) {
    if (new TextEncoder().encode(part + char).length > 73) {
      out += part + "\r\n ";
      part = "";
    }
    part += char;
  }
  return out + part;
}
export function calendarEvent(
  id: string,
  title: string,
  description: string,
  start: string,
  minutes: number,
  allDay = false,
) {
  if (!title.trim() || minutes < 5 || minutes > 1440)
    throw new Error("Choose a title and valid event duration.");
  const date = start.slice(0, 10);
  if (
    allDay &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date)
  )
    throw new Error("Choose a calendar date.");
  const end = allDay
    ? new Date(Date.parse(date + "T12:00:00Z") + 86400000)
        .toISOString()
        .slice(0, 10)
    : new Date(Date.parse(start) + minutes * 60000).toISOString();
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PULSE//Relationship calendar//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(id)}@pulse.local`,
      `DTSTAMP:${utc(new Date().toISOString())}`,
      `SUMMARY:${escape(title)}`,
      `DESCRIPTION:${escape(description)}`,
      ...(allDay
        ? [
            `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
            `DTEND;VALUE=DATE:${end.replaceAll("-", "")}`,
          ]
        : [`DTSTART:${utc(start)}`, `DTEND:${utc(end)}`]),
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
export function downloadText(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
