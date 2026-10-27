import { afterEach, expect, it, vi } from "vitest";
import {
  authorizeGoogle,
  clearGoogleSession,
  googleRequest,
  googleSessionStatus,
  GOOGLE_SCOPES,
} from "../src/services/google-session";
afterEach(() => {
  clearGoogleSession();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete window.google;
});
function identity(response: Record<string, unknown>) {
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (options) => ({
          requestAccessToken: () => options.callback(response),
        }),
        revoke: (_token, done) => done(),
      },
    },
  };
}
it("requires configuration and never authorizes Demo", async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
  await expect(authorizeGoogle("calendar", "personal")).rejects.toThrow(
    /not configured/,
  );
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "public-client");
  await expect(authorizeGoogle("calendar", "demo")).rejects.toThrow(
    /personal workspace/,
  );
});
it("uses only the requested feature scope and clears the in-memory session", async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "public-client");
  identity({
    access_token: "test-token",
    expires_in: 3600,
    scope: GOOGLE_SCOPES.calendar,
  });
  await authorizeGoogle("calendar", "personal");
  expect(googleSessionStatus("calendar", "personal")).toBe(
    "connected for this session",
  );
  expect(googleSessionStatus("contacts", "personal")).toBe(
    "authorization required",
  );
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  await googleRequest(
    "calendar",
    "personal",
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  const init = fetchMock.mock.calls[0][1]!;
  expect(new Headers(init.headers).get("Authorization")).toBe(
    "Bearer test-token",
  );
  expect(init.cache).toBe("no-store");
  await expect(
    googleRequest("calendar", "personal", "https://example.com/"),
  ).rejects.toThrow(/endpoint/);
  clearGoogleSession();
  await expect(
    googleRequest(
      "calendar",
      "personal",
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    ),
  ).rejects.toThrow(/Authorize/);
});
it("rejects missing consent and clears expired tokens after a 401", async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "public-client");
  identity({
    access_token: "test-token",
    expires_in: 3600,
    scope: GOOGLE_SCOPES.contacts,
  });
  await expect(authorizeGoogle("calendar", "personal")).rejects.toThrow(
    /permission/,
  );
  await authorizeGoogle("contacts", "personal");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("", { status: 401 }),
  );
  await expect(
    googleRequest(
      "contacts",
      "personal",
      "https://www.googleapis.com/people/v1/people/me/connections",
    ),
  ).rejects.toThrow(/expired/);
  expect(googleSessionStatus("contacts", "personal")).toBe(
    "authorization required",
  );
});
it("rejects a late authorization after the workspace changes", async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "public-client");
  let respond:
    | ((result: {
        access_token: string;
        expires_in: number;
        scope: string;
      }) => void)
    | undefined;
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (options) => ({
          requestAccessToken: () => {
            respond = options.callback;
          },
        }),
        revoke: (_token, done) => done(),
      },
    },
  };
  const attempt = authorizeGoogle("calendar", "personal");
  await Promise.resolve();
  clearGoogleSession();
  respond!({
    access_token: "late-token",
    expires_in: 3600,
    scope: GOOGLE_SCOPES.calendar,
  });
  await expect(attempt).rejects.toThrow(/Workspace changed/);
  expect(googleSessionStatus("calendar", "personal")).toBe(
    "authorization required",
  );
});
it("does not place the active Google token in a workspace backup", async () => {
  const { PulseDB } = await import("../src/data/db");
  const { initialize } = await import("../src/data/seed");
  const { exportBackup } = await import("../src/data/repository");
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "public-client");
  identity({
    access_token: "private-google-token-for-test",
    expires_in: 3600,
    scope: GOOGLE_SCOPES.contacts,
  });
  await authorizeGoogle("contacts", "personal");
  const db = new PulseDB("personal");
  await db.delete();
  await db.open();
  try {
    await initialize(db);
    expect(JSON.stringify(await exportBackup(db))).not.toContain(
      "private-google-token-for-test",
    );
  } finally {
    await db.delete();
  }
});
