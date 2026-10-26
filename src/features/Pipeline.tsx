import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Badge, Empty } from "../components/ui";
import { OpportunityCard } from "../components/relationship";
import { EditorModal, type Editor } from "../components/forms";
import { moveOpportunity } from "../data/repository";
export function Pipeline() {
  const p = usePulse(),
    [editor, setEditor] = useState<Editor | null>(null),
    [filter, setFilter] = useState("All"),
    [limit, setLimit] = useState(30);
  const selected =
    p.pipelines.find((x) => x.id === p.settings.focus.lastPipelineId) ||
    p.pipelines.find((x) => x.isDefault) ||
    p.pipelines[0];
  const rows = p.opportunities.filter((o) => o.pipelineId === selected?.id),
    stages = p.pipelineStages.filter((s) => s.pipelineId === selected?.id);
  const active = stages.filter((s) => filter === "All" || s.id === filter);
  const totals = new Map<string, number>();
  for (const o of rows)
    if (o.value !== null) {
      const key = `${o.status} · ${o.currency}`;
      totals.set(key, (totals.get(key) || 0) + o.value);
    }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">POSSIBILITY, WITH DIRECTION</p>
          <h1>
            Room to grow<span className="accent">.</span>
          </h1>
          <p className="subtitle">Every opportunity has a next chapter.</p>
        </div>
        <button
          className="button primary"
          disabled={selected?.archived}
          onClick={() => setEditor({ kind: "opportunity" })}
        >
          New opportunity
        </button>
      </div>
      <div className="review-toolbar">
        <Link className="button secondary" to="/customize">
          Manage Pipelines
        </Link>
        <Link className="button ghost" to="/focus">
          My Focus
        </Link>
      </div>
      <div className="directory-toolbar">
        <label className="field">
          <span>Pipeline</span>
          <select
            value={selected?.id || ""}
            onChange={(e) => {
              setFilter("All");
              setLimit(30);
              void p.run(() =>
                p.setSettings({
                  focus: {
                    ...p.settings.focus,
                    lastPipelineId: e.target.value,
                  },
                }),
              );
            }}
          >
            {p.pipelines.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {x.archived ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </label>
        <Badge tone="purple">{rows.length} opportunities</Badge>
        <label className="field">
          <span>View stage</span>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setLimit(30);
            }}
          >
            <option value="All">All</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section
        className="pipeline-totals"
        aria-label="Pipeline totals by currency"
      >
        {[...totals].map(([key, value]) => (
          <Badge key={key}>
            {key} ·{" "}
            {value.toLocaleString(p.settings.locale, {
              maximumFractionDigits: 2,
            })}
          </Badge>
        ))}
      </section>
      <div className="pipeline-grid">
        {active.map((stage) => {
          const deals = rows.filter((o) => o.stageId === stage.id);
          return (
            <section
              className="pipeline-column"
              key={stage.id}
              style={{ borderTop: `3px solid ${stage.color}` }}
            >
              <div className="pipeline-title">
                <span>{stage.name}</span>
                <Badge>{deals.length}</Badge>
              </div>
              {deals.slice(0, limit).map((o) => (
                <div key={o.id} className="pipeline-deal">
                  <OpportunityCard opportunity={o} onEdit={setEditor} />
                  <label className="field">
                    <span>Move to stage / reopen</span>
                    <select
                      value={o.stageId}
                      onChange={(e) =>
                        void p.run(
                          () => moveOpportunity(p.db, o.id, e.target.value),
                          "Opportunity updated",
                        )
                      }
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
              {deals.length > limit && (
                <button
                  className="button secondary"
                  onClick={() => setLimit(limit + 30)}
                >
                  Show more opportunities
                </button>
              )}
              {!deals.length && (
                <p className="muted">Room for the next opportunity.</p>
              )}
            </section>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title="Make room for possibility"
          body="No opportunities in this pipeline. Create one to get started."
        />
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
