import { useEffect, useState } from "react";
import { subscribe } from "../lib/rtdb";

/**
 * Daftar device dari /monitoring/devices, difilter per type & hanya yang active.
 * type: "panel-daya" | "ketinggian"
 * Return: { devices, loading }
 *   devices = [{ id, name, type, location, dataPath, thresholds, ... }]
 */
export function useDevices(type) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribe("monitoring/devices", (val) => {
      const list = Object.entries(val || {})
        .map(([id, d]) => ({ id, ...d }))
        .filter((d) => d.type === type && d.active !== false)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setDevices(list);
      setLoading(false);
    });
    return unsub;
  }, [type]);

  return { devices, loading };
}
