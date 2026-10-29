import { useInterfaceText } from "../i18n/useInterfaceText";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePulse } from "../app/context";
import {
  cancelPendingGoogleAuthorization,
  authorizeGoogle,
  configuredGoogleClient,
  disconnectGoogle,
  googleSessionStatus,
} from "../services/google-session";
import {
  googleContactsCsv,
  queueGoogleImport,
  readGoogleContacts,
  type GooglePerson,
} from "../services/google-api";
export function GoogleContacts() {
  const __pulseText = useInterfaceText();
  const p = usePulse(),
    navigate = useNavigate();
  const [people, setPeople] = useState<GooglePerson[]>([]),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      cancelPendingGoogleAuthorization();
    };
  }, []);
  async function preview() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (
        googleSessionStatus("contacts", p.workspace) !==
        "connected for this session"
      )
        await authorizeGoogle("contacts", p.workspace);
      if (!active.current) return;
      const data = await readGoogleContacts(p.workspace);
      if (active.current) {
        setPeople(data);
        setSelected(new Set());
        setLoaded(true);
      }
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error
            ? e.message
            : "Google Contacts could not be loaded.",
        );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <section className="surface">
      <h2>{__pulseText("Google Contacts")}</h2>
      <p>
        {__pulseText("Read-only, selected import. Review matches and fields before anything is saved. Contacts and consent are never changed on Google.")}</p>
      <p>
        {__pulseText("Status:") + " "}{googleSessionStatus("contacts", p.workspace)}{__pulseText(". Access lasts only for this session; switching workspaces clears it.")}</p>
      <button
        className="button secondary"
        disabled={
          !configuredGoogleClient() || p.workspace !== "personal" || busy
        }
        onClick={() => void preview()}
      >
        {busy ? __pulseText("Loading…") : __pulseText("Connect and preview contacts")}
      </button>
      {p.workspace !== "personal" && (
        <p>{__pulseText("Open your personal workspace to connect Google.")}</p>
      )}
      {!configuredGoogleClient() && (
        <p>{__pulseText("Google Cloud OAuth configuration is needed before connecting.")}</p>
      )}
      <button
        className="button ghost"
        onClick={() => {
          disconnectGoogle();
          setPeople([]);
          setSelected(new Set());
          setLoaded(false);
        }}
      >
        {__pulseText("Disconnect")}</button>
      {error && <p role="alert">{__pulseText(error)}</p>}
      {loaded && (
        <>
          <p>
            {people.length} {" " + __pulseText("retrieved ·") + " "}{selected.size} {" " + __pulseText("selected. Nothing is saved yet.")}</p>
          {people.map((person) => (
            <label className="bulk-option" key={person.resourceName}>
              <input
                type="checkbox"
                checked={selected.has(person.resourceName)}
                onChange={(e) =>
                  setSelected((previous) => {
                    const next = new Set(previous);
                    if (e.target.checked) next.add(person.resourceName);
                    else next.delete(person.resourceName);
                    return next;
                  })
                }
              />
              <span>
                {person.names?.[0]?.displayName || __pulseText("Name missing")} ·{" "}
                {person.emailAddresses?.[0]?.value || __pulseText("No email")} ·{" "}
                {person.organizations?.[0]?.name || __pulseText("No company")}
              </span>
            </label>
          ))}
          <button
            className="button primary"
            disabled={!selected.size}
            onClick={() => {
              queueGoogleImport(
                p.workspace,
                googleContactsCsv(
                  people.filter((person) => selected.has(person.resourceName)),
                ),
              );
              navigate("/import");
            }}
          >
            {__pulseText("Review selected contacts")}</button>
        </>
      )}
    </section>
  );
}
