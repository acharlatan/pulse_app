import { lazy, Suspense, useState } from "react";
import type { MediaOwner } from "../data/media-repository";
const Editor = lazy(() =>
  import("./media-editor").then((m) => ({ default: m.MediaEditor })),
);
export function MediaControls({
  owner,
  id,
}: {
  owner: MediaOwner;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button secondary"
        onClick={() => setOpen(true)}
      >
        {owner === "workspace"
          ? "Workspace photo"
          : owner === "organization"
            ? "Logo & cover"
            : "Photo & cover"}
      </button>
      {open && (
        <Suspense fallback={<p role="status">Opening image editor…</p>}>
          <Editor owner={owner} recordId={id} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
