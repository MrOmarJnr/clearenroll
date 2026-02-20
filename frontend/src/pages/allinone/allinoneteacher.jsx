import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../../assets/css/create-records.css";

/* ===============================
   AUTH
=================================*/

function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

/* ===============================
   SEARCHABLE SCHOOL SELECT
=================================*/

function SearchableSchoolSelect({ schools, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = schools.find((s) => String(s.id) === String(value));
  const filtered = schools.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase().trim())
  );

  const choose = (school) => {
    onChange(String(school.id));
    setQuery("");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        className="input"
        placeholder={selected ? selected.name : "Search school..."}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && (
        <div className="card dropdown-panel">
          {filtered.length === 0 ? (
            <div className="muted" style={{ padding: 8 }}>
              No schools found
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn dropdown-item"
                onClick={() => choose(s)}
              >
                {s.name}
              </button>
            ))
          )}

          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: "100%" }}
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ===============================
   MAIN COMPONENT
=================================*/

export default function CreateTeacher() {
  const navigate = useNavigate();
  const user = getUserFromToken();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const userSchoolId = user?.school_id || "";

  const [error, setError] = useState("");
  const [schools, setSchools] = useState([]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    other_names: "",
    date_of_birth: "",
    gender: "Male",
    current_school_id: "",
    qualification: "",
    employment_year: "",
    reason: "",
    status: "ACTIVE",
    ghana_card_number: "",
    address: "",
    phone: "",
    teacher_photo: null,
  });

  /* ===============================
     LOAD SCHOOLS
  =================================*/

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    const sch = await api("/schools");
    setSchools(sch.schools || []);
  };

  /* Auto-assign school if not super admin */
  useEffect(() => {
    if (!isSuperAdmin && userSchoolId) {
      setForm((prev) => ({
        ...prev,
        current_school_id: String(userSchoolId),
      }));
    }
  }, [isSuperAdmin, userSchoolId]);

  /* ===============================
     SUBMIT
  =================================*/

  const submitTeacher = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const fd = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          fd.append(key, value);
        }
      });

      await api("/teachers", {
        method: "POST",
        body: fd,
      });

      navigate("/teachersflag");
    } catch (err) {
      setError(err.message);
    }
  };

  /* ===============================
     RENDER
  =================================*/

  return (
    <div className="card create-records">
      <div className="page-head">
        <div>
          <h1 className="page-title">Create Teacher Record</h1>
          <div className="page-subtitle">
            Fill in teacher information below
          </div>
        </div>
      </div>

      {error && <div className="danger">{error}</div>}

      <form onSubmit={submitTeacher} className="form-section">
        <div className="form-grid">
          <input
            className="input"
            placeholder="First Name"
            required
            onChange={(e) =>
              setForm({ ...form, first_name: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Last Name"
            required
            onChange={(e) =>
              setForm({ ...form, last_name: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Other Names"
            onChange={(e) =>
              setForm({ ...form, other_names: e.target.value })
            }
          />

          <input
            type="date"
            className="input"
            required
            onChange={(e) =>
              setForm({ ...form, date_of_birth: e.target.value })
            }
          />

          <select
            className="select"
            onChange={(e) =>
              setForm({ ...form, gender: e.target.value })
            }
          >
            <option>Male</option>
            <option>Female</option>
          </select>

          {isSuperAdmin ? (
            <SearchableSchoolSelect
              schools={schools}
              value={form.current_school_id}
              onChange={(val) =>
                setForm({ ...form, current_school_id: val })
              }
            />
          ) : (
            <input className="input school" disabled value="Your School" />
          )}

          <input
            className="input"
            placeholder="Qualification"
            onChange={(e) =>
              setForm({ ...form, qualification: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Employment Year"
            onChange={(e) =>
              setForm({ ...form, employment_year: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Status (e.g ACTIVE)"
            onChange={(e) =>
              setForm({ ...form, status: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Ghana Card Number"
            onChange={(e) =>
              setForm({ ...form, ghana_card_number: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Phone"
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Address"
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <textarea
            className="input"
            placeholder="Reason"
            onChange={(e) =>
              setForm({ ...form, reason: e.target.value })
            }
          />

          <div className="form-field">
            <label className="label">Photo</label>
            <input
              type="file"
              className="input"
              onChange={(e) =>
                setForm({
                  ...form,
                  teacher_photo: e.target.files?.[0] || null,
                })
              }
            />
          </div>
        </div>

        <div className="form-footer">
          <button className="btn btn-primary">Save Teacher</button>
        </div>
      </form>
    </div>
  );
}