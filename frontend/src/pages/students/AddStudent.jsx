import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function AddStudent() {
  const navigate = useNavigate();

  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);

  const [error, setError] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState([]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    other_names: "",
    date_of_birth: "",
    gender: "Male",
    current_school_id: "",
    parent_id: "",
  });

  // ======================
  // Load schools & parents
  // ======================
  useEffect(() => {
    (async () => {
      const sch = await api("/schools");
      setSchools(sch.schools || []);

      const par = await api("/parents");
      setParents(par.parents || []);
    })();
  }, []);

  const onChange = (k) => (e) => {
    setIsDuplicate(false);
    setDuplicateMatches([]);
    setError("");
    setForm({ ...form, [k]: e.target.value });
  };

  // ======================
  // Submit handler
  // ======================
  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setIsDuplicate(false);
    setDuplicateMatches([]);

    try {
      await api("/students", {
        method: "POST",
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          other_names: form.other_names?.trim() || null,
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          current_school_id: Number(form.current_school_id),
          parent_id: Number(form.parent_id),
        }),
      });

      navigate("/students/add");
    } catch (err) {
      // 🔑 Proper duplicate handling
      if (err.data?.status === "POSSIBLE_DUPLICATE") {
        setIsDuplicate(true);
        setDuplicateMatches(err.data.matches || []);
        return;
      }

      setError(err.message || "Failed to add student");
    }
  };

  return (
    <div className="card">
      <h2>Add Student</h2>

      {/* General error */}
      {error && <div className="danger">{error}</div>}

      {/* Duplicate warning */}
      {isDuplicate && (
        <div className="warning">
          <strong>Possible existing student found</strong>
          <p>
            A student with the same name and date of birth already exists in the
            registry. You cannot create a duplicate record.
          </p>

          <table className="table table-sm mt-2">
            <thead>
              <tr>
                <th>Student</th>
                <th>Date of Birth</th>
                <th>School</th>
                <th>Student ID</th>
              </tr>
            </thead>
            <tbody>
              {duplicateMatches.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.date_of_birth}</td>
                  <td>{s.school}</td>
                  <td>{s.student_identifier}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2">
            Please contact the system administrator to resolve this record.
          </p>
        </div>
      )}

      {/* ======================
           Student Form
         ====================== */}
      <form onSubmit={submit}>
        <div className="form-row">
          <input
            className="input"
            placeholder="First Name"
            value={form.first_name}
            onChange={onChange("first_name")}
            required
          />
        </div>

        <div className="form-row">
          <input
            className="input"
            placeholder="Last Name"
            value={form.last_name}
            onChange={onChange("last_name")}
            required
          />
        </div>

        <div className="form-row">
          <input
            className="input"
            placeholder="Other Names (optional)"
            value={form.other_names}
            onChange={onChange("other_names")}
          />
        </div>

        <div className="form-row">
          <input
            className="input"
            type="date"
            value={form.date_of_birth}
            onChange={onChange("date_of_birth")}
            required
          />
        </div>

        <div className="form-row">
          <select
            className="select"
            value={form.gender}
            onChange={onChange("gender")}
            required
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="form-row">
          <select
            className="select"
            value={form.current_school_id}
            onChange={onChange("current_school_id")}
            required
          >
            <option value="" disabled>
              Select Current School
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <select
            className="select"
            value={form.parent_id}
            onChange={onChange("parent_id")}
            required
          >
            <option value="" disabled>
              Select Parent / Guardian
            </option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button className="btn" type="submit" disabled={isDuplicate}>
            Save
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => navigate("/students")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
