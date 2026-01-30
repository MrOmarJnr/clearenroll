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

export default function MonthlyBarChart({ data = [] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart
          data={Array.isArray(data) ? data : []}
          barSize={14}               
          barGap={6}                   
          barCategoryGap={40}          
        >
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
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />

          <Legend
            verticalAlign="top"
            height={30}
            iconType="circle"
            iconSize={8}
          />

          {/* CLEARED */}
          <Bar
            dataKey="cleared"
            name="Cleared"
            fill="#40C057"
            radius={[8, 8, 0, 0]}
          />

          {/* FLAGGED */}
          <Bar
            dataKey="flagged"
            name="Flagged"
            fill="#FA5252"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
