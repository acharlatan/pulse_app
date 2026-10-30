import { describe, expect, it } from "vitest";
import type { Task } from "../src/data/models";
import { upcomingCommitments } from "../src/services/weekly-review";

const task = (id: string, dueAt: string, completedAt: string | null = null) => ({ id, dueAt, completedAt }) as Task;

describe("upcoming commitments", () => {
  it("includes open tasks due in the next seven local calendar days in due order", () => {
    const tasks = [task("later", "2026-11-06T09:00:00Z"), task("today", "2026-10-30T09:00:00Z"), task("end", "2026-11-05T09:00:00Z"), task("done", "2026-10-31T09:00:00Z", "2026-10-30T10:00:00Z"), task("old", "2026-10-29T09:00:00Z")];
    expect(upcomingCommitments(tasks, "UTC", Date.parse("2026-10-30T12:00:00Z")).map((t) => t.id)).toEqual(["today", "end"]);
  });
  it("uses the workspace calendar across timezone boundaries", () => {
    const tasks = [task("local-today", "2026-10-30T16:30:00Z"), task("local-yesterday", "2026-10-30T15:00:00Z")];
    expect(upcomingCommitments(tasks, "Asia/Taipei", Date.parse("2026-10-30T16:00:00Z")).map((t) => t.id)).toEqual(["local-today"]);
  });
});
