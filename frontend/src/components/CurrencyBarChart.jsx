import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function CurrencyBarChart({ data = [] }) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={Array.isArray(data) ? data : []} barSize={42}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
          <XAxis
            dataKey="currency"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Bar
            dataKey="total"
            fill="#38D9A9"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
