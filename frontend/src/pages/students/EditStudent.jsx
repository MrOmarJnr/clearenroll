import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";

export default function EditStudent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);
  const [error, setError] = useState("");

  // ✅ EXTENDED FORM (keeps guardian + adds missing fields)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    other_names: "",
    date_of_birth: "",
    gender: "Male",
    current_school_id: "",
    leaving_class: "",
    student_school_id: "",
    parent_id: "",
    student_photo: null, // new upload
  });

  // ======================
  // Load student, schools, parents
  // ======================
  useEffect(() => {
    (async () => {
      try {
        const s = await api("/schools");
        setSchools(s.schools || []);

        const p = await api("/parents");
        setParents(p.parents || []);

        const data = await api(`/students/${id}`);
        const st = data.student;

        setForm({
          first_name: st.first_name || "",
          last_name: st.last_name || "",
          other_names: st.other_names || "",
          date_of_birth: String(st.date_of_birth).slice(0, 10),
          gender: st.gender || "Male",
          current_school_id: st.current_school_id || "",
          leaving_class: st.leaving_class || "",
          student_school_id: st.student_school_id || "",
          parent_id: st.parent_id ? String(st.parent_id) : "",
          student_photo: null,
        });
      } catch {
        setError("Failed to load student");
      }
    })();
  }, [id]);

  const onChange = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  // ======================
  // SAVE (FormData)
  // ======================
  const save = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const fd = new FormData();

      fd.append("first_name", form.first_name);
      fd.append("last_name", form.last_name);
      fd.append("other_names", form.other_names || "");
      fd.append("date_of_birth", form.date_of_birth);
      fd.append("gender", form.gender);
      fd.append("current_school_id", form.current_school_id);
      fd.append("leaving_class", form.leaving_class);
      fd.append("student_school_id", form.student_school_id || "");

      if (form.student_photo) {
        fd.append("student_photo", form.student_photo);
      }

      // ✅ Update student
      await api(`/students/${id}`, {
        method: "PUT",
        body: fd,
      });

      // ✅ Assign guardian / parent (kept logic)
      if (form.parent_id) {
        await api(`/students/${id}/assign-parent`, {
          method: "PATCH",
          body: JSON.stringify({ parent_id: form.parent_id }),
        });
      }

      navigate("/students");
    } catch (err) {
      setError(err.message || "Failed to update student");
    }
  };

  // ======================
  // DELETE
  // ======================
  const remove = async () => {
    if (!confirm("Delete this student permanently?")) return;
    try {
      await api(`/students/${id}`, { method: "DELETE" });
      navigate("/students");
    } catch {
      setError("Failed to delete student");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h2>Modify Student</h2>

      {error && <div className="danger">{error}</div>}

      <form onSubmit={save}>
        <input
          className="input"
          placeholder="First Name"
          value={form.first_name}
          onChange={onChange("first_name")}
          required
        />

        <input
          className="input"
          placeholder="Last Name"
          value={form.last_name}
          onChange={onChange("last_name")}
          required
        />

        <input
          className="input"
          placeholder="Other Names"
          value={form.other_names}
          onChange={onChange("other_names")}
        />

        <input
          className="input"
          type="date"
          value={form.date_of_birth}
          onChange={onChange("date_of_birth")}
          required
        />

        <select
          className="select"
          value={form.gender}
          onChange={onChange("gender")}
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          className="select"
          value={form.current_school_id}
          onChange={onChange("current_school_id")}
          required
        >
          <option value="">Select Current School</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          className="input"
          placeholder="Leaving Class / Grade"
          value={form.leaving_class}
          onChange={onChange("leaving_class")}
          required
        />

        <input
          className="input"
          placeholder="Student ID from Previous School"
          value={form.student_school_id}
          onChange={onChange("student_school_id")}
        />

        {/* ✅ GUARDIAN / PARENT (KEPT) */}
        <select
          className="select"
          value={form.parent_id}
          onChange={onChange("parent_id")}
          required
        >
          <option value="">Select Parent / Guardian</option>
          {parents.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.full_name}
            </option>
          ))}
        </select>

        {/* ✅ PHOTO UPLOAD */}
        <input
          type="file"
          className="input"
          accept="image/*"
          onChange={(e) =>
            setForm({
              ...form,
              student_photo: e.target.files?.[0] || null,
            })
          }
        />

        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save Changes
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/students")}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={remove}
          >
            Delete Student
          </button>
        </div>
      </form>
    </div>
  );
}
