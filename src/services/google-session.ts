/** Google authorization is intentionally memory-only and scoped to one workspace.
 * OAuth tokens are never added to PULSE records, backup files or URLs. */
export type GoogleFeature = "calendar" | "contacts";
export const GOOGLE_SCOPES: Record<GoogleFeature, string> = {
  calendar: "https://www.googleapis.com/auth/calendar.events.owned",
  contacts: "https://www.googleapis.com/auth/contacts.readonly",
};
type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
};
type TokenClient = {
  requestAccessToken: (options: { prompt: string }) => void;
};
type GoogleOAuth = {
  initTokenClient: (options: {
    client_id: string;
    scope: string;
    include_granted_scopes: boolean;
    callback: (result: TokenResponse) => void;
    error_callback: () => void;
  }) => TokenClient;
  revoke: (token: string, callback: () => void) => void;
};
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth } };
  }
}
type Session = {
  token: string;
  feature: GoogleFeature;
  workspace: string;
  expiresAt: number;
};
let session: Session | undefined;
let generation = 0;
let pending = false;
let scriptPromise: Promise<void> | undefined;
export function configuredGoogleClient() {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
}
export function clearGoogleSession() {
  generation++;
  session = undefined;
  pending = false;
}
export function cancelPendingGoogleAuthorization() {
  if (pending) clearGoogleSession();
}
export function googleSessionStatus(
  feature: GoogleFeature,
  workspace: string,
  now = Date.now(),
) {
  if (!configuredGoogleClient()) return "not configured";
  if (
    !session ||
    session.workspace !== workspace ||
    session.feature !== feature
  )
    return "authorization required";
  if (session.expiresAt <= now) return "session expired";
  return "connected for this session";
}
export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (!navigator.onLine)
    return Promise.reject(
      new Error("Google authorization requires an internet connection."),
    );
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () =>
        window.google?.accounts.oauth2
          ? resolve()
          : reject(new Error("Google Identity did not initialize."));
      script.onerror = () =>
        reject(
          new Error("Could not load Google Identity. Check your connection."),
        );
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      scriptPromise = undefined;
      throw error;
    });
  }
  return scriptPromise;
}
export async function authorizeGoogle(
  feature: GoogleFeature,
  workspace: string,
): Promise<void> {
  const clientId = configuredGoogleClient();
  if (!clientId)
    throw new Error(
      "Google is not configured. An OAuth web client ID is required.",
    );
  if (workspace !== "personal")
    throw new Error(
      "Google connections are available only in your personal workspace.",
    );
  if (pending) throw new Error("An authorization request is already open.");
  pending = true;
  const requestGeneration = ++generation;
  session = undefined;
  try {
    await loadGoogleIdentity();
    if (requestGeneration !== generation)
      throw new Error("Workspace changed; authorization was cancelled.");
    await new Promise<void>((resolve, reject) => {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES[feature],
        include_granted_scopes: false,
        callback: (response) => {
          if (requestGeneration !== generation)
            return reject(
              new Error("Workspace changed; authorization was cancelled."),
            );
          if (
            response.error ||
            !response.access_token ||
            !response.expires_in ||
            !response.scope?.split(/\s+/).includes(GOOGLE_SCOPES[feature])
          )
            return reject(
              new Error(
                "Google authorization was denied or did not grant the required permission.",
              ),
            );
          session = {
            token: response.access_token,
            feature,
            workspace,
            expiresAt: Date.now() + response.expires_in * 1000 - 30000,
          };
          resolve();
        },
        error_callback: () =>
          reject(
            new Error("Google authorization was closed or could not open."),
          ),
      });
      client.requestAccessToken({ prompt: "select_account" });
    });
  } finally {
    if (requestGeneration === generation) pending = false;
  }
}
export function disconnectGoogle() {
  const token = session?.token;
  clearGoogleSession();
  if (token && window.google?.accounts.oauth2)
    window.google.accounts.oauth2.revoke(token, () => {});
}
export class GoogleRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Google request failed (${status}). No automatic retry was made.`);
  }
}
export async function googleRequest(
  feature: GoogleFeature,
  workspace: string,
  url: string,
  init: RequestInit = {},
) {
  const origin = new URL(url);
  if (
    origin.protocol !== "https:" ||
    !["www.googleapis.com", "people.googleapis.com"].includes(origin.hostname)
  )
    throw new Error("Unsupported Google API endpoint.");
  const active = session;
  if (
    !active ||
    active.feature !== feature ||
    active.workspace !== workspace ||
    active.expiresAt <= Date.now()
  )
    throw new Error("Authorize Google again before continuing.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${active.token}`);
  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  });
  if (active !== session)
    throw new Error("Authorization changed before the request completed.");
  if (response.status === 401) {
    clearGoogleSession();
    throw new Error("Google session expired. Please reconnect.");
  }
  if (!response.ok) throw new GoogleRequestError(response.status);
  return response;
}
