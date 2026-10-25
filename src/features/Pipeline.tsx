import { useState } from "react";
import { Plus } from "lucide-react";
import { usePulse } from "../app/context";
import { Badge, Empty } from "../components/ui";
import { OpportunityCard } from "../components/relationship";
import { EditorModal, type Editor } from "../components/forms";
import { stages } from "../data/models";
import { moveOpportunity } from "../data/repository";
export function Pipeline() {
  const p = usePulse();
  const [editor, setEditor] = useState<Editor | null>(null),
    [filter, setFilter] = useState("All");
  const active = stages.filter(
    (s) =>
      (filter === "All" || s === filter) &&
      p.opportunities.some((o) => o.stageId === s),
  );
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
          onClick={() => setEditor({ kind: "opportunity" })}
        >
          <Plus size={18} />
          New opportunity
        </button>
      </div>
      <div className="directory-toolbar">
        <Badge tone="purple">
          {p.settings.pipeline.name} · {p.opportunities.length} opportunities
        </Badge>
        <label className="field">
          <span>View stage</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="pipeline-grid">
        {active.map((stage) => (
          <section className="pipeline-column" key={stage}>
            <div className="pipeline-title">
              <span>{stage}</span>
              <Badge>
                {p.opportunities.filter((o) => o.stageId === stage).length}
              </Badge>
            </div>
            {p.opportunities
              .filter((o) => o.stageId === stage)
              .map((o) => (
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
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
          </section>
        ))}
      </div>
      {!active.length && (
        <Empty
          title="Make room for possibility"
          body="No opportunities in this view. Create one or choose another stage."
          action={
            <button
              className="button primary"
              onClick={() => setEditor({ kind: "opportunity" })}
            >
              Create opportunity
            </button>
          }
        />
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
