import { NetworkContext } from "./NetworkContext";
import { useFormat } from "../components/ui";
import { taskState } from "../services/recommendations";
import { BulkTags } from "../components/bulk-tags";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Badge, Empty } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import {
  builtInLists,
  listMatcher,
  companyListMatcher,
} from "../services/smart-lists";
import { priorities, stages, availabilities, categories } from "../data/models";
export function Network() {
  const p = usePulse();
  const { date } = useFormat();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const { contacts, organizations } = p;
  const [smart, setSmart] = useState(params.get("list") || "all");
  const match = listMatcher(p);
  const insights = new Map(
    p.intelligence.relationships.map((i) => [i.contactId, i]),
  );
  const smartList = p.smartLists.find((l) => l.id === smart) || smart;
  const [limit, setLimit] = useState(60);
  const [tab, setTab] = useState<"people" | "companies">(
    params.get("view") === "companies" ? "companies" : "people",
  );
  const [search, setSearch] = useState(params.get("q") || "");
  const [priority, setPriority] = useState(params.get("priority") || "");
  const [availability, setAvailability] = useState(
    params.get("availability") || "",
  );
  const [category, setCategory] = useState(params.get("category") || "");
  const [stage, setStage] = useState(params.get("stage") || "");
  const [sort, setSort] = useState(params.get("sort") || "name");
  const [filters, setFilters] = useState(false);
  const [display, setDisplay] = useState("list");
  const [editor, setEditor] = useState<Editor | null>(null);
  useEffect(() => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: search,
      view: tab === "companies" ? tab : "",
      priority,
      stage,
      category,
      availability,
      sort: sort === "name" ? "" : sort,
      list: smart === "all" ? "" : smart,
    }))
      if (value) next.set(key, value);
    if (next.toString() !== params.toString())
      setParams(next, { replace: true });
  }, [
    search,
    tab,
    priority,
    stage,
    category,
    availability,
    sort,
    smart,
    params,
    setParams,
  ]);
  const query = search.trim().toLowerCase();
  const people = contacts
    .filter(
      (c) =>
        `${c.name} ${c.role} ${c.emails.join(" ")} ${c.tags.join(" ")} ${organizations.find((o) => o.id === c.organizationId)?.name || ""}`
          .toLowerCase()
          .includes(query) &&
        (!priority || c.priority === priority) &&
        (!stage || c.stage === stage) &&
        (!availability || insights.get(c.id)?.availability === availability) &&
        (!category || c.category === category) &&
        (smart === "pinned"
          ? p.focusItems.some(
              (f) => f.entityType === "contact" && f.recordId === c.id,
            )
          : match(c, smartList)),
    )
    .sort((a, b) =>
      sort === "priority"
        ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
        : sort === "recent"
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.name.localeCompare(b.name),
    );
  const companyMatcher = companyListMatcher(p);
  const companies = organizations
    .filter(
      (o) =>
        `${o.name} ${o.industry} ${o.location} ${o.tags.join(" ")}`
          .toLowerCase()
          .includes(query) &&
        (typeof smartList === "string" ||
          smartList.entityType !== "organization" ||
          companyMatcher(o, smartList)),
    )
    .sort((a, b) =>
      sort === "recent"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.name.localeCompare(b.name),
    );
  return (
    <div className="page network-page">
      <header className="page-heading editorial-masthead network-masthead">
        <div>
          <p className="eyebrow">YOUR RELATIONSHIPS, REMEMBERED</p>
          <h1>
            Network<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            People you know. The details that move things forward.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setEditor({ kind: tab === "people" ? "contact" : "company" })
          }
        >
          <Plus size={18} />
          Add {tab === "people" ? "person" : "company"}
        </button>
      </header>
      <section className="network-orientation" aria-label="Network overview">
        <div>
          <p className="eyebrow">YOUR RELATIONSHIP LANDSCAPE</p>
          <h2>Every connection has a next chapter.</h2>
          <p>
            Find a person or company, revisit the context, and choose a
            thoughtful next step.
          </p>
        </div>
        <div className="network-orientation-facts">
          <div>
            <strong>{contacts.length}</strong>
            <span>saved people</span>
          </div>
          <div>
            <strong>{organizations.length}</strong>
            <span>saved companies</span>
          </div>
          <div>
            <strong>
              {
                p.focusItems.filter(
                  (f) =>
                    f.entityType === "contact" ||
                    f.entityType === "organization",
                ).length
              }
            </strong>
            <span>pinned connections</span>
          </div>
        </div>
        <div className="network-orientation-links">
          <Link to="/review">
            Review relationships <ArrowUpRight size={16} />
          </Link>
          <Link to="/orbit">
            Explore Orbit <ArrowUpRight size={16} />
          </Link>
          <Link to="/analytics">
            Understand your network <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <div className="directory-toolbar">
        <div
          className="tabs"
          role="tablist"
          aria-label="Directory view"
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            const next =
              e.key === "Home"
                ? "people"
                : e.key === "End"
                  ? "companies"
                  : tab === "people"
                    ? "companies"
                    : "people";
            setTab(next);
            document.getElementById(`directory-${next}-tab`)?.focus();
          }}
        >
          <button
            role="tab"
            id="directory-people-tab"
            aria-controls="directory-results"
            tabIndex={tab === "people" ? 0 : -1}
            aria-selected={tab === "people"}
            className={tab === "people" ? "selected" : ""}
            onClick={() => setTab("people")}
          >
            <Users size={17} />
            People <span>{contacts.length}</span>
          </button>
          <button
            role="tab"
            id="directory-companies-tab"
            aria-controls="directory-results"
            tabIndex={tab === "companies" ? 0 : -1}
            aria-selected={tab === "companies"}
            className={tab === "companies" ? "selected" : ""}
            onClick={() => setTab("companies")}
          >
            <Building2 size={17} />
            Companies <span>{organizations.length}</span>
          </button>
        </div>
        <div className="directory-controls">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Search network"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a familiar face…"
            />
          </label>
          {tab === "people" && (
            <button
              className={"button secondary " + (filters ? "is-selected" : "")}
              aria-expanded={filters}
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={17} />
              <span>Filters</span>
            </button>
          )}
          <select
            aria-label="Sort network"
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="recent">Recently updated</option>
            {tab === "people" && (
              <option value="priority">Highest priority</option>
            )}
          </select>
        </div>
      </div>
      <div className="network-viewbar">
        {tab === "people" && (
          <div className="network-segments" aria-label="Relationship segments">
            {[
              ["all", "Everyone"],
              ["overdue", "Follow-ups overdue"],
              ["pinned", "Pinned"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={smart === id}
                onClick={() => {
                  setSmart(id);
                  setLimit(60);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <details className="network-tools">
          <summary>Directory tools</summary>
          <div className="network-tools-content">
            <label className="field">
              <span>Smart List</span>
              <select value={smart} onChange={(e) => setSmart(e.target.value)}>
                {(tab === "people"
                  ? [...builtInLists, ["pinned", "Pinned relationships"]]
                  : [["all", "All companies"]]
                ).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
                {p.smartLists
                  .filter(
                    (l) =>
                      (l.entityType || "contact") ===
                      (tab === "people" ? "contact" : "organization"),
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </label>
            <BulkTags
              type={tab === "people" ? "contact" : "organization"}
              records={tab === "people" ? people : companies}
            />
            <div
              className="tabs directory-display"
              aria-label="Directory presentation"
            >
              <button
                aria-pressed={display === "list"}
                onClick={() => setDisplay("list")}
              >
                Compact list
              </button>
              <button
                aria-pressed={display === "cards"}
                onClick={() => setDisplay("cards")}
              >
                Cards
              </button>
            </div>
            <Link className="button ghost" to="/orbit">
              Relationship Orbit
            </Link>
            <Link className="button ghost" to="/review">
              Relationship Review
            </Link>
            <Link className="button ghost" to="/lists">
              Manage Smart Lists
            </Link>
            <Link className="button ghost" to="/import">
              Import contacts
            </Link>
          </div>
        </details>
      </div>
      {filters && tab === "people" && (
        <div className="filter-panel">
          <label>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All priorities</option>
              {priorities.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Stage
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All stages</option>
              {stages.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Availability
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="">All availability</option>
              {availabilities.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Relationship
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All relationships</option>
              {categories.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button
            className="button ghost"
            onClick={() => {
              setStage("");
              setPriority("");
              setAvailability("");
              setCategory("");
              setSearch("");
              setSmart("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="results-label">
        <h2>
          {tab === "people" ? people.length : companies.length}{" "}
          {tab === "people" ? "people" : "companies"}
          {smart !== "all" ? " in this view" : " in your network"}
        </h2>
      </div>
      <div
        className={`network-workspace ${tab === "people" && people.length ? "with-context" : ""}`}
      >
        <div>
          <div
            className={`directory-grid ${display === "list" ? "directory-list" : ""}`}
            id="directory-results"
            role="tabpanel"
            aria-labelledby={`directory-${tab}-tab`}
          >
            {tab === "people"
              ? people.slice(0, limit).map((c) => {
                  const org = organizations.find(
                    (o) => o.id === c.organizationId,
                  );
                  const next = p.tasks
                    .filter((t) => t.contactId === c.id && !t.completedAt)
                    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
                  const latest = p.interactions
                    .filter(
                      (i) =>
                        i.contactId === c.id &&
                        i.type !== "Note" &&
                        Date.parse(i.occurredAt) <= Date.now(),
                    )
                    .sort((a, b) =>
                      b.occurredAt.localeCompare(a.occurredAt),
                    )[0];
                  const selected =
                    (people.find((c) => c.id === selectedId) || people[0])
                      ?.id === c.id;
                  return (
                    <article
                      className={`network-person ${selected ? "context-selected" : ""}`}
                      key={c.id}
                    >
                      <Link
                        to={`/network/people/${c.id}`}
                        state={{
                          networkReturn:
                            "/network" +
                            (params.size ? "?" + params.toString() : ""),
                        }}
                        className="profile-card"
                      >
                        <div className="profile-card-top">
                          <Avatar
                            mediaId={c.avatar}
                            name={c.name}
                            size="large"
                          />
                          {["VIP", "High"].includes(c.priority) ? (
                            <Badge tone="amber">
                              {c.priority === "VIP" ? "★ VIP" : "High priority"}
                            </Badge>
                          ) : (
                            <ArrowUpRight size={18} className="muted" />
                          )}
                        </div>
                        <h3>{c.name}</h3>
                        <p>{c.role || "A new connection"}</p>
                        <div className="company-line">
                          <Building2 size={14} />
                          {org?.name || "Independent"}
                        </div>
                        <div className="network-row-context">
                          <span className="network-row-label">
                            {next
                              ? "NEXT STEP"
                              : latest
                                ? "LAST CONVERSATION"
                                : "RELATIONSHIP"}
                          </span>
                          <strong>
                            {next?.title ||
                              (latest
                                ? latest.summary.slice(0, 100) +
                                  (latest.summary.length > 100 ? "…" : "")
                                : "No conversations logged")}
                          </strong>
                          <small>
                            {next
                              ? `${taskState(next, p.settings.timezone)} · ${date(next.dueAt)}`
                              : latest
                                ? `${latest.type} · ${date(latest.occurredAt)}`
                                : "A story waiting to be told"}
                          </small>
                        </div>
                        <div className="profile-card-bottom">
                          <Badge tone="purple">
                            {p.intelligence.relationships.find(
                              (r) => r.contactId === c.id,
                            )?.health || "Not enough history"}
                          </Badge>
                          <Badge
                            tone={
                              c.stage === "Proposal"
                                ? "purple"
                                : c.stage === "Engaged"
                                  ? "green"
                                  : ""
                            }
                          >
                            {c.stage}
                          </Badge>
                          <span
                            className={
                              "availability-label " +
                              (insights.get(c.id)?.availability === "Available"
                                ? "available"
                                : "")
                            }
                          >
                            <i />
                            {insights.get(c.id)?.availability === "Available"
                              ? "Available"
                              : insights.get(c.id)?.availability ===
                                  "Temporarily unavailable"
                                ? "Paused"
                                : insights.get(c.id)?.availability}
                          </span>
                        </div>
                      </Link>
                      <button
                        className="network-context-toggle"
                        aria-controls="network-relationship-context"
                        aria-label={`View context for ${c.name}`}
                        aria-pressed={selected}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <ArrowUpRight size={17} />
                        <span>Context</span>
                      </button>
                    </article>
                  );
                })
              : companies.slice(0, limit).map((o) => (
                  <Link
                    key={o.id}
                    to={`/network/companies/${o.id}`}
                    state={{
                      networkReturn:
                        "/network" +
                        (params.size ? "?" + params.toString() : ""),
                    }}
                    className="profile-card company-card"
                  >
                    <div className="profile-card-top">
                      <Avatar
                        mediaId={o.avatar}
                        name={o.name}
                        company
                        size="large"
                      />
                      <Badge>{o.industry || "Company"}</Badge>
                    </div>
                    <h3>{o.name}</h3>
                    <p className="company-description">
                      {o.description || "The next chapter starts here."}
                    </p>
                    <div className="company-line">
                      <MapPin size={14} />
                      {o.location || "Location not added"}
                    </div>
                    <div className="profile-card-bottom">
                      <span className="company-line">
                        <Users size={15} />
                        {
                          contacts.filter((c) => c.organizationId === o.id)
                            .length
                        }{" "}
                        people
                      </span>
                      <ArrowUpRight size={17} />
                    </div>
                  </Link>
                ))}
          </div>
          {(tab === "people" ? people.length : companies.length) > limit && (
            <button
              className="button secondary"
              onClick={() => setLimit(limit + 60)}
            >
              Show more connections
            </button>
          )}
          {!(tab === "people" ? people.length : companies.length) && (
            <Empty
              title={
                search ||
                stage ||
                priority ||
                availability ||
                category ||
                smart !== "all"
                  ? "No connections found"
                  : "A little space for possibility"
              }
              body="Try a different search, or add your first connection."
              action={
                search ||
                stage ||
                priority ||
                availability ||
                category ||
                smart !== "all" ? (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSearch("");
                      setSmart("all");
                      setPriority("");
                      setStage("");
                      setAvailability("");
                      setCategory("");
                    }}
                  >
                    Reset search & filters
                  </button>
                ) : (
                  <button
                    className="button primary"
                    onClick={() =>
                      setEditor({
                        kind: tab === "people" ? "contact" : "company",
                      })
                    }
                  >
                    <Plus size={17} />
                    Add {tab === "people" ? "person" : "company"}
                  </button>
                )
              }
            />
          )}
        </div>
        {tab === "people" && people.length > 0 && (
          <NetworkContext
            contact={people.find((c) => c.id === selectedId) || people[0]}
            onEdit={setEditor}
          />
        )}
      </div>
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
