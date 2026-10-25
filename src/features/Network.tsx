import { useState } from "react";
import { Link } from "react-router-dom";
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
import { priorities, stages } from "../data/models";
export function Network() {
  const { contacts, organizations } = usePulse();
  const [tab, setTab] = useState<"people" | "companies">("people");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState("name");
  const [filters, setFilters] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const query = search.toLowerCase();
  const people = contacts
    .filter(
      (c) =>
        `${c.name} ${c.role} ${c.emails.join(" ")} ${c.tags.join(" ")} ${organizations.find((o) => o.id === c.organizationId)?.name || ""}`
          .toLowerCase()
          .includes(query) &&
        (!priority || c.priority === priority) &&
        (!stage || c.stage === stage),
    )
    .sort((a, b) =>
      sort === "priority"
        ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
        : sort === "recent"
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.name.localeCompare(b.name),
    );
  const companies = organizations
    .filter((o) =>
      `${o.name} ${o.industry} ${o.location} ${o.tags.join(" ")}`
        .toLowerCase()
        .includes(query),
    )
    .sort((a, b) =>
      sort === "recent"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.name.localeCompare(b.name),
    );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEOPLE FIRST. ALWAYS.</p>
          <h1>
            Your circle of possibility<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Keep the people, companies, and little details that matter close.
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
      </div>
      <div className="directory-toolbar">
        <div className="tabs" role="tablist" aria-label="Directory view">
          <button
            role="tab"
            aria-selected={tab === "people"}
            className={tab === "people" ? "selected" : ""}
            onClick={() => setTab("people")}
          >
            <Users size={17} />
            People <span>{contacts.length}</span>
          </button>
          <button
            role="tab"
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
          <button
            className="button ghost"
            onClick={() => {
              setStage("");
              setPriority("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="results-label">
        <span>
          {tab === "people" ? people.length : companies.length}{" "}
          {tab === "people" ? "people" : "companies"} in your orbit
        </span>
        <span>Good connections grow here.</span>
      </div>
      <div className="directory-grid">
        {tab === "people"
          ? people.map((c) => {
              const org = organizations.find((o) => o.id === c.organizationId);
              return (
                <Link
                  key={c.id}
                  to={`/network/people/${c.id}`}
                  className="profile-card"
                >
                  <div className="profile-card-top">
                    <Avatar name={c.name} size="large" />
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
                  <div className="profile-card-bottom">
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
                        (c.availability === "Available" ? "available" : "")
                      }
                    >
                      <i />
                      {c.availability === "Available"
                        ? "Available"
                        : c.availability === "Temporarily unavailable"
                          ? "Paused"
                          : c.availability}
                    </span>
                  </div>
                </Link>
              );
            })
          : companies.map((o) => (
              <Link
                key={o.id}
                to={`/network/companies/${o.id}`}
                className="profile-card company-card"
              >
                <div className="profile-card-top">
                  <Avatar name={o.name} company size="large" />
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
                      contacts.filter((c) => c.organizationId === o.id).length
                    }{" "}
                    people
                  </span>
                  <ArrowUpRight size={17} />
                </div>
              </Link>
            ))}
      </div>
      {!(tab === "people" ? people.length : companies.length) && (
        <Empty
          title={
            search ? "No connections found" : "A little space for possibility"
          }
          body="Try a different search, or add your first connection."
          action={
            <button
              className="button primary"
              onClick={() =>
                setEditor({ kind: tab === "people" ? "contact" : "company" })
              }
            >
              <Plus size={17} />
              Add {tab === "people" ? "person" : "company"}
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
