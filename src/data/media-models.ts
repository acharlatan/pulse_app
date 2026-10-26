import { z } from "zod";
export const mediaLimits = {
  inputBytes: 8 * 1024 * 1024,
  totalBytes: 12 * 1024 * 1024,
  count: 128,
  backupBytes: 32 * 1024 * 1024,
  pixels: 24_000_000,
};
export const mediaMetadataSchema = z.object({
  id: z
    .string()
    .regex(/^media-[a-zA-Z0-9-]+$/)
    .max(200),
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  width: z.number().int().positive().max(1600),
  height: z.number().int().positive().max(1600),
  bytes: z
    .number()
    .int()
    .positive()
    .max(512 * 1024),
  createdAt: z.string().datetime(),
});
export const mediaBackupSchema = mediaMetadataSchema.extend({
  encoded: z.string().min(4).max(710000),
});
export type MediaAsset = z.infer<typeof mediaMetadataSchema> & { blob: Blob };
export type MediaBackup = z.infer<typeof mediaBackupSchema>;
export const mediaPrefix = "media-";
export function imageSize(
  bytes: Uint8Array,
  mime: string,
): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    ascii = (i: number, n: number) =>
      String.fromCharCode(...bytes.slice(i, i + n));
  try {
    if (
      mime === "image/png" &&
      bytes.length > 32 &&
      bytes[0] === 137 &&
      ascii(1, 3) === "PNG" &&
      ascii(12, 4) === "IHDR"
    )
      return { width: view.getUint32(16), height: view.getUint32(20) };
    if (
      mime === "image/webp" &&
      ascii(0, 4) === "RIFF" &&
      ascii(8, 4) === "WEBP" &&
      view.getUint32(4, true) + 8 === bytes.length
    ) {
      const kind = ascii(12, 4);
      if (kind === "VP8X")
        return {
          width: 1 + bytes[24] + bytes[25] * 256 + bytes[26] * 65536,
          height: 1 + bytes[27] + bytes[28] * 256 + bytes[29] * 65536,
        };
      if (
        kind === "VP8 " &&
        bytes[23] === 157 &&
        bytes[24] === 1 &&
        bytes[25] === 42
      )
        return {
          width: view.getUint16(26, true) & 16383,
          height: view.getUint16(28, true) & 16383,
        };
      if (kind === "VP8L" && bytes[20] === 47)
        return {
          width: 1 + (((bytes[22] & 63) << 8) | bytes[21]),
          height:
            1 +
            (((bytes[24] & 15) << 10) | (bytes[23] << 2) | (bytes[22] >> 6)),
        };
    }
    if (
      mime === "image/jpeg" &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[bytes.length - 2] === 255 &&
      bytes[bytes.length - 1] === 217
    ) {
      let i = 2;
      while (i + 8 < bytes.length) {
        if (bytes[i] !== 255) break;
        const marker = bytes[i + 1],
          length = view.getUint16(i + 2);
        if (
          [
            192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
          ].includes(marker)
        )
          return {
            height: view.getUint16(i + 5),
            width: view.getUint16(i + 7),
          };
        if (length < 2) break;
        i += 2 + length;
      }
    }
  } catch {
    /* A truncated header is not a valid image. */
  }
  throw new Error(
    "Image is corrupt or its content does not match JPEG, PNG or WebP.",
  );
}
export function encodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.slice(i, i + 8192));
  return btoa(binary);
}
export function decodeMedia(input: unknown): MediaAsset {
  const m = mediaBackupSchema.parse(input);
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      m.encoded,
    )
  )
    throw new Error("Invalid encoded image.");
  const bytes = Uint8Array.from(atob(m.encoded), (c) => c.charCodeAt(0));
  const dimensions = imageSize(bytes, m.mime);
  if (
    bytes.length !== m.bytes ||
    dimensions.width !== m.width ||
    dimensions.height !== m.height
  )
    throw new Error("Image metadata does not match its contents.");
  const { encoded: _, ...metadata } = m;
  void _;
  return { ...metadata, blob: new Blob([bytes], { type: m.mime }) };
}
