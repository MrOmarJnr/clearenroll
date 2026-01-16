import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function CreateFlag() {
  const navigate = useNavigate();

  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    student_id: "",
    parent_id: "",
    reported_by_school_id: "",
    amount_owed: "",
    reason: "",
  });

  // ======================
  // LOAD DATA
  // ======================
useEffect(() => {
  (async () => {
    const sch = await api("/schools");
    setSchools(sch.schools || []);

    const par = await api("/parents");
    setParents(par.parents || []);

    const std = await api("/students");
    console.log("STUDENTS API RESPONSE:", std); // 👈 ADD THIS
    setStudents(std.students || []);
  })();
}, []);

  const onChange = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  // ======================
  // AUTO POPULATE PARENT + SCHOOL
  // ======================
 const onStudentChange = (e) => {
  const studentId = e.target.value;

  console.log("SELECTED STUDENT ID:", studentId);

  const selectedStudent = students.find(
    (s) => String(s.id) === String(studentId)
  );

  console.log("MATCHED STUDENT OBJECT:", selectedStudent);

  if (!selectedStudent) return;

  setForm({
    ...form,
    student_id: studentId,
    parent_id: selectedStudent.parent_id || "",
    reported_by_school_id:
      selectedStudent.school_id || selectedStudent.current_school_id || "",
  });
};

  // ======================
  // SUBMIT
  // ======================
  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api("/flags", {
        method: "POST",
        body: JSON.stringify({
          student_id: Number(form.student_id),
          parent_id: form.parent_id ? Number(form.parent_id) : null,
          reported_by_school_id: Number(form.reported_by_school_id),
          amount_owed: Number(form.amount_owed),
          reason: form.reason?.trim() || "Unpaid fees",
        }),
      });

      navigate("/flags");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Create Flag</h2>

      {error && <div className="danger">{error}</div>}

      <form onSubmit={submit}>
        {/* STUDENT */}
        <div className="form-row">
          <select
            className="select"
            value={form.student_id}
            onChange={onStudentChange}
            required
          >
            <option value="">Select Student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({String(s.date_of_birth).slice(0, 10)})
              </option>
            ))}
          </select>
        </div>

        {/* PARENT (AUTO POPULATED) */}
        <div className="form-row">
          <select
            className="select"
            value={form.parent_id}
            onChange={onChange("parent_id")}
          >
            <option value="">Select Parent (optional)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* SCHOOL (AUTO POPULATED) */}
        <div className="form-row">
          <select
            className="select"
            value={form.reported_by_school_id}
            onChange={onChange("reported_by_school_id")}
            required
          >
            <option value="">Select Reported By School</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* AMOUNT */}
        <div className="form-row">
          <input
            className="input"
            placeholder="Amount Owed"
            value={form.amount_owed}
            onChange={onChange("amount_owed")}
            required
          />
        </div>

        {/* REASON */}
        <div className="form-row">
          <input
            className="input"
            placeholder="Reason"
            value={form.reason}
            onChange={onChange("reason")}
          />
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">
            Save
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => navigate("/flags")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
