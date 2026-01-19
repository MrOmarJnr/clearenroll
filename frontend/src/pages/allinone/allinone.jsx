import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function CreateRecords() {
  const navigate = useNavigate();

  // step = parent | student | flag
  const [step, setStep] = useState("parent");
  const [error, setError] = useState("");

  // ======================
  // Shared data
  // ======================
  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);

  // ======================
  // Parent form
  // ======================
  const [parentForm, setParentForm] = useState({
    full_name: "",
    phone: "",
    ghana_card_number: "",
    address: "",
  });

  // ======================
  // Student form
  // ======================
  const [studentForm, setStudentForm] = useState({
    first_name: "",
    last_name: "",
    other_names: "",
    date_of_birth: "",
    gender: "Male",
    current_school_id: "",
    parent_id: "",
  });

  // ======================
  // Flag form
  // ======================
  const [flagForm, setFlagForm] = useState({
    student_id: "",
    parent_id: "",
    reported_by_school_id: "",
    amount_owed: "",
    reason: "",
  });

  // ======================
  // Load data
  // ======================
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const sch = await api("/schools");
    setSchools(sch.schools || []);

    const par = await api("/parents");
    setParents(par.parents || []);

    const stu = await api("/students");
    setStudents(stu.students || []);
  };

  // ======================
  // Auto-populate flag
  // ======================
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

  // ======================
  // Submit Parent
  // ======================
  const submitParent = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api("/parents", {
        method: "POST",
        body: JSON.stringify(parentForm),
      });

      // reload parents so new one appears
      const par = await api("/parents");
      setParents(par.parents || []);

      alert("Parent created");

      setParentForm({
        full_name: "",
        phone: "",
        ghana_card_number: "",
        address: "",
      });

      // move to next step
      setStep("student");
    } catch (err) {
      setError(err.message);
    }
  };

  // ======================
  // Submit Student
  // ======================
  const submitStudent = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api("/students", {
        method: "POST",
        body: JSON.stringify({
          ...studentForm,
          current_school_id: Number(studentForm.current_school_id),
          parent_id: Number(studentForm.parent_id),
        }),
      });

      // reload students
      const stu = await api("/students");
      setStudents(stu.students || []);

      alert("Student created");

      setStudentForm({
        first_name: "",
        last_name: "",
        other_names: "",
        date_of_birth: "",
        gender: "Male",
        current_school_id: "",
        parent_id: "",
      });

      // move to next step
      setStep("flag");
    } catch (err) {
      setError(err.message);
    }
  };

  // ======================
  // Submit Flag
  // ======================
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

      alert("Flag created");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Create Records</h2>

      {error && <div className="danger">{error}</div>}

      {/* ======================
          PARENT STEP
         ====================== */}
      {step === "parent" && (
        <form onSubmit={submitParent}>
          <h3>Parent Details</h3>

          <input
            className="input"
            placeholder="Full Name"
            value={parentForm.full_name}
            onChange={(e) =>
              setParentForm({ ...parentForm, full_name: e.target.value })
            }
            required
          />

          <input
            className="input"
            placeholder="Phone"
            value={parentForm.phone}
            onChange={(e) =>
              setParentForm({ ...parentForm, phone: e.target.value })
            }
            required
          />

          <input
            className="input"
            placeholder="Ghana Card Number"
            value={parentForm.ghana_card_number}
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
            value={parentForm.address}
            onChange={(e) =>
              setParentForm({ ...parentForm, address: e.target.value })
            }
          />

          <button className="btn">Save Parent & Continue</button>
        </form>
      )}

      {/* ======================
          STUDENT STEP
         ====================== */}
      {step === "student" && (
        <form onSubmit={submitStudent}>
          <h3>Student Details</h3>

          <input
            className="input"
            placeholder="First Name"
            value={studentForm.first_name}
            onChange={(e) =>
              setStudentForm({ ...studentForm, first_name: e.target.value })
            }
            required
          />

          <input
            className="input"
            placeholder="Last Name"
            value={studentForm.last_name}
            onChange={(e) =>
              setStudentForm({ ...studentForm, last_name: e.target.value })
            }
            required
          />

          <input
            className="input"
            placeholder="Other Names"
            value={studentForm.other_names}
            onChange={(e) =>
              setStudentForm({ ...studentForm, other_names: e.target.value })
            }
          />

          <input
            type="date"
            className="input"
            value={studentForm.date_of_birth}
            onChange={(e) =>
              setStudentForm({
                ...studentForm,
                date_of_birth: e.target.value,
              })
            }
            required
          />

          <select
            className="select"
            value={studentForm.gender}
            onChange={(e) =>
              setStudentForm({ ...studentForm, gender: e.target.value })
            }
          >
            <option>Male</option>
            <option>Female</option>
          </select>

          <select
            className="select"
            value={studentForm.current_school_id}
            onChange={(e) =>
              setStudentForm({
                ...studentForm,
                current_school_id: e.target.value,
              })
            }
            required
          >
            <option value="">Select School</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={studentForm.parent_id}
            onChange={(e) =>
              setStudentForm({
                ...studentForm,
                parent_id: e.target.value,
              })
            }
            required
          >
            <option value="">Select Parent</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>

          <button className="btn">Save Student & Continue</button>
        </form>
      )}

      {/* ======================
          FLAG STEP
         ====================== */}
      {step === "flag" && (
        <form onSubmit={submitFlag}>
          <h3>Flag Student</h3>

          <select
            className="select"
            value={flagForm.student_id}
            onChange={(e) =>
              setFlagForm({ ...flagForm, student_id: e.target.value })
            }
            required
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
            value={flagForm.amount_owed}
            onChange={(e) =>
              setFlagForm({ ...flagForm, amount_owed: e.target.value })
            }
            required
          />

          <input
            className="input"
            placeholder="Reason"
            value={flagForm.reason}
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
