import { Link } from "react-router-dom";
import { useRef, useState, type FormEvent } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronRight,
  Download,
  HardDrive,
  Laptop,
  LockKeyhole,
  Moon,
  Palette,
  Plug,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { usePulse } from "../app/context";
import { Badge, Confirm, SectionHeading } from "../components/ui";
import {
  exportBackup,
  restoreBackup,
  validateBackup,
} from "../data/repository";
import { resetWorkspace } from "../data/seed";
import type { Settings as Preferences } from "../data/models";
function download(content: string, name: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Settings() {
  const p = usePulse();
  const [section, setSection] = useState("appearance");
  const [confirm, setConfirm] = useState<"reset" | "delete" | "restore" | null>(
    null,
  );
  const [backup, setBackup] = useState<unknown>(null);
  const [fileError, setFileError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState("");
  const tabs = [
    ["appearance", "Appearance"],
    ["relationships", "Relationship rhythm"],
    ["alerts", "Notifications"],
    ["progress", "Your momentum"],
    ["data", "Privacy & data"],
    ["integrations", "Integrations"],
  ];
  async function update(patch: Partial<Preferences>) {
    await p.run(() => p.setSettings(patch), "Preferences saved");
  }
  async function saveRhythm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    await update({
      intelligence: {
        ...p.settings.intelligence,
        ...Object.fromEntries(
          [
            "coolingDays",
            "dormantDays",
            "stalledDays",
            "closingDays",
            "snoozeDays",
            "homeLimit",
          ].map((k) => [k, Number(d.get(k))]),
        ),
        ...Object.fromEntries(
          ["enabled", "opportunities", "noHistory", "timeoutReviews"].map(
            (k) => [k, d.get(k) === "on"],
          ),
        ),
      },
      name: String(d.get("name")),
      locale: String(d.get("locale")),
      timezone: String(d.get("timezone")),
      reconnectDays: Number(d.get("reconnectDays")),
      priorityDays: Number(d.get("priorityDays")),
      followUpDays: Number(d.get("followUpDays")),
      timeoutDays: Number(d.get("timeoutDays")),
    });
  }
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>
            Your space, your rhythm<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Small preferences that make PULSE feel more like you.
          </p>
        </div>
        <Badge tone="green">
          <ShieldCheck size={14} />
          Local-first, always
        </Badge>
      </div>
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings categories">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              onClick={() => setSection(key)}
            >
              {label}
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <section className="surface settings-content">
          {section === "appearance" && (
            <>
              <SectionHeading
                title="A look that feels like you"
                eyebrow="APPEARANCE"
              />
              <p className="section-description">
                A softer workspace, from your first coffee to your last
                follow-up.
              </p>
              <div className="theme-options">
                {(
                  [
                    { key: "light", label: "Light", icon: Sun },
                    { key: "dark", label: "Dark", icon: Moon },
                    { key: "system", label: "Follow device", icon: Laptop },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={
                      "theme-option " +
                      (p.settings.theme === key ? "selected" : "")
                    }
                    aria-pressed={p.settings.theme === key}
                    onClick={() => update({ theme: key })}
                  >
                    <div className={`theme-preview ${key}`}>
                      <span />
                      <div>
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                    <span>
                      <Icon size={17} />
                      {label}
                      {p.settings.theme === key && <Check size={17} />}
                    </span>
                  </button>
                ))}
              </div>
              <label className="setting-toggle">
                <div>
                  <strong>Reduce motion</strong>
                  <small>
                    Keep transitions quiet. Device preferences are also
                    respected.
                  </small>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.settings.reducedMotion}
                  onChange={(e) => update({ reducedMotion: e.target.checked })}
                />
              </label>
            </>
          )}
          {section === "relationships" && (
            <>
              <SectionHeading
                title="Every relationship has its own pace"
                eyebrow="RELATIONSHIP RHYTHM"
              />
              <p className="section-description">
                These transparent rules guide your reconnection suggestions.
              </p>
              <form onSubmit={saveRhythm} key={p.workspace}>
                <div className="form-grid">
                  <label className="field wide">
                    <span>Your preferred name</span>
                    <input
                      name="name"
                      maxLength={80}
                      defaultValue={p.settings.name}
                    />
                  </label>
                  {[
                    { key: "reconnectDays", label: "Reconnect after (days)" },
                    {
                      key: "priorityDays",
                      label: "High / VIP priority after (days)",
                    },
                    { key: "followUpDays", label: "Default follow-up (days)" },
                    { key: "timeoutDays", label: "Default pause (days)" },
                  ].map(({ key, label }) => (
                    <label className="field" key={key}>
                      <span>{label}</span>
                      <input
                        type="number"
                        name={key}
                        min={1}
                        max={365}
                        required
                        defaultValue={p.settings[key as "reconnectDays"]}
                      />
                    </label>
                  ))}
                  <label className="field">
                    <span>Locale</span>
                    <input
                      name="locale"
                      required
                      defaultValue={p.settings.locale}
                      placeholder="en-US"
                    />
                  </label>
                  <label className="field">
                    <span>Display timezone</span>
                    <input
                      name="timezone"
                      required
                      defaultValue={p.settings.timezone}
                      placeholder="America/Chicago"
                    />
                  </label>
                </div>
                <details className="intelligence-settings">
                  <summary>Relationship intelligence settings</summary>
                  <p className="field-help">
                    Cooling and dormant thresholds are at least your applicable
                    review threshold. Unknown history is never classified as
                    cooling or dormant. Stalled opportunities require a real
                    linked conversation.
                  </p>
                  <div className="form-grid">
                    {[
                      { key: "coolingDays", label: "Cooling after (days)" },
                      { key: "dormantDays", label: "Dormant after (days)" },
                      {
                        key: "stalledDays",
                        label: "Stalled opportunity after (days)",
                      },
                      {
                        key: "closingDays",
                        label: "Closing soon window (days)",
                      },
                      { key: "snoozeDays", label: "Default snooze (days)" },
                      { key: "homeLimit", label: "Maximum Home reviews" },
                    ].map(({ key, label }) => (
                      <label className="field" key={key}>
                        <span>{label}</span>
                        <input
                          type="number"
                          name={key}
                          required
                          min={1}
                          max={
                            key === "homeLimit"
                              ? 10
                              : key === "coolingDays" ||
                                  key === "dormantDays" ||
                                  key === "stalledDays"
                                ? 3650
                                : 365
                          }
                          defaultValue={
                            p.settings.intelligence[key as "coolingDays"]
                          }
                        />
                      </label>
                    ))}
                  </div>
                  {[
                    { key: "enabled", label: "Enable relationship reviews" },
                    {
                      key: "opportunities",
                      label: "Include opportunity reviews",
                    },
                    {
                      key: "noHistory",
                      label: "Include contacts without recorded history",
                    },
                    {
                      key: "timeoutReviews",
                      label: "Review ended temporary pauses",
                    },
                  ].map(({ key, label }) => (
                    <label key={key} className="check-confirm">
                      <input
                        type="checkbox"
                        name={key}
                        defaultChecked={
                          p.settings.intelligence[key as "enabled"]
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </details>
                <p className="field-help">
                  Display dates use your selected timezone. Date and time inputs
                  use this device's timezone. Paused and restricted people are
                  excluded from reconnect suggestions.
                </p>
                <div className="form-actions">
                  <button className="button primary">Save your rhythm</button>
                </div>
              </form>
            </>
          )}
          {section === "alerts" && (
            <>
              <SectionHeading
                title="The right nudge, at the right time"
                eyebrow="IN-APP NOTIFICATIONS"
              />
              <p className="section-description">
                PULSE checks reminders when open or active. Background, email,
                and mobile push delivery are not available.
              </p>
              {(
                [
                  {
                    key: "tasks",
                    label: "Overdue tasks",
                    description:
                      "Show overdue task alerts in the notification center.",
                  },
                  {
                    key: "followUps",
                    label: "Upcoming follow-ups",
                    description:
                      "Include due-soon follow-ups in the notification center.",
                  },
                  {
                    key: "relationships",
                    label: "Reconnection nudges",
                    description:
                      "Show eligible inactive relationship reminders in the notification center.",
                  },
                ] as const
              ).map((v) => (
                <label className="setting-toggle" key={v.key}>
                  <div>
                    <strong>{v.label}</strong>
                    <small>{v.description}</small>
                  </div>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={p.settings.alerts[v.key]}
                    onChange={(e) =>
                      update({
                        alerts: {
                          ...p.settings.alerts,
                          [v.key]: e.target.checked,
                        },
                      })
                    }
                  />
                </label>
              ))}
              <div className="inline-notice">
                Delivery: in-app only. Browser notifications, quiet hours, and
                scheduled summaries are planned.
              </div>
            </>
          )}
          {section === "progress" && (
            <>
              <SectionHeading
                title="Progress at your own pace"
                eyebrow="YOUR MOMENTUM"
              />
              <p className="section-description">
                A little encouragement for meaningful work, without the
                pressure.
              </p>
              <label className="setting-toggle">
                <div>
                  <strong>Daily momentum summary</strong>
                  <small>
                    Show today's completed follow-ups on Daily Pulse.
                  </small>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.settings.gamification}
                  onChange={(e) => update({ gamification: e.target.checked })}
                />
              </label>
              <p className="inline-notice">
                XP, levels, achievements, quests, and streaks are planned.
                Today's progress comes from your actual completed tasks.
              </p>
            </>
          )}
          {section === "data" && (
            <>
              <SectionHeading
                title="Your relationships. Your data."
                eyebrow="PRIVACY & DATA"
              />
              <p className="section-description">
                Your CRM stays in this browser's IndexedDB. PULSE sends no CRM
                records to AI or external services.
              </p>
              <div className="privacy-note">
                <LockKeyhole size={22} />
                <p>
                  Local storage is not application-level encryption. Anyone with
                  access to this browser profile may access your records.
                  Clearing browser data can erase your workspace. Keep regular
                  backups in a safe place.
                </p>
              </div>
              <div className="data-action">
                <div>
                  <strong>Import contacts from CSV</strong>
                  <small>
                    Add or selectively update contacts after mapping, validation
                    and duplicate review. This does not replace the workspace.
                  </small>
                </div>
                <Link className="button secondary" to="/import">
                  Import contacts
                </Link>
              </div>
              <p className="field-help">
                Storage belongs to this site origin. To move between GitHub
                Pages, Cloudflare or another device, export a backup here and
                restore it there. There is no cloud synchronization or recovery
                account.
              </p>
              {p.importBatches.length > 0 && (
                <details>
                  <summary>Recent imports</summary>
                  {p.importBatches.slice(0, 5).map((b) => (
                    <p key={b.id}>
                      {b.fileName} ·{" "}
                      {new Date(b.createdAt).toLocaleString(p.settings.locale, {
                        timeZone: p.settings.timezone,
                      })}{" "}
                      · {b.createdContacts} created, {b.updatedContacts}{" "}
                      updated, {b.skipped} skipped, {b.invalid} rejected
                    </p>
                  ))}
                </details>
              )}
              <div className="data-action">
                <div>
                  <strong>Export a workspace backup</strong>
                  <small>
                    JSON · All CRM records and preferences for this workspace.
                  </small>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    p.run(
                      async () =>
                        download(
                          JSON.stringify(await exportBackup(p.db), null, 2),
                          `pulse-${p.workspace}-backup.json`,
                        ),
                      "Backup downloaded",
                    )
                  }
                >
                  <Download size={17} />
                  Export
                </button>
              </div>
              <div className="data-action">
                <div>
                  <strong>Restore a JSON backup</strong>
                  <small>
                    Replaces this workspace only, after validation and
                    confirmation.
                  </small>
                </div>
                <input
                  ref={input}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (e) => {
                    setFileError("");
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      setFileError("Choose a backup smaller than 10 MB.");
                      return;
                    }
                    try {
                      setBackup(validateBackup(JSON.parse(await file.text())));
                      setConfirm("restore");
                    } catch {
                      setFileError(
                        "This backup is invalid or incompatible. No records have changed.",
                      );
                    }
                  }}
                />
                <button
                  className="button secondary"
                  onClick={() => input.current?.click()}
                >
                  <Upload size={17} />
                  Restore
                </button>
              </div>
              {fileError && (
                <p role="alert" className="form-error">
                  {fileError}
                </p>
              )}
              <div className="data-action">
                <div>
                  <strong>Download contacts as CSV</strong>
                  <small>
                    Name, role, company, email, stage, and priority.
                  </small>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    const cell = (s: string) =>
                      '"' +
                      (/^[=+@\-\t\r]/.test(s) ? "'" : "") +
                      s.replaceAll('"', '""') +
                      '"';
                    download(
                      [
                        [
                          "Name",
                          "Role",
                          "Company",
                          "Email",
                          "Stage",
                          "Priority",
                        ],
                        ...p.contacts.map((c) => [
                          c.name,
                          c.role,
                          p.organizations.find((o) => o.id === c.organizationId)
                            ?.name || "",
                          c.emails.join("; "),
                          c.stage,
                          c.priority,
                        ]),
                      ]
                        .map((row) => row.map(cell).join(","))
                        .join("\r\n"),
                      "pulse-contacts.csv",
                      "text/csv",
                    );
                  }}
                >
                  <Download size={17} />
                  CSV
                </button>
              </div>
              <div className="data-action">
                <div>
                  <strong>Device storage</strong>
                  <small>
                    {storage ||
                      `${p.contacts.length} people · ${p.organizations.length} companies · ${p.interactions.length} interactions`}
                  </small>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    p.run(async () => {
                      const s = await navigator.storage.estimate();
                      setStorage(
                        `${((s.usage || 0) / 1024 / 1024).toFixed(1)} MB used by this origin · browser estimate`,
                      );
                    })
                  }
                >
                  <HardDrive size={17} />
                  Check
                </button>
              </div>
              <div className="data-action">
                <div>
                  <strong>Switch workspace</strong>
                  <small>Demo and personal records are kept separately.</small>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    p.switchWorkspace(
                      p.workspace === "demo" ? "personal" : "demo",
                    )
                  }
                >
                  <ArrowLeftRight size={17} />
                  Open {p.workspace === "demo" ? "personal" : "demo"}
                </button>
              </div>
              {p.workspace === "demo" && (
                <div className="data-action">
                  <div>
                    <strong>Reset demo data</strong>
                    <small>
                      Restore fictional examples. Your personal workspace is
                      untouched.
                    </small>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setConfirm("reset")}
                  >
                    <RotateCcw size={17} />
                    Reset demo
                  </button>
                </div>
              )}
              {p.workspace === "personal" && (
                <div className="data-action">
                  <div>
                    <strong>Delete personal workspace data</strong>
                    <small>
                      Permanently clear this personal workspace on this device.
                    </small>
                  </div>
                  <button
                    className="button danger"
                    onClick={() => setConfirm("delete")}
                  >
                    <Trash2 size={17} />
                    Delete data
                  </button>
                </div>
              )}
            </>
          )}
          {section === "integrations" && (
            <>
              <SectionHeading
                title="Room for your favorite tools"
                eyebrow="INTEGRATIONS"
              />
              <p className="section-description">
                Core CRM features work offline, without an account or a paid
                service. No external service is connected.
              </p>
              {[
                "Google Calendar",
                "Gmail",
                "Google Contacts",
                "WhatsApp quick actions",
                "LinkedIn profile links",
                "Gemini intelligence",
                "Shopify & WooCommerce",
              ].map((name) => (
                <div className="integration-row" key={name}>
                  <span className="soft-icon">
                    <Plug size={18} />
                  </span>
                  <strong>{name}</strong>
                  <Badge>Planned · disconnected</Badge>
                </div>
              ))}
              <div className="integration-row">
                <span className="soft-icon">
                  <Download size={18} />
                </span>
                <strong>JSON backup & CSV export</strong>
                <Badge tone="green">Available in Privacy & data</Badge>
              </div>
            </>
          )}
        </section>
      </div>
      {confirm && (
        <Confirm
          title={
            confirm === "restore"
              ? `Replace ${p.workspace} workspace?`
              : confirm === "reset"
                ? "Reset the demo?"
                : "Delete your personal data?"
          }
          body={
            confirm === "restore"
              ? (() => {
                  const b = validateBackup(backup);
                  return `Compatible backup v${b.version} · ${b.metadata?.exportedAt || "Date not recorded (legacy backup)"} · ${b.contacts.length} contacts, ${b.organizations.length} companies, ${b.interactions.length} interactions, ${b.tasks.length} tasks, ${b.opportunities.length} opportunities, ${b.smartLists.length} Smart Lists. This REPLACES ALL records and preferences in ${p.workspace}. The other workspace is untouched. Export a backup first.`;
                })()
              : confirm === "reset"
                ? "Your demo edits will be replaced with fictional sample data. Your personal workspace will not change."
                : "All personal CRM records on this device will be permanently deleted. Export a backup first if you need a copy. The demo workspace is untouched."
          }
          action={
            confirm === "restore"
              ? "Validate & restore"
              : confirm === "reset"
                ? "Reset demo"
                : "Delete personal data"
          }
          onClose={() => {
            setConfirm(null);
            setBackup(null);
          }}
          onConfirm={async () => {
            const ok = await p.run(
              () =>
                confirm === "restore"
                  ? restoreBackup(p.db, backup)
                  : resetWorkspace(p.db),
              confirm === "restore" ? "Backup restored" : "Workspace reset",
            );
            if (ok) {
              setConfirm(null);
              setBackup(null);
            }
          }}
        />
      )}
    </div>
  );
}
