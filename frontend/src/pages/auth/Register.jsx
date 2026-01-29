import { useEffect, useState } from "react";
import "../../assets/css/util.css";
import "../../assets/css/main.css";
import "../../assets/css/auth-layout.css";

export default function Register() {
  // ===== EXISTING STATE (UNCHANGED) =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // ===== EXISTING EFFECTS (UNCHANGED) =====
  useEffect(() => {
    const inputs = document.querySelectorAll(".input100");
    inputs.forEach((input) => {
      if (input.value.trim() !== "") {
        input.classList.add("has-val");
      }
    });
  }, []);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/schools`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load schools");
        setSchools(data.schools || []);
      } catch (err) {
        setError(err.message);
      }
    };
    loadSchools();
  }, [API_BASE]);

  // ===== EXISTING SUBMIT HANDLER (UNCHANGED) =====
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!schoolId) {
      setError("Please select a school");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          school_id: schoolId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      localStorage.setItem("token", data.token);
      window.location.href = "/login";
    } catch (err) {
      setError(err.message);
    }
  };

  // ===== UI ONLY BELOW =====
  return (
    <div className="auth-container">

      {/* LEFT PANEL */}
      <div className="auth-left">
        <h2>Create Account</h2>
        <p>Register to access the Clear Enroll System</p>

        <form className="login100-form" onSubmit={handleRegister}>

          {/* Email */}
          <div className="wrap-input100">
            <input
              className="input100"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="focus-input100" data-placeholder="Email"></span>
          </div>

          {/* Password */}
          <div className="wrap-input100">
            <input
              className="input100"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="focus-input100" data-placeholder="Password"></span>
          </div>

          {/* Confirm Password */}
          <div className="wrap-input100">
            <input
              className="input100"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <span
              className="focus-input100"
              data-placeholder="Confirm Password"
            ></span>
          </div>

          {/* School */}
          <div className="wrap-input100">
            <select
              className="input100"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select School
              </option>
              {schools.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="focus-input100"></span>
          </div>

          {/* Error */}
          {error && (
            <div style={{ color: "#ffd34e", marginBottom: 15 }}>
              {error}
            </div>
          )}

          <button className="login100-form-btn" type="submit">
            Register Account
          </button>

          <div className="auth-links">
            <a href="/login">Already have an account? Login</a>
          </div>

        </form>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <div
        className="auth-right"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf')",
        }}
      >
        <div className="auth-right-overlay">
          Secure. Transparent. School-Focused.
        </div>
      </div>

    </div>
  );
}
