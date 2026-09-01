/**
 * Dropdown pilih device + input tanggal. Dipakai di semua halaman monitoring.
 */
export default function DevicePicker({ devices, deviceId, onDevice, date, onDate }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-5">
      <select
        value={deviceId || ""}
        onChange={(e) => onDevice(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm flex-1"
      >
        {devices.length === 0 && <option value="">— belum ada device —</option>}
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}{d.location ? ` — ${d.location}` : ""}
          </option>
        ))}
      </select>

      {onDate && (
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
