import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function FlagTrend({ data = [] }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={Array.isArray(data) ? data : []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })
            }
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
