import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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
import { ConstellationScene } from "../components/ConstellationScene";
import { OrbitWorld } from "../components/OrbitWorld";
export function Orbit() {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const navigationState = useLocation().state as {
    profileReturn?: unknown;
    networkReturn?: unknown;
    reviewReturn?: unknown;
  } | null;
  const profileReturn =
    typeof navigationState?.profileReturn === "string" &&
    /^\/network\/(people|companies)\/[^/?#]+$/.test(
      navigationState.profileReturn,
    )
      ? navigationState.profileReturn
      : null;
  const p = usePulse(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [filtersOpen, setFiltersOpen] = useState(false),
    [priority, setPriority] = useState(""),
    [view, setView] = useState("list"),
    [mapMode, setMapMode] = useState<"3d" | "2d">("3d"),
    [webglAvailable, setWebglAvailable] = useState(true),
    [turn, setTurn] = useState(0),
    [resetScene, setResetScene] = useState(0),
    [selected, setSelected] = useState(""),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [editor, setEditor] = useState<Editor | null>(null),
    viewport = useRef<HTMLDivElement>(null),
    detail = useRef<HTMLElement>(null),
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
        limit: matchMedia("(max-width:600px)").matches ? (mapMode === "3d" ? 12 : 18) : 24,
        balance: true,
      }),
    [p, search, type, priority, params, mapMode],
  );
  const fullGraph = useMemo(
    () =>
      deriveOrbit(p, {
        search,
        type,
        priority,
        company: params.get("company") || "",
        person: params.get("person") || "",
        limit: 60,
      }),
    [p, search, type, priority, params],
  );
  const node = fullGraph.nodes.find((n) => n.id === selected),
    byId = new Map(graph.nodes.map((n) => [n.id, n])),
    allById = new Map(fullGraph.nodes.map((n) => [n.id, n]));
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
    if (!viewport.current) return;
    const observer = new ResizeObserver(() => {
      if ((viewport.current?.clientWidth || 0) <= 600) {
        // Start close enough to read on a phone; Fit network remains available.
        setZoom(0.9);
        setPan({ x: 0, y: 0 });
      } else fit();
    });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [graph.nodes.length]);
  function select(n: OrbitNode) {
    setSelected(n.id);
  }
  function selectFromBrowse(n: OrbitNode) {
    select(n);
    if (matchMedia("(max-width:767px)").matches)
      requestAnimationFrame(() =>
        detail.current?.scrollIntoView({ block: "start", behavior: "instant" }),
      );
  }
  return (
    <div className="page orbit-page">
      {profileReturn && (
        <Link
          className="text-link connected-return"
          to={profileReturn}
          state={{
            networkReturn: navigationState?.networkReturn,
            reviewReturn: navigationState?.reviewReturn,
          }}
        >
          {__pulseText("← Return to profile")}</Link>
      )}
      <div className="page-heading editorial-masthead insight-masthead">
        <div>
          <p className="eyebrow">{__pulseText("YOUR CONNECTIONS, IN CONTEXT")}</p>
          <h1>
            {t("orbitTitle")}<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            {t("orbitIntro")}
          </p>
        </div>
        <Link className="button secondary" to="/network">
          {t("backNetwork")}
        </Link>
      </div>
      <div className="orbit-filters surface">
        <label className="search-field">
          <span className="sr-only">{__pulseText("Search Orbit")}</span>
          <input
            aria-label={t("searchOrbit")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected("");
            }}
            placeholder={__pulseText("Find a person, company or opportunity")}
          />
        </label>
        <button className="button secondary orbit-filter-toggle" aria-expanded={filtersOpen} aria-controls="orbit-extra-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{t("filters")}{type || priority ? " •" : ""}</button>
        {filtersOpen && <div id="orbit-extra-filters" className="orbit-extra-filters"><label className="field">
          <span>{t("show")}</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setSelected("");
            }}
          >
            <option value="">{t("allRecords")}</option>
            <option value="person">{t("people")}</option>
            <option value="company">{t("companies")}</option>
            <option value="opportunity">{t("opportunities")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("contactPriority")}</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">{t("allPriorities")}</option>
            {["VIP", "High", "Normal", "Low"].map((x) => (
              <option key={x} value={x}>{x === "High" ? t("high") : x === "Normal" ? t("normal") : x === "Low" ? t("low") : x}</option>
            ))}
          </select>
        </label></div>}
      </div>
      {params.size > 0 && (
        <p className="orbit-scope">
          <strong>
            {params.has("company")
              ? p.organizations.find((o) => o.id === params.get("company"))
                  ?.name || __pulseText("Company")
              : p.contacts.find((c) => c.id === params.get("person"))?.name ||
                __pulseText("Person")}
          </strong>{" "}
          {__pulseText("· Focused") + " "}{params.has("company") ? __pulseText("company") : __pulseText("person")} {" " + __pulseText("view")}{" "}
          <button
            className="button ghost"
            onClick={() => {
              setParams({}, { state: navigationState });
              setSelected("");
            }}
          >
            {__pulseText("Show my network")}</button>
        </p>
      )}
      <div
        className={`orbit-layout ${node ? "orbit-has-selection" : "orbit-no-selection"}`}
      >
        <section className="orbit-map-panel">
          <div className="orbit-toolbar">
            <div className="orbit-stage-title"><span className="orbit-stage-icon" aria-hidden="true">✳</span><div><strong>{t("constellation")}</strong><small>{graph.nodes.length} {" " + __pulseText("of") + " "}{graph.total} {" " + __pulseText("matching records · select a connection")}</small></div></div>
            <div className="orbit-mode-tabs" aria-label={__pulseText("Map style")}><button aria-pressed={mapMode === "3d"} disabled={!webglAvailable} onClick={() => setMapMode("3d")}>{t("map3d")}</button><button aria-pressed={mapMode === "2d"} onClick={() => setMapMode("2d")}>{t("map2d")}</button></div>
            <div className="form-actions">
              {
                <>
                  <button
                    className="icon-button"
                    aria-label={__pulseText("Zoom out")}
                    onClick={() => setZoom(Math.max(0.35, zoom - 0.15))}
                  >
                    −
                  </button>
                  <span>{Math.round(zoom * 100)}%</span>
                  <button
                    className="icon-button"
                    aria-label={__pulseText("Zoom in")}
                    onClick={() => setZoom(Math.min(2, zoom + 0.15))}
                  >
                    +
                  </button>
                  <button className="button ghost" onClick={() => { fit(); setResetScene((value) => value + 1); }}>
                    {t("fit")}
                  </button>
                </>
              }
            </div>
          </div>
          {!webglAvailable && <p className="orbit-render-notice">{__pulseText("3D is unavailable on this device. The 2D map and full list remain available.")}</p>}

          {!graph.nodes.length ? (
            <Empty
              title={__pulseText("Your orbit starts with a connection")}
              body={__pulseText("No saved records match this view. Add people or companies, or clear your filters.")}
              action={
                <Link className="button primary" to="/network">
                  {__pulseText("Open Network")}</Link>
              }
            />
          ) : (
            <>
              <div
                ref={viewport}
                className="orbit-viewport"
                role="group"
                aria-label={__pulseText("Relationship map. Select a record or use the equivalent List view.")}
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
                <div className="orbit-dimensional-background">{mapMode === "2d" && <ConstellationScene variant="orbit" />}</div>
                {mapMode === "3d" ? <OrbitWorld nodes={graph.nodes} edges={graph.edges} selected={selected} zoom={zoom} pan={pan} turn={turn} reset={resetScene} onSelect={select} onUnavailable={() => { setWebglAvailable(false); setMapMode("2d"); }} /> : <div
                  className="orbit-canvas"
                  style={{
                    transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                  }}
                >
                  <svg
                    viewBox="0 0 1000 760"
                    className="orbit-edges"
                    role="img"
                    aria-label={__pulseText("Lines show only saved company membership and opportunity associations")}
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
                </div>}
              </div>
              <div className="orbit-pan">
                <span>{mapMode === "3d" ? __pulseText("Drag to rotate · Select an orb") : __pulseText("Drag to explore · Pan map")}</span>
                {mapMode === "3d" && <><button className="icon-button" aria-label={__pulseText("Rotate orbit left")} onClick={() => setTurn((value) => value - 1)}>↶</button><button className="icon-button" aria-label={__pulseText("Rotate orbit right")} onClick={() => setTurn((value) => value + 1)}>↷</button></>}
                {[
                  ["←", -80, 0],
                  ["↑", 0, -80],
                  ["↓", 0, 80],
                  ["→", 80, 0],
                ].map(([label, x, y]) => (
                  <button
                    className="icon-button"
                    key={label}
                    aria-label={__pulseText("Pan {0}", label)}
                    onClick={() =>
                      setPan({ x: pan.x + Number(x), y: pan.y + Number(y) })
                    }
                  >
                    {label}
                  </button>
                ))}
              <button
                className="button ghost"
                onClick={() => {
                  fit();
                  setResetScene((value) => value + 1);
                  setSelected("");
                  setSearch("");
                  setType("");
                  setPriority("");
                  setParams({}, { state: navigationState });
                }}
              >
                {t("reset")}
              </button>
              {node && graph.nodes.some((n) => n.id === node.id) && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setZoom(1);
                    const mapNode = graph.nodes.find(
                      (item) => item.id === node.id,
                    )!;
                    setPan({ x: 500 - mapNode.x, y: 380 - mapNode.y });
                  }}
                >
                  {__pulseText("Center selected")}</button>
              )}
                <button
                  className="button ghost"
                  onClick={() => {
                    setView("list");
                    document
                      .querySelector(".orbit-browse")
                      ?.scrollIntoView({ block: "start", behavior: "instant" });
                  }}
                >
                  {t("browse")}
                </button>
              </div>
            </>
          )}
          <section
            className="orbit-browse"
            aria-label={__pulseText("Explore connections below the map")}
          >
            <div className="orbit-browse-heading">
              <div>
                <p className="eyebrow">{__pulseText("EXPLORE YOUR NETWORK")}</p>
                <h2>{__pulseText("Find a starting point")}</h2>
                <p>
                  {__pulseText("Browse saved records or explore by company. Select any item to see its context.")}</p>
              </div>
              <div className="tabs" aria-label={__pulseText("Orbit presentation")}>
                <button
                  aria-pressed={view === "guide"}
                  onClick={() => setView("guide")}
                >
                  {t("explore")}
                </button>
                <button
                  onClick={() => {
                    viewport.current?.scrollIntoView({
                      block: "center",
                      behavior: "instant",
                    });
                  }}
                >
                  {t("map")}
                </button>
                <button
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  {t("list")}
                </button>
              </div>{" "}
            </div>
            {view === "guide" ? (
              <OrbitGuide
                graph={fullGraph}
                scoped={params.has("company") || params.has("person")}
                search={search}
                selected={selected}
                onSelect={selectFromBrowse}
                onCompany={(id) => {
                  setParams({ company: id }, { state: navigationState });
                  setSearch("");
                  setType("");
                  setPriority("");
                  setSelected("");
                }}
              />
            ) : (
              <>
                <div className="orbit-list-intro">
                  <strong>{__pulseText("Choose a starting point.")}</strong>
                  <p>
                    {__pulseText("List finds individual records. Explore organizes a company’s saved people and opportunities; Map shows their explicit links.")}</p>
                  <button
                    className="button secondary"
                    onClick={() => setView("guide")}
                  >
                    {__pulseText("Explore by company")}</button>
                </div>
                <div className="orbit-record-list">
                  {fullGraph.nodes.map((n) => (
                    <button
                      key={n.id}
                      className={`orbit-list-item ${selected === n.id ? "selected" : ""}`}
                      onClick={() => selectFromBrowse(n)}
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
            )}
          </section>
          <div className="orbit-legend">
            <span>{__pulseText("◯ Person")}</span>
            <span>{__pulseText("▢ Company")}</span>
            <span>{__pulseText("◇ Opportunity")}</span>
            <p>
              {__pulseText("Solid lines show works at · opportunity representative · company opportunity. Dotted lines connect portraits to their positions. Depth is a visual layout, not a measure of closeness. Shared employment does not imply that people know one another.")}</p>
          </div>
        </section>
        <aside
          ref={detail}
          className={`orbit-detail surface ${node ? "has-selection" : ""}`}
          aria-label={__pulseText("Selected relationship")}
        >
          {!node ? (
            <>
              <p className="eyebrow">{__pulseText("A LITTLE PERSPECTIVE")}</p>
              <h2>{__pulseText("Every connection has context.")}</h2>
              <p>
                {__pulseText("Select a record to see its saved associations and next steps. No relationships are inferred.")}</p>
              <Link to="/focus" className="button secondary">
                {__pulseText("Open My Focus")}</Link>
            </>
          ) : (
            <>
              <button
                className="button ghost orbit-close"
                onClick={() => setSelected("")}
              >
                {t("closeSelection")}
              </button>
              <Avatar
                name={node.label}
                mediaId={node.mediaId}
                size="xl"
                company={node.kind === "company"}
              />
              <Badge>{node.kind === "person" ? t("person") : node.kind === "company" ? t("company") : t("opportunity")}</Badge>
              <h2>{node.label}</h2>
              {person && (
                <>
                  <p>
                    {person.role} ·{" "}
                    {p.organizations.find((o) => o.id === person.organizationId)
                      ?.name || __pulseText("Independent")}
                  </p>
                  <p>
                    {person.priority} {" " + __pulseText("priority ·")}{" "}
                    {effectiveAvailability(person, p.restrictions)}
                  </p>
                  <p>
                    {__pulseText("Last conversation:")}{" "}
                    {lastInteraction(person.id, p.interactions)
                      ? date(lastInteraction(person.id, p.interactions)!)
                      : __pulseText("Not recorded")}
                  </p>
                  <Link
                    className="button primary"
                    to={`/network/people/${person.id}`}
                  >
                    {t("openProfile")}
                  </Link>
                  <button
                    className="button ghost"
                    onClick={() => {
                      setParams(
                        { person: person.id },
                        { state: navigationState },
                      );
                      setSelected("");
                    }}
                  >
                    {__pulseText("Person orbit")}</button>
                  <Link
                    className="button ghost"
                    to={`/analytics?person=${encodeURIComponent(person.id)}`}
                  >
                    {__pulseText("View person analytics")}</Link>
                  <FocusButton type="contact" id={person.id} />
                </>
              )}
              {company && (
                <>
                  <p>{company.industry || __pulseText("Industry not recorded")}</p>
                  <p>
                    {
                      p.contacts.filter((c) => c.organizationId === company.id)
                        .length
                    }{" "}
                    {__pulseText("representatives")}</p>
                  <Link
                    className="button primary"
                    to={`/network/companies/${company.id}`}
                  >
                    {__pulseText("Open Company")}</Link>
                  <button
                    className="button ghost"
                    onClick={() => {
                      setParams(
                        { company: company.id },
                        { state: navigationState },
                      );
                      setSelected("");
                    }}
                  >
                    {__pulseText("Company orbit")}</button>
                  <Link
                    className="button ghost"
                    to={`/analytics?company=${encodeURIComponent(company.id)}`}
                  >
                    {__pulseText("View company analytics")}</Link>
                  <FocusButton type="organization" id={company.id} />
                </>
              )}
              {deal && (
                <>
                  <p>
                    {p.organizations.find((o) => o.id === deal.organizationId)
                      ?.name || __pulseText("Independent opportunity")}
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
                    {__pulseText("Open Opportunity")}</button>
                </>
              )}
              {company && (
                <>
                  <h3>{__pulseText("Representatives")}</h3>
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
                <summary>{__pulseText("Saved connections in this view")}</summary>
                {fullGraph.edges
                  .filter((e) => e.from === node.id || e.to === node.id)
                  .map((e) => {
                    const other = allById.get(
                      e.from === node.id ? e.to : e.from,
                    )!;
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
                {!fullGraph.edges.some(
                  (e) => e.from === node.id || e.to === node.id,
                ) && (
                  <p>
                    {__pulseText("No saved connection is visible with these filters. Clear filters or open a scoped company/person view to inspect more.")}</p>
                )}
              </details>
              <h3>{__pulseText("Linked opportunities")}</h3>
              {related.slice(0, 10).map((o) => (
                <button
                  key={o.id}
                  className="orbit-related"
                  onClick={() => setEditor({ kind: "opportunity", record: o })}
                >
                  {o.title} · {o.status}
                </button>
              ))}
              {!related.length && <p className="muted">{__pulseText("None recorded.")}</p>}
              <h3>{__pulseText("Next actions")}</h3>
              {tasks.slice().sort((a,b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 5).map((task) => (
                <button key={task.id} className="orbit-related" onClick={() => setEditor({kind:"task",record:task})}>
                  <strong>{task.title}</strong><small>{date(task.dueAt)}</small>
                </button>
              ))}
              {!tasks.length && <p className="muted">{__pulseText("No open follow-ups.")}</p>}
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
