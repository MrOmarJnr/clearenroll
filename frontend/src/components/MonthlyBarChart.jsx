import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function MonthlyBarChart({ data = [] }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={Array.isArray(data) ? data : []} barSize={36}>
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
            formatter={(v) => v.toLocaleString()}
            cursor={{ fill: "rgba(76,110,245,0.08)" }}
          />
          <Bar
            dataKey="total"
            fill="#4C6EF5"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
