import { planLegacyPipelines } from "../services/pipelines";
import type { PulseDB } from "./db";
import { defaults, stamp, stages, type Contact } from "./models";
const day = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toISOString();
export async function initialize(db: PulseDB) {
  await db.transaction("rw", db.tables, async () => {
    const existing = await db.settings.get("settings");
    if (existing) {
      if (db.workspace === "demo" && existing.name === "Alex")
        await db.settings.put({ ...existing, name: "Michelle" });
      return;
    }
    if (!(await db.pipelines.count())) {
      const graph = planLegacyPipelines(defaults, [], new Date().toISOString());
      await db.pipelines.bulkPut(graph.pipelines);
      await db.pipelineStages.bulkPut(graph.stages);
    }
    await db.settings.put({
      ...defaults,
      name: db.workspace === "demo" ? "Michelle" : "",
    });
    if (db.workspace === "personal") return;
    const companies = [
      ["Forma Studio", "Design & creative", "Portland, OR"],
      ["Northstar Labs", "Technology", "Austin, TX"],
      ["Evergreen Collective", "Sustainability", "Denver, CO"],
      ["Bloom & Co.", "Marketing", "Brooklyn, NY"],
      ["Orbit Works", "Software", "Seattle, WA"],
      ["Goodkind", "Consumer goods", "Chicago, IL"],
      ["Sonder Health", "Healthcare", "Boston, MA"],
      ["Meridian Partners", "Consulting", "Atlanta, GA"],
      ["Sunday Supply", "Retail", "San Diego, CA"],
      ["Fieldwork", "Architecture", "Minneapolis, MN"],
    ];
    const people = [
      "Olivia Chen",
      "Marcus Johnson",
      "Sofia Rivera",
      "James Park",
      "Amara Okafor",
      "Ethan Brooks",
      "Isabella Rossi",
      "Noah Williams",
      "Mia Patel",
      "Lucas Reed",
      "Chloe Bennett",
      "Daniel Kim",
      "Zoe Mitchell",
      "Leo Santos",
      "Ava Thompson",
      "Elijah Wright",
      "Nora Anderson",
      "Liam Foster",
      "Grace Lee",
      "Theo Morgan",
      "Aria Collins",
      "Owen Hayes",
      "Luna Scott",
      "Kai Nguyen",
    ];
    const orgs = companies.map((v, i) => ({
      ...stamp(),
      id: `org-${i}`,
      name: v[0],
      industry: v[1],
      location: v[2],
      website: `https://company-${i}.example`,
      description: `A thoughtful team building a better future through ${v[1].toLowerCase()}. Exploring a long-term partnership and new ways to work together.`,
      avatar: "",
      tags: [i % 2 ? "Potential partner" : "Key account"],
      customFields: {},
    }));
    await db.organizations.bulkAdd(orgs);
    const contacts: Contact[] = people.map((name, i) => ({
      ...stamp(),
      id: `contact-${i}`,
      createdAt: day(-40),
      name,
      preferredName: name.split(" ")[0],
      role: [
        "Creative Director",
        "Head of Partnerships",
        "Founder & CEO",
        "Marketing Lead",
        "Operations Director",
        "Account Manager",
      ][i % 6],
      organizationId: `org-${i % 10}`,
      emails: [
        `${name.toLowerCase().replace(" ", ".")}@company-${i % 10}.example`,
      ],
      phones: [],
      links: [],
      avatar: "",
      category: i % 3 === 0 ? "Active client" : "Prospect",
      stage: stages[[5, 4, 3, 2, 6, 1][i % 6]],
      priority: i % 5 === 0 ? "VIP" : i % 3 === 0 ? "High" : "Normal",
      availability:
        i === 8
          ? "Do not contact"
          : i === 6 || i === 13
            ? "Temporarily unavailable"
            : "Available",
      timeoutUntil: i === 6 || i === 13 ? day(14) : null,
      tags: [i % 2 ? "Partnership" : "Creative"],
      nextFollowUp: null,
    }));
    await db.contacts.bulkAdd(contacts);
    await db.interactions.bulkAdd(
      contacts.flatMap((c, i) => [
        {
          ...stamp(),
          id: `interaction-${i}`,
          contactId: c.id,
          organizationId: c.organizationId,
          type: i % 2 ? ("Call" as const) : ("Meeting" as const),
          occurredAt: day(-[25, 2, 9, 1, 31, 4][i % 6]),
          summary: [
            "Discussed the brand refresh. Olivia is excited about a thoughtful, long-term collaboration. Send over the updated proposal.",
            "Great discovery call. Their team is growing and needs support with the next launch.",
            "Explored partnership goals and agreed to reconnect after their planning session.",
          ][i % 3],
          outcome: "Next steps agreed",
          opportunityId: null,
          followUpId: null,
        },
      ]),
    );
    await db.tasks.bulkAdd(
      contacts.slice(0, 7).map((c, i) => ({
        ...stamp(),
        id: `task-${i}`,
        title: [
          "Send the updated proposal",
          "Check in on the spring launch",
          "Share partnership ideas",
          "Schedule a discovery call",
          "Follow up on the project scope",
          "Prepare meeting notes",
          "Review the creative brief",
        ][i],
        description: "A thoughtful next step for this relationship.",
        contactId: c.id,
        organizationId: c.organizationId,
        dueAt: day([-1, 0, 1, 0, 3, 5, 10][i]),
        completedAt: i === 5 ? day(0) : null,
        priority: c.priority,
        reminderMinutes: 60,
      })),
    );
    await db.opportunities.bulkAdd(
      orgs.slice(0, 6).map((o, i) => ({
        ...stamp(),
        title: [
          "Brand identity refresh",
          "Launch partnership",
          "Annual creative retainer",
          "Growth strategy",
          "Platform collaboration",
          "Customer experience project",
        ][i],
        organizationId: o.id,
        contactIds: [`contact-${i}`],
        pipelineId: "default",
        stageId: stages[[5, 4, 3, 6, 2, 5][i]],
        value: [8500, 12000, 24000, 6500, 18000, 9000][i],
        currency: "USD",
        status: "open" as const,
        probability: null,
        expectedCloseAt: day(30),
        notes: "Fictional demo opportunity.",
      })),
    );
    await db.events.bulkAdd(
      contacts.slice(0, 8).map((c, i) => ({
        ...stamp(),
        createdAt: day(-i / 5),
        category: "interaction",
        contactId: c.id,
        organizationId: c.organizationId,
        summary: `${i % 2 ? "Call with" : "Meeting with"} ${c.name} · next steps agreed`,
      })),
    );
  });
}
export async function resetWorkspace(db: PulseDB) {
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await initialize(db);
}
