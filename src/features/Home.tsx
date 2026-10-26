import { GettingStarted } from "../components/GettingStarted";
import { ProgressSummary } from "../components/progress";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Heart,
  MessageCircle,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { usePulse } from "../app/context";
import {
  Avatar,
  Badge,
  Empty,
  SectionHeading,
  useFormat,
  ViewLink,
} from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { completeTask } from "../data/repository";
import { overdue } from "../services/recommendations";
export function Home() {
  const p = usePulse();
  const { date, money } = useFormat();
  const [editor, setEditor] = useState<Editor | null>(null);
  const recs = p.intelligence.queue
    .filter((r) => r.contactId)
    .map((r) => ({
      ...r,
      contact: p.contacts.find((c) => c.id === r.contactId)!,
    }));
  const outstanding = p.tasks.filter((t) => !t.completedAt);
  const pipeline = p.opportunities
    .filter((o) => o.status === "open")
    .reduce((v, o) => v + (o.currency === "USD" ? o.value || 0 : 0), 0);
  const recent = [...p.contacts]
    .sort((a, b) => {
      const time = (id: string) =>
        p.interactions.find((i) => i.contactId === id)?.occurredAt || "";
      return time(b.id).localeCompare(time(a.id));
    })
    .slice(0, 5);
  return (
    <div className="page home-page page-enter">
      <div className="page-heading">
        <div>
          <p className="eyebrow date-label">
            {date(new Date().toISOString(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            <span className="tiny-dot" />
            YOUR DAILY PULSE
          </p>
          <h1>
            A good day to connect<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Welcome{p.settings.name ? ` back, ${p.settings.name}` : ""}. A
            little intention goes a long way.
          </p>
        </div>
        <button
          className="button primary desktop-quick"
          onClick={() => setEditor({ kind: "contact" })}
        >
          <Plus size={17} />
          New connection
        </button>
      </div>
      <GettingStarted />
      {p.contacts.length > 0 ||
      p.organizations.length > 0 ||
      p.tasks.length > 0 ||
      p.opportunities.length > 0 ? (
        <>
          <div className="home-columns">
            <div className="home-primary">
              <section className="surface">
                <SectionHeading
                  title="Today’s relationship focus"
                  eyebrow="YOUR NEXT BEST CONNECTION"
                  action={
                    <span className="soft-icon">
                      <Sparkles size={19} />
                    </span>
                  }
                />
                <p className="section-description">
                  Explainable reviews, based on recorded history and
                  commitments.
                </p>
                <div className="recommendation-list">
                  {recs.slice(0, p.settings.intelligence.homeLimit).map((r) => (
                    <div className="recommendation" key={r.key}>
                      <Link
                        to={`/network/people/${r.contact.id}`}
                        className="person-summary"
                      >
                        <Avatar name={r.contact.name} />
                        <div>
                          <strong>{r.contact.name}</strong>
                          <span>
                            {p.organizations.find(
                              (o) => o.id === r.contact.organizationId,
                            )?.name || "Independent"}
                            <span className="inline-dot">·</span>
                            {r.contact.role}
                          </span>
                          <small>
                            <Clock3 size={12} />
                            {r.reason}
                          </small>
                        </div>
                      </Link>
                      <div className="recommendation-action">
                        <button
                          className="button secondary small-button"
                          onClick={() =>
                            setEditor({
                              kind: "interaction",
                              contact: r.contact,
                            })
                          }
                        >
                          Log a touchpoint
                          <ArrowUpRight size={14} />
                        </button>
                        <button
                          className="dismiss-link"
                          onClick={() =>
                            p.run(
                              () =>
                                p.setSettings({
                                  dismissed: [...p.settings.dismissed, r.key],
                                }),
                              "Suggestion dismissed",
                            )
                          }
                        >
                          Dismiss suggestion
                        </button>
                      </div>
                    </div>
                  ))}
                  {!recs.length && (
                    <Empty
                      title="Your relationships have room to breathe"
                      body="No reconnections are due. Add people or adjust your thresholds in Settings."
                    />
                  )}
                </div>
                <Link to="/review" className="surface-footer">
                  Open Relationship Review
                  <ArrowRight size={16} />
                </Link>
              </section>
              {p.intelligence.opportunities.some((o) => o.flags.length > 0) &&
                p.settings.intelligence.enabled &&
                p.settings.intelligence.opportunities && (
                  <section className="surface">
                    <SectionHeading
                      title="Opportunities to review"
                      action={<ViewLink to="/review" />}
                    />
                    {p.intelligence.opportunities
                      .filter((o) => o.flags.length)
                      .slice(0, 2)
                      .map((insight) => {
                        const deal = p.opportunities.find(
                          (o) => o.id === insight.opportunityId,
                        )!;
                        return (
                          <button
                            className="opportunity-review-link"
                            key={deal.id}
                            onClick={() =>
                              setEditor({ kind: "opportunity", record: deal })
                            }
                          >
                            <strong>{deal.title}</strong>
                            <span>{insight.flags[0]}</span>
                          </button>
                        );
                      })}
                  </section>
                )}
              <section className="surface">
                <SectionHeading
                  title="Conversations in motion"
                  action={<ViewLink to="/activity" />}
                />
                <div className="mini-timeline">
                  {p.events.slice(0, 3).map((e) => (
                    <div key={e.id} className="timeline-row">
                      <span className="timeline-dot">
                        <MessageCircle size={15} />
                      </span>
                      <div>
                        {e.contactId ? (
                          <Link to={`/network/people/${e.contactId}`}>
                            {e.summary}
                          </Link>
                        ) : (
                          <strong>{e.summary}</strong>
                        )}
                        <small>
                          {date(e.createdAt, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </div>
                  ))}
                  {!p.events.length && (
                    <p className="muted">
                      Your relationship story starts with your first connection.
                    </p>
                  )}
                </div>
              </section>
            </div>
            <aside className="home-secondary">
              <section className="surface follow-up-panel">
                <SectionHeading
                  title="On your radar"
                  action={
                    <Link to="/activity" className="count-pill">
                      {outstanding.length}
                    </Link>
                  }
                />
                <p className="section-description">
                  Small steps. Meaningful progress.
                </p>
                <div className="task-list">
                  {outstanding.slice(0, 4).map((t) => {
                    const c = p.contacts.find((c) => c.id === t.contactId);
                    return (
                      <div className="task-row" key={t.id}>
                        <button
                          className="task-check"
                          aria-label={`Complete ${t.title}`}
                          onClick={() =>
                            p.run(
                              () => completeTask(p.db, t.id),
                              "One thoughtful step, complete.",
                            )
                          }
                        >
                          <Check size={13} />
                        </button>
                        <div>
                          <strong>{t.title}</strong>
                          {c && (
                            <Link to={`/network/people/${c.id}`}>{c.name}</Link>
                          )}
                          <small className={overdue(t) ? "overdue" : ""}>
                            {overdue(t) ? "Overdue · " : ""}
                            {date(t.dueAt)}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                  {!outstanding.length && (
                    <div className="small-empty">
                      <CheckCheck />
                      <p>All clear. Plan your next meaningful step.</p>
                    </div>
                  )}
                </div>
                <button
                  className="button add-task"
                  onClick={() => setEditor({ kind: "task" })}
                >
                  <Plus size={16} />
                  Plan a follow-up
                </button>
              </section>
              <ProgressSummary />
              <section className="recent-section">
                <SectionHeading
                  title="Familiar faces"
                  action={<ViewLink to="/network" />}
                />
                <div className="face-stack">
                  {recent.map((c) => (
                    <Link
                      key={c.id}
                      to={`/network/people/${c.id}`}
                      aria-label={`Open ${c.name}`}
                    >
                      <Avatar name={c.name} />
                    </Link>
                  ))}
                </div>
                <p className="muted">The people behind the possibilities.</p>
              </section>
            </aside>
          </div>
          <div className="home-explore">
            <section className="hero-card">
              <div className="hero-copy">
                <Badge tone="hero-badge">
                  <span className="live-dot" />
                  IN GOOD COMPANY
                </Badge>
                <h2>
                  Keep your
                  <br />
                  relationships moving.
                </h2>
                <p>
                  Pick up where you left off. Make the next
                  <br className="desktop-break" /> conversation a meaningful
                  one.
                </p>
                <Link to="/network" className="button hero-button">
                  Explore your network
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="relationship-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="orbit orbit-three" />
                <div className="orbit-center">
                  <Heart size={35} fill="currentColor" />
                </div>
                <div className="orbit-person person-one">
                  <Avatar name="Olivia Chen" size="large" />
                  <span className="orbit-label">A familiar face</span>
                </div>
                <div className="orbit-person person-two">
                  <Avatar name="Marcus Johnson" size="large" />
                </div>
                <div className="orbit-person person-three">
                  <Avatar name="Sofia Rivera" />
                </div>
                <div className="orbit-person person-four">
                  <Avatar name="James Park" />
                </div>
                <div className="art-spark spark-one">✳</div>
                <div className="art-spark spark-two">✦</div>
                <div className="art-message">
                  <MessageCircle size={16} />
                  <span>Good things start with hello.</span>
                </div>
              </div>
            </section>
            <Link className="button ghost" to="/assistant">
              Open PULSE Intelligence · optional AI
            </Link>
            <div className="stats-grid">
              <Link to="/network" className="stat-card">
                <span className="stat-icon lavender">
                  <Users size={19} />
                </span>
                <div>
                  <span className="stat-name">Your network</span>
                  <strong>
                    {p.contacts.length}
                    <small>people</small>
                  </strong>
                </div>
                <ArrowUpRight size={17} />
              </Link>
              <Link to="/activity" className="stat-card">
                <span className="stat-icon peach">
                  <Clock3 size={19} />
                </span>
                <div>
                  <span className="stat-name">Next steps</span>
                  <strong>
                    {outstanding.length}
                    <small>follow-ups</small>
                  </strong>
                </div>
                <ArrowUpRight size={17} />
              </Link>
              <Link to="/pipeline" className="stat-card">
                <span className="stat-icon sage">
                  <TrendingUp size={19} />
                </span>
                <div>
                  <span className="stat-name">Open opportunities</span>
                  <strong>
                    {money(pipeline, "USD")}
                    <small>USD pipeline</small>
                  </strong>
                </div>
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </>
      ) : (
        <section className="surface">
          <h2>A little intention goes a long way.</h2>
          <p>
            Add a person, a company or import your existing contacts. Your
            Personal workspace contains no fictional demo records.
          </p>
          <div className="profile-actions">
            <button
              className="button primary"
              onClick={() => setEditor({ kind: "contact" })}
            >
              Add someone
            </button>
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "company" })}
            >
              Add a company
            </button>
            <Link className="button secondary" to="/import">
              Import contacts
            </Link>
            <Link className="button ghost" to="/help">
              Getting started
            </Link>
          </div>
        </section>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
