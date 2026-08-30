import { useEffect, useState } from "react";
import { presignGetMany } from "../firebase/secureStorage";

export function useSecurePhotoUrls(paths) {
  const key = (paths || []).filter(Boolean).slice().sort().join("|");
  const [urls, setUrls] = useState({});
  useEffect(() => {
    if (!key) { setUrls({}); return; }
    let alive = true;
    presignGetMany(key.split("|")).then((m) => { if (alive) setUrls(m); });
    return () => { alive = false; };
  }, [key]);
  return urls;
}
