import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePulse } from "../app/context";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { deriveOrbit, type OrbitNode } from "../services/orbit";
import { EditorModal, type Editor } from "../components/forms";
import {
  lastInteraction,
  effectiveAvailability,
} from "../services/recommendations";
import { FocusButton } from "../components/focus";
import { OrbitGuide } from "./OrbitGuide";
export function Orbit() {
  const p = usePulse(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [priority, setPriority] = useState(""),
    [view, setView] = useState(() =>
      matchMedia("(max-width:600px)").matches ? "list" : "guide",
    ),
    [selected, setSelected] = useState(""),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [editor, setEditor] = useState<Editor | null>(null),
    viewport = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      start: { x: number; y: number };
    } | null>(null);
  const { date } = useFormat();
  const graph = useMemo(
    () =>
      deriveOrbit(p, {
        search,
        type,
        priority,
        company: params.get("company") || "",
        person: params.get("person") || "",
        limit:
          view === "map"
            ? matchMedia("(max-width:600px)").matches
              ? 18
              : 24
            : 60,
      }),
    [p, search, type, priority, params, view],
  );
  const node = graph.nodes.find((n) => n.id === selected),
    byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const person =
      node?.kind === "person"
        ? p.contacts.find((c) => c.id === node.recordId)
        : undefined,
    company =
      node?.kind === "company"
        ? p.organizations.find((c) => c.id === node.recordId)
        : undefined,
    deal =
      node?.kind === "opportunity"
        ? p.opportunities.find((c) => c.id === node.recordId)
        : undefined;
  const related = p.opportunities.filter((o) =>
    person
      ? o.contactIds.includes(person.id)
      : company
        ? o.organizationId === company.id
        : o.id === deal?.id,
  );
  const tasks = p.tasks.filter(
    (t) =>
      !t.completedAt &&
      (person
        ? t.contactId === person.id
        : company
          ? t.organizationId === company.id
          : deal
            ? deal.contactIds.includes(t.contactId || "") ||
              (!!deal.organizationId &&
                t.organizationId === deal.organizationId)
            : false),
  );
  function fit() {
    setZoom(
      Math.min(
        1,
        (viewport.current?.clientWidth || 1000) / 1000,
        (viewport.current?.clientHeight || 760) / 760,
      ),
    );
    setPan({ x: 0, y: 0 });
  }
  useEffect(() => {
    if (view !== "map" || !viewport.current) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [view, graph.nodes.length]);
  function select(n: OrbitNode) {
    setSelected(n.id);
  }
  return (
    <div className="page orbit-page">
      <div className="page-heading editorial-masthead insight-masthead">
        <div>
          <p className="eyebrow">YOUR CONNECTIONS, IN CONTEXT</p>
          <h1>
            Relationship Orbit<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            Start with a familiar record. Understand what connects it.
          </p>
        </div>
        <Link className="button secondary" to="/network">
          Back to Network
        </Link>
      </div>
      <div className="orbit-filters surface">
        <label className="search-field">
          <span className="sr-only">Search Orbit</span>
          <input
            aria-label="Search Orbit"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected("");
            }}
            placeholder="Find a person, company or opportunity"
          />
        </label>
        <label className="field">
          <span>Show</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setSelected("");
            }}
          >
            <option value="">All record types</option>
            <option value="person">People</option>
            <option value="company">Companies</option>
            <option value="opportunity">Opportunities</option>
          </select>
        </label>
        <label className="field">
          <span>Contact priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {["VIP", "High", "Normal", "Low"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <div className="tabs" aria-label="Orbit presentation">
          <button
            aria-pressed={view === "guide"}
            onClick={() => setView("guide")}
          >
            Explore
          </button>
          <button aria-pressed={view === "map"} onClick={() => setView("map")}>
            Map
          </button>
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>
      {params.size > 0 && (
        <p className="orbit-scope">
          <strong>
            {params.has("company")
              ? p.organizations.find((o) => o.id === params.get("company"))
                  ?.name || "Company"
              : p.contacts.find((c) => c.id === params.get("person"))?.name ||
                "Person"}
          </strong>{" "}
          · Focused {params.has("company") ? "company" : "person"} view{" "}
          <button
            className="button ghost"
            onClick={() => {
              setParams({});
              setSelected("");
            }}
          >
            Show my network
          </button>
        </p>
      )}
      <div className="orbit-layout">
        <section className="orbit-map-panel">
          <div className="orbit-toolbar">
            <strong>
              {graph.nodes.length} of {graph.total} matching records
            </strong>
            <div className="form-actions">
              {view === "map" && (
                <>
                  <button
                    className="icon-button"
                    aria-label="Zoom out"
                    onClick={() => setZoom(Math.max(0.35, zoom - 0.15))}
                  >
                    −
                  </button>
                  <span>{Math.round(zoom * 100)}%</span>
                  <button
                    className="icon-button"
                    aria-label="Zoom in"
                    onClick={() => setZoom(Math.min(2, zoom + 0.15))}
                  >
                    +
                  </button>
                  <button className="button ghost" onClick={fit}>
                    Fit network
                  </button>
                </>
              )}
              <button
                className="button ghost"
                onClick={() => {
                  fit();
                  setSelected("");
                  setSearch("");
                  setType("");
                  setPriority("");
                  setParams({});
                }}
              >
                Reset view
              </button>
              {node && view === "map" && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 500 - node.x, y: 380 - node.y });
                  }}
                >
                  Center selected
                </button>
              )}
            </div>
          </div>
          {graph.limited && (
            <p className="orbit-limit">
              Showing the first {graph.nodes.length} records. Search or open a
              company/person orbit to explore the rest.
            </p>
          )}
          {!graph.nodes.length ? (
            <Empty
              title="Your orbit starts with a connection"
              body="No saved records match this view. Add people or companies, or clear your filters."
              action={
                <Link className="button primary" to="/network">
                  Open Network
                </Link>
              }
            />
          ) : view === "guide" ? (
            <OrbitGuide
              graph={graph}
              scoped={params.has("company") || params.has("person")}
              search={search}
              selected={selected}
              onSelect={select}
              onCompany={(id) => {
                setParams({ company: id });
                setSearch("");
                setType("");
                setPriority("");
                setSelected("");
              }}
            />
          ) : view === "list" ? (
            <>
              <div className="orbit-list-intro">
                <strong>Choose a starting point.</strong>
                <p>
                  List finds individual records. Explore organizes a company’s
                  saved people and opportunities; Map shows their explicit
                  links.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setView("guide")}
                >
                  Explore by company
                </button>
              </div>
              <div className="orbit-record-list">
                {graph.nodes.map((n) => (
                  <button
                    key={n.id}
                    className={`orbit-list-item ${selected === n.id ? "selected" : ""}`}
                    onClick={() => select(n)}
                    aria-pressed={selected === n.id}
                  >
                    <Avatar
                      name={n.label}
                      mediaId={n.mediaId}
                      company={n.kind === "company"}
                    />
                    <span>
                      <strong>{n.label}</strong>
                      <small>{n.kind}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div
                ref={viewport}
                className="orbit-viewport"
                role="group"
                aria-label="Relationship map. Select a record or use the equivalent List view."
                onPointerDown={(e) => {
                  if ((e.target as Element).closest("button")) return;
                  drag.current = { x: e.clientX, y: e.clientY, start: pan };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (drag.current)
                    setPan({
                      x: drag.current.start.x + e.clientX - drag.current.x,
                      y: drag.current.start.y + e.clientY - drag.current.y,
                    });
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
              >
                <div
                  className="orbit-canvas"
                  style={{
                    transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                  }}
                >
                  <svg
                    viewBox="0 0 1000 760"
                    className="orbit-edges"
                    role="img"
                    aria-label="Lines show only saved company membership and opportunity associations"
                  >
                    {graph.edges.map((e) => {
                      const a = byId.get(e.from)!,
                        b = byId.get(e.to)!;
                      return (
                        <line
                          className={
                            selected &&
                            (e.from === selected || e.to === selected)
                              ? "orbit-active-edge"
                              : ""
                          }
                          key={e.id}
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                        >
                          <title>
                            {a.label} → {b.label}: {e.label}
                          </title>
                        </line>
                      );
                    })}
                  </svg>
                  {graph.nodes.map((n) => (
                    <button
                      key={n.id}
                      className={`orbit-node ${n.kind} ${n.id === selected ? "selected" : ""}`}
                      style={{ left: n.x, top: n.y }}
                      title={`${n.label} · ${n.kind}`}
                      aria-pressed={n.id === selected}
                      onClick={() => select(n)}
                    >
                      <Avatar
                        name={n.label}
                        mediaId={n.mediaId}
                        company={n.kind === "company"}
                        size="large"
                      />
                      <span>{n.label}</span>
                      <small>{n.kind}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="orbit-pan">
                <span>Pan map</span>
                {[
                  ["←", -80, 0],
                  ["↑", 0, -80],
                  ["↓", 0, 80],
                  ["→", 80, 0],
                ].map(([label, x, y]) => (
                  <button
                    className="icon-button"
                    key={label}
                    aria-label={`Pan ${label}`}
                    onClick={() =>
                      setPan({ x: pan.x + Number(x), y: pan.y + Number(y) })
                    }
                  >
                    {label}
                  </button>
                ))}
                <button
                  className="button ghost"
                  onClick={() => setView("list")}
                >
                  Use searchable list instead
                </button>
              </div>
            </>
          )}
          <div className="orbit-legend">
            <span>◯ Person</span>
            <span>▢ Company</span>
            <span>◇ Opportunity</span>
            <p>
              Lines: works at · opportunity representative · company
              opportunity. Shared employment does not imply that people know one
              another.
            </p>
          </div>
        </section>
        <aside
          className={`orbit-detail surface ${node ? "has-selection" : ""}`}
          aria-label="Selected relationship"
        >
          {!node ? (
            <>
              <p className="eyebrow">A LITTLE PERSPECTIVE</p>
              <h2>Every connection has context.</h2>
              <p>
                Select a record to see its saved associations and next steps. No
                relationships are inferred.
              </p>
              <Link to="/focus" className="button secondary">
                Open My Focus
              </Link>
            </>
          ) : (
            <>
              <button
                className="button ghost orbit-close"
                onClick={() => setSelected("")}
              >
                Close selection
              </button>
              <Avatar
                name={node.label}
                mediaId={node.mediaId}
                size="xl"
                company={node.kind === "company"}
              />
              <Badge>{node.kind}</Badge>
              <h2>{node.label}</h2>
              {person && (
                <>
                  <p>
                    {person.role} ·{" "}
                    {p.organizations.find((o) => o.id === person.organizationId)
                      ?.name || "Independent"}
                  </p>
                  <p>
                    {person.priority} priority ·{" "}
                    {effectiveAvailability(person, p.restrictions)}
                  </p>
                  <p>
                    Last conversation:{" "}
                    {lastInteraction(person.id, p.interactions)
                      ? date(lastInteraction(person.id, p.interactions)!)
                      : "Not recorded"}
                  </p>
                  <Link
                    className="button primary"
                    to={`/network/people/${person.id}`}
                  >
                    Open Profile
                  </Link>
                  <button
                    className="button ghost"
                    onClick={() => {
                      setParams({ person: person.id });
                      setSelected("");
                    }}
                  >
                    Person orbit
                  </button>
                  <Link
                    className="button ghost"
                    to={`/analytics?person=${encodeURIComponent(person.id)}`}
                  >
                    View person analytics
                  </Link>
                  <FocusButton type="contact" id={person.id} />
                </>
              )}
              {company && (
                <>
                  <p>{company.industry || "Industry not recorded"}</p>
                  <p>
                    {
                      p.contacts.filter((c) => c.organizationId === company.id)
                        .length
                    }{" "}
                    representatives
                  </p>
                  <Link
                    className="button primary"
                    to={`/network/companies/${company.id}`}
                  >
                    Open Company
                  </Link>
                  <button
                    className="button ghost"
                    onClick={() => {
                      setParams({ company: company.id });
                      setSelected("");
                    }}
                  >
                    Company orbit
                  </button>
                  <Link
                    className="button ghost"
                    to={`/analytics?company=${encodeURIComponent(company.id)}`}
                  >
                    View company analytics
                  </Link>
                  <FocusButton type="organization" id={company.id} />
                </>
              )}
              {deal && (
                <>
                  <p>
                    {p.organizations.find((o) => o.id === deal.organizationId)
                      ?.name || "Independent opportunity"}
                  </p>
                  <p>
                    {p.pipelines.find((x) => x.id === deal.pipelineId)?.name} ·{" "}
                    {p.pipelineStages.find((x) => x.id === deal.stageId)?.name}{" "}
                    · {deal.status}
                  </p>
                  <button
                    className="button primary"
                    onClick={() =>
                      setEditor({ kind: "opportunity", record: deal })
                    }
                  >
                    Open Opportunity
                  </button>
                </>
              )}
              {company && (
                <>
                  <h3>Representatives</h3>
                  {p.contacts
                    .filter((c) => c.organizationId === company.id)
                    .slice(0, 20)
                    .map((c) => (
                      <Link
                        className="orbit-related"
                        key={c.id}
                        to={`/network/people/${c.id}`}
                      >
                        {c.name}
                      </Link>
                    ))}
                </>
              )}
              <details className="orbit-saved-links">
                <summary>Saved connections in this view</summary>
                {graph.edges
                  .filter((e) => e.from === node.id || e.to === node.id)
                  .map((e) => {
                    const other = byId.get(e.from === node.id ? e.to : e.from)!;
                    return (
                      <button
                        key={e.id}
                        className="orbit-related"
                        onClick={() => select(other)}
                      >
                        <strong>{other.label}</strong>
                        <small>{e.label}</small>
                      </button>
                    );
                  })}
                {!graph.edges.some(
                  (e) => e.from === node.id || e.to === node.id,
                ) && (
                  <p>
                    No saved connection is visible with these filters. Clear
                    filters or open a scoped company/person view to inspect
                    more.
                  </p>
                )}
              </details>
              <h3>Linked opportunities</h3>
              {related.slice(0, 10).map((o) => (
                <button
                  key={o.id}
                  className="orbit-related"
                  onClick={() => setEditor({ kind: "opportunity", record: o })}
                >
                  {o.title} · {o.status}
                </button>
              ))}
              {!related.length && <p className="muted">None recorded.</p>}
              <h3>Next actions</h3>
              {tasks.slice(0, 5).map((t) => (
                <p key={t.id}>
                  {t.title} · {date(t.dueAt)}
                </p>
              ))}
              {!tasks.length && <p className="muted">No open follow-ups.</p>}
            </>
          )}
        </aside>
      </div>
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
