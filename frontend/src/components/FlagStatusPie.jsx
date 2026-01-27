import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FlagStatusPie({ data = {} }) {
  const flagged = Number(data.flagged_amount || 0);
  const cleared = Number(data.cleared_amount || 0);
  const total = flagged + cleared;

  const chartData = [
    { name: "Flagged", value: flagged },
    { name: "Cleared", value: cleared },
  ];

  const COLORS = {
    Flagged: "#E5533D",
    Cleared: "#2EB85C",
  };

  const renderLabel = ({ value }) => {
    if (!total || value === 0) return "";
    return `${Math.round((value / total) * 100)}%`;
  };

  return (
    <div
      style={{
        width: "100%",
        height: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
      }}
    >
      {/* PIE */}
      <div style={{ width: 260, height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={75}
              outerRadius={105}
              paddingAngle={4}
              label={renderLabel}
              labelLine={false}
            >
              {chartData.map((e, i) => (
                <Cell key={i} fill={COLORS[e.name]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) =>
                v.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* LEGEND */}
      <div style={{ minWidth: 200 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>
          Debt Summary
        </div>

        <LegendRow
          color={COLORS.Flagged}
          label="Flagged"
          value={flagged}
        />
        <LegendRow
          color={COLORS.Cleared}
          label="Cleared"
          value={cleared}
        />
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          background: color,
          borderRadius: 3,
          marginRight: 10,
        }}
      />
      <span style={{ flex: 1 }}>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}
