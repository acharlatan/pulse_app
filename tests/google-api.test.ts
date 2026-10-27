import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/services/google-session", () => ({ googleRequest: vi.fn() }));
import { googleRequest } from "../src/services/google-session";
import {
  createGoogleEvent,
  googleContactsCsv,
  makeGoogleEvent,
  readGoogleContacts,
} from "../src/services/google-api";
const request = vi.mocked(googleRequest);
beforeEach(() => request.mockReset());
it("retrieves only requested contact fields across pages and maps selected records", async () => {
  request.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        connections: [
          {
            resourceName: "people/1",
            names: [{ displayName: "Ada" }],
            emailAddresses: [{ value: "ada@example.com" }],
          },
        ],
        nextPageToken: "next",
      }),
    ),
  );
  request.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        connections: [
          {
            resourceName: "people/2",
            names: [{ displayName: "Lee" }],
            organizations: [{ name: "Example", title: "Lead" }],
          },
        ],
      }),
    ),
  );
  const people = await readGoogleContacts("personal");
  expect(people).toHaveLength(2);
  expect(googleContactsCsv([people[1]]).rows).toEqual([
    ["Lee", "", "", "Example", "Lead"],
  ]);
  expect(request.mock.calls[0][2]).toContain(
    "personFields=names%2CemailAddresses%2CphoneNumbers%2Corganizations",
  );
  expect(request.mock.calls[1][2]).toContain("pageToken=next");
});
it("rejects repeated pagination tokens instead of looping", async () => {
  request.mockImplementation(
    async () => new Response(JSON.stringify({ nextPageToken: "same" })),
  );
  await expect(readGoogleContacts("personal")).rejects.toThrow(/repeated/);
});
it("validates dates, all-day end and sends only explicitly provided event fields", async () => {
  const event = makeGoogleEvent(
    "abcde123",
    " Call ",
    "Reviewed description",
    "2026-03-08T10:00",
    30,
    true,
  );
  expect(event).toMatchObject({
    summary: "Call",
    start: { date: "2026-03-08" },
    end: { date: "2026-03-09" },
  });
  expect(() =>
    makeGoogleEvent("abcde123", "Call", "", "2026-02-30T10:00", 30, true),
  ).toThrow();
  request.mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "abcde123",
        htmlLink: "https://calendar.google.com/event",
      }),
    ),
  );
  await createGoogleEvent("personal", event);
  expect(request.mock.calls[0][2]).toContain("sendUpdates=none");
  expect(JSON.parse(String(request.mock.calls[0][3]?.body))).toEqual(event);
});
