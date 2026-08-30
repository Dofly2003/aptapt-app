import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { getCachedPhotoUrl, cachePhoto } from "./photoStore";

/**
 * Image component with 7-day Filesystem cache on native,
 * direct URL on web.
 *
 * Props:
 *   src         - Firebase Storage URL (or any URL)
 *   alt         - img alt
 *   className   - CSS classes
 *   fallback    - element shown while loading (optional)
 */
export default function CachedImage({ src, alt = "", className = "", fallback = null }) {
  const [displaySrc, setDisplaySrc] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!src) return;
    setDisplaySrc(null);
    setErrored(false);
    let cancelled = false;

    (async () => {
      if (!Capacitor.isNativePlatform()) {
        if (!cancelled) setDisplaySrc(src);
        return;
      }

      // Try filesystem cache first
      const cached = await getCachedPhotoUrl(src);
      if (cached) {
        if (!cancelled) setDisplaySrc(cached);
        return;
      }

      // Not cached — load from URL, then cache
      if (!cancelled) setDisplaySrc(src); // show URL immediately while fetching
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        await cachePhoto(src, blob);
        // Re-resolve from cache now that it's stored
        const fresh = await getCachedPhotoUrl(src);
        if (!cancelled && fresh) setDisplaySrc(fresh);
      } catch {
        // URL stays as fallback
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  if (!displaySrc) return fallback;
  if (errored) return fallback;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
