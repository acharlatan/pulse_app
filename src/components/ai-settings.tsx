import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
export function AISettings() {
  const p = usePulse(),
    [status, setStatus] = useState("AI availability has not been checked."),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/ai/status", { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const v = await r.json();
        setStatus(v.message || "AI is unavailable.");
      })
      .catch(() => {
        if (!c.signal.aborted)
          setStatus("AI endpoint unavailable. Your local CRM still works.");
      });
    return () => c.abort();
  }, []);
  return (
    <div className="surface ai-settings">
      <h3>Optional PULSE Intelligence</h3>
      <p role="status">{status}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const f = new FormData(e.currentTarget);
          setBusy(true);
          await p.run(
            () =>
              p.setSettings({
                ai: {
                  enabled: f.get("enabled") === "on",
                  notes: f.get("notes") === "on",
                  opportunities: f.get("opportunities") === "on",
                  values: f.get("values") === "on",
                  channels: f.get("channels") === "on",
                },
              }),
            "AI preferences saved",
          );
          setBusy(false);
        }}
      >
        {(
          [
            ["enabled", "Enable optional AI features"],
            ["notes", "Include notes by default"],
            ["opportunities", "Include related opportunities by default"],
            ["values", "Include deal values by default"],
            ["channels", "Include email and phone details by default"],
          ] as const
        ).map(([key, label]) => (
          <label className="setting-toggle" key={key}>
            {label}
            <input
              type="checkbox"
              name={key}
              defaultChecked={p.settings.ai[key]}
            />
          </label>
        ))}
        <p className="inline-notice">
          Every request still requires exact context review and approval. Only
          selected information is sent to Google Gemini. Provider terms apply;
          free-tier content may be used to improve its products. Responses
          remain temporary unless explicitly saved. Permission evidence is never
          included. No background transmission or automatic actions.
        </p>
        <button className="button primary" disabled={busy}>
          Save AI preferences
        </button>
      </form>
      <Link className="button ghost" to="/assistant">
        Open PULSE Intelligence
      </Link>
      <p className="muted">
        Calendar files, email composers and WhatsApp links are local handoffs,
        not synchronized account connections.
      </p>
    </div>
  );
}
