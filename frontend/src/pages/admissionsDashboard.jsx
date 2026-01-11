import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Link } from "react-router-dom";

export default function DashboardAdmissions() {
  const [cards, setCards] = useState(null);
  const [recentFlags, setRecentFlags] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await api("/dashboard/admissions");
      setCards(data.cards);
      setRecentFlags(data.recentFlags || []);
    })();
  }, []);

  if (!cards) return <div className="card">Loading...</div>;

  return (
    <>
      <div className="card">
        <h2>Admission Admin Dashboard</h2>
        <div className="row-actions">
          <Link className="link" to="/flags/create">Create Flag</Link>
          <Link className="link" to="/verify">Verify Parent/Student</Link>
          {/* ✅ NEW: Quick link to duplicates */}
          <Link className="link" to="/duplicates">Duplicate Reviews</Link>
        </div>
      </div>

      <div className="grid4">
        <div className="card">
          <div className="stat-title">Schools</div>
          <div className="stat-value">{cards.schools}</div>
        </div>

        <div className="card">
          <div className="stat-title">Parents</div>
          <div className="stat-value">{cards.parents}</div>
        </div>

        <div className="card">
          <div className="stat-title">Students</div>
          <div className="stat-value">{cards.students}</div>
        </div>

        <div className="card">
          <div className="stat-title">Flagged</div>
          <div className="stat-value danger">{cards.flagged}</div>
        </div>
      </div>

      {/* ✅ NEW: Pending Duplicates badge/card (clickable) */}
      <div className="grid4" style={{ marginTop: 12 }}>
        <Link to="/duplicates" className="card" style={{ textDecoration: "none" }}>
          <div className="stat-title">Pending Duplicates</div>
          <div className={"stat-value " + (Number(cards.pendingDuplicates) > 0 ? "danger" : "")}>
            {cards.pendingDuplicates ?? 0}
          </div>
        </Link>
      </div>

      <div className="card">
        <h3>Recent Flags</h3>
        <table className="table">
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
            {recentFlags.map((f, i) => (
              <tr key={i}>
                <td>{f.student}</td>
                <td>{f.parent}</td>
                <td>{f.reported_by}</td>
                <td>{f.amount_owed}</td>
                <td className={f.status === "FLAGGED" ? "danger" : ""}>{f.status}</td>
              </tr>
            ))}
            {!recentFlags.length && (
              <tr><td colSpan="5">No flags yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
