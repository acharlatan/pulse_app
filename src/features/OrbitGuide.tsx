import { ArrowRight, Building2, Users, BriefcaseBusiness } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar } from "../components/ui";
import type { OrbitNode, deriveOrbit } from "../services/orbit";
export function OrbitGuide({
  graph,
  scoped,
  search,
  onCompany,
  onSelect,
  selected,
}: {
  graph: ReturnType<typeof deriveOrbit>;
  scoped: boolean;
  search: string;
  onCompany: (id: string) => void;
  onSelect: (n: OrbitNode) => void;
  selected: string;
}) {
  const p = usePulse();
  return (
    <div className="orbit-guide">
      {!scoped && !search && graph.nodes.some((n) => n.kind === "company") ? (
        <>
          <header className="orbit-guide-intro">
            <span className="eyebrow">START WITH SOMETHING FAMILIAR</span>
            <h2>Choose a company. Follow the thread.</h2>
            <p>
              Explore its saved people and opportunities first. Use Map when you
              want to see the connections spatially.
            </p>
          </header>
          <div className="orbit-company-index">
            {graph.nodes
              .filter((n) => n.kind === "company")
              .map((n) => (
                <button key={n.id} onClick={() => onCompany(n.recordId)}>
                  <Avatar
                    name={n.label}
                    mediaId={n.mediaId}
                    company
                    size="large"
                  />
                  <h3>{n.label}</h3>
                  <span>
                    {
                      p.contacts.filter((c) => c.organizationId === n.recordId)
                        .length
                    }{" "}
                    people ·{" "}
                    {
                      p.opportunities.filter(
                        (o) => o.organizationId === n.recordId,
                      ).length
                    }{" "}
                    opportunities
                  </span>
                  <span className="orbit-explore-link">
                    Explore connections <ArrowRight size={17} />
                  </span>
                </button>
              ))}
          </div>
          {!graph.nodes.some((n) => n.kind === "company") && (
            <p>
              No companies in this view. Use List to explore people and
              independent opportunities.
            </p>
          )}
        </>
      ) : (
        <>
          <header className="orbit-guide-intro">
            <p className="eyebrow">SAVED ASSOCIATIONS, MADE READABLE</p>
            <h2>
              {search
                ? "Find the record. See its context."
                : "One starting point. Clear connections."}
            </h2>
            <p>
              People belong to a saved company; opportunities have saved company
              and representative links. These do not imply that people know one
              another.
            </p>
          </header>
          <div className="orbit-guide-groups">
            {(
              [
                ["company", "Companies", Building2],
                ["person", "People", Users],
                ["opportunity", "Opportunities", BriefcaseBusiness],
              ] as const
            ).map(([kind, label, Icon]) => (
              <section key={kind}>
                <h3>
                  <Icon size={18} />
                  {label}
                  <span>
                    {graph.nodes.filter((n) => n.kind === kind).length}
                  </span>
                </h3>
                {graph.nodes
                  .filter((n) => n.kind === kind)
                  .map((n) => (
                    <button
                      className={`orbit-guide-record ${selected === n.id ? "selected" : ""}`}
                      key={n.id}
                      aria-pressed={selected === n.id}
                      onClick={() => onSelect(n)}
                    >
                      <Avatar
                        name={n.label}
                        mediaId={n.mediaId}
                        company={kind === "company"}
                      />
                      <span>
                        <strong>{n.label}</strong>
                        <small>
                          {kind === "person"
                            ? "Saved person"
                            : kind === "company"
                              ? "Saved company"
                              : "Saved opportunity"}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                {!graph.nodes.some((n) => n.kind === kind) && (
                  <p className="muted">
                    No matching {label.toLowerCase()} in this view.
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
      <details className="orbit-reading-key">
        <summary>What do these connections mean?</summary>
        <dl>
          <div>
            <dt>Works at</dt>
            <dd>A person’s currently saved company.</dd>
          </div>
          <div>
            <dt>Company opportunity</dt>
            <dd>The company explicitly selected on an opportunity.</dd>
          </div>
          <div>
            <dt>Opportunity representative</dt>
            <dd>
              A person explicitly linked to an opportunity. Their current
              employer may have changed.
            </dd>
          </div>
        </dl>
        <p>
          Orbit is a view of your records. It does not discover external
          relationships or infer personal connections.
        </p>
      </details>
    </div>
  );
}
