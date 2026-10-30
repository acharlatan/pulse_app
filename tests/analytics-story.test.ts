import { describe, expect, it } from "vitest";
import type { Interaction, Task } from "../src/data/models";
import type { OpportunityTransition } from "../src/data/intelligence-models";
import { analyticsStory } from "../src/services/analytics-story";

const interaction = (id: string, type: Interaction["type"], occurredAt: string) => ({ id, type, occurredAt, organizationId: "historic-company" }) as Interaction;
const task = (id: string, completedAt: string | null) => ({ id, completedAt }) as Task;
const movement = (id: string, occurredAt: string) => ({ id, opportunityId: "opportunity-1", occurredAt, previousStageName: "Saved old label", stageName: "Saved new label" }) as OpportunityTransition;

describe("analytics story", () => {
  it("shows only dated saved events, excludes notes and future events, and orders across event types", () => {
    const report = {
      asOf: Date.parse("2026-10-30T12:00:00Z"),
      interactions: [interaction("meeting", "Meeting", "2026-10-29T10:00:00Z"), interaction("note", "Note", "2026-10-30T09:00:00Z"), interaction("future", "Call", "2026-11-01T09:00:00Z")],
      completed: [task("done", "2026-10-30T08:00:00Z"), task("open", null)],
      transitions: [movement("move", "2026-10-30T11:00:00Z")],
    };
    const events = analyticsStory(report);
    expect(events.map(e => `${e.kind}:${e.id}`)).toEqual(["movement:move", "completed:done", "conversation:meeting"]);
    expect(events[0].kind === "movement" && events[0].record.previousStageName).toBe("Saved old label");
    expect(events[2].kind === "conversation" && events[2].record.organizationId).toBe("historic-company");
    expect(report.interactions.map(i => i.id)).toEqual(["meeting", "note", "future"]);
  });
  it("is deterministic when dates are equal", () => {
    const at = "2026-10-30T08:00:00Z";
    expect(analyticsStory({ asOf: Date.parse(at), interactions: [interaction("b", "Call", at), interaction("a", "Email", at)], completed: [], transitions: [] }).map(e => e.id)).toEqual(["a", "b"]);
  });
});
