import { markSaved } from "../app/update-safety";
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Badge, Empty } from "../components/ui";
import {
  parseCsv,
  suggestMapping,
  inspectCsv,
  buildImportPlan,
  importFields,
  mergeFields,
  type CsvData,
  type ImportField,
  type ImportPlan,
  type RowDecision,
} from "../services/csv-import";
import { commitImport } from "../data/import-repository";
import type { ImportBatch } from "../data/models";
const steps = [
  "File",
  "Preview",
  "Map fields",
  "Validate",
  "Duplicates",
  "Confirm",
  "Complete",
];
const fieldNames: Partial<Record<ImportField, string>> = {
  ignore: "Do not import",
  name: "Full name",
  firstName: "First name",
  lastName: "Last name",
  company: "Company",
  lastContact: "Last contact date (with provenance)",
  notes: "Imported note",
};
export function CsvImport() {
  const p = usePulse(),
    [step, setStep] = useState(0),
    [csv, setCsv] = useState<CsvData | null>(null),
    [mapping, setMapping] = useState<ImportField[]>([]),
    [file, setFile] = useState({ name: "", size: 0 }),
    [analysis, setAnalysis] = useState<ReturnType<typeof inspectCsv> | null>(
      null,
    ),
    [plan, setPlan] = useState<ImportPlan | null>(null),
    [result, setResult] = useState<ImportBatch | null>(null),
    [page, setPage] = useState(0),
    [companyPage, setCompanyPage] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fill, setFill] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  async function perform(fn: () => Promise<void> | void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Import could not complete. Existing records are unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  const decide = (row: number, patch: Partial<RowDecision>) =>
    setAnalysis((a) =>
      a
        ? {
            ...a,
            decisions: {
              ...a.decisions,
              [row]: { ...a.decisions[row], ...patch },
            },
          }
        : a,
    );
  const summary = result || plan?.batch;
  return (
    <div className="page import-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BRING YOUR RELATIONSHIPS WITH YOU</p>
          <h1>
            Import contacts<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            A guided, local CSV import into your {p.workspace} workspace.
            Nothing changes until you confirm the plan.
          </p>
        </div>
        <Link className="button secondary" to="/settings">
          Privacy & data
        </Link>
      </div>
      <ol className="wizard-steps" aria-label="Import progress">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={i === step ? "active" : ""}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <section className="surface import-content" aria-busy={busy}>
        {step === 0 && (
          <>
            <h2>Choose a UTF-8 CSV</h2>
            <p>
              Up to 2 MB, 2,000 data rows and 40 columns. Headers are required.
              Quoted commas and newlines are supported. Excel workbooks are not
              supported.
            </p>
            <label className="field">
              <span>Contact CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  e.target.value = "";
                  if (!selected) return;
                  void perform(async () => {
                    if (!selected.name.toLowerCase().endsWith(".csv"))
                      throw new Error(
                        "Choose a .csv file, not an Excel workbook.",
                      );
                    if (selected.size > 2 * 1024 * 1024)
                      throw new Error("CSV limit is 2 MB.");
                    const bytes = await selected.arrayBuffer();
                    let text: string;
                    try {
                      text = new TextDecoder("utf-8", { fatal: true }).decode(
                        bytes,
                      );
                    } catch {
                      throw new Error(
                        "Save the file as UTF-8 CSV before importing.",
                      );
                    }
                    const parsed = parseCsv(text);
                    setFile({ name: selected.name, size: selected.size });
                    setCsv(parsed);
                    setMapping(suggestMapping(parsed.headers));
                    setStep(1);
                  });
                }}
              />
            </label>
            <p className="field-help">
              Import adds or selectively updates contacts. Restore replaces a
              whole workspace. Export a backup in Settings before bulk changes.
            </p>
          </>
        )}
        {csv && step === 1 && (
          <>
            <h2>Preview your file</h2>
            <p>
              {file.name} · {(file.size / 1024).toFixed(1)} KB ·{" "}
              {csv.rows.length} data rows · {csv.headers.length} columns
            </p>
            <Badge tone="green">CSV structure validated</Badge>
            <div className="csv-samples">
              {csv.rows.slice(0, 3).map((row, i) => (
                <details key={i} open={i === 0}>
                  <summary>Sample row {i + 2}</summary>
                  <dl>
                    {csv.headers.map((h, j) => (
                      <div key={h}>
                        <dt>{h}</dt>
                        <dd>{row[j] || "Empty"}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
            </div>
          </>
        )}
        {csv && step === 2 && (
          <>
            <h2>Map columns to PULSE</h2>
            <p>
              Suggestions are editable. Unmapped columns are ignored. Consent
              fields are deliberately unsupported; import never grants
              communication permission.
            </p>
            <div className="mapping-grid">
              {csv.headers.map((h, i) => (
                <label className="field" key={h}>
                  <span>{h}</span>
                  <small>
                    Example: {csv.rows[0][i]?.slice(0, 100) || "Empty"}
                  </small>
                  <select
                    aria-label={`Map ${h}`}
                    value={mapping[i]}
                    onChange={(e) =>
                      setMapping(
                        mapping.map((v, j) =>
                          j === i ? (e.target.value as ImportField) : v,
                        ),
                      )
                    }
                  >
                    {importFields.map((f) => (
                      <option value={f} key={f}>
                        {fieldNames[f] || f}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="field-help">
              Last-contact dates must be YYYY-MM-DD or ISO timestamps with
              timezone; they retain import provenance and do not create
              conversations. Date-only values use the start of that date in
              device time. Tags may be separated by semicolons or |.
            </p>
          </>
        )}
        {analysis && step === 3 && (
          <>
            <h2>Validation results</h2>
            <p>
              {analysis.rows.filter((r) => !r.errors.length).length} valid rows
              · {analysis.rows.filter((r) => r.errors.length).length} invalid
              rows. Invalid rows will be rejected without writes; go back to fix
              mappings or correct the source file.
            </p>
            {analysis.rows
              .filter((r) => r.errors.length)
              .slice(0, 50)
              .map((r) => (
                <div className="validation-row" key={r.row}>
                  <strong>CSV row {r.row}</strong>
                  <p>{r.errors.join(" ")}</p>
                </div>
              ))}
            {analysis.rows.filter((r) => r.errors.length).length > 50 && (
              <p>
                Showing the first 50 invalid rows. Correct the file and restart
                to validate the remaining rows.
              </p>
            )}
          </>
        )}
        {analysis && step === 4 && (
          <>
            <h2>Review duplicates and changes</h2>
            <p>
              Matches default to Skip. Creating as new can create a duplicate.
              Updates preserve blank fields and only apply the fields you
              select. Restrictions, consent, tasks and deals are preserved.
            </p>
            <details className="company-matches">
              <summary>
                Company matching · {analysis.companies.length} names
              </summary>
              <label className="setting-toggle">
                <span>
                  Fill missing company industry, website and location from the
                  first imported row. Existing values are kept.
                </span>
                <input
                  type="checkbox"
                  checked={fill}
                  onChange={(e) => setFill(e.target.checked)}
                />
              </label>
              {analysis.companies
                .slice(companyPage * 10, companyPage * 10 + 10)
                .map((company) => (
                  <div key={company.key} className="company-match">
                    <strong>{company.name}</strong>
                    <span>{company.website || "No website supplied"}</span>
                    <small>{company.reason}</small>
                    {company.matches.map((o) => (
                      <p key={o.id}>
                        Existing: {o.name} · {o.website || "No website"} ·{" "}
                        {o.location || "No location"}
                      </p>
                    ))}
                    <label className="field">
                      <span>
                        Company decision for {company.name} {company.website}
                      </span>
                      <select
                        value={analysis.organizationChoices[company.key]}
                        onChange={(e) =>
                          setAnalysis({
                            ...analysis,
                            organizationChoices: {
                              ...analysis.organizationChoices,
                              [company.key]: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="new">Create a separate company</option>
                        {p.organizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            Use {o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              {analysis.companies.length > 10 && (
                <div className="record-actions">
                  <button
                    className="button secondary"
                    disabled={companyPage === 0}
                    onClick={() => setCompanyPage(companyPage - 1)}
                  >
                    Previous companies
                  </button>
                  <span>
                    Companies {companyPage * 10 + 1}–
                    {Math.min(companyPage * 10 + 10, analysis.companies.length)}
                  </span>
                  <button
                    className="button secondary"
                    disabled={
                      (companyPage + 1) * 10 >= analysis.companies.length
                    }
                    onClick={() => setCompanyPage(companyPage + 1)}
                  >
                    Next companies
                  </button>
                </div>
              )}
            </details>
            <p>
              Rows {page * 10 + 1}–
              {Math.min((page + 1) * 10, analysis.rows.length)} of{" "}
              {analysis.rows.length}
            </p>
            {analysis.rows.slice(page * 10, page * 10 + 10).map((row) => {
              const d = analysis.decisions[row.row];
              return (
                <article className="import-row" key={row.row}>
                  <div className="section-heading">
                    <h3>
                      Row {row.row} ·{" "}
                      {row.values.name ||
                        [row.values.firstName, row.values.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        "Missing name"}
                    </h3>
                    <Badge tone={row.errors.length ? "red" : ""}>
                      {row.errors.length
                        ? "Invalid"
                        : row.matches[0]?.confidence ||
                          (row.fileDuplicate
                            ? "Duplicate within file"
                            : "No match")}
                    </Badge>
                  </div>
                  <p>
                    {row.values.email || "No email"} ·{" "}
                    {row.values.role || "No role"} ·{" "}
                    {row.values.company || "Independent"}
                  </p>
                  {row.fileDuplicate && (
                    <p className="restriction-note">
                      Another file row has the same email, phone or
                      name/company. Review before creating a separate record.
                    </p>
                  )}
                  {row.errors.length ? (
                    <p className="form-error">{row.errors.join(" ")}</p>
                  ) : (
                    <>
                      <label className="field">
                        <span>Action for row {row.row}</span>
                        <select
                          value={d.mode}
                          onChange={(e) =>
                            decide(row.row, {
                              mode: e.target.value as RowDecision["mode"],
                            })
                          }
                        >
                          <option value="skip">Skip</option>
                          <option value="create">Create as new</option>
                          {row.matches.length > 0 && (
                            <option value="update">
                              Update selected existing contact
                            </option>
                          )}
                        </select>
                      </label>
                      {row.matches.map((m) => (
                        <details key={m.id}>
                          <summary>
                            {m.confidence} · {m.name} · {m.reason}
                          </summary>
                          <dl className="merge-comparison">
                            {mergeFields.map((field) => {
                              const old =
                                field === "organizationId"
                                  ? p.organizations.find(
                                      (o) => o.id === m.existing.organizationId,
                                    )?.name || ""
                                  : field === "lastContact"
                                    ? m.existing.importProvenance
                                        ?.lastContactAt ||
                                      "No imported last-contact date"
                                    : field === "notes"
                                      ? `${p.interactions.filter((i) => i.contactId === m.id && i.type === "Note").length} existing notes preserved`
                                      : Array.isArray(m.existing[field])
                                        ? (m.existing[field] as string[]).join(
                                            "; ",
                                          )
                                        : String(m.existing[field] || "");
                              const incoming =
                                field === "name"
                                  ? row.values.name ||
                                    [row.values.firstName, row.values.lastName]
                                      .filter(Boolean)
                                      .join(" ")
                                  : row.values[
                                      (field === "organizationId"
                                        ? "company"
                                        : field === "emails"
                                          ? "email"
                                          : field === "phones"
                                            ? "phone"
                                            : field) as ImportField
                                    ] || "";
                              return (
                                <div key={field}>
                                  <dt>{field}</dt>
                                  <dd>
                                    <strong>Existing:</strong> {old || "Empty"}
                                  </dd>
                                  <dd>
                                    <strong>Imported:</strong>{" "}
                                    {incoming || "Empty — existing value kept"}
                                  </dd>
                                </div>
                              );
                            })}
                            <div>
                              <dt>Communication instructions</dt>
                              <dd>
                                {m.existing.availability} · all consent records
                                preserved
                              </dd>
                            </div>
                          </dl>
                        </details>
                      ))}
                      {d.mode === "update" && (
                        <>
                          <label className="field">
                            <span>Existing contact for row {row.row}</span>
                            <select
                              value={d.targetId}
                              onChange={(e) =>
                                decide(row.row, { targetId: e.target.value })
                              }
                            >
                              {row.matches.map((m) => (
                                <option value={m.id} key={m.id}>
                                  {m.name} · {m.existing.emails[0] || m.reason}
                                </option>
                              ))}
                            </select>
                          </label>
                          <fieldset className="people-picker">
                            <legend>
                              Accept imported fields · row {row.row}
                            </legend>
                            {mergeFields.map((f) => (
                              <label key={f}>
                                <input
                                  type="checkbox"
                                  checked={d.fields.includes(f)}
                                  onChange={(e) =>
                                    decide(row.row, {
                                      fields: e.target.checked
                                        ? [...d.fields, f]
                                        : d.fields.filter((v) => v !== f),
                                    })
                                  }
                                />
                                <span>
                                  {f}{" "}
                                  {f === "tags"
                                    ? "(union with existing tags)"
                                    : ""}
                                </span>
                              </label>
                            ))}
                          </fieldset>
                        </>
                      )}
                    </>
                  )}
                </article>
              );
            })}
            <div className="record-actions">
              <button
                className="button secondary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous rows
              </button>
              <button
                className="button secondary"
                disabled={(page + 1) * 10 >= analysis.rows.length}
                onClick={() => setPage(page + 1)}
              >
                Next rows
              </button>
            </div>
          </>
        )}
        {summary && step >= 5 && (
          <>
            <h2>{result ? "Import complete" : "Confirm your import plan"}</h2>
            <div className="import-summary">
              {(
                [
                  ["New contacts", summary.createdContacts],
                  ["Updated contacts", summary.updatedContacts],
                  ["New companies", summary.createdOrganizations],
                  ["Updated companies", summary.updatedOrganizations],
                  ["Skipped rows", summary.skipped],
                  ["Invalid rows rejected", summary.invalid],
                ] as const
              ).map(([label, count]) => (
                <div key={label}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            {!result && (
              <>
                <p>
                  Apply these changes to {p.workspace} only. Invalid rows and
                  skipped rows will not be imported. No current records are
                  deleted. If the workspace changes after preview, the import
                  will stop and ask you to validate again.
                </p>
                <label className="check-confirm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>
                    I reviewed the mappings, duplicate choices, selected updates
                    and rejected rows.
                  </span>
                </label>
              </>
            )}
            {result && (
              <>
                <p>
                  Changes are saved on this device. Imported notes are labeled
                  by source; missing history remains unknown.
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setStep(0);
                    setCsv(null);
                    setAnalysis(null);
                    setPlan(null);
                    setResult(null);
                    setConfirmed(false);
                    setError("");
                    setPage(0);
                    setCompanyPage(0);
                  }}
                >
                  Import another CSV
                </button>
                <Link className="button primary" to="/network">
                  Open your Network
                </Link>
                <Link className="button secondary" to="/review">
                  Relationship Review
                </Link>
              </>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <p role="status">
            {step === 5
              ? "Applying the validated plan…"
              : "Processing locally…"}
          </p>
        )}
        <div className="form-actions">
          {step > 0 && step < 6 && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setStep(step - 1);
                setError("");
                setConfirmed(false);
              }}
            >
              Back
            </button>
          )}
          {step === 1 && (
            <button className="button primary" onClick={() => setStep(2)}>
              Continue to mapping
            </button>
          )}
          {step === 2 && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                perform(() => {
                  setAnalysis(
                    inspectCsv(csv!, mapping, p.contacts, p.organizations),
                  );
                  setPage(0);
                  setCompanyPage(0);
                  setStep(3);
                })
              }
            >
              Validate rows
            </button>
          )}
          {step === 3 && (
            <button className="button primary" onClick={() => setStep(4)}>
              Review duplicates
            </button>
          )}
          {step === 4 && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                perform(() => {
                  setPlan(
                    buildImportPlan(
                      analysis!,
                      p.contacts,
                      p.organizations,
                      p.interactions,
                      file.name,
                      fill,
                    ),
                  );
                  setConfirmed(false);
                  setStep(5);
                })
              }
            >
              Preview import summary
            </button>
          )}
          {step === 5 && (
            <button
              className="button primary"
              disabled={!confirmed || busy}
              onClick={() =>
                perform(async () => {
                  const saved = await commitImport(p.db, plan!);
                  markSaved(document.querySelector(".import-page"));
                  setResult(saved);
                  setStep(6);
                  p.notify("CSV import saved");
                })
              }
            >
              Apply import to {p.workspace}
            </button>
          )}
        </div>
      </section>
      {step === 0 && !p.importBatches.length && (
        <Empty
          title="Your relationships, ready for a fresh chapter"
          body="Choose a CSV to inspect it before any changes are made."
        />
      )}
    </div>
  );
}
