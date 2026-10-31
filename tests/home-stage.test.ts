import { describe, expect, it } from "vitest";
import type { DailyPulseData } from "../src/services/daily-pulse";
import { homeStageSnapshot } from "../src/services/home-stage";

const fixture = () => ({
  contacts: [{ id: "person" }],
  organizations: [{ id: "company" }],
  opportunities: [{ id: "deal" }],
  tasks: [
    { id: "later", dueAt: "2026-11-04T10:00:00Z", completedAt: null },
    { id: "done", dueAt: "2026-10-01T10:00:00Z", completedAt: "2026-10-31T01:00:00Z" },
    { id: "soon", dueAt: "2026-11-01T10:00:00Z", completedAt: null },
  ],
  focusItems: [
    { entityType: "task", recordId: "soon", today: "2026-10-30" },
    { entityType: "task", recordId: "done", today: "2026-10-30" },
    { entityType: "contact", recordId: "person", today: "2026-10-30" },
    { entityType: "organization", recordId: "company", today: "2026-10-30" },
    { entityType: "opportunity", recordId: "missing", today: "2026-10-30" },
    { entityType: "opportunity", recordId: "deal", today: "2026-10-31" },
  ],
}) as unknown as Pick<DailyPulseData, "contacts" | "organizations" | "tasks" | "opportunities" | "focusItems">;

describe("Home opening snapshot", () => {
  it("uses saved open tasks and existing chosen records for the workspace day", () => {
    const data = fixture(), original = structuredClone(data);
    const snapshot = homeStageSnapshot(data, "America/Los_Angeles", Date.parse("2026-10-31T02:00:00Z"));
    expect(snapshot).toMatchObject({ moment: "evening", chosen: 3, openCount: 2, next: { id: "soon" } });
    expect(data).toEqual(original);
  });
  it("uses the workspace timezone for the day and greeting", () => {
    const now = Date.parse("2026-10-31T02:00:00Z");
    expect(homeStageSnapshot(fixture(), "UTC", now)).toMatchObject({ moment: "evening", chosen: 1 });
    expect(homeStageSnapshot(fixture(), "Asia/Manila", now).moment).toBe("morning");
    expect(homeStageSnapshot(fixture(), "Pacific/Auckland", now).moment).toBe("afternoon");
  });
  it("has a genuine empty state without sample records", () => {
    const empty = { contacts: [], organizations: [], opportunities: [], tasks: [], focusItems: [] };
    expect(homeStageSnapshot(empty, "UTC", Date.parse("2026-10-31T12:00:00Z"))).toMatchObject({ moment: "afternoon", chosen: 0, openCount: 0, next: undefined });
  });
});
