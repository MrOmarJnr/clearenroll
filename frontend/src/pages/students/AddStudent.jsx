import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function AddStudent() {
  const navigate = useNavigate();

  const [schools, setSchools] = useState([]);

  const [error, setError] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState([]);

  // ✅ MATCH ALL-IN-ONE STUDENT FORM
  const [studentForm, setStudentForm] = useState({
    first_name: "",
    last_name: "",
    other_names: "",
    date_of_birth: "",
    gender: "Male",
    current_school_id: "",
    leaving_class: "",
    student_school_id: "",
    student_photo: null,
  });

  // ======================
  // Load schools ONLY
  // ======================
  useEffect(() => {
    api("/schools").then((res) => {
      setSchools(res.schools || []);
    });
  }, []);

  // ======================
  // Submit student (SAME AS ALL-IN-ONE)
  // ======================
  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setIsDuplicate(false);
    setDuplicateMatches([]);

    try {
      const formData = new FormData();

      Object.entries(studentForm).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          formData.append(k, v);
        }
      });

      await api("/students", {
        method: "POST",
        body: formData,
      });

      navigate("/students");
    } catch (err) {
      if (err.data?.status === "POSSIBLE_DUPLICATE") {
        setIsDuplicate(true);
        return;
      }

      setError(err.message || "Request failed");
    }
  };

  return (
    <div className="card">
      <h2>Add Student</h2>

      {error && <div className="danger">{error}</div>}

      {isDuplicate && (
        <div className="warning">
          <strong>Possible existing student found.</strong>
          <p>Please contact the system administrator.</p>
        </div>
      )}

      <form onSubmit={submit}>
        <input
          className="input"
          placeholder="First Name"
          required
          onChange={(e) =>
            setStudentForm({ ...studentForm, first_name: e.target.value })
          }
        />

        <input
          className="input"
          placeholder="Last Name"
          required
          onChange={(e) =>
            setStudentForm({ ...studentForm, last_name: e.target.value })
          }
        />

        <input
          className="input"
          placeholder="Other Names"
          onChange={(e) =>
            setStudentForm({ ...studentForm, other_names: e.target.value })
          }
        />

        <input
          type="date"
          className="input"
          required
          onChange={(e) =>
            setStudentForm({ ...studentForm, date_of_birth: e.target.value })
          }
        />

        <select
          className="select"
          onChange={(e) =>
            setStudentForm({ ...studentForm, gender: e.target.value })
          }
        >
          <option>Male</option>
          <option>Female</option>
        </select>

        <select
          className="select"
          required
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              current_school_id: e.target.value,
            })
          }
        >
          <option value="">Select School</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          className="input"
          placeholder="Leaving Class / Grade"
          required
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              leaving_class: e.target.value,
            })
          }
        />

        <input
          className="input"
          placeholder="Student ID from Previous School"
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              student_school_id: e.target.value,
            })
          }
        />

        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={(e) =>
            setStudentForm({
              ...studentForm,
              student_photo: e.target.files?.[0] || null,
            })
          }
        />

        <div className="form-actions">
          <button className="btn" type="submit">
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
