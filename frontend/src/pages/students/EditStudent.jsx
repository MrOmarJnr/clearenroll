import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";

export default function EditStudent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    other_names: "",
    date_of_birth: "",
    gender: "Male",
    current_school_id: "",
    parent_id: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const s = await api("/schools");
        setSchools(s.schools || []);

        const p = await api("/parents");
        setParents(p.parents || []);

        const data = await api(`/students/${id}`);
        setForm({
          first_name: data.student.first_name,
          last_name: data.student.last_name,
          other_names: data.student.other_names || "",
          date_of_birth: String(data.student.date_of_birth).slice(0, 10),
          gender: data.student.gender,
          current_school_id: data.student.current_school_id,
         parent_id: String(data.student.parent_id),
        });
        console.log( data);
      } catch {
        setError("Failed to load student");
      }
    })();
  }, [id]);

  const onChange = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api(`/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      navigate("/students");
    } catch (err) {
      setError(err.message || "Failed to update student");
    }
  };

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
