import { describe, expect, it } from "vitest";
import type { AnalyticsReport } from "../src/services/analytics";
import { relationshipLedger } from "../src/services/relationship-ledger";

// The report service supplies the date and record scope. Only explicit person links
// may be joined here; a shared company is not a person-to-person connection.
function scopedReport(): AnalyticsReport {
  return {
    contacts: [{ id: "b", name: "Bella", organizationId: "org" }, { id: "a", name: "Ada", organizationId: "org" }],
    interactions: [
      { id: "older", contactId: "a", organizationId: "old-org", occurredAt: "2026-10-01T10:00:00Z" },
      { id: "recent", contactId: "a", organizationId: "org", occurredAt: "2026-10-04T10:00:00Z" },
      { id: "company-only", contactId: null, organizationId: "org", occurredAt: "2026-10-04T10:00:00Z" },
    ],
    open: [
      { id: "later", contactId: "a", organizationId: "org", dueAt: "2026-10-09T10:00:00Z" },
      { id: "sooner", contactId: "a", organizationId: "org", dueAt: "2026-10-05T10:00:00Z" },
      { id: "company-only", contactId: null, organizationId: "org", dueAt: "2026-10-05T10:00:00Z" },
    ],
    active: [
      { id: "direct", title: "An opportunity", organizationId: "org", contactIds: ["a"] },
      { id: "company-only", title: "Company opportunity", organizationId: "org", contactIds: [] },
    ],
    health: [{ contactId: "a", health: "Needs attention" }, { contactId: "b", health: "Active" }],
  } as unknown as AnalyticsReport;
}

describe("relationship workspace evidence", () => {
  it("uses only direct links, retains historical conversations and sorts without mutating the report", () => {
    const report = scopedReport();
    const original = structuredClone(report);
    const rows = relationshipLedger(report, "", "UTC");
    expect(rows.map(row => row.person.name)).toEqual(["Ada", "Bella"]);
    expect(rows[0].conversations.map(item => item.id)).toEqual(["recent", "older"]);
    expect(rows[0].tasks.map(item => item.id)).toEqual(["sooner", "later"]);
    expect(rows[0].opportunities.map(item => item.id)).toEqual(["direct"]);
    expect(rows[0].status).toBe("Needs attention");
    expect(rows[1].conversations).toEqual([]);
    expect(rows[1].tasks).toEqual([]);
    expect(rows[1].opportunities).toEqual([]);
    expect(report).toEqual(original);
  });
  it("applies a selected date bucket to conversations without filtering the current snapshot", () => {
    const [ada] = relationshipLedger(scopedReport(), "2026-10-04", "UTC");
    expect(ada.conversations.map(item => item.id)).toEqual(["recent"]);
    expect(ada.tasks).toHaveLength(2);
    expect(ada.opportunities).toHaveLength(1);
    expect(relationshipLedger(scopedReport(), "2026-09", "UTC")[0].conversations).toEqual([]);
  });
  it("returns an empty workspace when no people match the report", () => {
    expect(relationshipLedger({ ...scopedReport(), contacts: [] }, "", "UTC")).toEqual([]);
  });
});
