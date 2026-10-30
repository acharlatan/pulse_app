import type { FocusItem } from "../data/expansion-models";

/** Future selections are kept apart from today's priorities and undated pins. */
export function focusHorizon(items: FocusItem[], today: string) {
  return {
    today: items.filter(item => item.today === today),
    ahead: items.filter(item => !!item.today && item.today > today).sort((a, b) => a.today!.localeCompare(b.today!) || a.id.localeCompare(b.id)),
    later: items.filter(item => !item.today || item.today < today),
  };
}
