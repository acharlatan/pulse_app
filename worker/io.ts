export async function boundedText(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
) {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("size");
      chunks.push(value);
    }
  } catch (e) {
    await reader.cancel();
    throw e;
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    joined.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(
    joined,
  );
}
export const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
