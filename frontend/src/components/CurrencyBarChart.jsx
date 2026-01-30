import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function CurrencyBarChart({ data = [] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart
          data={Array.isArray(data) ? data : []}
          barGap={8}
          barCategoryGap={16}
          barSize={40}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
          <XAxis dataKey="currency" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Legend />

          {/* FLAGGED */}
          <Bar
            dataKey="flagged"
            name="Flagged"
            fill="#FA5252"
            radius={[6, 6, 0, 0]}
          />

          {/* CLEARED */}
          <Bar
            dataKey="cleared"
            name="Cleared"
            fill="#40C057"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
