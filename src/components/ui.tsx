import { LocalMedia } from "./local-media";
import { useEffect, useRef, useId, type ReactNode } from "react";
import { confirmDialogClose } from "../app/update-safety";
import { X, ArrowUpRight, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import demoPortraits from "../demo-portraits.webp";
const demoNames = ["Olivia Chen", "Marcus Johnson", "Sofia Rivera", "James Park", "Amara Okafor", "Ethan Brooks", "Isabella Rossi", "Noah Williams", "Mia Patel", "Lucas Reed", "Chloe Bennett", "Daniel Kim", "Zoe Mitchell", "Leo Santos", "Ava Thompson", "Elijah Wright"];
const portraitSlots = [0, 10, 3, 8, 5, 9, 6, 15, 7, 11, 1, 14, 2, 12, 4, 13];
export function Avatar({
  name,
  size = "",
  company = false,
  mediaId,
}: {
  name: string;
  size?: string;
  company?: boolean;
  mediaId?: string;
}) {
  const p = usePulse();
  const colors = ["lavender", "peach", "sage", "blue", "pink"];
  const n = [...name].reduce((v, c) => v + c.charCodeAt(0), 0);
  const demoIndex = demoNames.indexOf(name);
  const matching = p.contacts.filter((contact) => contact.name === name);
  const demoPortrait = !company && !mediaId && p.workspace === "demo" && demoIndex >= 0 && matching.length === 1 && matching[0].id === `contact-${demoIndex}` ? portraitSlots[demoIndex] : -1;
  return (
    <span
      aria-hidden="true"
      className={`avatar ${size} ${company ? "company" : ""} ${colors[n % colors.length]}`}
      style={demoPortrait >= 0 ? { backgroundImage: `url(${demoPortraits})`, backgroundSize: "400% 400%", backgroundPosition: `${(demoPortrait % 4) * 100 / 3}% ${Math.floor(demoPortrait / 4) * 100 / 3}%` } : undefined}
    >
      {demoPortrait >= 0 ? null : mediaId?.startsWith("media-") ? (
        <LocalMedia
          id={mediaId}
          fallback={name
            .split(/\s|&/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")}
        />
      ) : (
        name
          .split(/\s|&/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0])
          .join("")
      )}
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
  const close = () => {
    if (confirmDialogClose(ref.current)) onClose();
  };
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current,
      opener = document.activeElement;
    const viewport = window.visualViewport;
    const fit = () => {
      if (!dialog || !viewport) return;
      dialog.style.maxHeight = `${Math.max(120, viewport.height - 24)}px`;
      if (viewport.height < window.innerHeight - 100) {
        dialog.style.top = `${viewport.offsetTop + 12}px`;
        dialog.style.marginBlock = "0";
      } else {
        dialog.style.top = "";
        dialog.style.marginBlock = "";
      }
    };
    dialog?.showModal();
    fit();
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    return () => {
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClickCapture={(e) => {
        const button =
          e.target instanceof Element ? e.target.closest("button") : null;
        if (
          button?.textContent?.trim() === "Cancel" &&
          !confirmDialogClose(ref.current)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
          ),
        ].filter((el) => el.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            close();
        }
      }}
      aria-labelledby={titleId}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
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
