import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, Workflow } from "lucide-react";
import { usePulse } from "../app/context";
import { Badge, Empty, useFormat } from "../components/ui";
import { stages } from "../data/models";
import { moveOpportunity } from "../data/repository";
export function Pipeline() {
  const p = usePulse();
  const { money } = useFormat();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">POSSIBILITY, WITH DIRECTION</p>
          <h1>
            Room to grow<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            A clear view of the opportunities you're moving forward.
          </p>
        </div>
        <Badge tone="purple">
          <Workflow size={14} />
          {p.settings.pipeline.name}
        </Badge>
      </div>
      <p className="inline-notice">
        Foundation preview · Stage changes are saved. Creating opportunities and
        custom pipelines are planned for a later iteration.
      </p>
      <div className="pipeline-grid">
        {stages
          .filter((s) => p.opportunities.some((o) => o.stageId === s))
          .map((stage) => (
            <section className="pipeline-column" key={stage}>
              <div className="pipeline-title">
                <span>
                  <i />
                  {stage}
                </span>
                <Badge>
                  {p.opportunities.filter((o) => o.stageId === stage).length}
                </Badge>
              </div>
              {p.opportunities
                .filter((o) => o.stageId === stage)
                .map((o) => {
                  const org = p.organizations.find(
                    (org) => org.id === o.organizationId,
                  );
                  return (
                    <article className="deal-card" key={o.id}>
                      <span className="eyebrow">
                        {o.status === "open"
                          ? "IN MOTION"
                          : o.status.toUpperCase()}
                      </span>
                      <h3>{o.title}</h3>
                      <p className="company-line">
                        <Building2 size={15} />
                        {org ? (
                          <Link to={`/network/companies/${org.id}`}>
                            {org.name}
                          </Link>
                        ) : (
                          "Independent opportunity"
                        )}
                      </p>
                      <strong className="deal-value">
                        {o.value === null
                          ? "Value not set"
                          : money(o.value, o.currency)}
                      </strong>
                      <label className="field">
                        <span>Move to stage</span>
                        <select
                          value={o.stageId}
                          onChange={(e) =>
                            p.run(
                              () => moveOpportunity(p.db, o.id, e.target.value),
                              "Opportunity updated",
                            )
                          }
                        >
                          {stages.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </article>
                  );
                })}
            </section>
          ))}
      </div>
      {!p.opportunities.length && (
        <Empty
          title="A little room for future possibilities"
          body="Opportunity creation is coming in a future iteration. Demo mode includes editable sample stages so you can explore the foundation."
        />
      )}
    </div>
  );
}
