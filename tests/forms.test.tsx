import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditorModal } from "../src/components/forms";
const run = vi.fn(async (fn: () => Promise<unknown>) => {
  await fn();
  return true;
});
vi.mock("../src/app/context", () => ({
  usePulse: () => ({
    db: {
      contacts: {
        get: async () => ({
          id: "1",
          name: "A Person",
          preferredName: "A",
          role: "Founder",
          organizationId: null,
          emails: [],
          phones: [],
          links: [],
          avatar: "",
          category: "Prospect",
          stage: "New",
          availability: "Available",
          timeoutUntil: null,
          priority: "Normal",
          tags: [],
          nextFollowUp: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      },
    },
    organizations: [],
    contacts: [],
    opportunities: [],
    tasks: [],
    settings: { followUpDays: 7, timeoutDays: 30 },
    run,
  }),
}));
const saveContact = vi.fn(async () => {});
const addInteraction = vi.fn(async () => {});
vi.mock("../src/data/repository", () => ({
  saveContact: (...args: unknown[]) => saveContact(...args),
  saveOrganization: vi.fn(),
  addInteraction: (...args: unknown[]) => addInteraction(...args),
  saveTask: vi.fn(),
}));
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  value: function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  },
});

it("saves the interaction before opening an optional follow-up and keeps it saved if cancelled", async () => {
  const { cleanup } = await import("@testing-library/react");
  cleanup();
  addInteraction.mockClear();
  const close = vi.fn();
  render(<EditorModal editor={{ kind: "interaction" }} onClose={close} />);
  fireEvent.change(await screen.findByLabelText("What would you like to remember?"), { target: { value: "Discussed the next step" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Plan a follow-up after saving/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save interaction" }));
  expect(await screen.findByText(/Interaction saved\. You can plan a separate follow-up/)).toBeInTheDocument();
  expect(addInteraction).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalledOnce();
});

it("does not start the follow-up if the interaction could not be saved", async () => {
  const { cleanup } = await import("@testing-library/react");
  cleanup();
  addInteraction.mockRejectedValueOnce(new Error("Could not save interaction"));
  const close = vi.fn();
  render(<EditorModal editor={{ kind: "interaction" }} onClose={close} />);
  fireEvent.change(await screen.findByLabelText("What would you like to remember?"), { target: { value: "Discussed the next step" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Plan a follow-up after saving/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save interaction" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save interaction");
  expect(screen.queryByText(/Interaction saved\. You can plan/)).not.toBeInTheDocument();
  expect(close).not.toHaveBeenCalled();
});
Object.defineProperty(HTMLDialogElement.prototype, "close", { value: vi.fn() });
describe("accessible profile editing", () => {
  it("submits an edited contact with an accessible form and selected stage", async () => {
    const close = vi.fn();
    render(
      <EditorModal
        editor={{
          kind: "contact",
          record: {
            id: "1",
            name: "A Person",
            preferredName: "A",
            role: "Founder",
            organizationId: null,
            emails: [],
            phones: [],
            links: [],
            avatar: "",
            category: "Prospect",
            stage: "New",
            availability: "Available",
            timeoutUntil: null,
            priority: "Normal",
            tags: [],
            nextFollowUp: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }}
        onClose={close}
      />,
    );
    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "Updated Person" },
    });
    fireEvent.change(screen.getByLabelText("Stage"), {
      target: { value: "Proposal" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Save person" }));
    await waitFor(() => expect(saveContact).toHaveBeenCalled());
    expect(saveContact.mock.calls[0][1]).toMatchObject({
      name: "Updated Person",
      stage: "Proposal",
    });
    expect(close).toHaveBeenCalled();
  });
});

it("keeps a failed save open and announces its error inside the editing dialog", async () => {
  const { cleanup } = await import("@testing-library/react");
  cleanup();
  saveContact.mockRejectedValueOnce(
    new Error("Storage is full. Export existing records before retrying."),
  );
  const close = vi.fn();
  render(<EditorModal editor={{ kind: "contact" }} onClose={close} />);
  fireEvent.change(await screen.findByLabelText("Full name"), {
    target: { value: "Fictional failure case" },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Save person" }));
  await waitFor(() =>
    expect(screen.getByRole("dialog")).toContainElement(
      screen.getByRole("alert"),
    ),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Storage is full");
  expect(close).not.toHaveBeenCalled();
});
