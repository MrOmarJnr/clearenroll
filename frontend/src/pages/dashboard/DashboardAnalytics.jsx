import { useEffect, useState } from "react";
import { api } from "../../services/api";

import FlagStatusPie from "../../components/FlagStatusPie";
import MonthlyBarChart from "../../components/MonthlyBarChart";
import CurrencyBarChart from "../../components/CurrencyBarChart";
import FlagTrend from "../../components/FlagTrend";

export default function DashboardAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/dashboard/analytics");
        setData(res);
      } catch (err) {
        setError("Failed to load analytics dashboard");
      }
    })();
  }, []);

  if (error) return <div className="card danger">{error}</div>;
  if (!data) return <div className="card">Loading analytics...</div>;

  const scopeLabel =
    data.scope === "GLOBAL"
      ? "Showing: All Schools (SUPER_ADMIN)"
      : "Showing: This School Only (SCHOOL_ADMIN)";

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">Analytics Dashboard</h2>
        <div className="page-subtitle">Financial & compliance insights</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {scopeLabel}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Flagged vs Cleared (Amount)</h3>
          <FlagStatusPie
            data={{
              flagged_amount: data?.pieTotals?.flagged_amount ?? 0,
              cleared_amount: data?.pieTotals?.cleared_amount ?? 0,
            }}
          />
        </div>

        <div className="card">
          <h3>Amount by Currency</h3>
          <CurrencyBarChart data={data?.currencyBar ?? []} />
        </div>
      </div>

      <div className="card">
        <h3>Monthly Amount Overview</h3>
        <MonthlyBarChart data={data?.monthlyBar ?? []} />
      </div>

      <div className="card">
        <h3>Debt Trend (Flagged vs Cleared)</h3>
        <FlagTrend data={data?.trendData ?? []} />
      </div>
    </>
  );
}
