import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";

/**
 * Grafik garis vs waktu.
 * data  : array baris, tiap baris punya key `time` + key numerik.
 * series: [{ key, name, color }]
 */
export default function TimeChart({ title, data = [], series = [], height = 300, yDomain }) {
  return (
    <div className="bg-slate-800 p-5 rounded-xl mb-6">
      <h2 className="text-slate-200 font-semibold mb-3">{title}</h2>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            domain={yDomain || ["auto", "auto"]}
            tickFormatter={(v) => Number(v).toFixed(1)}
          />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
            formatter={(v, n) => [Number(v).toFixed(2), n]}
          />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name || s.key}
              stroke={s.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
