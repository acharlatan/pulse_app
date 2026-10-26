import { boundedText } from "./io";
function decode(value: string) {
  const text = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}
export async function authorize(
  request: Request,
  domain: string,
  audience: string,
): Promise<string> {
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) || !audience)
    throw new Error("access");
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt || jwt.length > 12000) throw new Error("access");
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("access");
  const head = JSON.parse(new TextDecoder().decode(decode(parts[0]))),
    payload = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  if (
    head.alg !== "RS256" ||
    typeof head.kid !== "string" ||
    payload.iss !== `https://${domain}` ||
    !Array.isArray(payload.aud) ||
    !payload.aud.includes(audience) ||
    typeof payload.exp !== "number" ||
    payload.exp <= Date.now() / 1000 ||
    typeof payload.sub !== "string" ||
    payload.type !== "app" ||
    (payload.nbf && payload.nbf > Date.now() / 1000)
  )
    throw new Error("access");
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error("access");
  const data = JSON.parse(await boundedText(res.body, 60000));
  const jwk = (data.keys as (JsonWebKey & { kid: string })[]).find(
    (k) => k.kid === head.kid && k.kty === "RSA",
  );
  if (!jwk) throw new Error("access");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  if (
    !(await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decode(parts[2]),
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    ))
  )
    throw new Error("access");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload.sub),
  );
  return [...new Uint8Array(digest)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
