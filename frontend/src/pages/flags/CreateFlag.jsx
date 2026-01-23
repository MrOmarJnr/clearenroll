import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

export default function CreateFlag() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);

  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");
  const [reportedBySchoolId, setReportedBySchoolId] = useState("");

  const [amountOwed, setAmountOwed] = useState("");
  const [currency, setCurrency] = useState("GHS"); // ✅ restored
  const [reason, setReason] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ===============================
  // LOAD STUDENTS + PARENTS
  // ===============================
  useEffect(() => {
    (async () => {
      try {
        const s = await api("/students");
        const p = await api("/parents");

        setStudents(s.students || []);
        setParents(p.parents || []);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  // ===============================
  // STUDENT CHANGE → AUTO SCHOOL + PARENT
  // ===============================
  const onStudentChange = (e) => {
    const id = e.target.value;
    setStudentId(id);

    const selected = students.find(
      (s) => String(s.id) === String(id)
    );

    console.log("SELECTED STUDENT:", selected);

    if (!selected) return;

    setParentId(selected.parent_id || "");
    setReportedBySchoolId(selected.school_id);
  };

  // ===============================
  // SUBMIT
  // ===============================
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      student_id: Number(studentId),
      parent_id: parentId ? Number(parentId) : null,
      reported_by_school_id: Number(reportedBySchoolId), // ✅ REQUIRED
      amount_owed: Number(amountOwed),
      currency, // ✅ WORKS
      reason,
    };

    console.log("CREATE FLAG PAYLOAD:", payload);

    try {
      await api("/flags", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      navigate("/flags");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Create Flag</h2>

      {error && <div className="danger">{error}</div>}

      <form onSubmit={submit}>
        {/* STUDENT */}
        <div className="form-group">
          <label>Student</label>
          <select
            className="input"
            value={studentId}
            onChange={onStudentChange}
            required
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.school})
              </option>
            ))}
          </select>
        </div>

        {/* PARENT */}
        <div className="form-group">
          <label>Parent (optional)</label>
          <select
            className="input"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Select parent</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* AMOUNT */}
        <div className="form-group">
          <label>Amount Owed</label>
          <input
            type="number"
            className="input"
            value={amountOwed}
            onChange={(e) => setAmountOwed(e.target.value)}
            required
          />
        </div>

        {/* CURRENCY */}
        <div className="form-group">
          <label>Currency</label>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="GHS">GHS</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {/* REASON */}
        <div className="form-group">
          <label>Reason</label>
          <textarea
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="row-actions">
          <button className="btn" disabled={loading}>
            {loading ? "Saving..." : "Create Flag"}
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate("/flags")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
