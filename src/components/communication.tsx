import { useState } from "react";
import { usePulse } from "../app/context";
import { Modal } from "./ui";
import { outreachReasons } from "../ai/context";
import { emailLink, whatsappLink } from "../services/handoffs";
import type { Contact } from "../data/models";
export function CommunicationHandoff({ contact }: { contact: Contact }) {
  const p = usePulse(),
    [open, setOpen] = useState(false),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [error, setError] = useState("");
  const reasons = outreachReasons(
    contact,
    p.permissions,
    p.restrictions,
    "General",
    "Relationship",
  );
  function handoff(channel: "Email" | "WhatsApp") {
    try {
      const blocked = outreachReasons(
        contact,
        p.permissions,
        p.restrictions,
        channel,
        "Relationship",
      );
      if (blocked.length) throw Error(blocked.join(" "));
      const url =
        channel === "Email"
          ? emailLink(contact.emails[0] || "", subject, body)
          : whatsappLink(contact.phones[0] || "", body);
      if (channel === "Email") location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      p.notify("Opened a draft for review. Nothing was marked sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Handoff unavailable.");
    }
  }
  return (
    <>
      <button
        className="button secondary"
        disabled={reasons.length > 0}
        onClick={() => setOpen(true)}
      >
        Message handoff
      </button>
      {open && (
        <Modal
          title="Review a relationship message"
          onClose={() => setOpen(false)}
        >
          <p>
            Local composer handoff only. No AI, account connection or automatic
            sending. Promotional communication requires separate marketing
            permission and is not supported by this composer.
          </p>
          <label className="field">
            <span>Message subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Message body</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <p className="muted">
            Email: {contact.emails[0] || "not recorded"} · WhatsApp:{" "}
            {contact.phones[0] || "not recorded"}. A valid international number
            does not prove a WhatsApp account exists.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="record-actions">
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(body);
                  p.notify("Copied. Nothing sent.");
                } catch {
                  setError("Select and copy the text manually.");
                }
              }}
            >
              Copy message
            </button>
            <button className="button primary" onClick={() => handoff("Email")}>
              Open email composer
            </button>
            <button
              className="button secondary"
              onClick={() => handoff("WhatsApp")}
            >
              Open WhatsApp draft
            </button>
          </div>
          <button className="button ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </Modal>
      )}
    </>
  );
}
