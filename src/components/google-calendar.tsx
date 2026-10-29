import { useInterfaceText } from "../i18n/useInterfaceText";
import { useEffect, useRef, useState } from "react";
import { usePulse } from "../app/context";
import {
  cancelPendingGoogleAuthorization,
  authorizeGoogle,
  configuredGoogleClient,
  GoogleRequestError,
  googleSessionStatus,
} from "../services/google-session";
import {
  createGoogleEvent,
  getGoogleEvent,
  googleEventId,
  makeGoogleEvent,
} from "../services/google-api";
export function GoogleCalendar({
  id,
  form,
}: {
  id: string;
  form: React.RefObject<HTMLFormElement | null>;
}) {
  const __pulseText = useInterfaceText();
  const p = usePulse();
  const [description, setDescription] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      id: string;
      htmlLink?: string;
      existing: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const another = useRef("");
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      cancelPendingGoogleAuthorization();
    };
  }, []);
  async function create() {
    if (busy || !form.current) return;
    setBusy(true);
    setError("");
    try {
      const fields = new FormData(form.current);
      const eventId = await googleEventId(id, p.workspace, another.current);
      const event = makeGoogleEvent(
        eventId,
        String(fields.get("title") || ""),
        description,
        String(fields.get("start") || ""),
        Number(fields.get("minutes")),
        fields.get("allDay") === "on",
      );
      if (
        googleSessionStatus("calendar", p.workspace) !==
        "connected for this session"
      )
        await authorizeGoogle("calendar", p.workspace);
      if (!active.current) return;
      try {
        const saved = await createGoogleEvent(p.workspace, event);
        setResult({ ...saved, existing: false });
      } catch (e) {
        if (!(e instanceof GoogleRequestError) || e.status !== 409) throw e;
        const existing = await getGoogleEvent(p.workspace, eventId);
        setResult({ ...existing, existing: true });
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create the Google event.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label className="field">
        <span>{__pulseText("Google event description (optional)")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={10000}
        />
      </label>
      <p className="muted">
        {__pulseText("Only the title, time and description above are shared after you choose Add to Google Calendar. Uses your primary calendar; no invitations or synchronization. Dates use device time.")}</p>
      <p className="muted">
        {__pulseText("Google’s permission also allows viewing, editing and deleting events on calendars you own. PULSE uses it only to create the reviewed event and check for an existing event when needed.")}</p>
      {p.workspace !== "personal" && (
        <p>{__pulseText("Google is available in your personal workspace.")}</p>
      )}
      {!configuredGoogleClient() && (
        <p>{__pulseText("Google Cloud OAuth setup is required to connect.")}</p>
      )}
      {error && (
        <p role="alert">
          {__pulseText(error)} {" " + __pulseText("If the outcome is uncertain, retrying uses the same event ID.")}</p>
      )}
      {result && (
        <p role="status">
          {result.existing
            ? __pulseText("An event for this record already exists.")
            : __pulseText("Event created.")}{" "}
          {result.htmlLink && (
            <a href={result.htmlLink} target="_blank" rel="noopener noreferrer">
              {__pulseText("Open in Google Calendar")}</a>
          )}
        </p>
      )}
      {result && (
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            another.current = crypto.randomUUID();
            setResult(null);
          }}
        >
          {__pulseText("Create another event")}</button>
      )}
      <button
        type="button"
        className="button secondary"
        disabled={
          !configuredGoogleClient() ||
          p.workspace !== "personal" ||
          busy ||
          !!result
        }
        onClick={() => void create()}
      >
        {busy ? __pulseText("Working…") : __pulseText("Add to Google Calendar")}
      </button>
    </div>
  );
}
