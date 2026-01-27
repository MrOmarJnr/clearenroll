import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link } from "react-router-dom";

import FlagStatusPie from "../../components/FlagStatusPie";
import MonthlyBarChart from "../../components/MonthlyBarChart";
import CurrencyBarChart from "../../components/CurrencyBarChart";
import DebtTrendChart from "../../components/DebtTrendChart";

export default function Dashboard() {
  const [cards, setCards] = useState(null);
  const [recentFlags, setRecentFlags] = useState([]);
  const [myFlagActivity, setMyFlagActivity] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const PAGE_SIZE = 5;
  const [recentPage, setRecentPage] = useState(1);
  const [myPage, setMyPage] = useState(1);

  useEffect(() => {
    (async () => {
      // ===== Existing dashboard (DO NOT TOUCH LOGIC) =====
      const data = await api("/dashboard");
      setCards(data.cards);
      setRecentFlags(data.recentFlags || []);
      setMyFlagActivity(data.myFlagActivity || []);

      // ===== Analytics (add-on only) =====
      try {
        const a = await api("/dashboard/analytics");
        setAnalytics(a);
      } catch {
        setAnalytics(null);
      }
    })();
  }, []);

  const recentStart = (recentPage - 1) * PAGE_SIZE;
  const recentEnd = recentStart + PAGE_SIZE;
  const pagedRecentFlags = recentFlags.slice(recentStart, recentEnd);

  const myStart = (myPage - 1) * PAGE_SIZE;
  const myEnd = myStart + PAGE_SIZE;
  const pagedMyActivity = myFlagActivity.slice(myStart, myEnd);

  const exportMyActivityCSV = () => {
    if (!myFlagActivity.length) return;

    const headers = ["Student", "Parent", "School", "Amount", "Status", "My Action"];
    const rows = myFlagActivity.map((f) => [
      f.student,
      f.parent,
      f.school,
      f.amount_owed,
      f.status,
      f.my_action,
    ]);

    const csv =
      [headers, ...rows]
        .map((r) =>
          r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "my_flag_activity.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  const badgeClass = (status) => {
    if (status === "FLAGGED") return "badge badge-danger";
    if (status === "CLEARED") return "badge badge-success";
    return "badge";
  };

  if (!cards) return <div className="card">Loading...</div>;

  return (
    <>
      {/* ================= PAGE HEADER ================= */}
      <div className="page-head">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <div className="page-subtitle">
            System overview & activity snapshot
          </div>
        </div>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="grid4">
        <div className="card stat-card">
          <div className="stat-title">Schools</div>
          <div className="stat-value">{cards.schools}</div>
        </div>

        <div className="card stat-card">
          <div className="stat-title">Parents</div>
          <div className="stat-value">{cards.parents}</div>
        </div>

        <div className="card stat-card">
          <div className="stat-title">Students</div>
          <div className="stat-value">{cards.students}</div>
        </div>

        <div className="card stat-card">
          <div className="stat-title">Flagged</div>
          <div className="stat-value danger">{cards.flagged}</div>
        </div>
      </div>

      {/* ================= PENDING DUPLICATES ================= */}
      <div className="grid4" style={{ marginTop: 12 }}>
        <Link
          to="/duplicates"
          className="card stat-card clickable"
          style={{ textDecoration: "none" }}
        >
          <div className="stat-title">Pending Duplicates</div>
          <div
            className={
              "stat-value " +
              (Number(cards.pendingDuplicates) > 0 ? "danger" : "")
            }
          >
            {cards.pendingDuplicates ?? 0}
          </div>
          <div className="hint">Review potential duplicates</div>
        </Link>
      </div>

      {/* ================= ANALYTICS (CONSTRAINED) ================= */}
      <div
        className="card"
        style={{
          marginTop: 16,
          maxWidth: "1920px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div className="card-head">
          <h3 className="card-title">Financial & Compliance Analytics</h3>
          <div className="card-actions">
            <Link className="link-soft" to="/dashboard/analytics">
              Open full analytics
            </Link>
          </div>
        </div>

        {!analytics ? (
          <div className="muted">Loading analytics...</div>
        ) : (
          <>
            {/* Row 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="card" style={{ margin: 0 }}>
                <h4 style={{ marginBottom: 8 }}>
                  Flagged vs Cleared (Amount)
                </h4>
                <FlagStatusPie
                  data={
                    analytics.pieTotals || {
                      flagged_amount: 0,
                      cleared_amount: 0,
                    }
                  }
                />
              </div>

              <div className="card" style={{ margin: 0 }}>
                <h4 style={{ marginBottom: 8 }}>By Currency</h4>
                <CurrencyBarChart data={analytics.currencyBar || []} />
              </div>
            </div>

            {/* Row 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 16,
              }}
            >
              <div className="card" style={{ margin: 0 }}>
                <h4 style={{ marginBottom: 8 }}>Monthly Overview</h4>
                <MonthlyBarChart data={analytics.monthlyBar || []} />
              </div>

              <div className="card" style={{ margin: 0 }}>
                <h4 style={{ marginBottom: 8 }}>
                  Debt Trend (Flagged vs Cleared)
                </h4>
                <DebtTrendChart data={analytics.trendData || []} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= RECENT FLAGS ================= */}
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">Recent Flags</h3>
          <div className="card-actions">
            <Link className="link-soft" to="/flags">
              View all
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Parent</th>
                <th>Reported By</th>
                <th className="td-left">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedRecentFlags.map((f, i) => (
                <tr key={i}>
                  <td>{f.student}</td>
                  <td>{f.parent}</td>
                  <td>{f.reported_by}</td>
                  <td className="td-left">{f.amount_owed}</td>
                  <td>
                    <span className={badgeClass(f.status)}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}

              {!recentFlags.length && (
                <tr>
                  <td colSpan="5">No flags yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="row-actions">
          <button
            className="btn btn-ghost"
            disabled={recentPage === 1}
            onClick={() => setRecentPage(recentPage - 1)}
          >
            Prev
          </button>
          <span className="muted">Page {recentPage}</span>
          <button
            className="btn btn-ghost"
            disabled={recentEnd >= recentFlags.length}
            onClick={() => setRecentPage(recentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* ================= MY FLAG ACTIVITY ================= */}
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">My Flag Activity</h3>
          <div className="card-actions">
            <button className="btn btn-outline" onClick={exportMyActivityCSV}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Parent</th>
                <th>School</th>
                <th className="td-left">Amount</th>
                <th>Status</th>
                <th>My Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedMyActivity.map((f, i) => (
                <tr key={i}>
                  <td>{f.student}</td>
                  <td>{f.parent}</td>
                  <td>{f.school}</td>
                  <td className="td-left">{f.amount_owed}</td>
                  <td>
                    <span className={badgeClass(f.status)}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    <span className="pill">{f.my_action}</span>
                  </td>
                </tr>
              ))}

              {!myFlagActivity.length && (
                <tr>
                  <td colSpan="6">No activity recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="row-actions">
          <button
            className="btn btn-ghost"
            disabled={myPage === 1}
            onClick={() => setMyPage(myPage - 1)}
          >
            Prev
          </button>
          <span className="muted">Page {myPage}</span>
          <button
            className="btn btn-ghost"
            disabled={myEnd >= myFlagActivity.length}
            onClick={() => setMyPage(myPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
