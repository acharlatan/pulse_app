import { describe, expect, it } from "vitest";
import type { Contact, Interaction, Opportunity, Organization, Task } from "../src/data/models";
import { orbitSignals } from "../src/services/orbit-signals";
import { deriveOrbit } from "../src/services/orbit";

const now = Date.parse("2026-10-30T12:00:00Z");
const person = {id:"p",name:"Alex",avatar:"",organizationId:"new"} as Contact;
const oldCompany = {id:"old",name:"Old company",avatar:""} as Organization;
const newCompany = {id:"new",name:"New company",avatar:""} as Organization;
const deal = {id:"deal",title:"A project",organizationId:"new",contactIds:["p"],status:"open",stageId:"stage"} as Opportunity;
const followup = (id:string,dueAt:string,completedAt:string|null = null) => ({id,title:id,dueAt,completedAt,contactId:"p",organizationId:null}) as Task;
const record = (id:string,occurredAt:string,organizationId:string|null,type:Interaction["type"] = "Call") => ({id,occurredAt,organizationId,type,summary:id,contactId:"p",opportunityId:null}) as Interaction;
const base = {contacts:[person],organizations:[oldCompany,newCompany],opportunities:[deal],tasks:[] as Task[],interactions:[] as Interaction[]};

describe("Orbit starting points", () => {
  it("uses only overdue and next seven days of unfinished linked follow-ups", () => {
    const data = {...base,tasks:[followup("later","2026-11-08T12:00:00Z"),followup("done","2026-10-29T12:00:00Z","2026-10-30T10:00:00Z"),followup("due","2026-11-06T12:00:00Z"),followup("overdue","2026-10-01T12:00:00Z"),{...followup("unlinked","2026-10-01T12:00:00Z"),contactId:null}]};
    const signals = orbitSignals(data,now);
    expect(signals.followups.map(item => item.id)).toEqual(["overdue","due"]);
    expect([...signals.ids.followups]).toEqual(["person:p"]);
  });
  it("keeps historical company snapshots and excludes future or stale activity", () => {
    const data = {...base,interactions:[record("past","2026-10-29T12:00:00Z","old"),record("note","2026-10-28T12:00:00Z",null,"Note"),record("future","2026-10-31T12:00:00Z","new"),record("stale","2026-09-01T12:00:00Z","new")]};
    const signals = orbitSignals(data,now);
    expect(signals.activity.map(item => item.id)).toEqual(["past","note"]);
    expect(signals.activity[1].activityType).toBe("Note");
    expect([...signals.ids.activity].sort()).toEqual(["company:old","person:p"]);
  });
  it("includes only open opportunities and their explicit saved links", () => {
    const data = {...base,opportunities:[deal,{...deal,id:"closed",status:"won" as const}]};
    const signals = orbitSignals(data,now);
    expect(signals.opportunities.map(item => item.id)).toEqual(["deal"]);
    expect([...signals.ids.opportunities].sort()).toEqual(["company:new","opportunity:deal","person:p"]);
    const graph = deriveOrbit(data,{includeIds:signals.ids.opportunities});
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(3);
  });
  it("keeps a revealed record and its direct neighbors inside the bound", () => {
    const extra = Array.from({length:10},(_,i) => ({...person,id:`extra-${i}`,name:`Extra ${i}`}));
    const data = {...base,contacts:[person,...extra]};
    const graph = deriveOrbit(data,{limit:3,balance:true,preferredId:"company:new",preferredIds:["person:p","opportunity:deal"]});
    expect(graph.nodes.map(node => node.id).sort()).toEqual(["company:new","opportunity:deal","person:p"]);
    expect(graph.edges).toHaveLength(3);
    expect(graph.edges.every(edge => !(edge.from.startsWith("person:") && edge.to.startsWith("person:")))).toBe(true);
  });
  it("handles an empty personal workspace without creating examples", () => {
    const signals = orbitSignals({contacts:[],organizations:[],opportunities:[],tasks:[],interactions:[]},now);
    expect([signals.followups.length,signals.opportunities.length,signals.activity.length]).toEqual([0,0,0]);
  });
});
