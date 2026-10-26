import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Badge, Empty, SectionHeading, useFormat } from "./ui";
import type { Editor } from "./forms";
import { TaskRow } from "./relationship";
import { eligible } from "../services/recommendations";
export function ProgressSummary() {
  const p = usePulse(),
    v = p.progress;
  if (!p.settings.gamification) return null;
  return (
    <section className="surface momentum-summary" aria-label="Your progress">
      <SectionHeading title="Your momentum" />
      {p.rewards.filter((r) => r.day === v.day).length >= 10 && (
        <p className="inline-notice">
          Today’s reward limit is reached. Your CRM work remains available; new
          grants resume on the next progress day.
        </p>
      )}
      {!p.settings.progress.enabled ? (
        <>
          <p>
            Optional encouragement for meaningful work. Turn on tracking to
            start earning XP; existing records are never backfilled.
          </p>
          <Link className="button secondary" to="/settings?section=progress">
            Configure progress in Settings
          </Link>
        </>
      ) : (
        <>
          <div className="momentum-numbers">
            <strong>Level {v.level}</strong>
            <Badge tone="purple">{v.xp} XP</Badge>
          </div>
          <progress
            aria-label="Current level progress"
            value={v.levelXP}
            max={100}
          />
          <p className="muted">
            {v.levelXP} / 100 XP toward level {v.level + 1}. Every 100 XP adds
            one level.
          </p>
          {p.settings.progress.weeklyGoal > 0 && (
            <p>
              {v.weekly} / {p.settings.progress.weeklyGoal} qualifying
              follow-ups this week
            </p>
          )}
          {p.settings.progress.streak && (
            <p>
              {v.streak} day{v.streak === 1 ? "" : "s"} of momentum · longest{" "}
              {v.longest}
            </p>
          )}
          {p.settings.progress.streakReminders &&
            v.streak > 0 &&
            !p.rewards.some((r) => r.active && r.day === v.day) && (
              <p className="inline-notice">
                A small intention for today: review your planned commitments
                when you have time. No background reminder is sent.
              </p>
            )}
          <Link className="button ghost" to="/activity?view=progress">
            See progress & criteria
          </Link>
        </>
      )}
    </section>
  );
}
export function ProgressDetails({ onEdit }: { onEdit: (e: Editor) => void }) {
  const p = usePulse(),
    v = p.progress,
    { date } = useFormat(),
    prefs = p.settings.progress;
  const quests = v.quests;
  return (
    <div className="progress-workspace">
      <ProgressSummary />
      <section className="surface">
        <SectionHeading title="A clear starting point" />
        <p>
          Progress tracking is {prefs.enabled ? "on" : "off"}. Turning it off
          pauses new earning and quests, while keeping history and applying
          source corrections.
        </p>
        {p.progressState && (
          <p>
            Tracking started {date(p.progressState.startedAt)}. Progress
            calendar: <strong>{p.progressState.timezone}</strong>. This calendar
            stays fixed after tracking starts, even if you change display
            timezone. Weeks begin Monday.
          </p>
        )}
        <details>
          <summary>What counts, and why</summary>
          <ul className="reward-rules">
            <li>
              5 XP: complete a previously saved follow-up linked to an eligible
              contact, with a title of at least 12 characters or a description
              of at least 20.
            </li>
            <li>
              10 XP: save a call or meeting with an eligible contact, at least
              40 characters of summary, occurring within the preceding 24 hours.
              These checks reject empty entries; they cannot judge quality or
              prove an outreach outcome.
            </li>
            <li>
              5 XP: move an existing open opportunity to Won or Lost, with at
              least 20 characters of outcome notes and eligible associated
              contacts.
            </li>
            <li>
              At most 10 original entitlements per calendar day. Equivalent
              same-day records do not earn again. Reopening reverses XP;
              recompleting restores the same entitlement and original day.
              Deleted sources retain a non-earning tombstone.
            </li>
            <li>
              Imports, restores, notes, profile creation and ordinary edits earn
              nothing. Quests and achievements add no bonus XP. Past-day records
              do not manufacture streaks. Legitimate CRM work remains available
              regardless of reward eligibility.
            </li>
          </ul>
        </details>
        <Link className="button ghost" to="/settings?section=progress">
          Manage progress preferences
        </Link>
      </section>
      {prefs.enabled && prefs.quests && (
        <section className="surface">
          <SectionHeading title="Today's small intentions" />
          <p className="muted">
            Up to three saved commitments. Complete the specific qualifying task
            today. No extra XP for a quest.
          </p>
          {quests.map((q) => {
            const t = p.tasks.find((t) => t.id === q.taskId),
              c = p.contacts.find((c) => c.id === t?.contactId),
              available = !!c && eligible(c, p.permissions, p.restrictions);
            return (
              <div className="quest-row" key={q.id}>
                <Badge tone={q.complete ? "green" : "purple"}>
                  {q.complete ? "Completed" : "Planned"}
                </Badge>
                <h3>{q.title}</h3>
                {!t ? (
                  <p>
                    Task removed. This saved intention is no longer available.
                  </p>
                ) : !available ? (
                  <p>
                    Outreach is restricted. Review the profile; this intention
                    does not override restrictions.
                    {c && (
                      <Link
                        className="button ghost"
                        to={`/network/people/${c.id}`}
                      >
                        Open profile
                      </Link>
                    )}
                  </p>
                ) : (
                  <TaskRow task={t} onEdit={onEdit} />
                )}
              </div>
            );
          })}
          {!quests.length && (
            <Empty
              title="Room to breathe"
              body="No eligible follow-ups are due. Your existing work can guide tomorrow's intentions."
            />
          )}
        </section>
      )}
      {prefs.achievements && prefs.enabled && (
        <section className="surface">
          <SectionHeading title="Meaningful milestones" />
          <p className="muted">
            Criteria are recalculated from active entitlements. Corrections can
            relock a milestone. No bonus XP.
          </p>
          <div className="milestone-grid">
            {v.achievements.map((a) => (
              <article className="milestone" key={a.id}>
                <Badge tone={a.unlocked ? "green" : ""}>
                  {a.unlocked ? "Unlocked" : "In progress"}
                </Badge>
                <h3>{a.title}</h3>
                <p>{a.criteria}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="surface">
        <SectionHeading title="Reward & correction history" />
        <p className="muted">
          Original earning dates stay fixed. CRM activity remains in the
          Activity timeline.
        </p>
        {p.rewardChanges.slice(0, 40).map((change) => {
          const reward = p.rewards.find((r) => r.id === change.rewardId);
          return (
            <div className="reward-history" key={change.id}>
              <Badge>{change.action}</Badge>
              <div>
                <strong>{reward?.rule || "Recorded progress"}</strong>
                <p>{change.reason}</p>
                <small>
                  {date(change.at, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            </div>
          );
        })}
        {!p.rewardChanges.length && (
          <p>No rewards recorded yet. Your CRM is ready whenever you are.</p>
        )}
        {p.rewardChanges.length > 40 && (
          <p>
            Showing the latest 40 corrections. Export a full backup to retain
            all history.
          </p>
        )}
      </section>
    </div>
  );
}

export function ProgressSettings() {
  const p = usePulse();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="progress-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const f = new FormData(e.currentTarget);
        await p.run(
          () =>
            p.setSettings({
              gamification: f.get("widgets") === "on",
              progress: {
                enabled: f.get("enabled") === "on",
                achievements: f.get("achievements") === "on",
                quests: f.get("quests") === "on",
                streak: f.get("streak") === "on",
                streakReminders: f.get("streakReminders") === "on",
                celebrations: f.get("celebrations") === "on",
                weeklyGoal: Number(f.get("weeklyGoal")),
              },
            }),
          "Progress preferences saved",
        );
        setBusy(false);
      }}
    >
      {[
        [
          "enabled",
          "Earn XP from meaningful work",
          p.settings.progress.enabled,
        ],
        ["widgets", "Show progress widgets", p.settings.gamification],
        ["achievements", "Show achievements", p.settings.progress.achievements],
        ["quests", "Enable daily quests", p.settings.progress.quests],
        ["streak", "Show streaks", p.settings.progress.streak],
        [
          "streakReminders",
          "Show an active-app streak reminder",
          p.settings.progress.streakReminders,
        ],
        [
          "celebrations",
          "Allow subtle success animations",
          p.settings.progress.celebrations,
        ],
      ].map(([name, label, checked]) => (
        <label className="setting-toggle" key={String(name)}>
          <strong>{String(label)}</strong>
          <input
            type="checkbox"
            name={String(name)}
            defaultChecked={Boolean(checked)}
          />
        </label>
      ))}
      <label className="field">
        <span>Weekly follow-up goal (0 disables)</span>
        <input
          name="weeklyGoal"
          type="number"
          min="0"
          max="100"
          required
          defaultValue={p.settings.progress.weeklyGoal}
        />
      </label>
      <p className="inline-notice">
        Tracking starts when enabled. Turning XP off preserves history and
        corrections but pauses new earning. Hiding widgets does not pause
        earning. Quests and achievements add no bonus XP. Reminders are visible
        only while PULSE is open; no background notifications.
      </p>
      {p.progressState && (
        <p className="muted">
          Fixed progress calendar: {p.progressState.timezone}. Changing display
          timezone does not move past days or create awards.
        </p>
      )}
      <button className="button primary" type="submit" disabled={busy}>
        Save progress preferences
      </button>
      <Link className="button ghost" to="/activity?view=progress">
        View progress and reward rules
      </Link>
    </form>
  );
}
