// @vitest-environment node
import { it, expect } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { build } from "esbuild";
it("real workerd serves static/API routes and SQLite quota rejects replay, concurrent bursts and daily limits", async () => {
  const compiled = await build({
    entryPoints: ["worker/index.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    external: ["cloudflare:workers"],
    target: "es2022",
  });
  const module = compiled.outputFiles[0].text;
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "pulse",
          modulesRoot: process.cwd(),
          modules: [
            {
              type: "ESModule",
              path: process.cwd() + "/test-entry.js",
              contents: `import worker,{AIQuota} from './pulse.js';export {AIQuota};export default {async fetch(r,e){const u=new URL(r.url);if(u.pathname==='/test/reserve')return Response.json(e.AI_QUOTA.getByName('global-v1').reserve ? await e.AI_QUOTA.getByName('global-v1').reserve(u.searchParams.get('client'),u.searchParams.get('id')):false);if(u.pathname==='/test/release'){await e.AI_QUOTA.getByName('global-v1').release(u.searchParams.get('id'));return new Response('released');}return worker.fetch(r,e);}}`,
            },
            {
              type: "ESModule",
              path: process.cwd() + "/pulse.js",
              contents: module,
            },
          ],
          compatibilityDate: "2026-10-25",
          durableObjects: {
            AI_QUOTA: { className: "AIQuota", useSQLite: true },
          },
          bindings: {
            AI_ENABLED: "false",
            GEMINI_MODEL: "gemini-3.5-flash-lite",
            ACCESS_AUD: "",
            ACCESS_TEAM_DOMAIN: "",
          },
          serviceBindings: { ASSETS: async () => new Response("static shell") },
        },
      ],
    }),
  );
  try {
    expect(await (await mf.dispatchFetch("https://test/")).text()).toBe(
      "static shell",
    );
    expect(
      await (await mf.dispatchFetch("https://test/api/ai/status")).json(),
    ).toMatchObject({ available: false });
    expect(
      (
        await mf.dispatchFetch("https://test/api/ai/generate", {
          method: "POST",
        })
      ).status,
    ).toBe(503);
    const reserve = async (id: string, client = "client") => {
      const r = await mf.dispatchFetch(
        `https://test/test/reserve?id=${id}&client=${client}`,
      );
      return r.json();
    };
    const burst = await Promise.all(
      Array.from({ length: 5 }, (_, i) => reserve("first-" + i)),
    );
    expect(burst.filter(Boolean)).toHaveLength(2);
    expect(await reserve("first-0")).toBe(false);
    for (let i = 0; i < 5; i++)
      await mf.dispatchFetch("https://test/test/release?id=first-" + i);
    for (let i = 0; i < 30; i++) {
      const id = "later-" + i;
      await reserve(id, "client-" + i);
      await mf.dispatchFetch("https://test/test/release?id=" + id);
    }
    expect(await reserve("over-daily", "unique-new-client")).toBe(false);
  } finally {
    await mf.dispose();
  }
}, 30000);
