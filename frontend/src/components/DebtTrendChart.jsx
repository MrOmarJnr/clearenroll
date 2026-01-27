import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DebtTrendChart({ data = [] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={Array.isArray(data) ? data : []}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(v) => Number(v).toLocaleString()}
          />
          <Line
            type="monotone"
            dataKey="flagged"
            stroke="#E5533D"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cleared"
            stroke="#2EB85C"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
