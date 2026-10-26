export interface Reservation {
  id?: string;
  client: string;
  at: number;
  active: number;
}
// This pure policy is called synchronously within the single durable global-budget admission operation.
export function withinLimits(rows: Reservation[], client: string, now: number) {
  return (
    rows.length < 200 &&
    rows.filter(
      (r) =>
        new Date(r.at).toISOString().slice(0, 10) ===
        new Date(now).toISOString().slice(0, 10),
    ).length < 20 &&
    rows.filter((r) => r.active && now - r.at < 90000).length < 2 &&
    rows.filter((r) => r.client === client && now - r.at < 600000).length < 5
  );
}
