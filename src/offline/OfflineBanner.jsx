import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { isOnline, onNetworkChange } from "./networkWatcher";

export default function OfflineBanner() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    return onNetworkChange(setOnline);
  }, []);

  if (online) return null;

  return (
    <div className="bg-amber-500 text-white text-xs px-4 py-2 flex items-center gap-2">
      <WifiOff size={13} className="shrink-0" />
      <span>Tidak ada koneksi — perubahan disimpan lokal &amp; akan tersinkron saat online.</span>
    </div>
  );
}
