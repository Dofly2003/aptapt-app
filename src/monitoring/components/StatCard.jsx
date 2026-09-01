/**
 * Kartu angka realtime. `items` = [{ label, value, color }].
 * `alert` = true -> border merah (mis. threshold terlampaui).
 */
export default function StatCard({ title, unit, items = [], alert = false }) {
  return (
    <div
      className={`bg-slate-800/80 backdrop-blur p-5 rounded-2xl shadow-lg border transition ${
        alert ? "border-red-500" : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg text-slate-100">{title}</h2>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
      <div
        className="grid gap-3 text-center"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0,1fr))` }}
      >
        {items.map((it) => (
          <div key={it.label}>
            <p className="text-xs text-slate-400">{it.label}</p>
            <p className="font-semibold text-lg" style={{ color: it.color || "#e2e8f0" }}>
              {it.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
