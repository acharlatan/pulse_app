import { mediaLimits, imageSize, type MediaAsset } from "../data/media-models";
import { stamp } from "../data/models";
export async function readImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPEG, PNG or WebP image. HEIC and SVG are not supported.",
    );
  if (!file.size || file.size > mediaLimits.inputBytes)
    throw new Error("Choose an image smaller than 8 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = imageSize(bytes, file.type);
  if (
    !size.width ||
    !size.height ||
    size.width * size.height > mediaLimits.pixels ||
    size.width > 12000 ||
    size.height > 12000
  )
    throw new Error(
      "Choose an image up to 24 megapixels and 12,000 pixels per side.",
    );
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be decoded. Choose another file.");
  }
}
export async function cropImage(
  image: ImageBitmap,
  cover: boolean,
  zoom: number,
  x: number,
  y: number,
  contain = false,
): Promise<MediaAsset> {
  const width = cover ? 1280 : 320,
    height = cover ? 480 : 320,
    ratio = width / height;
  const scale = contain
    ? Math.min(width / image.width, height / image.height)
    : Math.max(width / image.width, height / image.height) * zoom;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image editing is unavailable in this browser.");
  if (contain) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      image,
      (width - image.width * scale) / 2,
      (height - image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    );
  } else {
    const sw = width / scale,
      sh = sw / ratio;
    ctx.drawImage(
      image,
      ((image.width - sw) * x) / 100,
      ((image.height - sh) * y) / 100,
      sw,
      sh,
      0,
      0,
      width,
      height,
    );
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not optimize image."))),
      "image/webp",
      0.84,
    ),
  );
  if (blob.size > 512 * 1024)
    throw new Error(
      "This image is too detailed to fit. Choose a simpler crop.",
    );
  return {
    id: "media-" + stamp().id,
    mime: blob.type as MediaAsset["mime"],
    width,
    height,
    bytes: blob.size,
    createdAt: new Date().toISOString(),
    blob,
  };
}
