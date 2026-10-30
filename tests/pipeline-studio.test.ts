import { describe, expect, it } from "vitest";
import type { Interaction, Opportunity, Task } from "../src/data/models";
import type { OpportunityInsight } from "../src/services/recommendations";
import { opportunityFollowUp, pipelineStudio } from "../src/services/pipeline-studio";
const base = { createdAt:"2026-10-01T00:00:00.000Z", updatedAt:"2026-10-01T00:00:00.000Z" };
const deal = (id:string, patch:Partial<Opportunity>={}): Opportunity => ({...base,id,title:id,organizationId:"org",contactIds:["person"],pipelineId:"pipeline",stageId:"stage",value:100,currency:"USD",status:"open",probability:null,expectedCloseAt:null,notes:"",...patch});
const task = (id:string,patch:Partial<Task>={}): Task => ({...base,id,title:id,description:"",contactId:null,organizationId:"org",dueAt:"2026-11-01T10:00:00.000Z",completedAt:null,priority:"Normal",reminderMinutes:60,...patch});
const interaction = (patch:Partial<Interaction>={}): Interaction => ({...base,id:"interaction",contactId:null,organizationId:"org",type:"Meeting",occurredAt:"2026-10-01T00:00:00.000Z",summary:"A conversation",outcome:"",opportunityId:"a",followUpId:"linked",...patch});
const insight = (id:string, flags:string[]): OpportunityInsight => ({opportunityId:id, flags, reason:"Saved evidence",rank:0,date:"2026-10-01",signature:"signature"});
describe("pipeline studio evidence",()=>{
  it("prefers an explicitly linked open follow-up over an earlier shared-company task and labels the difference",()=>{
    const o=deal("a"), shared=task("shared",{dueAt:"2026-10-30T10:00:00.000Z"}), linked=task("linked",{organizationId:"other"});
    expect(opportunityFollowUp(o,[shared,linked],[interaction()])).toEqual({task:linked,relation:"linked"});
    expect(opportunityFollowUp(o,[shared,linked],[])).toEqual({task:shared,relation:"related"});
    expect(opportunityFollowUp(o,[{...shared,completedAt:"2026-10-29T00:00:00.000Z"}],[])).toBeNull();
  });
  it("limits actionable totals to open records, respects the workspace calendar and uses existing flags",()=>{
    const now=Date.parse("2026-10-30T12:00:00Z");
    const deals=[deal("today",{expectedCloseAt:"2026-10-30T23:00:00.000Z"}),deal("edge",{organizationId:null,contactIds:[],expectedCloseAt:"2026-11-13T08:00:00.000Z"}),deal("late",{expectedCloseAt:"2026-11-14T08:00:00.000Z"}),deal("won",{status:"won",expectedCloseAt:"2026-10-31T08:00:00.000Z"}),deal("past",{expectedCloseAt:"2026-10-29T08:00:00.000Z"})];
    const summary=pipelineStudio(deals,[task("related")],[],[insight("today",["flag"]),insight("won",["flag"]),insight("late",[])],"UTC",now);
    expect(summary.open.map(o=>o.id)).toEqual(["today","edge","late","past"]);
    expect(summary.needsReview.map(o=>o.id)).toEqual(["today"]);
    expect(summary.closingSoon.map(o=>o.id)).toEqual(["today","edge"]);
    expect(summary.noFollowUp.map(o=>o.id)).toEqual(["edge"]);
  });
  it("does not associate an unrelated task with an opportunity",()=>{
    expect(opportunityFollowUp(deal("a",{organizationId:null,contactIds:[]}),[task("other")],[interaction({opportunityId:"different"})])).toBeNull();
  });
});
