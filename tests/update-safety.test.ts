import { afterEach, it, expect, vi } from "vitest";
import {
  hasUnsavedWork,
  installEditProtection,
  markSaved,
  confirmRefresh,
  isChunkFailure,
} from "../src/app/update-safety";
afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
it("tracks ephemeral form edits, failed saves stay guarded, and successful saves clear only that form", () => {
  const cleanup = installEditProtection();
  document.body.innerHTML =
    '<form id="first"><input /></form><form id="second"><textarea></textarea></form>';
  const forms = document.querySelectorAll("form");
  forms[0]
    .querySelector("input")!
    .dispatchEvent(new Event("input", { bubbles: true }));
  forms[1]
    .querySelector("textarea")!
    .dispatchEvent(new Event("input", { bubbles: true }));
  expect(hasUnsavedWork()).toBe(true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  expect(confirmRefresh()).toBe(false);
  expect(confirm).toHaveBeenCalledOnce();
  markSaved(forms[0]);
  expect(hasUnsavedWork()).toBe(true);
  forms[1].remove();
  expect(hasUnsavedWork()).toBe(false);
  cleanup();
});
it("guards unloaded pages after edits without writing draft contents anywhere", () => {
  const cleanup = installEditProtection();
  document.body.innerHTML =
    '<section class="assistant-page"><textarea></textarea></section>';
  document
    .querySelector("textarea")!
    .dispatchEvent(new Event("input", { bubbles: true }));
  const e = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(e);
  expect(e.defaultPrevented).toBe(true);
  cleanup();
});
it("distinguishes missing application files from ordinary application errors", () => {
  expect(
    isChunkFailure(
      new Error("Failed to fetch dynamically imported module: /assets/old.js"),
    ),
  ).toBe(true);
  expect(
    isChunkFailure(new Error("Unable to preload CSS for /assets/old.css")),
  ).toBe(true);
  expect(isChunkFailure(new Error("Database write failed"))).toBe(false);
  expect(isChunkFailure(new Error("fetch request failed"))).toBe(false);
});
it("internal navigation can be cancelled without losing dirty work", () => {
  const cleanup = installEditProtection();
  document.body.innerHTML = '<form><input /></form><a href="#/network">Go</a>';
  document
    .querySelector("input")!
    .dispatchEvent(new Event("input", { bubbles: true }));
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  document.querySelector("a")!.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(hasUnsavedWork()).toBe(true);
  confirm.mockReturnValue(true);
  const next = new MouseEvent("click", { bubbles: true, cancelable: true });
  // Prevent jsdom navigation, while still exercising capture protection.
  document
    .querySelector("a")!
    .addEventListener("click", (e) => e.preventDefault());
  document.querySelector("a")!.dispatchEvent(next);
  expect(hasUnsavedWork()).toBe(false);
  cleanup();
});
it("dialog dismissal preserves edits on cancellation and clears only its own scope on approval", async () => {
  const { confirmDialogClose } = await import("../src/app/update-safety");
  const cleanup = installEditProtection();
  document.body.innerHTML =
    '<dialog><form><input /></form></dialog><form id="other"><input /></form>';
  document
    .querySelectorAll("input")
    .forEach((el) => el.dispatchEvent(new Event("input", { bubbles: true })));
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  expect(confirmDialogClose(document.querySelector("dialog"))).toBe(false);
  expect(hasUnsavedWork()).toBe(true);
  confirm.mockReturnValue(true);
  expect(confirmDialogClose(document.querySelector("dialog"))).toBe(true);
  expect(hasUnsavedWork()).toBe(true);
  markSaved(document.querySelector("#other"));
  expect(hasUnsavedWork()).toBe(false);
  cleanup();
});
it("ignores search typing while preserving protection for actual edits", () => {
  const cleanup = installEditProtection();
  document.body.innerHTML =
    "<dialog open><input data-non-editing></dialog><form><input></form>";
  const search = document.querySelector("dialog input")!;
  search.dispatchEvent(new Event("input", { bubbles: true }));
  expect(hasUnsavedWork()).toBe(false);
  document
    .querySelector("form input")!
    .dispatchEvent(new Event("input", { bubbles: true }));
  search.dispatchEvent(new Event("input", { bubbles: true }));
  expect(hasUnsavedWork()).toBe(true);
  cleanup();
});
