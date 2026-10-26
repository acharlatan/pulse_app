import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { usePulse } from "../app/context";
export function LocalMedia({
  id,
  alt = "",
  className = "",
  fallback = null,
}: {
  id?: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const { db } = usePulse();
  const asset = useLiveQuery(
    () => (id?.startsWith("media-") ? db.media.get(id) : undefined),
    [db, id],
  );
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!asset) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(asset.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [asset]);
  return url && !failed ? (
    <img
      className={className}
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <>{fallback}</>
  );
}
