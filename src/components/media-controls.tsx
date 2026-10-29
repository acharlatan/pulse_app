import { useInterfaceText } from "../i18n/useInterfaceText";
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
  const __pulseText = useInterfaceText();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button secondary"
        onClick={() => setOpen(true)}
      >
        {owner === "workspace"
          ? __pulseText("Workspace photo")
          : owner === "organization"
            ? __pulseText("Logo & cover")
            : __pulseText("Photo & cover")}
      </button>
      {open && (
        <Suspense fallback={<p role="status">{__pulseText("Opening image editor…")}</p>}>
          <Editor owner={owner} recordId={id} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
