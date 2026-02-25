import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

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

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";


  useEffect(() => {
    (async () => {
      const data = await api("/dashboard");
      setCards(data.cards);
      setRecentFlags(data.recentFlags || []);
      setMyFlagActivity(data.myFlagActivity || []);

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
    const rows = myFlagActivity.map((f) => [f.student, f.parent, f.school, f.amount_owed, f.status, f.my_action]);

    const csv =
      [headers, ...rows]
        .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "my_flag_activity.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  const statusClass = (status) => {
    if (status === "CLEARED") return "status completed";
    if (status === "FLAGGED") return "status pending";
    return "status process";
  };

  const token = localStorage.getItem("token");

  const getUserSafe = () => {
    try {
      if (!token) return null;
      const payload = jwtDecode(token);

      if (payload?.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        return null;
      }

      return payload;
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  };

  const user = getUserSafe();

   const profileImage =
      user?.profile_photo
        ? user.profile_photo.startsWith("http")
          ? user.profile_photo
          : `${API_BASE}/${user.profile_photo}`
        : null;

        
  const profileInitial =
    user?.full_name?.trim()?.[0]?.toUpperCase() ||
    user?.email?.trim()?.[0]?.toUpperCase() ||
    "U";



  if (!cards) return <div>Loading...</div>;

  return (
    <>
      {/* HEADER (AdminHub) */}
      <div className="head-title">
        <div className="left">
          
          <h1>Dashboard</h1>
          {user ? (
            <div style={{ marginTop: 10, color: "var(--dark)" }}>
           
              Hello <strong style={{ fontSize: "30px" }}>{user.full_name}  </strong>
              <br />
            </div>
            
          ) : null}
          
        </div>

     
      </div>

      {/* KPI CARDS (AdminHub box-info) */}
     <ul className="box-info">
  <li className="kpi schools">
    <div className="icon">
      <i className="bx bxs-school" />
    </div>
    <div className="text">
      <h3>{cards.schools}</h3>
      <p>Schools</p>
    </div>
  </li>

  <li className="kpi parents">
    <div className="icon">
      <i className="bx bxs-user-detail" />
    </div>
    <div className="text">
      <h3>{cards.parents}</h3>
      <p>Parents</p>
    </div>
  </li>

  <li className="kpi students">
    <div className="icon">
      <i className="bx bxs-group" />
    </div>
    <div className="text">
      <h3>{cards.students}</h3>
      <p>Students</p>
    </div>
  </li>

  <li className="kpi flagged">
    <div className="icon">
      <i className="bx bxs-flag-alt" />
    </div>
    <div className="text">
      <h3>{cards.flagged}</h3>
      <p>Flagged</p>
    </div>
  </li>

  <li className="kpi duplicates">
    <div className="icon">
      <i className="bx bxs-copy" />
    </div>
    <div className="text">
      <h3>{cards.pendingDuplicates ?? 0}</h3>
      <p>Teachers</p>
    </div>
  </li>
</ul>


      {/* ANALYTICS SECTION (still AdminHub style) */}
      <div className="table-data" style={{ marginTop: 24 }}>
        <div className="order" style={{ flexBasis: "800px" }}>
          <div className="head">
            <h3>Financial & Compliance Analytics</h3>
            <Link to="/dashboard/analytics" style={{ color: "var(--blue)", fontWeight: 600 }}>
              Open full analytics
            </Link>
          </div>

          {!analytics ? (
            <div style={{ color: "var(--dark-grey)" }}>Loading analytics...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minWidth: 520 }}>
              <div style={{ background: "var(--grey)", borderRadius: 12, padding: 16 }}>
                <h4 style={{ marginBottom: 8 }}>Flagged vs Cleared</h4>
                <FlagStatusPie
                  data={analytics.pieTotals || { flagged_amount: 0, cleared_amount: 0 }}
                />
              </div>

              <div style={{ background: "var(--grey)", borderRadius: 12, padding: 16 }}>
                <h4 style={{ marginBottom: 8 }}>By Currency</h4>
                <CurrencyBarChart data={analytics.currencyBar || []} />
              </div>

              <div style={{ background: "var(--grey)", borderRadius: 12, padding: 16 }}>
                <h4 style={{ marginBottom: 8 }}>Monthly Overview</h4>
                <MonthlyBarChart data={analytics.monthlyBar || []} />
              </div>

              <div style={{ background: "var(--grey)", borderRadius: 12, padding: 16 }}>
                <h4 style={{ marginBottom: 8 }}>Debt Trend (Flagged vs Cleared)</h4>
                <DebtTrendChart data={analytics.trendData || []} />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions / exports (use AdminHub todo style) */}
        <div className="todo">
          <div className="head">
            <h3>Quick Actions</h3>
            <i className="bx bx-filter" />
          </div>

          <ul className="todo-list">
            <li className="not-completed">
              <p>
                <Link to="/flags" style={{ color: "inherit" }}>
                  Review Flags
                </Link>
              </p>
              <i className="bx bx-right-arrow-alt" />
            </li>

            <li className="not-completed">
              <p>
                <Link to="/duplicates" style={{ color: "inherit" }}>
                  Review Duplicates
                </Link>
              </p>
              <i className="bx bx-right-arrow-alt" />
            </li>

            <li className="completed">
              <p onClick={exportMyActivityCSV} style={{ cursor: "pointer" }}>
                Export My Flag Activity (CSV)
              </p>
              <i className="bx bx-download" />
            </li>
          </ul>
        </div>
      </div>

      {/* TABLES (AdminHub table-data layout) */}
      <div className="table-data">
        {/* Recent Flags */}
        <div className="order">
          <div className="head">
            <h3>Recent Flags</h3>
            <Link to="/flags" style={{ color: "var(--blue)", fontWeight: 600 }}>
              View all
            </Link>
          </div>

          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Parent</th>
                <th>Reported By</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {pagedRecentFlags.map((f, i) => (
                <tr key={i}>
                  <td>{f.student}</td>
                  <td>{f.parent}</td>
                  <td>{f.reported_by}</td>
                  <td>{f.amount_owed}</td>
                  <td>
                    <span className={statusClass(f.status)}>{f.status}</span>
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

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
            <button
              className="btn-download"
                        style={{
                height: 34,
                backgroundColor: "#919191", 
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              disabled={recentPage === 1}
              onClick={() => setRecentPage(recentPage - 1)}
            >
              Prev
            </button>
            <span style={{ color: "var(--dark-grey)",}}>Page {recentPage}</span>
            <button
              className="btn-download"
                  style={{
                height: 34,
                backgroundColor: "#919191",  
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0 16px",
                fontWeight: 600,
                cursor: "pointer"
              }}
              disabled={recentEnd >= recentFlags.length}
              onClick={() => setRecentPage(recentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* My Flag Activity (use todo panel, but as a compact list) */}
        <div className="todo">
          <div className="head">
            <h3>My Flag Activity</h3>
            <i className="bx bx-download" onClick={exportMyActivityCSV} title="Export CSV" />
          </div>

          <ul className="todo-list">
            {pagedMyActivity.map((f, i) => (
              <li key={i} className={f.status === "CLEARED" ? "completed" : "not-completed"}>
                <p style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>{f.student}</span>
                  <span style={{ fontSize: 12, color: "var(--dark-grey)" }}>
                    {f.school} • {f.amount_owed} • {f.my_action}
                  </span>
                </p>
              </li>
            ))}

            {!myFlagActivity.length && (
              <li className="not-completed">
                <p>No activity recorded.</p>
                <i className="bx bx-info-circle" />
              </li>
            )}
          </ul>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
            <button
              className="btn-download"
                        style={{
                height: 34,
                backgroundColor: "#919191", 
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              disabled={myPage === 1}
              onClick={() => setMyPage(myPage - 1)}
            >
              Prev
            </button>
            <span style={{ color: "var(--dark-grey)" }}>Page {myPage}</span>
            <button
              className="btn-download"
                       style={{
                height: 34,
                backgroundColor: "#919191", 
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              disabled={myEnd >= myFlagActivity.length}
              onClick={() => setMyPage(myPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
