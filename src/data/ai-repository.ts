import type { PulseDB } from "./db";
import { saveTask, addInteraction, settings } from "./repository";
import { stamp, type Task } from "./models";
import Dexie from "dexie";
export async function acceptAITask(
  db: PulseDB,
  proposal: {
    title: string;
    description: string;
    dueAt: string;
    contactId: string | null;
    organizationId: string | null;
  },
) {
  return db.transaction("rw", db.tables, async () => {
    if (!(await settings(db)).ai.enabled)
      throw new Error("AI features are disabled.");
    if (proposal.contactId) {
      const contact = await db.contacts.get(proposal.contactId);
      if (!contact) throw new Error("Contact no longer exists.");
      proposal = { ...proposal, organizationId: contact.organizationId };
    }
    const normalized = (v: string) =>
      v.trim().toLowerCase().replace(/\s+/g, " ");
    const identity = JSON.stringify([
      proposal.contactId,
      proposal.organizationId,
      normalized(proposal.title),
      proposal.dueAt,
    ]);
    const digest = await Dexie.waitFor(
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity)),
    );
    const id =
        "ai-task-" +
        [...new Uint8Array(digest)]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join(""),
      old = await db.tasks.get(id);
    if (old) return old.id;
    if (
      (await db.tasks.toArray()).some(
        (t) =>
          !t.completedAt &&
          t.contactId === proposal.contactId &&
          t.organizationId === proposal.organizationId &&
          normalized(t.title) === normalized(proposal.title) &&
          t.dueAt === proposal.dueAt,
      )
    )
      throw new Error("An open task with these details already exists.");
    const task: Task = {
      ...stamp(),
      ...proposal,
      id,
      description: proposal.description,
      source: "PULSE AI · reviewed proposal",
      completedAt: null,
      priority: "Normal",
      reminderMinutes: 60,
    };
    await saveTask(db, task);
    return id;
  });
}
export async function saveAINote(
  db: PulseDB,
  contactId: string | null,
  organizationId: string | null,
  text: string,
) {
  return db.transaction("rw", db.tables, async () => {
    if (!(await settings(db)).ai.enabled)
      throw new Error("AI features are disabled.");
    await addInteraction(db, {
      ...stamp(),
      contactId,
      organizationId,
      type: "Note",
      summary: text,
      outcome: "",
      occurredAt: new Date().toISOString(),
      opportunityId: null,
      followUpId: null,
      source: "PULSE AI · reviewed generated text",
    });
  });
}
