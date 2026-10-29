import { useInterfaceText } from "../i18n/useInterfaceText";
import { useEffect, useRef, useState } from "react";
import { usePulse } from "../app/context";
import { Modal } from "./ui";
import { LocalMedia } from "./local-media";
import { readImage, cropImage } from "../services/image-processing";
import { saveMedia, type MediaOwner } from "../data/media-repository";
import type { MediaAsset } from "../data/media-models";
export function MediaEditor({
  owner,
  recordId,
  onClose,
}: {
  owner: MediaOwner;
  recordId: string;
  onClose: () => void;
}) {
  const __pulseText = useInterfaceText();
  const p = usePulse(),
    canvas = useRef<HTMLCanvasElement>(null),
    [slot, setSlot] = useState<"avatar" | "cover">("avatar"),
    [image, setImage] = useState<ImageBitmap | null>(null),
    [zoom, setZoom] = useState(1),
    [x, setX] = useState(50),
    [y, setY] = useState(50),
    [contain, setContain] = useState(owner === "organization"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [info, setInfo] = useState("");
  const row =
    owner === "contact"
      ? p.contacts.find((c) => c.id === recordId)
      : owner === "organization"
        ? p.organizations.find((o) => o.id === recordId)
        : null;
  const ref =
    owner === "workspace"
      ? p.settings.identity.avatarMediaId
      : slot === "avatar"
        ? row?.avatar || ""
        : row?.coverMediaId || "";
  const [expected, setExpected] = useState(ref);
  useEffect(() => () => image?.close(), [image]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !image) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = (c.width = slot === "cover" ? 640 : 320),
      h = (c.height = slot === "cover" ? 240 : 320);
    ctx.clearRect(0, 0, w, h);
    const scale =
      contain && slot === "avatar"
        ? Math.min(w / image.width, h / image.height)
        : Math.max(w / image.width, h / image.height) * zoom;
    if (contain && slot === "avatar") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(
        image,
        (w - image.width * scale) / 2,
        (h - image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
    } else {
      const sw = w / scale,
        sh = h / scale;
      ctx.drawImage(
        image,
        ((image.width - sw) * x) / 100,
        ((image.height - sh) * y) / 100,
        sw,
        sh,
        0,
        0,
        w,
        h,
      );
    }
  }, [image, slot, zoom, x, y, contain]);
  async function commit(remove = false) {
    setBusy(true);
    setError("");
    try {
      let asset: MediaAsset | null = null;
      if (!remove) {
        if (!image) throw new Error("Choose an image first.");
        asset = await cropImage(
          image,
          slot === "cover",
          zoom,
          x,
          y,
          contain && slot === "avatar",
        );
      }
      await saveMedia(p.db, owner, recordId, slot, asset, expected);
      p.notify(remove ? "Image removed" : "Image saved locally");
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && /quota/i.test(e.name + e.message)
          ? "Device storage is full. Export a backup, then remove unneeded images and try again."
          : e instanceof Error
            ? e.message
            : "Could not save image.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={__pulseText("Profile media")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void commit();
        }}
      >
        <p className="muted">
          {__pulseText("Private, on this device. Images are optimized locally and included in backups.")}</p>
        {owner !== "workspace" && (
          <label className="field">
            <span>{__pulseText("Image kind")}</span>
            <select
              value={slot}
              onChange={(e) => {
                const s = e.target.value as typeof slot;
                setSlot(s);
                setExpected(
                  s === "avatar" ? row?.avatar || "" : row?.coverMediaId || "",
                );
                setZoom(1);
                setX(50);
                setY(50);
              }}
            >
              <option value="avatar">
                {owner === "organization" ? __pulseText("Company logo") : __pulseText("Portrait")}
              </option>
              <option value="cover">{__pulseText("Cover image")}</option>
            </select>
          </label>
        )}
        {!image && (
          <div className={`media-current ${slot}`}>
            <LocalMedia
              id={ref}
              alt={__pulseText("Current saved image")}
              fallback={
                <p>
                  {__pulseText("No image yet. Your initials and ambient cover remain available.")}</p>
              }
            />
          </div>
        )}
        <label className="field">
          <span>{__pulseText("Choose image")}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              setError("");
              try {
                const bitmap = await readImage(f);
                setImage(bitmap);
                setZoom(1);
                setX(50);
                setY(50);
                setInfo(
                  `${bitmap.width} × ${bitmap.height} · ${Math.round(f.size / 1024)} KB original`,
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not open image.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
          <small>{__pulseText("JPEG, PNG or WebP · up to 8 MB / 24 megapixels.")}</small>
        </label>
        {image && (
          <>
            <canvas
              ref={canvas}
              className={`crop-preview ${slot}`}
              role="img"
              aria-label={__pulseText("Image crop preview")}
            />
            <p className="muted">
              {info}{__pulseText(". Saved as an optimized")}{" "}
              {slot === "cover" ? "1280 × 480" : "320 × 320"} {" " + __pulseText("image.")}</p>
            {slot === "avatar" && owner === "organization" && (
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={contain}
                  onChange={(e) => setContain(e.target.checked)}
                />
                {__pulseText("Fit the complete logo on white")}</label>
            )}
            {!(contain && slot === "avatar") && (
              <div className="form-grid">
                <label className="field">
                  <span>{__pulseText("Zoom")}</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span>{__pulseText("Horizontal position")}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={x}
                    onChange={(e) => setX(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span>{__pulseText("Vertical position")}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={y}
                    onChange={(e) => setY(Number(e.target.value))}
                  />
                </label>
              </div>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {__pulseText(error)}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            {__pulseText("Cancel")}</button>
          <button className="button primary" disabled={busy || !image}>
            {busy ? __pulseText("Processing…") : __pulseText("Save image")}
          </button>
          {ref && (
            <button
              type="button"
              className="button ghost destructive"
              disabled={busy}
              onClick={() => void commit(true)}
            >
              {__pulseText("Remove saved image")}</button>
          )}
        </div>
      </form>
    </Modal>
  );
}
