import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { setFocus } from "../data/expansion-repository";
import { calendarDay } from "../services/progress";
import type { FocusItem } from "../data/expansion-models";
export function FocusButton({
  type,
  id,
}: {
  type: FocusItem["entityType"];
  id: string;
}) {
  const p = usePulse();
  const pin = p.focusItems.find(
    (f) => f.entityType === type && f.recordId === id,
  );
  return (
    <button
      type="button"
      className="button ghost"
      aria-pressed={!!pin}
      onClick={() =>
        void p.run(
          () => setFocus(p.db, type, id, pin ? "unpin" : "pin"),
          pin ? "Unpinned" : "Pinned to My Focus",
        )
      }
    >
      {pin ? "Unpin" : "Pin to Focus"}
    </button>
  );
}
export function FocusSummary() {
  const p = usePulse(),
    today = calendarDay(Date.now(), p.settings.timezone);
  const selected = p.focusItems.filter((f) => f.today === today);
  const tasks = selected
    .filter((f) => f.entityType === "task")
    .map((f) => p.tasks.find((t) => t.id === f.recordId))
    .filter((t) => !!t);
  return (
    <section className="surface focus-summary">
      <h2>Your chosen next steps</h2>
      <p>
        {selected.length} selected for today ·{" "}
        {tasks.filter((t) => t.completedAt).length} of {tasks.length} tasks
        completed.
      </p>
      {p.settings.focus.homeLayout === "focused" && (
        <div>
          {p.focusItems
            .filter(
              (f) =>
                f.entityType === "contact" || f.entityType === "organization",
            )
            .slice(0, 4)
            .map((f) => (
              <p key={f.id}>
                <Link
                  to={`/network/${f.entityType === "contact" ? "people" : "companies"}/${f.recordId}`}
                >
                  {f.entityType === "contact"
                    ? p.contacts.find((c) => c.id === f.recordId)?.name
                    : p.organizations.find((o) => o.id === f.recordId)?.name}
                </Link>
              </p>
            ))}
        </div>
      )}
      <Link className="button secondary" to="/focus">
        Open My Focus
      </Link>
    </section>
  );
}
