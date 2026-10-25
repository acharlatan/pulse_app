import type {
  Contact,
  Interaction,
  Permission,
  Restriction,
  Settings,
  Task,
  Opportunity,
  RecommendationAction,
  Health,
} from "../data/models";
import { intelligenceSchema, priorities } from "../data/models";
export function effectiveAvailability(
  c: Contact,
  restrictions: Restriction[] = [],
  now = Date.now(),
): Contact["availability"] {
  const own = restrictions.filter((r) => r.contactId === c.id),
    active = own.filter(
      (r) =>
        (!r.startAt || Date.parse(r.startAt) <= now) &&
        (!r.endAt || Date.parse(r.endAt) > now),
    );
  const types = active.map((r) => r.type);
  if (
    !own.some((r) => r.id === `profile-${c.id}`) &&
    !(
      c.availability === "Temporarily unavailable" &&
      c.timeoutUntil &&
      Date.parse(c.timeoutUntil) <= now
    )
  )
    types.push(c.availability);
  return types.includes("Do not contact")
    ? "Do not contact"
    : types.includes("On hold")
      ? "On hold"
      : types.includes("Temporarily unavailable")
        ? "Temporarily unavailable"
        : "Available";
}
export function eligible(
  contact: Contact,
  permissions: Permission[] = [],
  restrictions: Restriction[] = [],
  now = Date.now(),
) {
  return (
    restrictionReasons(contact, permissions, restrictions, now).length === 0
  );
}
export function restrictionReasons(
  contact: Contact,
  permissions: Permission[] = [],
  restrictions: Restriction[] = [],
  now = Date.now(),
) {
  const reasons: string[] = [];
  // Explicit profile restrictions carry the start/end window. Legacy profiles without
  // a restriction row retain their existing availability behavior.
  if (!restrictions.some((r) => r.id === `profile-${contact.id}`)) {
    if (["Do not contact", "On hold"].includes(contact.availability))
      reasons.push(contact.availability);
    if (
      contact.availability === "Temporarily unavailable" &&
      (!contact.timeoutUntil || Date.parse(contact.timeoutUntil) > now)
    )
      reasons.push("Temporarily unavailable");
  }
  for (const r of restrictions)
    if (
      r.contactId === contact.id &&
      r.type !== "Available" &&
      (!r.startAt || Date.parse(r.startAt) <= now) &&
      (!r.endAt || Date.parse(r.endAt) > now)
    )
      reasons.push(
        `${r.type}${r.endAt ? " until " + r.endAt.slice(0, 10) : " until explicitly ended"}`,
      );
  for (const p of permissions)
    if (
      p.contactId === contact.id &&
      p.purpose === "Relationship" &&
      ["Denied", "Withdrawn"].includes(p.status)
    )
      reasons.push(
        `${p.channel} relationship permission ${p.status.toLowerCase()}`,
      );
  return reasons;
}
export function taskState(task: Task, timezone: string, now = Date.now()) {
  if (task.completedAt) return "Completed";
  const day = (d: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  if (overdue(task, now)) return "Overdue";
  return day(Date.parse(task.dueAt)) === day(now) ? "Due today" : "Upcoming";
}
export function lastInteraction(
  id: string,
  interactions: Interaction[],
  now = Date.now(),
) {
  return interactions
    .filter(
      (i) =>
        i.contactId === id &&
        i.type !== "Note" &&
        Date.parse(i.occurredAt) <= now,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt;
}
export function overdue(task: Task, now = Date.now()) {
  return !task.completedAt && Date.parse(task.dueAt) < now;
}
export const fingerprint = (s: string) => {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++)
    hash = Math.imul(hash ^ s.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
};
export type ReviewCategory =
  | "Overdue follow-up"
  | "Needs attention"
  | "Cooling relationship"
  | "Dormant relationship"
  | "Ready to reconnect"
  | "No conversation recorded"
  | "Opportunity requires review"
  | "On timeout"
  | "Restricted contact";
export interface Recommendation {
  key: string;
  recordId: string;
  contactId?: string;
  opportunityId?: string;
  taskId?: string;
  category: ReviewCategory;
  reason: string;
  rank: number;
  priority: number;
  date: string;
  changedAt: string;
  days: number | null;
  action?: RecommendationAction;
  blocked: boolean;
  legacyKey?: string;
}
export interface RelationshipInsight {
  contactId: string;
  availability: Contact["availability"];
  health: Health;
  reason: string;
  days: number | null;
  lastAt: string | null;
  history:
    | "Logged"
    | "Imported date"
    | "Imported unknown"
    | "No conversation recorded";
  expiredPauseAt: string | null;
}
export interface OpportunityInsight {
  opportunityId: string;
  flags: string[];
  reason: string;
  rank: number;
  date: string;
  signature: string;
}
export interface IntelligenceData {
  contacts: Contact[];
  interactions: Interaction[];
  tasks: Task[];
  opportunities: Opportunity[];
  settings: Settings;
  permissions: Permission[];
  restrictions: Restriction[];
  recommendationActions?: RecommendationAction[];
}
const dayMs = 86400000;
const readableDate = (value: string, settings: Settings) =>
  new Intl.DateTimeFormat(settings.locale, {
    timeZone: settings.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
function group<T>(items: T[], key: (v: T) => string | null) {
  const m = new Map<string, T[]>();
  for (const v of items) {
    const id = key(v);
    if (id) {
      const a = m.get(id) || [];
      a.push(v);
      m.set(id, a);
    }
  }
  return m;
}
export function opportunityReview(
  o: Opportunity,
  tasks: Task[],
  interactions: Interaction[],
  settings: Settings,
  now = Date.now(),
): OpportunityInsight {
  const config = intelligenceSchema.parse(settings.intelligence);
  if (o.status !== "open")
    return {
      opportunityId: o.id,
      flags: [],
      reason: "Closed opportunities do not require routine review.",
      rank: 9,
      date: o.updatedAt,
      signature: "closed",
    };
  const linked = new Set(
    interactions
      .filter((i) => i.opportunityId === o.id && i.followUpId)
      .map((i) => i.followUpId),
  );
  const open = tasks.filter(
    (t) =>
      !t.completedAt &&
      (linked.has(t.id) ||
        o.contactIds.includes(t.contactId || "") ||
        (!!o.organizationId && t.organizationId === o.organizationId)),
  );
  const flags: string[] = [];
  let rank = 4,
    date = o.expectedCloseAt || o.updatedAt;
  if (open.some((t) => overdue(t, now))) {
    const earliest = open
      .filter((t) => overdue(t, now))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    flags.push(
      "Associated follow-up overdue · " +
        readableDate(earliest.dueAt, settings),
    );
    rank = 0;
    date = earliest.dueAt;
  }
  if (o.expectedCloseAt) {
    const distance = Date.parse(o.expectedCloseAt) - now;
    if (distance < 0) {
      flags.push(
        "Expected close date has passed · " +
          readableDate(o.expectedCloseAt, settings),
      );
      rank = Math.min(rank, 1);
    } else if (distance <= config.closingDays * dayMs) {
      flags.push(
        "Expected close within " +
          config.closingDays +
          " days · " +
          readableDate(o.expectedCloseAt, settings),
      );
      rank = Math.min(rank, 2);
    }
  }
  if (!open.length)
    flags.push("No open follow-up for the associated people or company");
  const last = interactions
    .filter(
      (i) =>
        i.opportunityId === o.id &&
        i.type !== "Note" &&
        Date.parse(i.occurredAt) <= now,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  if (last && now - Date.parse(last.occurredAt) >= config.stalledDays * dayMs)
    flags.push(
      "No conversation linked to this opportunity for " +
        Math.floor((now - Date.parse(last.occurredAt)) / dayMs) +
        " days; threshold " +
        config.stalledDays,
    );
  const signature = fingerprint(
    JSON.stringify([
      o.updatedAt,
      open.map((t) => [t.id, t.dueAt, t.updatedAt]).sort(),
      last?.id,
      last?.updatedAt,
      !!o.expectedCloseAt && Date.parse(o.expectedCloseAt) < now,
      !!o.expectedCloseAt &&
        Date.parse(o.expectedCloseAt) - now <= config.closingDays * dayMs,
      !!last && now - Date.parse(last.occurredAt) >= config.stalledDays * dayMs,
    ]),
  );
  return {
    opportunityId: o.id,
    flags,
    reason: flags.join(". "),
    rank,
    date,
    signature,
  };
}
export function analyzeRelationships(data: IntelligenceData, now = Date.now()) {
  const {
      contacts,
      interactions,
      tasks,
      settings,
      permissions,
      restrictions,
      opportunities,
    } = data,
    config = intelligenceSchema.parse(settings.intelligence);
  const interactionGroups = group(interactions, (i) => i.contactId),
    taskGroups = group(tasks, (t) => t.contactId),
    restrictionGroups = group(restrictions, (r) => r.contactId),
    permissionGroups = group(permissions, (p) => p.contactId);
  const actions = new Map(
    (data.recommendationActions || []).map((a) => [a.key, a]),
  );
  const relationships: RelationshipInsight[] = [],
    all: Recommendation[] = [];
  for (const c of contacts) {
    const history = interactionGroups.get(c.id) || [],
      ownTasks = taskGroups.get(c.id) || [],
      rs = restrictionGroups.get(c.id) || [],
      ps = permissionGroups.get(c.id) || [];
    const logged = lastInteraction(c.id, history, now),
      imported = c.importProvenance?.lastContactAt;
    const lastAt =
      logged && (!imported || logged >= imported) ? logged : imported || null;
    const days = lastAt
      ? Math.max(0, Math.floor((now - Date.parse(lastAt)) / dayMs))
      : null;
    const historyType = lastAt
      ? lastAt === logged
        ? "Logged"
        : "Imported date"
      : c.importProvenance
        ? "Imported unknown"
        : "No conversation recorded";
    const reasons = restrictionReasons(c, ps, rs, now),
      blocked = reasons.length > 0;
    const active = rs.filter(
      (r) =>
        r.type !== "Available" &&
        (!r.startAt || Date.parse(r.startAt) <= now) &&
        (!r.endAt || Date.parse(r.endAt) > now),
    );
    const paused =
      blocked &&
      !ps.some(
        (p) =>
          p.purpose === "Relationship" &&
          ["Denied", "Withdrawn"].includes(p.status),
      ) &&
      !active.some((r) => r.type !== "Temporarily unavailable") &&
      !["Do not contact", "On hold"].includes(c.availability);
    const ends = [
      ...rs
        .filter(
          (r) =>
            r.type === "Temporarily unavailable" &&
            r.endAt &&
            Date.parse(r.endAt) <= now,
        )
        .map((r) => r.endAt!),
      ...(c.availability === "Temporarily unavailable" &&
      c.timeoutUntil &&
      Date.parse(c.timeoutUntil) <= now
        ? [c.timeoutUntil]
        : []),
    ]
      .sort()
      .reverse();
    const expiredPauseAt = ends.find((end) => !lastAt || lastAt < end) || null;
    const overdueTasks = ownTasks
      .filter((t) => overdue(t, now))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const threshold = ["High", "VIP"].includes(c.priority)
      ? settings.priorityDays
      : settings.reconnectDays;
    let health: Health = "Active",
      category: ReviewCategory = "Needs attention",
      rank = 5,
      reason = "",
      date = lastAt || c.createdAt;
    if (blocked) {
      health = paused ? "Paused" : "Restricted";
      category = paused ? "On timeout" : "Restricted contact";
      rank = 9;
      reason = reasons.join(". ");
    } else if (overdueTasks.length) {
      health = "Needs attention";
      category = "Overdue follow-up";
      rank = 0;
      date = overdueTasks[0].dueAt;
      reason = `Follow-up scheduled for ${readableDate(date, settings)} is overdue (${overdueTasks.length} open).`;
    } else if (days === null) {
      health = "Not enough history";
      category = "No conversation recorded";
      rank = 6;
      reason = c.importProvenance
        ? "Imported contact — interaction history unknown. Review when appropriate."
        : "No conversation recorded. Review or add an accurate conversation history.";
    } else if (
      days >= Math.max(config.dormantDays, config.coolingDays, threshold)
    ) {
      health = "Dormant";
      category = "Dormant relationship";
      rank = 3;
      reason = `No meaningful contact recorded for ${days} days; dormant threshold ${Math.max(config.dormantDays, config.coolingDays, threshold)} days.`;
    } else if (days >= Math.max(config.coolingDays, threshold)) {
      health = "Cooling";
      category = "Cooling relationship";
      rank = 4;
      reason = `${days} days since recorded contact; cooling threshold ${Math.max(config.coolingDays, threshold)} days. This measures recorded activity, not interest.`;
    } else if (days >= threshold) {
      health = "Needs attention";
      category = "Needs attention";
      rank = 5;
      reason = `No meaningful contact recorded for ${days} days; your review threshold is ${threshold} days.`;
    } else
      reason = `Active — ${historyType === "Imported date" ? "imported last-contact date" : "conversation recorded"} ${days} days ago; review threshold ${threshold} days.`;
    relationships.push({
      contactId: c.id,
      availability: effectiveAvailability(c, rs, now),
      health,
      reason,
      days,
      lastAt,
      history: historyType,
      expiredPauseAt,
    });
    if (
      !blocked &&
      expiredPauseAt &&
      config.timeoutReviews &&
      !overdueTasks.length
    ) {
      category = "Ready to reconnect";
      rank = 2;
      date = expiredPauseAt;
      reason = `Recorded temporary pause ended ${readableDate(expiredPauseAt, settings)}. Eligible for review; marketing consent is unchanged.`;
    }
    const activeReview =
      blocked || health !== "Active" || category === "Ready to reconnect";
    if (
      !activeReview ||
      (!blocked && ["Won", "Lost"].includes(c.stage)) ||
      (!blocked && !config.enabled) ||
      (category === "No conversation recorded" && !config.noHistory)
    )
      continue;
    const source = JSON.stringify([
      c.id,
      category,
      c.stage,
      c.priority,
      lastAt,
      overdueTasks.map((t) => [t.id, t.dueAt, t.updatedAt]),
      expiredPauseAt,
    ]);
    const key = `contact:${c.id}:${category}:${fingerprint(source)}`;
    const legacyKey = `${c.id}:${logged || c.createdAt}:${overdueTasks.length ? "due" : "quiet"}`;
    const action = actions.get(key);
    all.push({
      key,
      legacyKey,
      recordId: c.id,
      contactId: c.id,
      taskId: overdueTasks[0]?.id,
      category,
      reason,
      rank,
      priority: priorities.indexOf(c.priority),
      date,
      changedAt: [
        c.updatedAt,
        ...history.map((i) => i.updatedAt),
        ...ownTasks.map((t) => t.updatedAt),
      ]
        .sort()
        .at(-1)!,
      days,
      blocked,
      action:
        action?.kind === "snooze" &&
        action.until &&
        Date.parse(action.until) <= now
          ? undefined
          : action,
    });
  }
  const opportunityInsights = opportunities.map((o) =>
    opportunityReview(o, tasks, interactions, settings, now),
  );
  if (config.enabled && config.opportunities)
    for (const insight of opportunityInsights) {
      if (!insight.flags.length) continue;
      const o = opportunities.find((o) => o.id === insight.opportunityId)!;
      const key = `opportunity:${o.id}:${insight.signature}`;
      const action = actions.get(key);
      all.push({
        key,
        recordId: o.id,
        opportunityId: o.id,
        category: "Opportunity requires review",
        reason: insight.reason,
        rank: insight.rank,
        priority: 1,
        date: insight.date,
        changedAt: o.updatedAt,
        days: null,
        blocked: false,
        action:
          action?.kind === "snooze" &&
          action.until &&
          Date.parse(action.until) <= now
            ? undefined
            : action,
      });
    }
  all.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.priority - a.priority ||
      a.date.localeCompare(b.date) ||
      a.recordId.localeCompare(b.recordId),
  );
  const dismissed = (r: Recommendation) =>
    r.action?.kind === "dismiss" ||
    settings.dismissed.includes(r.key) ||
    (!!r.legacyKey && settings.dismissed.includes(r.legacyKey));
  return {
    relationships,
    opportunities: opportunityInsights,
    all: all.filter((r) => !dismissed(r)),
    queue: all.filter((r) => !r.blocked && !r.action && !dismissed(r)),
  };
}
// Compatibility selector for existing consumers; it uses the same engine and eligibility rules.
export function recommendations(
  contacts: Contact[],
  interactions: Interaction[],
  tasks: Task[],
  settings: Settings,
  permissions: Permission[] = [],
  restrictions: Restriction[] = [],
  now = Date.now(),
) {
  const data = analyzeRelationships(
    {
      contacts,
      interactions,
      tasks,
      settings,
      permissions,
      restrictions,
      opportunities: [],
    },
    now,
  );
  return data.queue
    .filter((r) => r.contactId)
    .map((r) => ({
      ...r,
      contact: contacts.find((c) => c.id === r.contactId)!,
      days: r.days || 0,
    }));
}
