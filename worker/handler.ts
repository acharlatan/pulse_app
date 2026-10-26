import { aiRequestSchema } from "../src/ai/contracts";
import { authorize } from "./access";
import { generate, MODEL } from "./provider";
import { boundedText, json } from "./io";
export function configured(env: Env) {
  return (
    env.AI_ENABLED === "true" &&
    !!env.GEMINI_API_KEY &&
    !!env.ACCESS_AUD &&
    /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN) &&
    env.GEMINI_MODEL === MODEL &&
    !!env.AI_QUOTA
  );
}
export async function handle(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (path === "/api/ai/status" && request.method === "GET")
    return json({
      version: 1,
      available: configured(env),
      mode: configured(env) ? "protected-operator" : "disabled",
      message: configured(env)
        ? "Operator authorization required; each request requires selected-context approval."
        : "AI is not configured. Core CRM and local communication handoffs remain available.",
    });
  if (path !== "/api/ai/generate")
    return json({ error: "API route not found." }, 404);
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!configured(env))
    return json(
      {
        error:
          "AI is disabled or its provider/access controls are not configured.",
      },
      503,
    );
  let client: string;
  try {
    client = await authorize(request, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
  } catch {
    return json({ error: "Authorized operator access is required." }, 401);
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return json({ error: "Use JSON." }, 415);
  let input;
  try {
    input = aiRequestSchema.parse(
      JSON.parse(await boundedText(request.body, 48000)),
    );
  } catch {
    return json(
      {
        error:
          "Invalid or oversized request. Only supported operations and bounded context are accepted.",
      },
      400,
    );
  }
  const quota = env.AI_QUOTA.getByName("global-v1");
  let accepted = false;
  try {
    accepted = await quota.reserve(client, input.requestId);
  } catch {
    return json(
      { error: "Usage protection unavailable; request refused." },
      503,
    );
  }
  if (!accepted)
    return json(
      {
        error:
          "Request replay, rate, daily, concurrency or lifetime limit reached. No automatic retry.",
      },
      429,
    );
  try {
    return json(
      await generate(
        input,
        env.GEMINI_API_KEY!,
        env.GEMINI_MODEL,
        request.signal,
      ),
    );
  } catch {
    return json(
      {
        error:
          "The AI provider could not return a valid response. No CRM records changed. Review context before retrying.",
      },
      502,
    );
  } finally {
    try {
      await quota.release(input.requestId);
    } catch {
      /* Admission lease remains closed until expiry; never refund a possibly billed attempt. */
    }
  }
}
