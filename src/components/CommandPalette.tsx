import { useInterfaceText } from "../i18n/useInterfaceText";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserRound,
  Building2,
  BriefcaseBusiness,
  ListTodo,
  Zap,
} from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Modal } from "./ui";
import type { Editor } from "./forms";

type Item = {
  id: string;
  title: string;
  context: string;
  terms: string;
  icon: "contact" | "company" | "opportunity" | "task" | "command";
  media?: string;
  path?: string;
  editor?: Editor;
};
export function CommandPalette({
  onClose,
  onEdit,
}: {
  onClose: () => void;
  onEdit: (editor: Editor) => void;
}) {
  const __pulseText = useInterfaceText();
  const p = usePulse();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const items = useMemo<Item[]>(() => {
    const companies = new Map(p.organizations.map((o) => [o.id, o.name]));
    const stages = new Map(p.pipelineStages.map((s) => [s.id, s.name]));
    const commands: Item[] = [
      {
        id: "add-person",
        title: "Add person",
        context: "Quick action",
        terms: "new contact",
        icon: "command",
        editor: { kind: "contact" },
      },
      {
        id: "add-company",
        title: "Add company",
        context: "Quick action",
        terms: "new organization",
        icon: "command",
        editor: { kind: "company" },
      },
      {
        id: "add-opportunity",
        title: "Create opportunity",
        context: "Quick action",
        terms: "new deal pipeline",
        icon: "command",
        editor: { kind: "opportunity" },
      },
      {
        id: "add-task",
        title: "Add follow-up",
        context: "Quick action",
        terms: "new task",
        icon: "command",
        editor: { kind: "task" },
      },
      {
        id: "add-interaction",
        title: "Log interaction",
        context: "Quick action",
        terms: "conversation touchpoint",
        icon: "command",
        editor: { kind: "interaction" },
      },
      ...[
        ["focus", "Open My Focus"],
        ["analytics", "Open Analytics"],
        ["orbit", "Open Relationship Orbit"],
      ].map(([path, title]) => ({
        id: path,
        title,
        context: "Destination",
        terms: path,
        icon: "command" as const,
        path: `/${path}`,
      })),
    ];
    return [
      ...commands,
      ...p.contacts.map((c) => ({
        id: `contact:${c.id}`,
        title: c.name,
        context: `Contact · ${companies.get(c.organizationId || "") || c.role || "Independent"}`,
        terms: [
          c.preferredName,
          c.role,
          companies.get(c.organizationId || ""),
          ...c.tags,
        ].join(" "),
        icon: "contact" as const,
        media: c.avatar,
        path: `/network/people/${c.id}`,
      })),
      ...p.organizations.map((o) => ({
        id: `company:${o.id}`,
        title: o.name,
        context: "Company",
        terms: [o.industry, ...o.tags].join(" "),
        icon: "company" as const,
        media: o.avatar,
        path: `/network/companies/${o.id}`,
      })),
      ...p.opportunities.map((o) => ({
        id: `opportunity:${o.id}`,
        title: o.title,
        context: `Opportunity · ${stages.get(o.stageId) || o.status}`,
        terms: [
          companies.get(o.organizationId || ""),
          stages.get(o.stageId),
        ].join(" "),
        icon: "opportunity" as const,
        editor: { kind: "opportunity" as const, record: o },
      })),
      ...p.tasks.map((t) => ({
        id: `task:${t.id}`,
        title: t.title,
        context: `Task · ${t.completedAt ? "Completed" : new Intl.DateTimeFormat(p.settings.locale, { dateStyle: "medium", timeZone: p.settings.timezone }).format(new Date(t.dueAt))}`,
        terms: companies.get(t.organizationId || "") || "",
        icon: "task" as const,
        editor: { kind: "task" as const, record: t },
      })),
    ];
  }, [
    p.contacts,
    p.organizations,
    p.opportunities,
    p.tasks,
    p.pipelineStages,
    p.settings.locale,
    p.settings.timezone,
  ]);
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return items.filter((i) => i.icon === "command").slice(0, 5);
    const words = q.split(/\s+/);
    return items
      .map((i) => {
        const title = i.title.toLocaleLowerCase();
        const text = `${title} ${i.context} ${i.terms}`.toLocaleLowerCase();
        return {
          i,
          score: words.every((w) => text.includes(w))
            ? title.startsWith(q)
              ? 0
              : title.includes(q)
                ? 1
                : 2
            : 99,
        };
      })
      .filter((x) => x.score < 99)
      .sort((a, b) => a.score - b.score || a.i.title.localeCompare(b.i.title))
      .slice(0, 30)
      .map((x) => x.i);
  }, [items, query]);
  const active = Math.min(selected, Math.max(0, results.length - 1));
  function choose(item: Item) {
    onClose();
    if (item.path) navigate(item.path);
    else if (item.editor) onEdit(item.editor);
  }
  return (
    <Modal title={__pulseText("Search PULSE")} onClose={onClose}>
      <div
        className="command-palette"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((n) =>
              results.length
                ? (n + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                  results.length
                : 0,
            );
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            choose(results[active]);
          }
        }}
      >
        <label className="command-input">
          <Search size={20} />
          <input
            aria-label={__pulseText("Search records and actions")}
            data-non-editing
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder={__pulseText("Search people, companies, tasks…")}
            aria-controls="command-results"
            aria-activedescendant={
              results[active] ? `command-${active}` : undefined
            }
            role="combobox"
            aria-expanded="true"
            autoComplete="off"
          />
        </label>
        <p className="command-label">
          {query.trim() ? __pulseText("Search results") : __pulseText("Suggested actions")}
        </p>
        <div
          id="command-results"
          role="listbox"
          aria-label={__pulseText("Search results")}
          className="command-results"
        >
          {results.map((item, index) => {
            const Icon =
              item.icon === "company"
                ? Building2
                : item.icon === "opportunity"
                  ? BriefcaseBusiness
                  : item.icon === "task"
                    ? ListTodo
                    : item.icon === "contact"
                      ? UserRound
                      : Zap;
            return (
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                id={`command-${index}`}
                className={`command-result ${index === active ? "selected" : ""}`}
                key={item.id}
                onMouseMove={() => setSelected(index)}
                onClick={() => choose(item)}
              >
                {item.icon === "contact" || item.icon === "company" ? (
                  <Avatar name={item.title} mediaId={item.media} size="small" />
                ) : (
                  <span className="command-icon">
                    <Icon size={18} />
                  </span>
                )}
                <span>
                  <strong>{item.icon === "command" ? __pulseText(item.title) : item.title}</strong>
                  <small>{item.icon === "command" ? __pulseText(item.context) : item.context}</small>
                </span>
              </button>
            );
          })}
          {!results.length && (
            <p className="command-empty">
              {__pulseText("No results found. Try another name or action.")}</p>
          )}
        </div>
        <p className="command-hint">
          {__pulseText("Use ↑ ↓ to select · Enter to open · Esc to close")}</p>
      </div>
    </Modal>
  );
}
