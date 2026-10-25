import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowUpRight, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
export function Avatar({
  name,
  size = "",
  company = false,
}: {
  name: string;
  size?: string;
  company?: boolean;
}) {
  const colors = ["lavender", "peach", "sage", "blue", "pink"];
  const n = [...name].reduce((v, c) => v + c.charCodeAt(0), 0);
  return (
    <span
      aria-hidden="true"
      className={`avatar ${size} ${company ? "company" : ""} ${colors[n % colors.length]}`}
    >
      {name
        .split(/\s|&/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")}
    </span>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Users size={30} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SectionHeading({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
export function ViewLink({
  to,
  children = "View all",
}: {
  to: string;
  children?: ReactNode;
}) {
  return (
    <Link to={to} className="text-link">
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
export function useFormat() {
  const { settings } = usePulse();
  return {
    date: (
      value: string,
      options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
    ) =>
      new Intl.DateTimeFormat(settings.locale, {
        ...options,
        timeZone: settings.timezone,
      }).format(new Date(value)),
    money: (value: number, currency: string) =>
      new Intl.NumberFormat(settings.locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value),
  };
}
export function Confirm({
  title,
  body,
  onConfirm,
  onClose,
  action = "Delete",
}: {
  title: string;
  body: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  action?: string;
}) {
  const busy = useRef(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-copy">{body}</p>
      <div className="form-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button danger"
          onClick={async () => {
            if (busy.current) return;
            busy.current = true;
            try {
              await onConfirm();
            } finally {
              busy.current = false;
            }
          }}
        >
          {action}
        </button>
      </div>
    </Modal>
  );
}
