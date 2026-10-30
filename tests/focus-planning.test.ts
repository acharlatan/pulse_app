import { afterEach, beforeEach, expect, it } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { setFocus } from "../src/data/expansion-repository";
import { completeTask, reopenTask } from "../src/data/repository";

let db: PulseDB;
beforeEach(async () => { db = new PulseDB("demo"); await db.delete(); await db.open(); await initialize(db); });
afterEach(async () => { await db.delete(); });

it("schedules a saved follow-up without changing its real due date and retains it through completion and reopen", async () => {
  const task = (await db.tasks.get("task-0"))!;
  await setFocus(db, "task", task.id, "pin");
  await setFocus(db, "task", task.id, "today", "2026-11-02");
  expect((await db.tasks.get(task.id))?.dueAt).toBe(task.dueAt);
  expect((await db.focusItems.toArray()).find((item) => item.recordId === task.id)?.today).toBe("2026-11-02");
  await completeTask(db, task.id);
  expect((await db.tasks.get(task.id))?.completedAt).toBeTruthy();
  await reopenTask(db, task.id);
  expect((await db.tasks.get(task.id))?.completedAt).toBeNull();
  expect((await db.tasks.get(task.id))?.dueAt).toBe(task.dueAt);
  expect((await db.focusItems.toArray()).find((item) => item.recordId === task.id)?.today).toBe("2026-11-02");
});
