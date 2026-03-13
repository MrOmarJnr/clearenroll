import { useEffect, useState } from "react";
import { api } from "../../services/api";

import FlagStatusPie from "../../components/FlagStatusPie";
import MonthlyBarChart from "../../components/MonthlyBarChart";
import CurrencyBarChart from "../../components/CurrencyBarChart";
import FlagTrend from "../../components/FlagTrend";

export default function DashboardAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async (f = fromDate, t = toDate, s = status) => {
    try {
      const params = new URLSearchParams();

      if (f) params.append("from", f);
      if (t) params.append("to", t);
      if (s) params.append("status", s);

      const res = await api("/dashboard/analytics?" + params.toString());
      setData(res);
    } catch (err) {
      setError("Failed to load analytics dashboard");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ---------------- PRESET DATE FILTERS ---------------- */

  const setPreset = (type) => {
    const today = new Date();

    if (type === "today") {
      const d = today.toISOString().split("T")[0];
      setFromDate(d);
      setToDate(d);
      loadData(d, d, status);
    }

    if (type === "7") {
      const past = new Date();
      past.setDate(today.getDate() - 7);

      const from = past.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      setFromDate(from);
      setToDate(to);
      loadData(from, to, status);
    }

    if (type === "30") {
      const past = new Date();
      past.setDate(today.getDate() - 30);

      const from = past.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      setFromDate(from);
      setToDate(to);
      loadData(from, to, status);
    }

    if (type === "year") {
      const from = `${today.getFullYear()}-01-01`;
      const to = today.toISOString().split("T")[0];

      setFromDate(from);
      setToDate(to);
      loadData(from, to, status);
    }
  };

  if (error) return <div className="card danger">{error}</div>;
  if (!data) return <div className="card">Loading analytics...</div>;

  const scopeLabel =
    data.scope === "GLOBAL"
      ? "Showing: All Schools (SUPER_ADMIN)"
      : "Showing: This School Only (SCHOOL_ADMIN)";

  return (
    <>
      {/* ================= HEADER ================= */}

      <div className="analytics-header">

        <div className="analytics-header-top">
          <h2>Analytics Dashboard</h2>
          <p>Financial & compliance insights</p>
          <span className="analytics-scope">{scopeLabel}</span>
        </div>

        {/* FILTER BAR */}

        <div className="analytics-filter-bar">

          <div className="analytics-filter-group">
            <label>From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="analytics-filter-group">
            <label>To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="analytics-filter-group">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="FLAGGED">Flagged</option>
              <option value="CLEARED">Cleared</option>
            </select>
          </div>

          <button
            className="analytics-apply"
            onClick={() => loadData()}
              style={{
                backgroundColor: "#169206",
                width: 100,
                height: 40,
                color: "#fff",
              }}
          >
            Apply
          </button>

          {/* PRESET BUTTONS */}

      

        </div>
      </div>

      {/* ================= CHARTS ================= */}

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