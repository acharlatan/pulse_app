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
