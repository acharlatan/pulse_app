import { expect, it } from "vitest";
import { defaults, settingsSchema } from "../src/data/models";
it("preserves old onboarding preferences and accepts new personal intentions", () => {
  expect(settingsSchema.parse({...defaults,onboarding:{hidden:false,intention:"clients",exportInitiatedAt:null}}).onboarding.intention).toBe("clients");
  for (const intention of ["job_search","networking","other"]) expect(settingsSchema.parse({...defaults,onboarding:{hidden:false,intention,exportInitiatedAt:null}}).onboarding.intention).toBe(intention);
});
