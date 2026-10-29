import { useInterfaceText } from "../i18n/useInterfaceText";
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
  const __pulseText = useInterfaceText();
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button className="button ghost" onClick={() => setOpen(true)}>
        {__pulseText("Calendar export")}</button>
      {open && (
        <Modal title={__pulseText("Review calendar event")} onClose={() => setOpen(false)}>
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
              <span>{__pulseText("Event title")}</span>
              <input name="title" required defaultValue={title} />
            </label>
            <label className="field">
              <span>{__pulseText("Start (device time)")}</span>
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
              <span>{__pulseText("Duration in minutes")}</span>
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
              {__pulseText("All-day event (uses selected device calendar date)")}<input type="checkbox" name="allDay" />
            </label>
            <p className="muted">
              {__pulseText("The .ics download works without an account. It does not synchronize, invite attendees or complete the follow-up.")}</p>
            <GoogleCalendar id={id} form={form} />
            {error && <p role="alert">{__pulseText(error)}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                {__pulseText("Cancel")}</button>
              <button className="button primary">{__pulseText("Download .ics")}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
