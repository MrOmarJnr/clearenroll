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
    leaving_class: "",
    student_school_id: "",
    parent_id: "",
    student_photo: null,

    flag_id: "",
    amount_owed: "",
    flag_reason: "",
  });

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
          date_of_birth: st.date_of_birth
            ? String(st.date_of_birth).slice(0, 10)
            : "",
          gender: st.gender || "Male",
          current_school_id: st.current_school_id || "",
          leaving_class: st.leaving_class || "",
          student_school_id: st.student_school_id || "",
          parent_id: st.parent_id ? String(st.parent_id) : "",
          student_photo: null,

          flag_id: st.flag_id || "",
          amount_owed: st.amount_owed || "",
          flag_reason: st.flag_reason || "",
        });
      } catch (err) {
        setError("Failed to load student");
      }
    })();
  }, [id]);

  const onChange = (key) => (e) => {
    setForm({
      ...form,
      [key]: e.target.value,
    });
  };

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

      await api(`/students/${id}`, {
        method: "PUT",
        body: fd,
      });

      if (form.flag_id) {
        await api(`/flags/${form.flag_id}`, {
          method: "PUT",
          body: JSON.stringify({
            amount_owed: Number(form.amount_owed),
            reason: form.flag_reason,
          }),
        });
      }

      if (form.parent_id) {
        await api(`/students/${id}/assign-parent`, {
          method: "PATCH",
          body: JSON.stringify({
            parent_id: form.parent_id,
          }),
        });
      }

      navigate("/students");
    } catch (err) {
      setError(err.message || "Failed to update student");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this student permanently?")) return;

    try {
      await api(`/students/${id}`, {
        method: "DELETE",
      });

      navigate("/students");
    } catch {
      setError("Failed to delete student");
    }
  };

  return (
    <div
      className="card"
      style={{
        maxWidth: 950,
        margin: "0 auto",
      }}
    >
      <div className="page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Modify Student</h1>
          <div className="page-subtitle">
            Update student details, guardian information, photo and outstanding fee flag.
          </div>
        </div>
      </div>

      {error && (
        <div className="danger" style={{ marginBottom: 15 }}>
          {error}
        </div>
      )}

      <form onSubmit={save}>
        {/* STUDENT INFORMATION */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            background: "#ffffff",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 15 }}>
            Student Information
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 15,
            }}
          >
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
              required
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
          </div>
        </div>

        {/* PARENT / GUARDIAN */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            background: "#ffffff",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 15 }}>
            Parent / Guardian
          </h3>

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
        </div>

        {/* OUTSTANDING DEBT */}
        {form.flag_id && (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#b91c1c",
                }}
              >
                Outstanding Debt Information
              </h3>

              <span
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                FLAGGED
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: 15,
              }}
            >
              <input
                className="input"
                type="number"
                placeholder="Outstanding Amount"
                value={form.amount_owed}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount_owed: e.target.value,
                  })
                }
              />

              <textarea
                className="input"
                placeholder="Reason"
                value={form.flag_reason}
                onChange={(e) =>
                  setForm({
                    ...form,
                    flag_reason: e.target.value,
                  })
                }
                rows={4}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#7f1d1d",
                lineHeight: 1.5,
              }}
            >
              Update the balance after receiving payment. Setting the outstanding
              amount to 0 will automatically clear the flag.
            </div>
          </div>
        )}

        {/* PHOTO */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            background: "#ffffff",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 15 }}>
            Student Photo
          </h3>

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
        </div>

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginTop: 25,
          }}
        >
          <button
            className="btn btn-danger"
            type="button"
            onClick={remove}
          >
            Delete Student
          </button>

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => navigate("/students")}
            >
              Cancel
            </button>

            <button className="btn btn-primary" type="submit">
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}