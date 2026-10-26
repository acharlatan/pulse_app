import { withinLimits } from "./limits";
import { DurableObject } from "cloudflare:workers";
export class AIQuota extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, client TEXT NOT NULL, at INTEGER NOT NULL, active INTEGER NOT NULL)",
    );
  }
  reserve(client: string, id: string) {
    const now = Date.now(),
      sql = this.ctx.storage.sql; // No awaits: admission is atomic within this one global budget coordinator.
    if (sql.exec("SELECT id FROM reservations WHERE id=?", id).toArray().length)
      return false;
    const rows = sql
      .exec<{ client: string; at: number; active: number }>(
        "SELECT client,at,active FROM reservations",
      )
      .toArray();
    if (!withinLimits(rows, client, now)) return false;
    sql.exec("INSERT INTO reservations VALUES (?,?,?,1)", id, client, now);
    return true;
  }
  release(id: string) {
    this.ctx.storage.sql.exec(
      "UPDATE reservations SET active=0 WHERE id=?",
      id,
    );
  }
}
