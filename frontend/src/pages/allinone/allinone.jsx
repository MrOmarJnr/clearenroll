import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../../assets/css/create-records.css";

/* ======================
   AUTH
====================== */
function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

/* ======================
   SEARCHABLE SCHOOL SELECT
====================== */
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

/* ======================
   MAIN
====================== */
export default function CreateRecords() {
  const navigate = useNavigate();
  const user = getUserFromToken();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const userSchoolId = user?.school_id || "";

  const [step, setStep] = useState("student");
  const [error, setError] = useState("");

  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [createdStudentId, setCreatedStudentId] = useState(null);

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

  const [parentForm, setParentForm] = useState({
    full_name: "",
    phone: "",
    ghana_card_number: "",
    address: "",
  });

  const [flagForm, setFlagForm] = useState({
    student_id: "",
    parent_id: "",
    reported_by_school_id: "",
    amount_owed: "",
    currency: "GHS",
    reason: "",
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const sch = await api("/schools");
    setSchools(sch.schools || []);

    const stu = await api("/students");
    setStudents(stu.students || []);
  };

  useEffect(() => {
    if (!isSuperAdmin && userSchoolId) {
      setStudentForm((p) => ({ ...p, current_school_id: String(userSchoolId) }));
    }
  }, [isSuperAdmin, userSchoolId]);

  /* ======================
     Auto-fill flag info when student selected (RESTORED)
  ====================== */
  useEffect(() => {
    if (!flagForm.student_id) return;

    const selected = students.find(
      (s) => String(s.id) === String(flagForm.student_id)
    );
    if (!selected) return;

    setFlagForm((prev) => ({
      ...prev,
      parent_id: selected.parent_id || "",
      reported_by_school_id: selected.school_id || "",
    }));
  }, [flagForm.student_id, students]);

  /* ======================
     SUBMITS
  ====================== */
  const submitStudent = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const fd = new FormData();
      Object.entries(studentForm).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") fd.append(k, v);
      });

      const res = await api("/students", { method: "POST", body: fd });
      setCreatedStudentId(res.student_id);

      // ✅ RESTORED: refresh students so the newly created student appears in Flag dropdown
      const stu = await api("/students");
      setStudents(stu.students || []);

      setStep("parent");
    } catch (err) {
      setError(err.message);
    }
  };

  const submitParent = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api("/parents", {
        method: "POST",
        body: JSON.stringify(parentForm),
      });

      await api(`/students/${createdStudentId}/assign-parent`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: res.parent_id }),
      });

      // ✅ RESTORED: refresh students again so parent_id is reflected before Flagging
      const stu = await api("/students");
      setStudents(stu.students || []);

      setStep("flag");
    } catch (err) {
      setError(err.message);
    }
  };

  const submitFlag = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api("/flags", {
        method: "POST",
        body: JSON.stringify({
          ...flagForm,
          student_id: Number(flagForm.student_id),
          parent_id: flagForm.parent_id ? Number(flagForm.parent_id) : null,
          reported_by_school_id: Number(flagForm.reported_by_school_id),
          amount_owed: Number(flagForm.amount_owed),
        }),
      });

      navigate("/flags");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card create-records">
      <div className="create-records-head">
        <div>
          <div className="create-records-title">Create Records</div>
          <div className="create-records-subtitle">
            Student → Parent → Fee Flag
          </div>
        </div>
      </div>

      <div className="stepper">
        <div
          className={`step ${
            step === "student" ? "active" : step !== "student" ? "done" : ""
          }`}
        >
          Student
        </div>
        <div
          className={`step ${
            step === "parent" ? "active" : step === "flag" ? "done" : ""
          }`}
        >
          Parent
        </div>
        <div className={`step ${step === "flag" ? "active" : ""}`}>Flag</div>
      </div>

      {error && <div className="danger">{error}</div>}

      {step === "student" && (
        <form onSubmit={submitStudent} className="form-section">
          <h3>Student Information</h3>

          <div className="form-grid">
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

            {isSuperAdmin ? (
              <SearchableSchoolSelect
                schools={schools}
                value={studentForm.current_school_id}
                onChange={(val) =>
                  setStudentForm({ ...studentForm, current_school_id: val })
                }
              />
            ) : (
              <input className="input" disabled value="Your School" />
            )}

            <input
              className="input"
              placeholder="Leaving Class"
              required
              onChange={(e) =>
                setStudentForm({ ...studentForm, leaving_class: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Previous Student ID"
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  student_school_id: e.target.value,
                })
              }
            />
            <input
              type="file"
              className="input"
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  student_photo: e.target.files?.[0] || null,
                })
              }
            />
          </div>

          <div className="form-footer">
            <button className="btn btn-primary">Save & Continue</button>
          </div>
        </form>
      )}

      {step === "parent" && (
        <form onSubmit={submitParent} className="form-section">
          <h3>Parent Information</h3>

          <div className="form-grid">
            <input
              className="input"
              placeholder="Full Name"
              required
              onChange={(e) =>
                setParentForm({ ...parentForm, full_name: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Phone"
              required
              onChange={(e) =>
                setParentForm({ ...parentForm, phone: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Ghana Card"
              onChange={(e) =>
                setParentForm({
                  ...parentForm,
                  ghana_card_number: e.target.value,
                })
              }
            />
            <input
              className="input"
              placeholder="Address"
              onChange={(e) =>
                setParentForm({ ...parentForm, address: e.target.value })
              }
            />
          </div>

          <div className="form-footer">
            <button className="btn btn-primary">Save & Continue</button>
          </div>
        </form>
      )}

      {step === "flag" && (
        <form onSubmit={submitFlag} className="form-section">
          <h3>Flag Student</h3>

          <div className="form-grid">
            <select
              className="select"
              required
              value={flagForm.student_id}
              onChange={(e) =>
                setFlagForm({ ...flagForm, student_id: e.target.value })
              }
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              className="input"
              placeholder="Amount Owed"
              required
              onChange={(e) =>
                setFlagForm({ ...flagForm, amount_owed: e.target.value })
              }
            />

            <select
              className="select"
              value={flagForm.currency}
              onChange={(e) =>
                setFlagForm({ ...flagForm, currency: e.target.value })
              }
            >
              <option>GHS</option>
              <option>USD</option>
            </select>

            <input
              className="input"
              placeholder="Reason"
              onChange={(e) =>
                setFlagForm({ ...flagForm, reason: e.target.value })
              }
            />
          </div>

          <div className="form-footer">
            <button className="btn btn-danger">Save Flag</button>
          </div>
        </form>
      )}
    </div>
  );
}
