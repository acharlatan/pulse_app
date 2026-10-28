import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { EditorModal, type Editor } from "./forms";
export function GettingStarted({ always = false }: { always?: boolean }) {
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
    <section className="surface getting-started" aria-label="Getting started">
      <p className="eyebrow">YOUR WORKSPACE, YOUR PACE</p>
      <h2>Your next connection starts here.</h2>
      <p>
        Keep people, conversations and commitments together. Start anywhere;
        these steps are optional.
      </p>
      <p className="muted">
        Records stay in this browser. There is no automatic cloud backup or
        cross-device sync. Export important work and keep the file somewhere you
        trust.
      </p>
      {(always || next) && (
        <div className="first-week-guide">
          <p className="eyebrow">YOUR FIRST WEEK · START SMALL</p>
          <h3>Make PULSE useful for your work.</h3>
          <p>
            Choose an intention, bring in a few people, and save one next step.
            This guide is optional and you can change your intention anytime.
          </p>
          <label className="field">
            <span>What would you like to focus on?</span>
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
              <option value="">Choose an intention (optional)</option>
              <option value="clients">Manage clients</option>
              <option value="partnerships">Build partnerships</option>
              <option value="opportunities">Move opportunities forward</option>
            </select>
          </label>
          {intention && (
            <p className="first-week-intention">
              {intention === "clients"
                ? "Keep client conversations and commitments together."
                : intention === "partnerships"
                  ? "Make space for thoughtful partnership follow-ups."
                  : "Keep opportunities and their next steps visible."}
            </p>
          )}
          <ol>
            {guidedSteps.map((step) => (
              <li key={step.label}>
                <span
                  aria-label={step.done ? "Completed" : "Not yet completed"}
                >
                  {step.done ? "✓" : "○"}
                </span>
                <strong>{step.label}</strong>
              </li>
            ))}
          </ol>
          {next ? (
            <div className="first-week-next">
              <strong>Next: {next.label}</strong>
              <p>{next.description}</p>
              {next.kind ? (
                <button
                  className="button secondary"
                  onClick={() => setEditor({ kind: next.kind })}
                >
                  {next.action}
                </button>
              ) : (
                <Link className="button secondary" to={next.to!}>
                  {next.action}
                </Link>
              )}{" "}
              {next.label === "Build your starting network" && (
                <button
                  className="button ghost"
                  onClick={() => setEditor({ kind: "contact" })}
                >
                  Add one person
                </button>
              )}
            </div>
          ) : (
            <div className="first-week-next">
              <strong>Your first foundations are in place.</strong>
              <p>
                Return to Daily Pulse for your next steps, or hide this guide
                whenever you’re ready.
              </p>
              <Link className="button secondary" to="/">
                Open Daily Pulse
              </Link>
            </div>
          )}
        </div>
      )}
      <p className="getting-started-progress">
        {steps.filter((step) => step.done).length} of {steps.length} foundations
        in place · optional, at your pace
      </p>
      {!always && steps.find((step) => !step.done) && (
        <div className="getting-started-next">
          <span className="eyebrow">YOUR NEXT FOUNDATION</span>
          {(() => {
            const step = steps.find((step) => !step.done)!;
            return step.kind ? (
              <button
                className="button primary"
                onClick={() => setEditor({ kind: step.kind })}
              >
                {step.label}
              </button>
            ) : (
              <Link className="button primary" to={step.to!}>
                {step.label}
              </Link>
            );
          })()}
        </div>
      )}
      {always ? (
        <ul>
          {steps.map((step) => (
            <li key={step.label}>
              <span aria-label={step.done ? "Completed" : "Not yet completed"}>
                {step.done ? "✓" : "○"}
              </span>{" "}
              {step.kind ? (
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: step.kind })}
                >
                  {step.label}
                </button>
              ) : (
                <Link className="text-link" to={step.to!}>
                  {step.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <details className="getting-started-steps">
          <summary>Explore all setup steps</summary>{" "}
          <ul>
            {steps.map((step) => (
              <li key={step.label}>
                <span
                  aria-label={step.done ? "Completed" : "Not yet completed"}
                >
                  {step.done ? "✓" : "○"}
                </span>{" "}
                {step.kind ? (
                  <button
                    className="text-link"
                    onClick={() => setEditor({ kind: step.kind })}
                  >
                    {step.label}
                  </button>
                ) : (
                  <Link className="text-link" to={step.to!}>
                    {step.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="field-help">
        Steps reflect current saved records. A requested download does not prove
        the file was retained. These steps earn no XP.
      </p>
      <div className="profile-actions">
        <Link className="button primary" to="/import">
          Import contacts from CSV
        </Link>
        <Link className="button secondary" to="/help">
          How PULSE works
        </Link>
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
            ? "Show guide on Home"
            : "Hide guide on Home"}
        </button>
      </div>
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </section>
  );
}
