import { expect, it } from "vitest";
import type { FocusItem } from "../src/data/expansion-models";
import { focusHorizon } from "../src/services/focus-horizon";
const pin = (id: string, today: string | null) => ({ id, today }) as FocusItem;
it("separates future choices from today and later pins, ordering future dates", () => {
  const result = focusHorizon([pin("late", "2026-11-05"), pin("past", "2026-10-28"), pin("now", "2026-10-30"), pin("saved", null), pin("soon", "2026-11-01")], "2026-10-30");
  expect(result.today.map(x => x.id)).toEqual(["now"]);
  expect(result.ahead.map(x => x.id)).toEqual(["soon", "late"]);
  expect(result.later.map(x => x.id)).toEqual(["past", "saved"]);
});
