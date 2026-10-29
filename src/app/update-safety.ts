import { translateInterface } from "../i18n/useInterfaceText";

// Ephemeral edit markers only: never persist field contents or silently save a draft.
const dirty = new Set<Element>();
let editVersion = 0;
export const getEditVersion = () => editVersion;
export function hasUnsavedWork() {
  for (const root of dirty) if (!root.isConnected) dirty.delete(root);
  return dirty.size > 0;
}
export function markSaved(root: Element | null) {
  if (root) dirty.delete(root);
}
export function installEditProtection() {
  const changed = (event: Event) => {
    const el = event.target;
    if (!(el instanceof Element) || el.closest("[data-non-editing]")) return;
    const root = el.closest(
      "form, dialog, [data-edit-scope], .assistant-page, .import-page",
    );
    if (root) {
      dirty.add(root);
      editVersion++;
    }
  };
  const leaving = (event: BeforeUnloadEvent) => {
    if (hasUnsavedWork()) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  const navigate = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (!link || link.target === "_blank" || link.hasAttribute("download"))
      return;
    const next = new URL(link.href, location.href);
    if (
      next.origin === location.origin &&
      next.pathname === location.pathname &&
      next.hash !== location.hash &&
      next.hash !== "#main" &&
      !confirmLeave()
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  document.addEventListener("click", navigate, true);
  document.addEventListener("input", changed, true);
  document.addEventListener("change", changed, true);
  window.addEventListener("beforeunload", leaving);
  return () => {
    document.removeEventListener("click", navigate, true);
    document.removeEventListener("input", changed, true);
    document.removeEventListener("change", changed, true);
    window.removeEventListener("beforeunload", leaving);
    dirty.clear();
  };
}
export function confirmRefresh() {
  return (
    !hasUnsavedWork() ||
    window.confirm(
      translateInterface(document.documentElement.lang, "You have unfinished edits. Updating will discard them. Cancel to save your work first, or OK to discard and reload."),
    )
  );
}
export function reloadSafely() {
  if (!navigator.onLine) return false;
  if (!confirmRefresh()) return false;
  // The explicit discard has been confirmed; avoid a second native unload warning.
  dirty.clear();
  window.location.reload();
  return true;
}
export function discardForUpdate() {
  dirty.clear();
}
export function isChunkFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed|Unable to preload CSS/i.test(
    message,
  );
}

export function confirmLeave() {
  if (!hasUnsavedWork()) return true;
  if (
    !window.confirm(
      translateInterface(document.documentElement.lang, "You have unfinished edits. Leave and discard them? Cancel to keep editing."),
    )
  )
    return false;
  dirty.clear();
  return true;
}

// Discard only the dialog being closed, preserving any other active editor.
export function confirmDialogClose(root: Element | null) {
  const edits = [...dirty].filter(
    (el) => root && (el === root || root.contains(el)),
  );
  if (!edits.length) return true;
  if (
    !window.confirm(
      translateInterface(document.documentElement.lang, "Discard unfinished edits in this dialog? Cancel to keep editing."),
    )
  )
    return false;
  for (const el of edits) dirty.delete(el);
  return true;
}
