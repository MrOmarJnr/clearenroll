import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function DuplicateReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState({});
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api("/duplicates/pending");

      // backend returns array directly OR { duplicates }
      const rows = Array.isArray(data) ? data : data.duplicates || [];

      // parse attempted_student_snapshot JSON safely
      const normalized = rows.map((r) => ({
        ...r,
        attempted_student_snapshot:
          typeof r.attempted_student_snapshot === "string"
            ? JSON.parse(r.attempted_student_snapshot)
            : r.attempted_student_snapshot,
      }));

      setReviews(normalized);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resolve = async (id, decision) => {
    if (!reason[id]) {
      alert("Please provide a reason before resolving.");
      return;
    }

    try {
      await api(`/duplicates/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reason: reason[id],
        }),
      });

      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Loading duplicate reviews…</p>;
  if (error) return <p className="danger">{error}</p>;

  return (
    <div className="card">
      <h2>Duplicate Reviews</h2>

      {reviews.length === 0 && (
        <p>No pending duplicate reviews 🎉</p>
      )}

      {reviews.map((r) => (
        <div key={r.id} className="card mb">
          <div className="grid-2">
            {/* Existing Student */}
            <div>
              <h4>Existing Student</h4>
              <p>
                <b>Name:</b> {r.first_name} {r.last_name}
              </p>
              <p>
                <b>DOB:</b> {r.date_of_birth}
              </p>
            </div>

            {/* Attempted Student */}
            <div>
              <h4>Attempted Enrollment</h4>
              <p>
                <b>Name:</b>{" "}
                {r.attempted_student_snapshot.first_name}{" "}
                {r.attempted_student_snapshot.last_name}
              </p>
              <p>
                <b>DOB:</b>{" "}
                {r.attempted_student_snapshot.date_of_birth}
              </p>
              <p>
                <b>School ID:</b>{" "}
                {r.attempted_student_snapshot.current_school_id}
              </p>
            </div>
          </div>

          <textarea
            placeholder="Admin decision reason"
            value={reason[r.id] || ""}
            onChange={(e) =>
              setReason({ ...reason, [r.id]: e.target.value })
            }
          />

          <div className="row-actions">
            <button
              className="btn-success"
              onClick={() => resolve(r.id, "MERGED")}
            >
              Merge (Same Student)
            </button>

            <button
              className="btn-danger"
              onClick={() => resolve(r.id, "DECLARED_DISTINCT")}
            >
              Declare Distinct
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
