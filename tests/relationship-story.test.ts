import { expect, it } from "vitest";
import type { Interaction, Opportunity, Task } from "../src/data/models";
import type { OpportunityTransition } from "../src/data/intelligence-models";
import { relationshipStory } from "../src/services/relationship-story";

it("filters a single factual story without attributing unlinked opportunity movements", () => {
  const interactions = [{id:"call",type:"Call",occurredAt:"2026-10-20T10:00:00Z",organizationId:"old-company"},{id:"note",type:"Note",occurredAt:"2026-10-21T10:00:00Z"}] as Interaction[];
  const tasks = [{id:"task",createdAt:"2026-10-22T10:00:00Z",completedAt:null}] as Task[];
  const opportunities = [{id:"linked"}] as Opportunity[];
  const transitions = [{id:"shown",opportunityId:"linked",occurredAt:"2026-10-23T10:00:00Z"},{id:"excluded",opportunityId:"other",occurredAt:"2026-10-24T10:00:00Z"}] as OpportunityTransition[];
  expect(relationshipStory(interactions,tasks,opportunities,transitions,"All").map((item) => item.record.id)).toEqual(["shown","task","note","call"]);
  expect(relationshipStory(interactions,tasks,opportunities,transitions,"Conversations").map((item) => item.record.id)).toEqual(["call"]);
  expect(relationshipStory(interactions,tasks,opportunities,transitions,"Note").map((item) => item.record.id)).toEqual(["note"]);
  expect(relationshipStory(interactions,tasks,opportunities,transitions,"Follow-ups").map((item) => item.record.id)).toEqual(["task"]);
  expect(interactions[0].organizationId).toBe("old-company");
});
