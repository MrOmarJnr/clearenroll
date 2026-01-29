import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

/* ======================
   AUTH HELPERS
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
   Searchable School Select
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
        <div
          className="card"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 6,
            maxHeight: 220,
            overflowY: "auto",
            padding: 8,
          }}
        >
          {filtered.length === 0 ? (
            <div className="muted" style={{ padding: 8 }}>
              No schools found
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn"
                style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
                onClick={() => choose(s)}
              >
                {s.name}
              </button>
            ))
          )}

          <button
            type="button"
            className="btn"
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
   MAIN COMPONENT
====================== */
export default function CreateRecords() {
  const navigate = useNavigate();
  const user = getUserFromToken();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const userSchoolId = user?.school_id || "";

  // wizard steps
  const [step, setStep] = useState("student");
  const [error, setError] = useState("");

  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);

  const [createdStudentId, setCreatedStudentId] = useState(null);

  /* ======================
     Student form
  ====================== */
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

  /* ======================
     Parent form
  ====================== */
  const [parentForm, setParentForm] = useState({
    full_name: "",
    phone: "",
    ghana_card_number: "",
    address: "",
  });

  /* ======================
     Flag form
  ====================== */
  const [flagForm, setFlagForm] = useState({
    student_id: "",
    parent_id: "",
    reported_by_school_id: "",
    amount_owed: "",
    currency: "GHS",
    reason: "",
  });

  /* ======================
     Load initial data
  ====================== */
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const sch = await api("/schools");
    setSchools(sch.schools || []);

    const stu = await api("/students");
    setStudents(stu.students || []);
  };

  /* ======================
     🔒 Auto-assign school for school users
  ====================== */
  useEffect(() => {
    if (!isSuperAdmin && userSchoolId) {
      setStudentForm((prev) => ({
        ...prev,
        current_school_id: String(userSchoolId),
      }));
    }
  }, [isSuperAdmin, userSchoolId]);

  /* ======================
     Auto-fill flag info when student selected
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
     Submit Student
  ====================== */
  const submitStudent = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const formData = new FormData();

      Object.entries(studentForm).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          formData.append(k, v);
        }
      });

      const res = await api("/students", {
        method: "POST",
        body: formData,
      });

      setCreatedStudentId(res.student_id);

      const stu = await api("/students");
      setStudents(stu.students || []);

      alert("Student created successfully");
      setStep("parent");
    } catch (err) {
      setError(err.message);
    }
  };

  /* ======================
     Submit Parent
  ====================== */
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

      alert("Parent created and linked");
      setStep("flag");

      const stu = await api("/students");
      setStudents(stu.students || []);
    } catch (err) {
      setError(err.message);
    }
  };

  /* ======================
     Submit Flag
  ====================== */
  const submitFlag = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api("/flags", {
        method: "POST",
        body: JSON.stringify({
          ...flagForm,
          student_id: Number(flagForm.student_id),
          parent_id: flagForm.parent_id
            ? Number(flagForm.parent_id)
            : null,
          reported_by_school_id: Number(flagForm.reported_by_school_id),
          amount_owed: Number(flagForm.amount_owed),
        }),
      });

      alert("Flag created successfully");
      navigate("/flags");
    } catch (err) {
      setError(err.message);
    }
  };

  /* ======================
     UI
  ====================== */
  return (
    <div className="card">
      <h2>Create Records</h2>
      {error && <div className="danger">{error}</div>}

      {/* ================= STUDENT ================= */}
      {step === "student" && (
        <form onSubmit={submitStudent}>
          <h3>Student Details</h3>

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
              setStudentForm({
                ...studentForm,
                date_of_birth: e.target.value,
              })
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
            <input
              className="input"
              disabled
              value={
                schools.find(
                  (s) => String(s.id) === String(userSchoolId)
                )?.name || "Your School"
              }
            />
          )}

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

          <button className="btn">Save Student & Continue</button>
        </form>
      )}

      {/* ================= PARENT ================= */}
      {step === "parent" && (
        <form onSubmit={submitParent}>
          <h3>Parent Details</h3>

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
            placeholder="Ghana Card Number"
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

          <button className="btn">Save Parent & Continue</button>
        </form>
      )}

      {/* ================= FLAG ================= */}
      {step === "flag" && (
        <form onSubmit={submitFlag}>
          <h3>Flag Student</h3>

          <select
            className="select"
            required
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
            onChange={(e) =>
              setFlagForm({ ...flagForm, currency: e.target.value })
            }
          >
            <option value="GHS">GHS</option>
            <option value="USD">USD</option>
          </select>

          <input
            className="input"
            placeholder="Reason"
            onChange={(e) =>
              setFlagForm({ ...flagForm, reason: e.target.value })
            }
          />

          <button className="btn danger">Save Flag</button>
        </form>
      )}
    </div>
  );
}
