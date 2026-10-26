import type {
  Contact,
  Interaction,
  Opportunity,
  Permission,
  Restriction,
  Task,
} from "../data/models";
import type {
  DailyQuest,
  ProgressState,
  Reward,
} from "../data/progress-models";
import { eligible } from "./recommendations";
export function calendarDay(at: string | number, timezone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(at));
  return ["year", "month", "day"]
    .map((k) => p.find((v) => v.type === k)!.value)
    .join("-");
}
export function shiftDay(day: string, offset: number) {
  return new Date(Date.parse(day + "T12:00:00Z") + offset * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function weekOf(day: string) {
  const dow = new Date(day + "T12:00:00Z").getUTCDay();
  return shiftDay(day, -(dow === 0 ? 6 : dow - 1));
}
const normalized = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
// A non-security content signature avoids retaining deleted note/task text in audit tombstones.
export function contentSignature(value: string) {
  let hash = 14695981039346656037n;
  for (const point of value) {
    hash ^= BigInt(point.codePointAt(0)!);
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(16).padStart(16, "0");
}
export interface RewardEvidence {
  contacts: Contact[];
  permissions: Permission[];
  restrictions: Restriction[];
}
export function sourceRule(
  type: Reward["sourceType"],
  source: Task | Interaction | Opportunity,
  data: RewardEvidence,
  at: number,
) {
  const ids =
    type === "opportunity"
      ? (source as Opportunity).contactIds
      : [(source as Task | Interaction).contactId || ""];
  const permitted =
    ids.length > 0 &&
    ids.every((id) => {
      const c = data.contacts.find((c) => c.id === id);
      return !!c && eligible(c, data.permissions, data.restrictions, at);
    });
  if (!permitted) return null;
  if (type === "task") {
    const t = source as Task;
    if (
      !t.completedAt ||
      (t.title.trim().length < 12 && t.description.trim().length < 20)
    )
      return null;
    return {
      rule: "follow-up" as const,
      xp: 5 as const,
      fingerprint: contentSignature(
        JSON.stringify([
          type,
          t.contactId,
          normalized(t.title),
          normalized(t.description),
        ]),
      ),
    };
  }
  if (type === "interaction") {
    const i = source as Interaction;
    if (
      !["Call", "Meeting"].includes(i.type) ||
      i.source ||
      i.summary.trim().length < 40 ||
      Date.parse(i.occurredAt) > at ||
      at - Date.parse(i.occurredAt) > 86400000
    )
      return null;
    return {
      rule: "conversation" as const,
      xp: 10 as const,
      fingerprint: contentSignature(
        JSON.stringify([type, i.contactId, normalized(i.summary)]),
      ),
    };
  }
  const o = source as Opportunity;
  if (o.status === "open" || o.notes.trim().length < 20) return null;
  return {
    rule: "outcome" as const,
    xp: 5 as const,
    fingerprint: contentSignature(
      JSON.stringify([
        type,
        o.organizationId,
        [...o.contactIds].sort(),
        normalized(o.title),
      ]),
    ),
  };
}
export function deriveProgress(
  rewards: Reward[],
  quests: DailyQuest[],
  state: ProgressState | null,
  goal: number,
  now = Date.now(),
) {
  const timezone = state?.timezone || "UTC",
    day = calendarDay(now, timezone),
    week = weekOf(day);
  const active = rewards.filter((r) => r.active),
    xp = active.reduce((n, r) => n + r.xp, 0);
  const level = Math.floor(xp / 100) + 1,
    levelXP = xp % 100;
  const days = new Set(active.map((r) => r.day));
  let streak = 0,
    cursor = days.has(day) ? day : shiftDay(day, -1);
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  let longest = 0,
    run = 0,
    prev = "";
  for (const d of [...days].sort()) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const weekly = active.filter(
    (r) => r.rule === "follow-up" && r.week === week,
  ).length;
  const achievements = [
    {
      id: "first-follow-up",
      title: "A promise kept",
      criteria: "Complete one qualifying planned follow-up.",
      unlocked: active.some((r) => r.rule === "follow-up"),
    },
    {
      id: "first-conversation",
      title: "A conversation remembered",
      criteria: "Save one qualifying recent call or meeting.",
      unlocked: active.some((r) => r.rule === "conversation"),
    },
    {
      id: "five-follow-ups",
      title: "Steady steps",
      criteria: "Keep five qualifying follow-ups completed.",
      unlocked: active.filter((r) => r.rule === "follow-up").length >= 5,
    },
    {
      id: "first-outcome",
      title: "A clear outcome",
      criteria: "Record one qualifying opportunity outcome.",
      unlocked: active.some((r) => r.rule === "outcome"),
    },
    {
      id: "weekly-goal",
      title: "Your weekly intention",
      criteria:
        "Meet your current weekly follow-up target. Recalculates if you change it.",
      unlocked: goal > 0 && weekly >= goal,
    },
  ];
  return {
    xp,
    level,
    levelXP,
    day,
    week,
    weekly,
    streak,
    longest,
    achievements,
    quests: quests
      .filter((q) => q.day === day)
      .map((q) => ({
        ...q,
        complete: active.some(
          (r) =>
            r.sourceType === "task" &&
            r.sourceId === q.taskId &&
            r.day === q.day,
        ),
      })),
  };
}
