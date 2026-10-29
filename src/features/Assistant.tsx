import { useInterfaceText } from "../i18n/useInterfaceText";
import { ActionProposals } from "./ai/ActionProposals";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePulse } from "../app/context";
import {
  aiRequestSchema,
  validateResult,
  type AIRequest,
  type AIResult,
  type AIContext,
} from "../ai/contracts";
import {
  buildContext,
  outreachReasons,
  type ContextOptions,
} from "../ai/context";
import { EditorModal, type Editor } from "../components/forms";
import { Badge, Modal } from "../components/ui";
import { emailLink, whatsappLink } from "../services/handoffs";
import { saveAINote } from "../data/ai-repository";
export function Assistant() {
  const __pulseText = useInterfaceText();
  const p = usePulse(),
    [params] = useSearchParams(),
    initial = params.get("scope");
  const [scope, setScope] = useState<AIContext["scope"]>(
      initial === "organization" || initial === "opportunity"
        ? initial
        : "contact",
    ),
    [id, setId] = useState(params.get("id") || "");
  const [operation, setOperation] = useState<AIRequest["operation"]>(
    params.get("note") ? "extract-actions" : "catch-up",
  );
  const [options, setOptions] = useState<ContextOptions>({
    identity: true,
    organization: true,
    interactions: true,
    notes: !!params.get("note") || p.settings.ai.notes,
    tasks: true,
    opportunities: p.settings.ai.opportunities,
    values: p.settings.ai.values,
    channels: p.settings.ai.channels,
    from: "",
    keyword: params.get("note")
      ? p.interactions
          .find((i) => i.id === params.get("note"))
          ?.summary.slice(0, 100) || ""
      : "",
    channel: "Email",
    purpose: "Relationship",
  });
  const [question, setQuestion] = useState(""),
    [text, setText] = useState(""),
    [tone, setTone] = useState<AIRequest["tone"]>("Professional"),
    [length, setLength] = useState<AIRequest["length"]>("Short");
  const [status, setStatus] = useState({
      available: false,
      message: "Checking optional AI availability…",
    }),
    [online, setOnline] = useState(navigator.onLine),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<AIRequest | null>(null),
    [answer, setAnswer] = useState<{
      request: AIRequest;
      result: AIResult;
    } | null>(null);
  const [draft, setDraft] = useState({ subject: "", body: "" }),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState<number[]>([]),
    [savingNote, setSavingNote] = useState(false),
    [noteText, setNoteText] = useState("");
  const [sourceEditor, setSourceEditor] = useState<Editor | null>(null);
  const abort = useRef<AbortController | null>(null),
    version = useRef(0);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/ai/status", { cache: "no-store", signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const s = await r.json();
        setStatus({
          available: s.available === true,
          message:
            typeof s.message === "string" ? s.message : "AI unavailable.",
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setStatus({
            available: false,
            message: "AI endpoint unavailable. Local CRM remains ready.",
          });
      });
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      ctrl.abort();
      abort.current?.abort();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  function clearResult() {
    version.current++;
    abort.current?.abort();
    setBusy(false);
    setPreview(null);
    setAnswer(null);
    setSavingNote(false);
    setNoteText("");
    setDraft({ subject: "", body: "" });
    setError("");
  }
  function clear() {
    clearResult();
    setQuestion("");
    setText("");
  }
  useEffect(() => {
    if (!p.settings.ai.enabled) clear();
  }, [p.settings.ai.enabled]);
  const choices =
    scope === "contact"
      ? p.contacts
      : scope === "organization"
        ? p.organizations
        : p.opportunities;
  const c = p.contacts.find((c) => c.id === id && scope === "contact");
  const reasons = c
    ? outreachReasons(
        c,
        p.permissions,
        p.restrictions,
        options.channel,
        options.purpose,
      )
    : ["Select an individual contact for outreach drafting."];
  function prepare() {
    setError("");
    try {
      if (!p.settings.ai.enabled)
        throw Error("Enable optional AI in Settings first.");
      const context = buildContext(p, scope, id, options, p.settings.timezone);
      const request = aiRequestSchema.parse({
        version: 1,
        requestId: crypto.randomUUID(),
        operation,
        context,
        question: operation === "ask" || operation === "draft" ? question : "",
        text: operation === "extract-actions" ? text : "",
        tone,
        length,
        channel: options.channel,
        purpose: options.purpose,
      });
      if (new TextEncoder().encode(JSON.stringify(request)).length > 48000)
        throw Error("Selected context is too large. Reduce the scope or text.");
      setPreview(request);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Review your scope and inputs.",
      );
    }
  }
  async function send() {
    if (!preview || busy) return;
    setError("");
    if (!p.settings.ai.enabled || !navigator.onLine || !status.available) {
      setError("AI is disabled, unconfigured or offline. Nothing was sent.");
      return;
    }
    if (preview.operation === "draft" && reasons.length) {
      setError(reasons.join(" "));
      return;
    }
    // Rebuild before submission: a record edit after preview requires new explicit approval.
    try {
      if (
        JSON.stringify(
          buildContext(
            p,
            scope,
            id,
            options,
            p.settings.timezone,
            Date.parse(preview.context.now),
          ),
        ) !== JSON.stringify(preview.context)
      ) {
        setPreview(null);
        setError("Records changed. Preview and approve the updated context.");
        return;
      }
    } catch {
      setPreview(null);
      setError(
        "The selected relationship changed or was deleted. Review your scope again.",
      );
      return;
    }
    const request = preview;
    setPreview(null);
    setBusy(true);
    const generation = ++version.current;
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const r = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(30000)]),
      });
      const raw = await r.json();
      if (!r.ok) throw Error(raw.error || "AI unavailable.");
      const result = validateResult(raw.result, request);
      if (generation !== version.current) return;
      setAnswer({ request, result });
      setDraft(result.draft || { subject: "", body: "" });
    } catch (e) {
      if (generation === version.current && !ctrl.signal.aborted)
        setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      if (generation === version.current) setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      p.notify("Copied for your review. Nothing sent.");
    } catch {
      setError("Copy unavailable. Select and copy the text manually.");
    }
  }
  function handoff(kind: "Email" | "WhatsApp") {
    try {
      if (!c || answer?.request.context.targetId !== c.id)
        throw Error("Select a contact and review the draft again.");
      const blocked = outreachReasons(
        c,
        p.permissions,
        p.restrictions,
        kind,
        answer.request.purpose,
      );
      if (blocked.length) throw Error(blocked.join(" "));
      const url =
        kind === "Email"
          ? emailLink(c.emails[0] || "", draft.subject, draft.body)
          : whatsappLink(c.phones[0] || "", draft.body);
      if (kind === "Email") window.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      p.notify(
        "Composer opened for review. PULSE has not recorded a sent message.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Handoff unavailable.");
    }
  }
  const summary = answer?.result.facts.map((f) => f.text).join("\n") || "";
  return (
    <div className="page assistant-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{__pulseText("OPTIONAL · SELECTED CONTEXT ONLY")}</p>
          <h1>
            {__pulseText("PULSE Intelligence")}<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            {__pulseText("Understand the relationship. Find the next step.")}</p>
        </div>
        <Link className="button secondary" to="/settings?section=integrations">
          {__pulseText("AI & integration preferences")}</Link>
      </div>
      <div className="inline-notice" role="status">
        {!online
          ? __pulseText("Offline: AI requires internet. Your local CRM still works.")
          : status.message}{" "}
        {!p.settings.ai.enabled && __pulseText(" AI is disabled in this workspace.")}
      </div>
      <section className="surface ai-controls">
        <label className="field">
          <span>{__pulseText("Context scope")}</span>
          <select
            value={scope}
            onChange={(e) => {
              clear();
              setScope(e.target.value as AIContext["scope"]);
              setId("");
            }}
          >
            <option value="contact">{__pulseText("Contact")}</option>
            <option value="organization">{__pulseText("Company")}</option>
            <option value="opportunity">{__pulseText("Opportunity")}</option>
          </select>
        </label>
        <label className="field">
          <span>{__pulseText("Selected relationship")}</span>
          <select
            value={id}
            onChange={(e) => {
              clear();
              setId(e.target.value);
            }}
          >
            <option value="">{__pulseText("Choose a record")}</option>
            {choices.map((r) => (
              <option key={r.id} value={r.id}>
                {"name" in r ? r.name : r.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{__pulseText("AI operation")}</span>
          <select
            value={operation}
            onChange={(e) => {
              clear();
              setOperation(e.target.value as AIRequest["operation"]);
            }}
          >
            <option value="catch-up">{__pulseText("Catch Me Up")}</option>
            <option value="ask">{__pulseText("Ask PULSE")}</option>
            <option value="draft">{__pulseText("Draft a message")}</option>
            <option value="extract-actions">{__pulseText("Notes to Actions")}</option>
          </select>
        </label>
        {operation === "ask" && (
          <label className="field">
            <span>{__pulseText("Your question")}</span>
            <textarea
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={__pulseText("What commitments are recorded?")}
            />
          </label>
        )}
        {operation === "extract-actions" && (
          <label className="field">
            <span>{__pulseText("Optional note to extract (also sent if approved)")}</span>
            <textarea
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        )}
        {operation === "draft" && (
          <>
            <label className="field">
              <span>{__pulseText("Message goal")}</span>
              <input
                maxLength={1000}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={__pulseText("Meeting request, proposal update or relationship check-in")}
              />
            </label>
            <div className="ai-form-grid">
              <label className="field">
                <span>{__pulseText("Tone")}</span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as AIRequest["tone"])}
                >
                  {[
                    "Professional",
                    "Friendly",
                    "Warm",
                    "Concise",
                    "Direct",
                  ].map((t) => (
                    <option key={t} value={t}>{__pulseText(t)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Length")}</span>
                <select
                  value={length}
                  onChange={(e) =>
                    setLength(e.target.value as AIRequest["length"])
                  }
                >
                  {["Short", "Standard", "Detailed"].map((t) => (
                    <option key={t} value={t}>{__pulseText(t)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Channel")}</span>
                <select
                  value={options.channel}
                  onChange={(e) => {
                    clearResult();
                    setOptions({
                      ...options,
                      channel: e.target.value as ContextOptions["channel"],
                    });
                  }}
                >
                  {["Email", "WhatsApp", "General"].map((t) => (
                    <option key={t} value={t}>{__pulseText(t)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Communication purpose")}</span>
                <select
                  value={options.purpose}
                  onChange={(e) => {
                    clearResult();
                    setOptions({
                      ...options,
                      purpose: e.target.value as ContextOptions["purpose"],
                    });
                  }}
                >
                  <option value="Relationship">{__pulseText("Relationship")}</option>
                  <option value="Marketing">{__pulseText("Marketing")}</option>
                </select>
              </label>
            </div>
            {reasons.length > 0 && (
              <p className="restriction-note">{reasons.join(" ")}</p>
            )}
          </>
        )}
        <details>
          <summary>{__pulseText("Choose included information")}</summary>
          <div className="ai-form-grid">
            {(
              [
                "identity",
                "organization",
                "interactions",
                "notes",
                "tasks",
                "opportunities",
                "values",
                "channels",
              ] as const
            ).map((key) => (
              <label className="setting-toggle" key={key}>
                {
                  {
                    identity: "Contact identity",
                    organization: "Company details",
                    interactions: "Conversations",
                    notes: "Notes",
                    tasks: "Open tasks",
                    opportunities: "Opportunities",
                    values: "Deal values",
                    channels: "Email addresses and phone numbers",
                  }[key]
                }
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) =>
                    setOptions({ ...options, [key]: e.target.checked })
                  }
                />
              </label>
            ))}
          </div>
          <label className="field">
            <span>{__pulseText("Interaction date from (UTC date)")}</span>
            <input
              type="date"
              value={options.from}
              onChange={(e) => setOptions({ ...options, from: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{__pulseText("Interaction keyword filter")}</span>
            <input
              value={options.keyword}
              onChange={(e) =>
                setOptions({ ...options, keyword: e.target.value })
              }
            />
          </label>
        </details>
        <p className="muted">
          {__pulseText("Up to 15 records (first 3 representatives, 5 open tasks and 3 deals), 1,500 characters per record; full payload preview before every request. Notes, contact channels and deal values are excluded by default. AI can be wrong; verify its cited records.")}</p>
        <div className="record-actions">
          <button
            className="button primary"
            disabled={
              busy || !id || (operation === "draft" && reasons.length > 0)
            }
            onClick={prepare}
          >
            {__pulseText("Review context")}</button>
          <button className="button ghost" onClick={clear}>
            {__pulseText("Clear temporary conversation")}</button>
          {busy && (
            <button className="button secondary" onClick={clear}>
              {__pulseText("Cancel generation")}</button>
          )}
        </div>
        {busy && <p role="status">{__pulseText("Preparing a grounded response…")}</p>}
        {error && (
          <p role="alert" className="form-error">
            {__pulseText(error)}
          </p>
        )}
      </section>
      {answer && (
        <section className="surface ai-answer">
          <Badge tone="purple">{__pulseText("AI-generated · verify before acting")}</Badge>
          <p className="muted">
            {__pulseText("Your request:") + " "}{answer.request.question || answer.request.operation}{" "}
            · {answer.request.context.label}{__pulseText(". This answer used only the approved context snapshot.")}</p>
          <h2>{__pulseText("Summary with cited records")}</h2>
          {answer.result.facts.map((f, i) => (
            <div className="ai-fact" key={i}>
              <p>{f.text}</p>
              {f.refs.map((ref) => {
                const source = answer.request.context.records.find(
                  (r) => r.id === ref,
                );
                return source ? (
                  <details key={ref}>
                    <summary>{__pulseText("Source ·") + " "}{source.kind}</summary>
                    <p>{source.text}</p>
                    <small>{source.at}</small>
                    {(() => {
                      const recordId = source.id.slice(
                        source.id.indexOf(":") + 1,
                      );
                      const i = p.interactions.find((i) => i.id === recordId);
                      const t = p.tasks.find((t) => t.id === recordId);
                      const d = p.opportunities.find((d) => d.id === recordId);
                      return i ? (
                        <button
                          className="button ghost"
                          onClick={() =>
                            setSourceEditor({ kind: "interaction", record: i })
                          }
                        >
                          {__pulseText("Open saved interaction")}</button>
                      ) : t ? (
                        <button
                          className="button ghost"
                          onClick={() =>
                            setSourceEditor({ kind: "task", record: t })
                          }
                        >
                          {__pulseText("Open saved task")}</button>
                      ) : d ? (
                        <button
                          className="button ghost"
                          onClick={() =>
                            setSourceEditor({ kind: "opportunity", record: d })
                          }
                        >
                          {__pulseText("Open saved opportunity")}</button>
                      ) : source.kind === "contact" &&
                        p.contacts.some((c) => c.id === recordId) ? (
                        <Link
                          className="button ghost"
                          to={`/network/people/${encodeURIComponent(recordId)}`}
                        >
                          {__pulseText("Open profile")}</Link>
                      ) : source.kind === "organization" &&
                        p.organizations.some((o) => o.id === recordId) ? (
                        <Link
                          className="button ghost"
                          to={`/network/companies/${encodeURIComponent(recordId)}`}
                        >
                          {__pulseText("Open company")}</Link>
                      ) : (
                        <p>
                          {__pulseText("Source may have been removed. The snapshot above was used.")}</p>
                      );
                    })()}
                  </details>
                ) : (
                  <p key={ref}>{__pulseText("Source: your approved input note")}</p>
                );
              })}
            </div>
          ))}
          {answer.result.suggestions.length > 0 && (
            <>
              <h3>{__pulseText("Suggestions, not saved instructions")}</h3>
              <ul>
                {answer.result.suggestions.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </>
          )}
          {answer.result.missing.length > 0 && (
            <>
              <h3>{__pulseText("Missing or uncertain")}</h3>
              <ul>
                {answer.result.missing.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </>
          )}
          <div className="record-actions">
            <button className="button secondary" onClick={() => copy(summary)}>
              {__pulseText("Copy summary")}</button>
            <button className="button ghost" onClick={prepare}>
              {__pulseText("Adjust context / regenerate")}</button>
            {summary && scope !== "opportunity" && (
              <button
                className="button secondary"
                disabled={savingNote || !p.settings.ai.enabled}
                onClick={() => {
                  setNoteText(summary);
                  setSavingNote(true);
                }}
              >
                {__pulseText("Review saving as note")}</button>
            )}
          </div>
          {answer.result.draft && (
            <>
              <h3>{__pulseText("Editable draft · nothing sent")}</h3>
              <label className="field">
                <span>{__pulseText("Draft subject")}</span>
                <input
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft({ ...draft, subject: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>{__pulseText("Draft message")}</span>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </label>
              <div className="record-actions">
                <button
                  className="button secondary"
                  onClick={() => copy(draft.body)}
                >
                  {__pulseText("Copy draft")}</button>
                <button
                  className="button secondary"
                  disabled={reasons.length > 0}
                  onClick={() => handoff("Email")}
                >
                  {__pulseText("Open email composer")}</button>
                <button
                  className="button secondary"
                  disabled={reasons.length > 0}
                  onClick={() => handoff("WhatsApp")}
                >
                  {__pulseText("Open WhatsApp draft")}</button>
              </div>
            </>
          )}
          <ActionProposals
            key={answer.request.requestId}
            actions={answer.result.actions}
            context={answer.request.context}
            inputNote={answer.request.text}
            scope={scope}
            id={id}
          />
        </section>
      )}
      {preview && (
        <Modal title={__pulseText("Approve context sharing")} onClose={() => setPreview(null)}>
          <p>
            {__pulseText("Send only this request to Google Gemini through PULSE's protected Worker. External provider terms and data handling apply; free-tier data may be used to improve provider products. Nothing is sent until you confirm.")}</p>
          <p>
            {preview.context.records.length} {" " + __pulseText("selected records ·")}{" "}
            {preview.context.omitted} {" " + __pulseText("additional records omitted. Each record may be clipped at 1,500 characters. Date from:")}{" "}
            {preview.context.dateFrom || __pulseText("all dates within scope")}.
          </p>
          <p>
            {__pulseText("Permission evidence, entire workspace and unselected fields are excluded. Review the exact payload:")}</p>
          <pre className="ai-preview">{JSON.stringify(preview, null, 2)}</pre>
          <div className="record-actions">
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              {__pulseText("Cancel")}</button>
            <button
              className="button primary"
              disabled={
                !online || !status.available || !p.settings.ai.enabled || busy
              }
              onClick={send}
            >
              {__pulseText("Send approved context to Gemini")}</button>
          </div>
          {!status.available && <p>{status.message}</p>}
        </Modal>
      )}
      {savingNote && (
        <Modal
          title={__pulseText("Save reviewed AI note?")}
          onClose={() => setSavingNote(false)}
        >
          <p>
            {__pulseText("This creates a labeled local note. Existing notes remain unchanged and no XP is awarded.")}</p>
          <label className="field">
            <span>{__pulseText("Reviewed note content")}</span>
            <textarea
              maxLength={10000}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </label>
          <div className="record-actions">
            <button
              className="button secondary"
              onClick={() => setSavingNote(false)}
            >
              {__pulseText("Cancel")}</button>
            <button
              className="button primary"
              disabled={saving || !noteText.trim()}
              onClick={async () => {
                setSaving(true);
                if (
                  await p.run(
                    () =>
                      saveAINote(
                        p.db,
                        scope === "contact" ? id : null,
                        scope === "organization"
                          ? id
                          : c?.organizationId || null,
                        noteText,
                      ),
                    "AI note saved for review.",
                  )
                )
                  setSavingNote(false);
                setSaving(false);
              }}
            >
              {__pulseText("Save this note")}</button>
          </div>
        </Modal>
      )}
      {sourceEditor && (
        <EditorModal
          editor={sourceEditor}
          onClose={() => setSourceEditor(null)}
        />
      )}
    </div>
  );
}
