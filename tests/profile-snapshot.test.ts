import { describe, expect, it } from "vitest";
import type { Interaction, Opportunity, Task } from "../src/data/models";
import { profileSnapshot } from "../src/services/profile-snapshot";

const interaction = (id: string, type: Interaction["type"], occurredAt: string) => ({ id, type, occurredAt, organizationId: "historical-company" }) as Interaction;
const task = (id: string, dueAt: string, completedAt: string | null = null) => ({ id, dueAt, completedAt }) as Task;
const opportunity = (id: string, status: Opportunity["status"]) => ({ id, status }) as Opportunity;

describe("profile snapshot", () => {
  it("uses the latest saved past conversation and note, and the earliest open follow-up", () => {
    const interactions = [interaction("meeting", "Meeting", "2026-10-29T08:00:00Z"), interaction("note", "Note", "2026-10-30T08:00:00Z"), interaction("future", "Call", "2026-11-01T08:00:00Z")];
    const tasks = [task("done", "2026-10-01T08:00:00Z", "2026-10-02T08:00:00Z"), task("later", "2026-11-02T08:00:00Z"), task("next", "2026-10-31T08:00:00Z")];
    const result = profileSnapshot(interactions, tasks, [opportunity("open", "open"), opportunity("won", "won")], Date.parse("2026-10-30T12:00:00Z"));
    expect(result.lastConversation?.id).toBe("meeting");
    expect(result.lastConversation?.organizationId).toBe("historical-company");
    expect(result.lastNote?.id).toBe("note");
    expect(result.nextTask?.id).toBe("next");
    expect(result.openTasks).toBe(2);
    expect(result.openOpportunities.map((item) => item.id)).toEqual(["open"]);
    expect(interactions.map((item) => item.id)).toEqual(["meeting", "note", "future"]);
  });
  it("returns empty results when no records have been saved", () => {
    expect(profileSnapshot([], [], [])).toEqual({ lastConversation: undefined, lastNote: undefined, nextTask: undefined, openTasks: 0, openOpportunities: [] });
  });
});
