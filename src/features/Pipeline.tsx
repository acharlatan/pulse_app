import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Badge, Empty, useFormat } from "../components/ui";
import { PipelineOpportunity } from "./PipelineOpportunity";
import { EditorModal, type Editor } from "../components/forms";
import { moveOpportunity } from "../data/repository";
export function Pipeline() {
  const { money } = useFormat();
  const p = usePulse(),
    [editor, setEditor] = useState<Editor | null>(null),
    [filter, setFilter] = useState("All"),
    [selectedId, setSelectedId] = useState(""),
    [limit, setLimit] = useState(30),
    [showEmpty, setShowEmpty] = useState(false);
  const selected =
    p.pipelines.find(
      (x) => x.id === (selectedId || p.settings.focus.lastPipelineId),
    ) ||
    p.pipelines.find((x) => x.isDefault) ||
    p.pipelines[0];
  const rows = p.opportunities.filter((o) => o.pipelineId === selected?.id),
    stages = p.pipelineStages.filter((s) => s.pipelineId === selected?.id);
  const active = stages.filter((s) =>
    filter === "All"
      ? showEmpty || rows.some((o) => o.stageId === s.id)
      : s.id === filter,
  );
  const totals = new Map<string, number>();
  for (const o of rows)
    if (o.value !== null) {
      const key = `${o.status} · ${o.currency}`;
      totals.set(key, (totals.get(key) || 0) + o.value);
    }
  return (
    <div className="page pipeline-page">
      <header className="page-heading editorial-masthead work-masthead">
        <div>
          <p className="eyebrow">FROM POSSIBILITY TO PARTNERSHIP</p>
          <h1>
            Pipeline<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            See what’s moving. Make the next move count.
          </p>
        </div>
        <button
          className="button primary"
          disabled={!selected || selected.archived}
          onClick={() =>
            setEditor({ kind: "opportunity", pipelineId: selected?.id })
          }
        >
          <Plus size={18} />
          New opportunity
        </button>
      </header>
      <div className="directory-toolbar">
        <label className="field">
          <span>Pipeline</span>
          <select
            value={selected?.id || ""}
            onChange={(e) => {
              setSelectedId(e.target.value);
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
        <div className="pipeline-toolbar-links">
          <button
            className="button ghost"
            aria-pressed={showEmpty}
            onClick={() => setShowEmpty(!showEmpty)}
          >
            Empty stages
          </button>
          <Link className="button ghost" to="/customize">
            Manage Pipelines
          </Link>
          <Link className="button ghost" to="/focus">
            My Focus <ArrowRight size={16} />
          </Link>
        </div>
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
        className="pipeline-value-strip"
        aria-label="Pipeline value overview"
      >
        <div className="pipeline-open-label">
          <span className="eyebrow">IN PLAY</span>
          <strong>
            {rows
              .filter((o) => o.status === "open")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span>open opportunities</span>
        </div>
        <div className="pipeline-money">
          <p className="eyebrow">OPEN VALUE · BY CURRENCY</p>
          <div>
            {[...totals]
              .filter(([key]) => key.startsWith("open ·"))
              .map(([key, value]) => (
                <strong key={key}>
                  {money(value, key.split(" · ")[1])}
                  <small>{key.split(" · ")[1]}</small>
                </strong>
              ))}
            {!rows.some((o) => o.status === "open" && o.value !== null) && (
              <strong className="pipeline-no-value">
                No open value recorded
              </strong>
            )}
          </div>
          <span>
            {rows.filter((o) => o.status === "open" && o.value === null).length}{" "}
            open without a value · Saved values, not a forecast
          </span>
        </div>
        <details
          className="pipeline-totals"
          aria-label="Pipeline totals by currency"
        >
          <summary>Outcomes by currency</summary>
          <div>
            {[...totals].map(([key, value]) => (
              <Badge key={key}>
                {key} · {money(value, key.split(" · ")[1])}
              </Badge>
            ))}
            {!totals.size && <p>No valued opportunities yet.</p>}
          </div>
        </details>
      </section>
      <h2 className="pipeline-section-title">
        {selected?.name || "Your pipeline"}
      </h2>
      <nav className="pipeline-stage-map" aria-label="Pipeline stage overview">
        {stages.map((stage) => (
          <button
            key={stage.id}
            aria-pressed={filter === stage.id}
            onClick={() => {
              setFilter(filter === stage.id ? "All" : stage.id);
              setLimit(30);
            }}
          >
            <span>{stage.name}</span>
            <strong>{rows.filter((o) => o.stageId === stage.id).length}</strong>
            <span className="stage-volume-track" aria-hidden="true">
              <i
                style={{
                  width: `${rows.length ? (rows.filter((o) => o.stageId === stage.id).length / rows.length) * 100 : 0}%`,
                  background: stage.color,
                }}
              />
            </span>
          </button>
        ))}
      </nav>
      <div
        className="pipeline-grid"
        role="region"
        aria-label="Opportunity board"
        tabIndex={0}
      >
        {active.map((stage) => {
          const deals = rows.filter((o) => o.stageId === stage.id);
          return (
            <section
              className="pipeline-column"
              key={stage.id}
              data-empty={!deals.length}
              style={{ borderTop: `3px solid ${stage.color}` }}
            >
              <div className="pipeline-title">
                <div>
                  <span className="stage-sequence">
                    {(stages.indexOf(stage) + 1).toString().padStart(2, "0")} /{" "}
                    {stage.category}
                  </span>
                  <h3>{stage.name}</h3>
                </div>
                <Badge>{deals.length}</Badge>
              </div>
              <div className="stage-value-label">
                {[
                  ...new Set(
                    deals
                      .filter((o) => o.value !== null)
                      .map((o) => o.currency),
                  ),
                ].map((currency) => (
                  <span key={currency}>
                    {money(
                      deals
                        .filter((o) => o.currency === currency)
                        .reduce((sum, o) => sum + (o.value || 0), 0),
                      currency,
                    )}
                  </span>
                ))}
              </div>
              {deals.slice(0, limit).map((o) => (
                <div key={o.id} className="pipeline-deal">
                  <PipelineOpportunity opportunity={o} onEdit={setEditor} />
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
                <div className="stage-empty">
                  <span aria-hidden="true">↗</span>
                  <p>Room for your next move.</p>
                  <small>
                    Move an opportunity here using its stage control.
                  </small>
                </div>
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
