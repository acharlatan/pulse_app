import { useInterfaceText } from "../i18n/useInterfaceText";
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { EditorModal, type Editor } from "./forms";
export function GettingStarted({ always = false }: { always?: boolean }) {
  const __pulseText = useInterfaceText();
  const p = usePulse();
  const [editor, setEditor] = useState<Editor | null>(null);
  if (p.workspace !== "personal" || (!always && p.settings.onboarding.hidden))
    return null;
  const steps = [
    {
      label: "Add your first person",
      done: p.contacts.length > 0,
      kind: "contact" as const,
    },
    {
      label: "Create a company",
      done: p.organizations.length > 0,
      kind: "company" as const,
    },
    {
      label: "Create your first opportunity",
      done: p.opportunities.length > 0,
      kind: "opportunity" as const,
    },
    {
      label: "Record a conversation or note",
      done: p.interactions.length > 0,
      to: "/network",
    },
    {
      label: "Schedule a follow-up",
      done: p.tasks.length > 0,
      kind: "task" as const,
    },
    {
      label: "Request a workspace backup",
      done: !!p.settings.onboarding.exportInitiatedAt,
      to: "/settings?section=data",
    },
  ];
  const intention = p.settings.onboarding.intention;
  const guidedSteps = [
    {
      label: "Build your starting network",
      done: p.contacts.length > 0,
      description:
        "Add someone you already know or import contacts to bring your relationships into PULSE.",
      to: "/import",
      action: "Import contacts",
    },
    {
      label: "Give a next step a date",
      done: p.tasks.length > 0,
      description:
        "Save a follow-up so PULSE can help you remember a real commitment.",
      kind: "task" as const,
      action: "Schedule a follow-up",
    },
    {
      label: "Choose your first priority",
      done: p.focusItems.length > 0,
      description:
        "Review the evidence and choose what deserves your attention. You remain in control.",
      to: "/analytics",
      action: "Explore your focus",
    },
  ];
  const next = guidedSteps.find((step) => !step.done);
  return (
    <section className="surface getting-started" aria-label={__pulseText("Getting started")}>
      <p className="eyebrow">{__pulseText("YOUR WORKSPACE, YOUR PACE")}</p>
      <h2>{__pulseText("Your next connection starts here.")}</h2>
      <p>
        {__pulseText("Keep people, conversations and commitments together. Start anywhere; these steps are optional.")}</p>
      <p className="muted">
        {__pulseText("Records stay in this browser. There is no automatic cloud backup or cross-device sync. Export important work and keep the file somewhere you trust.")}</p>
      {(always || next) && (
        <div className="first-week-guide">
          <p className="eyebrow">{__pulseText("YOUR FIRST WEEK · START SMALL")}</p>
          <h3>{__pulseText("Make PULSE useful for your work.")}</h3>
          <p>
            {__pulseText("Choose an intention, bring in a few people, and save one next step. This guide is optional and you can change your intention anytime.")}</p>
          <label className="field">
            <span>{__pulseText("What would you like to focus on?")}</span>
            <select
              value={intention}
              onChange={(e) =>
                void p.run(
                  () =>
                    p.setSettings({
                      onboarding: {
                        ...p.settings.onboarding,
                        intention: e.target.value as typeof intention,
                      },
                    }),
                  "Intention saved",
                )
              }
            >
              <option value="">{__pulseText("Choose an intention (optional)")}</option>
              <option value="clients">{__pulseText("Manage clients")}</option>
              <option value="partnerships">{__pulseText("Build partnerships")}</option>
              <option value="opportunities">{__pulseText("Move opportunities forward")}</option>
            </select>
          </label>
          {intention && (
            <p className="first-week-intention">
              {intention === "clients"
                ? __pulseText("Keep client conversations and commitments together.")
                : intention === "partnerships"
                  ? __pulseText("Make space for thoughtful partnership follow-ups.")
                  : __pulseText("Keep opportunities and their next steps visible.")}
            </p>
          )}
          <ol>
            {guidedSteps.map((step) => (
              <li key={__pulseText(step.label)}>
                <span
                  aria-label={step.done ? __pulseText("Completed") : __pulseText("Not yet completed")}
                >
                  {step.done ? "✓" : "○"}
                </span>
                <strong>{__pulseText(step.label)}</strong>
              </li>
            ))}
          </ol>
          {next ? (
            <div className="first-week-next">
              <strong>{__pulseText("Next:") + " "}{__pulseText(next.label)}</strong>
              <p>{__pulseText(next.description)}</p>
              {next.kind ? (
                <button
                  className="button secondary"
                  onClick={() => setEditor({ kind: next.kind })}
                >
                  {__pulseText(next.action)}
                </button>
              ) : (
                <Link className="button secondary" to={next.to!}>
                  {__pulseText(next.action)}
                </Link>
              )}{" "}
              {next.label === "Build your starting network" && (
                <button
                  className="button ghost"
                  onClick={() => setEditor({ kind: "contact" })}
                >
                  {__pulseText("Add one person")}</button>
              )}
            </div>
          ) : (
            <div className="first-week-next">
              <strong>{__pulseText("Your first foundations are in place.")}</strong>
              <p>
                {__pulseText("Return to Daily Pulse for your next steps, or hide this guide whenever you’re ready.")}</p>
              <Link className="button secondary" to="/">
                {__pulseText("Open Daily Pulse")}</Link>
            </div>
          )}
        </div>
      )}
      <p className="getting-started-progress">
        {steps.filter((step) => step.done).length} {" " + __pulseText("of") + " "}{steps.length} {" " + __pulseText("foundations in place · optional, at your pace")}</p>
      {!always && steps.find((step) => !step.done) && (
        <div className="getting-started-next">
          <span className="eyebrow">{__pulseText("YOUR NEXT FOUNDATION")}</span>
          {(() => {
            const step = steps.find((step) => !step.done)!;
            return step.kind ? (
              <button
                className="button primary"
                onClick={() => setEditor({ kind: step.kind })}
              >
                {__pulseText(step.label)}
              </button>
            ) : (
              <Link className="button primary" to={step.to!}>
                {__pulseText(step.label)}
              </Link>
            );
          })()}
        </div>
      )}
      {always ? (
        <ul>
          {steps.map((step) => (
            <li key={__pulseText(step.label)}>
              <span aria-label={step.done ? __pulseText("Completed") : __pulseText("Not yet completed")}>
                {step.done ? "✓" : "○"}
              </span>{" "}
              {step.kind ? (
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: step.kind })}
                >
                  {__pulseText(step.label)}
                </button>
              ) : (
                <Link className="text-link" to={step.to!}>
                  {__pulseText(step.label)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <details className="getting-started-steps">
          <summary>{__pulseText("Explore all setup steps")}</summary>{" "}
          <ul>
            {steps.map((step) => (
              <li key={__pulseText(step.label)}>
                <span
                  aria-label={step.done ? __pulseText("Completed") : __pulseText("Not yet completed")}
                >
                  {step.done ? "✓" : "○"}
                </span>{" "}
                {step.kind ? (
                  <button
                    className="text-link"
                    onClick={() => setEditor({ kind: step.kind })}
                  >
                    {__pulseText(step.label)}
                  </button>
                ) : (
                  <Link className="text-link" to={step.to!}>
                    {__pulseText(step.label)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="field-help">
        {__pulseText("Steps reflect current saved records. A requested download does not prove the file was retained. These steps earn no XP.")}</p>
      <div className="profile-actions">
        <Link className="button primary" to="/import">
          {__pulseText("Import contacts from CSV")}</Link>
        <Link className="button secondary" to="/help">
          {__pulseText("How PULSE works")}</Link>
        <button
          className="button ghost"
          onClick={() =>
            p.run(
              () =>
                p.setSettings({
                  onboarding: {
                    ...p.settings.onboarding,
                    hidden: !p.settings.onboarding.hidden,
                  },
                }),
              "Guide preference saved",
            )
          }
        >
          {p.settings.onboarding.hidden
            ? __pulseText("Show guide on Home")
            : __pulseText("Hide guide on Home")}
        </button>
      </div>
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </section>
  );
}
