import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Building2, BriefcaseBusiness, Crosshair, Users } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePulse } from "../app/context";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { deriveOrbit, type OrbitNode } from "../services/orbit";
import { savedOrbitConnections, savedOrbitNode } from "../services/orbit-connections";
import { orbitSignals, type OrbitLens, type OrbitSignal } from "../services/orbit-signals";
import { EditorModal, type Editor } from "../components/forms";
import {
  lastInteraction,
  effectiveAvailability,
} from "../services/recommendations";
import { FocusButton } from "../components/focus";
import { OpportunityBrief } from "./OpportunityBrief";
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
    focusReturn?: unknown;
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
    [lens, setLens] = useState<OrbitLens>("all"),
    [mobileMap, setMobileMap] = useState(() => matchMedia("(max-width:600px)").matches),
    [mapMode, setMapMode] = useState<"3d" | "2d">("3d"),
    [webglAvailable, setWebglAvailable] = useState(true),
    [turn, setTurn] = useState(0),
    [resetScene, setResetScene] = useState(0),
    [selected, setSelected] = useState(""),
    [focusConnections, setFocusConnections] = useState(false),
    [detailView, setDetailView] = useState<"connections" | "followups" | "opportunities" | "activity">("connections"),
    [centerScene, setCenterScene] = useState(0),
    [selectionTrail, setSelectionTrail] = useState<string[]>([]),
    [mapAnchor, setMapAnchor] = useState(""),
    [connectionLimit, setConnectionLimit] = useState(6),
    [taskLimit, setTaskLimit] = useState(3),
    [dealLimit, setDealLimit] = useState(3),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [editor, setEditor] = useState<Editor | null>(null),
    [briefId, setBriefId] = useState<string | null>(null),
    viewport = useRef<HTMLDivElement>(null),
    detail = useRef<HTMLElement>(null),
    focusRef = useRef(false),
    previousMapView = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null),
    drag = useRef<{
      x: number;
      y: number;
      start: { x: number; y: number };
    } | null>(null);
  const { date } = useFormat();
  useEffect(() => { focusRef.current = focusConnections; }, [focusConnections]);
  useEffect(() => {
    const query = matchMedia("(max-width:600px)");
    const update = () => setMobileMap(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const signals = useMemo(() => orbitSignals(p), [p]);
  const node = useMemo(() => selected ? savedOrbitNode(p, selected) : undefined, [p, selected]);
  const connections = useMemo(() => node ? savedOrbitConnections(p, node) : [], [p, node]);
  const focusedIds = useMemo(() => focusConnections && node ? new Set([node.id, ...connections.map((connection) => connection.node.id)]) : undefined, [focusConnections, node, connections]);
  const lensIds = lens === "all" ? undefined : signals.ids[lens];
  const visibleIds = focusedIds || lensIds;
  const focusedId = focusConnections ? selected : "";
  const anchorNode = mapAnchor ? savedOrbitNode(p, mapAnchor) : undefined;
  const anchorNeighbors = anchorNode ? savedOrbitConnections(p, anchorNode).map((connection) => connection.node.id) : [];
  const graph = useMemo(
    () =>
      deriveOrbit(p, {
        search: focusConnections ? "" : search,
        type: focusConnections ? "" : type,
        priority: focusConnections ? "" : priority,
        company: focusConnections ? "" : params.get("company") || "",
        person: focusConnections ? "" : params.get("person") || "",
        limit: mobileMap ? (mapMode === "3d" ? 12 : 18) : 24,
        balance: true,
        preferredId: focusedId || mapAnchor,
        preferredIds: focusConnections ? connections.map((connection) => connection.node.id) : anchorNeighbors,
        includeIds: visibleIds,
        centerId: focusedId || undefined,
      }),
    [p, search, type, priority, params, mapMode, mapAnchor, mobileMap, visibleIds, focusConnections, focusedId],
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
        includeIds: lensIds,
      }),
    [p, search, type, priority, params, lensIds],
  );
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
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
  const recent = p.interactions.filter((i) => Date.parse(i.occurredAt) <= Date.now() && (person ? i.contactId === person.id : company ? i.organizationId === company.id : deal ? i.opportunityId === deal.id : false)).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 3);
  const connectedOnMap = new Set(graph.edges.flatMap((edge) => edge.from === selected ? [edge.to] : edge.to === selected ? [edge.from] : []));
  const openDeals = related.filter((opportunity) => opportunity.status === "open");
  const orderedTasks = [...tasks].sort((a,b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
  const isOnMap = !!node && graph.nodes.some((item) => item.id === node.id);
  const hasMapNodes = graph.nodes.length > 0;
  const hasSavedRecords = p.contacts.length + p.organizations.length + p.opportunities.length > 0;
  const hasMapFilters = !!(search || type || priority || params.get("company") || params.get("person") || lens !== "all");
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
        setZoom(focusRef.current ? 0.65 : 0.9);
        setPan({ x: 0, y: 0 });
      } else fit();
    });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [hasMapNodes]);
  function select(n: OrbitNode) {
    if (selected && selected !== n.id) setSelectionTrail((trail) => [...trail, selected].slice(-20));
    setSelected(n.id); setDetailView("connections"); setConnectionLimit(6); setTaskLimit(3); setDealLimit(3);
  }
  function focusSelectedHeading() {
    requestAnimationFrame(() => detail.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true }));
  }
  function selectLinked(n: OrbitNode) {
    select(n);
    focusSelectedHeading();
  }
  function selectPrevious() {
    let index = selectionTrail.length - 1;
    while (index >= 0 && !savedOrbitNode(p, selectionTrail[index])) index--;
    if (index < 0) { setSelectionTrail([]); return; }
    const previous = selectionTrail[index];
    setSelectionTrail(selectionTrail.slice(0, index));
    setSelected(previous); setDetailView("connections"); setConnectionLimit(6); setTaskLimit(3); setDealLimit(3); focusSelectedHeading();
  }
  function clearSelection() {
    setSelected(""); setSelectionTrail([]); setMapAnchor(""); setFocusConnections(false); previousMapView.current = null;
  }
  function toggleFocusConnections() {
    if (!node) return;
    if (focusConnections) {
      setFocusConnections(false);
      if (previousMapView.current) { setZoom(previousMapView.current.zoom); setPan(previousMapView.current.pan); }
      previousMapView.current = null;
    } else {
      previousMapView.current = { zoom, pan };
      setFocusConnections(true); setPan({ x: 0, y: 0 }); setZoom(mobileMap ? 0.65 : 1);
    }
    requestAnimationFrame(() => viewport.current?.scrollIntoView({ block: "center", behavior: p.settings.reducedMotion ? "instant" : "smooth" }));
  }
  function revealOnMap() {
    if (!node) return;
    setFocusConnections(false);
    setSearch(""); setType(""); setPriority(""); setLens("all"); setParams({}, { state: navigationState });
    setMapAnchor(node.id);
    requestAnimationFrame(() => viewport.current?.scrollIntoView({ block:"center", behavior:p.settings.reducedMotion ? "instant" : "smooth" }));
  }
  function selectSignal(signal: OrbitSignal) {
    setFocusConnections(false); setLens(signal.kind); setSearch(""); setType(""); setPriority("");
    setParams({}, { state: navigationState }); setMapAnchor(signal.node.id); select(signal.node);
    requestAnimationFrame(() => { detail.current?.scrollIntoView({ block: "start", behavior: "instant" }); focusSelectedHeading(); });
  }
  function selectFromBrowse(n: OrbitNode) {
    select(n);
    if (matchMedia("(max-width:767px)").matches)
      requestAnimationFrame(() =>
        { detail.current?.scrollIntoView({ block: "start", behavior: "instant" }); focusSelectedHeading(); },
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
            focusReturn: navigationState?.focusReturn,
          }}
        >
          {__pulseText("← Return to profile")}</Link>
      )}
      <header className="orbit-launch">
        <div className="orbit-launch-art" aria-hidden="true"><i/><i/><i/><b>✳</b></div>
        <div className="orbit-launch-copy">
          <p className="eyebrow">{__pulseText("YOUR CONNECTIONS, IN CONTEXT")}</p>
          <h1>{t("orbitTitle")}<span>.</span></h1>
          <p>{t("orbitIntro")}</p>
          <Link to="/network">{t("backNetwork")} <ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
        <div className="orbit-launch-index" aria-label={__pulseText("Saved in your workspace")}>
          <div><Users size={17} aria-hidden="true"/><strong>{p.contacts.length}</strong><span>{t("people")}</span></div>
          <div><Building2 size={17} aria-hidden="true"/><strong>{p.organizations.length}</strong><span>{t("companies")}</span></div>
          <div><BriefcaseBusiness size={17} aria-hidden="true"/><strong>{p.opportunities.length}</strong><span>{t("opportunities")}</span></div>
        </div>
      </header>
      <div className="orbit-console">
      <div className="orbit-lens-bar" aria-label={__pulseText("Map filters")}><span>{__pulseText("MAP VIEW")}</span>{([ ["all", "All records"], ["followups", "Follow-ups"], ["opportunities", "Open opportunities"], ["activity", "Recent activity"] ] as const).map(([value, label]) => <button key={value} aria-pressed={!focusConnections && lens === value} onClick={() => {setFocusConnections(false); setLens(value); setMapAnchor("");}}>{__pulseText(label)}</button>)}<small>{__pulseText("Filters include records directly linked to saved work.")}</small></div>
      <div className="orbit-filters surface">
        <label className="search-field">
          <span className="sr-only">{__pulseText("Search Orbit")}</span>
          <input
            aria-label={t("searchOrbit")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              clearSelection();
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
              clearSelection();
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
            onChange={(e) => { setPriority(e.target.value); clearSelection(); }}
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
              clearSelection();
            }}
          >
            {__pulseText("Show my network")}</button>
        </p>
      )}
      {focusConnections && node && <div className="orbit-focus-notice"><Crosshair size={17} aria-hidden="true"/><span>{__pulseText("Showing saved connections for")} <strong>{node.label}</strong>. {__pulseText("Your other map filters are paused.")}</span><button onClick={toggleFocusConnections}>{__pulseText("Return to map")}</button></div>}
      </div>
      <div
        className={`orbit-layout ${node ? "orbit-has-selection" : "orbit-no-selection"}`}
      >
        <section className="orbit-map-panel">
          <div className="orbit-toolbar">
            <div className="orbit-stage-title"><span className="orbit-stage-icon" aria-hidden="true">✳</span><div><strong>{t("constellation")}</strong><small>{graph.nodes.length} {" " + __pulseText("of") + " "}{graph.total} {" " + __pulseText("matching records · select a connection")}</small></div></div>
            {hasMapNodes && <><div className="orbit-mode-tabs" aria-label={__pulseText("Map style")}><button aria-pressed={mapMode === "3d"} disabled={!webglAvailable} onClick={() => setMapMode("3d")}>{t("map3d")}</button><button aria-pressed={mapMode === "2d"} onClick={() => setMapMode("2d")}>{t("map2d")}</button></div>
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
            </>}
          </div>
          {hasMapNodes && !webglAvailable && <p className="orbit-render-notice">{__pulseText("3D is unavailable on this device. The 2D map and full list remain available.")}</p>}

          {!graph.nodes.length ? (
            <Empty
              title={__pulseText("Your orbit starts with a connection")}
              body={__pulseText(hasSavedRecords ? "No saved records match this view. Add people or companies, or clear your filters." : "Add a person, company or opportunity to start building your map.")}
              action={
                <div className="orbit-empty-actions">{hasMapFilters && <button className="button secondary" onClick={() => {setSearch("");setType("");setPriority("");setLens("all");setParams({}, {state:navigationState});clearSelection();}}>{__pulseText("Clear map filters")}</button>}<Link className="button primary" to="/network">{__pulseText("Open Network")}</Link></div>
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
                {mapMode === "3d" ? <OrbitWorld nodes={graph.nodes} edges={graph.edges} selected={selected} zoom={zoom} pan={pan} turn={turn} reset={resetScene} center={centerScene} onCenter={setPan} onSelect={select} onUnavailable={() => { setWebglAvailable(false); setMapMode("2d"); }} /> : <div
                  className={`orbit-canvas ${focusConnections ? "orbit-canvas-focused" : ""}`}
                  style={{
                    transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                    "--orbit-label-scale": 1 / zoom,
                  } as CSSProperties}
                >
                  <svg
                    viewBox="0 0 1000 760"
                    className={`orbit-edges ${selected && isOnMap ? "has-selection" : ""}`}
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
                      className={`orbit-node ${n.kind} ${n.id === selected ? "selected" : ""} ${connectedOnMap.has(n.id) ? "connected" : ""} ${selected && isOnMap && n.id !== selected && !connectedOnMap.has(n.id) ? "unrelated" : ""}`}
                      style={{ left: n.x, top: n.y }}
                      title={`${n.label} · ${n.kind === "person" ? t("person") : n.kind === "company" ? t("company") : t("opportunity")}`}
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
                      <small>{n.kind === "person" ? t("person") : n.kind === "company" ? t("company") : t("opportunity")}</small>
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
                  clearSelection();
                  setSearch("");
                  setType("");
                  setPriority("");
                  setLens("all");
                  setParams({}, { state: navigationState });
                }}
              >
                {t("reset")}
              </button>
              {node && <button className="button secondary" onClick={() => detail.current?.scrollIntoView({block:"start", behavior:p.settings.reducedMotion ? "instant" : "smooth"})}>{__pulseText("View selected details")}</button>}
              {node && <button className="orbit-focus-toggle" aria-pressed={focusConnections} onClick={toggleFocusConnections}><Crosshair size={16} aria-hidden="true"/>{__pulseText(focusConnections ? "Return to map" : "Focus saved connections")}</button>}
              {node && graph.nodes.some((n) => n.id === node.id) && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setZoom(1);
                    if (mapMode === "3d") { setCenterScene((value) => value + 1); return; }
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
          <aside ref={detail} className={`orbit-detail surface ${node ? "has-selection" : ""}`} aria-label={__pulseText("Selected relationship")}>
          {node && <>
            <div className="orbit-selected-header"><div className="orbit-selected-identity">
              <button className="button ghost orbit-close" onClick={clearSelection}>{t("closeSelection")}</button>
              <Avatar name={node.label} mediaId={node.mediaId} size="xl" company={node.kind === "company"}/>
              <Badge>{node.kind === "person" ? t("person") : node.kind === "company" ? t("company") : t("opportunity")}</Badge>
              <div><p className="eyebrow">{__pulseText("THE SELECTED CONNECTION")}</p><h2 tabIndex={-1}>{node.label}</h2><p className="orbit-selected-subtitle">{person ? [person.role, p.organizations.find(o => o.id === person.organizationId)?.name].filter(Boolean).join(" · ") || __pulseText("Independent") : company ? company.industry || __pulseText("Industry not recorded") : deal ? [p.organizations.find(o => o.id === deal.organizationId)?.name, p.pipelineStages.find(stage => stage.id === deal.stageId)?.name, __pulseText(deal.status)].filter(Boolean).join(" · ") : ""}</p></div>
            </div></div>
            <div className="orbit-selection-actions">
              {selectionTrail.length > 0 && <button className="orbit-back" onClick={selectPrevious}>← {__pulseText("Back to previous selection")}</button>}
              {!isOnMap && <button className="orbit-back" onClick={revealOnMap}>{__pulseText("Show this record on the map")} ↗</button>}
              <button className="orbit-spotlight" aria-pressed={focusConnections} onClick={toggleFocusConnections}><Crosshair size={16} aria-hidden="true"/>{__pulseText(focusConnections ? "Return to map" : "Focus saved connections")}</button>
              {person && <Link to={`/network/people/${encodeURIComponent(person.id)}`}>{t("openProfile")} ↗</Link>}
              {company && <><Link to={`/network/companies/${encodeURIComponent(company.id)}`}>{__pulseText("Open Company")} ↗</Link><button onClick={() => {setFocusConnections(false);setParams({company:company.id},{state:navigationState});setSearch("");setType("");setPriority("");setLens("all");setMapAnchor(node.id);setView("guide");requestAnimationFrame(() => document.querySelector(".orbit-browse")?.scrollIntoView({block:"start",behavior:"instant"}));}}>{__pulseText("Explore this company")}</button></>}
              {(person || company) && <><button onClick={() => setEditor({kind:"interaction", contact:person, organizationId:company?.id})}>{__pulseText("Log interaction")}</button><button onClick={() => setEditor({kind:"task", contact:person, organizationId:company?.id})}>{__pulseText("Plan a follow-up")}</button></>}
              {deal && <button onClick={() => setBriefId(deal.id)}>{__pulseText("Open opportunity details")}</button>}
              {person && <FocusButton type="contact" id={person.id}/ >}{company && <FocusButton type="organization" id={company.id}/ >}{deal && <FocusButton type="opportunity" id={deal.id}/ >}
            </div>
            <div className="orbit-inspector">
              <div className="orbit-inspector-tabs" aria-label={__pulseText("Selected record sections")}>
                <button aria-pressed={detailView === "connections"} onClick={() => setDetailView("connections")}><strong>{connections.length}</strong><span>{__pulseText("Saved connections")}</span></button>
                <button aria-pressed={detailView === "followups"} onClick={() => setDetailView("followups")}><strong>{orderedTasks.length}</strong><span>{__pulseText("Open follow-ups")}</span></button>
                <button aria-pressed={detailView === "opportunities"} onClick={() => setDetailView("opportunities")}><strong>{openDeals.length}</strong><span>{__pulseText("Open opportunities")}</span></button>
                <button aria-pressed={detailView === "activity"} onClick={() => setDetailView("activity")}><strong aria-hidden="true">↗</strong><span>{__pulseText("Recent activity")}</span></button>
              </div>
              <div className="orbit-inspector-content" aria-live="polite">
                {detailView === "connections" && <section><div className="orbit-inspector-heading"><div><p className="eyebrow">{__pulseText("FOLLOW THE THREAD")}</p><h3>{__pulseText("Saved connections")}</h3></div><p>{__pulseText("Choose a connection to explore it here.")}</p></div><div className="orbit-inspector-links">{connections.slice(0,connectionLimit).map(({id,label,node:other}) => <button key={id} onClick={() => selectLinked(other)}><Avatar name={other.label} mediaId={other.mediaId} company={other.kind === "company"}/><span><strong>{other.label}</strong><small>{__pulseText(label)}</small></span><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div>{connections.length > connectionLimit && <button className="button secondary" onClick={() => setConnectionLimit(connectionLimit + 6)}>{__pulseText("Show more connections")}</button>}{!connections.length && <p>{__pulseText("No saved connections for this record yet.")}</p>}</section>}
                {detailView === "followups" && <section><div className="orbit-inspector-heading"><div><p className="eyebrow">{__pulseText("YOUR NEXT STEPS")}</p><h3>{__pulseText("Open follow-ups")}</h3></div>{deal && <p>{__pulseText("These follow-ups are related through the company or a representative and may support other work.")}</p>}</div><div className="orbit-inspector-records">{orderedTasks.slice(0,taskLimit).map(task => <button key={task.id} onClick={() => setEditor({kind:"task",record:task})}><span>{__pulseText("Due")} · {date(task.dueAt)}</span><strong>{task.title}</strong><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div>{orderedTasks.length > taskLimit && <button className="button secondary" onClick={() => setTaskLimit(taskLimit + 5)}>{__pulseText("Show more follow-ups")}</button>}{!orderedTasks.length && <p>{__pulseText("No open follow-ups.")}</p>}</section>}
                {detailView === "opportunities" && <section><div className="orbit-inspector-heading"><div><p className="eyebrow">{__pulseText("WORK IN PROGRESS")}</p><h3>{__pulseText("Open opportunities")}</h3></div></div><div className="orbit-inspector-records">{openDeals.slice(0,dealLimit).map((opportunity) => <button key={opportunity.id} onClick={() => setBriefId(opportunity.id)}><span>{p.pipelineStages.find(stage => stage.id === opportunity.stageId)?.name || __pulseText("Open")}</span><strong>{opportunity.title}</strong><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div>{openDeals.length > dealLimit && <button className="button secondary" onClick={() => setDealLimit(dealLimit + 5)}>{__pulseText("Show more opportunities")}</button>}{!openDeals.length && <p>{__pulseText("No open opportunities for this selection.")}</p>}</section>}
                {detailView === "activity" && <section><div className="orbit-inspector-heading"><div><p className="eyebrow">{__pulseText("LATEST SAVED ENTRIES")}</p><h3>{__pulseText("Recent recorded activity")}</h3></div></div><div className="orbit-inspector-records">{recent.map(i => <button key={i.id} onClick={() => setEditor({kind:"interaction",record:i})}><span>{__pulseText(i.type)} · {date(i.occurredAt)}</span><strong>{i.summary}</strong><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div>{!recent.length && <p>{__pulseText("No recorded activity for this selection yet.")}</p>}{company && <small>{__pulseText("Company activity uses the company saved on each conversation.")}</small>}{deal && <small>{__pulseText("Only interactions directly linked to this opportunity appear here.")}</small>}</section>}
              </div>
            </div>
            <details className="orbit-more-details"><summary>{__pulseText("Relationship details and next actions")}</summary><div className="orbit-more-content">
              {person && <><p>{person.priority} {__pulseText("priority ·")} {effectiveAvailability(person,p.restrictions)}</p><p>{__pulseText("Last conversation:")} {lastInteraction(person.id,p.interactions) ? date(lastInteraction(person.id,p.interactions)!) : __pulseText("Not recorded")}</p><button className="button ghost" onClick={() => {setParams({person:person.id},{state:navigationState});setSearch("");setType("");setPriority("");}}>{__pulseText("Person orbit")}</button><Link className="button ghost" to={`/analytics?person=${encodeURIComponent(person.id)}`}>{__pulseText("View person analytics")}</Link></>}
              {company && <><button className="button ghost" onClick={() => {setParams({company:company.id},{state:navigationState});setSearch("");setType("");setPriority("");}}>{__pulseText("Company orbit")}</button><Link className="button ghost" to={`/analytics?company=${encodeURIComponent(company.id)}`}>{__pulseText("View company analytics")}</Link></>}
              {deal && <p>{p.pipelines.find(x => x.id === deal.pipelineId)?.name} · {p.pipelineStages.find(x => x.id === deal.stageId)?.name} · {__pulseText(deal.status)}</p>}
            </div></details>
          </>}
          </aside>
      {hasSavedRecords && <section className="orbit-radar" aria-label={__pulseText("Orbit starting points")}>
        <div className="orbit-radar-heading"><div><p className="eyebrow">{__pulseText("YOUR NETWORK, IN MOTION")}</p><h2>{__pulseText("A good place to begin.")}</h2><p>{__pulseText("A live view of the work and activity you have saved. Choose a thread or explore the whole map.")}</p></div>{p.contacts.length + p.organizations.length + p.opportunities.length > 0 ? <button className="orbit-radar-all" onClick={() => { setFocusConnections(false); setLens("all"); setSearch(""); setType(""); setPriority(""); setParams({}, {state:navigationState}); setMapAnchor(""); requestAnimationFrame(() => viewport.current?.scrollIntoView({block:"center",behavior:"instant"})); }}>{__pulseText("Explore the whole network")} <span aria-hidden="true">↗</span></button> : <Link className="orbit-radar-all" to="/network">{__pulseText("Add your first connection")} <span aria-hidden="true">↗</span></Link>}</div>
        <div className="orbit-radar-grid">{([
          ["followups", "01", "Linked follow-ups due", "Overdue and next 7 days", signals.followups],
          ["opportunities", "02", "Open opportunities", "Current saved work", signals.opportunities],
          ["activity", "03", "Recently recorded", "Last 30 days, including notes", signals.activity],
        ] as const).map(([kind, number, title, description, items]) => <section className={`orbit-radar-lane ${kind}`} key={kind}>
          <div className="orbit-radar-label"><span>{number} / {__pulseText(title)}</span><strong>{items.length}</strong></div><p>{__pulseText(description)}</p>
          {items.length ? items.slice(0,2).map((item) => <button className="orbit-signal" key={item.id} onClick={() => selectSignal(item)}><Avatar name={item.node.label} mediaId={item.node.mediaId} company={item.node.kind === "company"}/><span><strong>{item.node.label}</strong><small>{item.kind === "followups" ? `${__pulseText("Due")} ${date(item.date!)} · ${item.title}` : item.kind === "activity" ? `${__pulseText(item.activityType!)} · ${date(item.date!)} · ${item.title}` : p.pipelineStages.find((stage) => stage.id === item.stageId)?.name || __pulseText("Open opportunity")}</small></span><b aria-hidden="true">↗</b></button>) : <div className="orbit-radar-empty">{__pulseText(kind === "followups" ? "No linked follow-ups due in this window." : kind === "opportunities" ? "No open opportunities yet." : "No activity recorded in the last 30 days.")}</div>}
          <button className="orbit-radar-filter" aria-pressed={!focusConnections && lens === kind} onClick={() => {setFocusConnections(false);setLens(lens === kind ? "all" : kind); setMapAnchor("");requestAnimationFrame(() => viewport.current?.scrollIntoView({block:"center",behavior:"instant"}));}}>{__pulseText(!focusConnections && lens === kind ? "Showing this on the map" : "Show related records on map")} →</button>
        </section>)}</div>
      </section>}
          {hasSavedRecords && <section
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
                  disabled={!hasMapNodes}
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
                  setLens("all");
                  clearSelection();
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
                  {!fullGraph.nodes.length && <p>{__pulseText("No records match this view.")}</p>}
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
                        <small>{n.kind === "person" ? t("person") : n.kind === "company" ? t("company") : t("opportunity")}</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>}
          <div className="orbit-legend">
            <span>{__pulseText("◯ Person")}</span>
            <span>{__pulseText("▢ Company")}</span>
            <span>{__pulseText("◇ Opportunity")}</span>
            <p>
              {__pulseText("Lines show saved company and opportunity links. Portraits may overlap as you move the map. Depth is a visual layout, not a measure of closeness. Shared employment does not imply that people know one another.")}</p>
          </div>
        </section>

      </div>
      {briefId && <OpportunityBrief id={briefId} onClose={() => setBriefId(null)} onEdit={(next) => {setBriefId(null); setEditor(next);}} />}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
