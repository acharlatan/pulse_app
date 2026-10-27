import { useRef, useState } from "react";
import { GoogleCalendar } from "./google-calendar";
import { Modal } from "./ui";
import { calendarEvent, downloadText } from "../services/handoffs";
export function CalendarHandoff({
  id,
  title,
  description,
  start,
}: {
  id: string;
  title: string;
  description: string;
  start: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button className="button ghost" onClick={() => setOpen(true)}>
        Calendar export
      </button>
      {open && (
        <Modal title="Review calendar event" onClose={() => setOpen(false)}>
          <form
            ref={form}
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget),
                  at = new Date(String(f.get("start"))).toISOString();
                downloadText(
                  calendarEvent(
                    id,
                    String(f.get("title")),
                    description,
                    f.get("allDay") === "on"
                      ? String(f.get("start")).slice(0, 10) + "T12:00:00.000Z"
                      : at,
                    Number(f.get("minutes")),
                    f.get("allDay") === "on",
                  ),
                  "pulse-event.ics",
                  "text/calendar;charset=utf-8",
                );
                setOpen(false);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Calendar export failed.",
                );
              }
            }}
          >
            <label className="field">
              <span>Event title</span>
              <input name="title" required defaultValue={title} />
            </label>
            <label className="field">
              <span>Start (device time)</span>
              <input
                type="datetime-local"
                name="start"
                required
                defaultValue={new Date(
                  Date.parse(start) -
                    new Date(start).getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)}
              />
            </label>
            <label className="field">
              <span>Duration in minutes</span>
              <input
                type="number"
                min="5"
                max="1440"
                name="minutes"
                defaultValue="30"
                required
              />
            </label>
            <label className="setting-toggle">
              All-day event (uses selected device calendar date)
              <input type="checkbox" name="allDay" />
            </label>
            <p className="muted">
              The .ics download works without an account. It does not synchronize,
              invite attendees or complete the follow-up.
            </p>
            <GoogleCalendar id={id} form={form} />
            {error && <p role="alert">{error}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary">Download .ics</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
