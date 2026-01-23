import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../assets/css/util.css";
import "../../assets/css/main.css";

export default function Register() {
  // State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState("");

  // If VITE_API_URL is not set, this defaults to your backend at 4000.
  // Example: VITE_API_URL=http://localhost:4000
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // Floating label logic (unchanged)
  useEffect(() => {
    const inputs = document.querySelectorAll(".input100");

    inputs.forEach((input) => {
      if (input.value.trim() !== "") {
        input.classList.add("has-val");
      }

      input.addEventListener("blur", () => {
        if (input.value.trim() !== "") {
          input.classList.add("has-val");
        } else {
          input.classList.remove("has-val");
        }
      });
    });
  }, []);

  // Load schools from backend
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setError("");
        const res = await fetch(`${API_BASE}/auth/schools`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load schools");
        }

        setSchools(data.schools || []);
      } catch (err) {
        setError(err.message);
      }
    };

    loadSchools();
  }, [API_BASE]);

  // Submit handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side checks
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!schoolId) {
      setError("Please select a school");
      return;
    }

    try {
      const payload = {
        email,
        password,
        confirmPassword,
        school_id: schoolId,
      };

      console.log("REGISTER PAYLOAD:", payload);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("REGISTER RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Save JWT
      localStorage.setItem("token", data.token);

      // Redirect
      window.location.href = "/login";
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="limiter">
      <div className="container-login100">
        <div className="wrap-login100">
          <form className="login100-form validate-form" onSubmit={handleRegister}>
            <span className="login100-form-title p-b-26">Create Account</span>

            {/* Email */}
            <div className="wrap-input100 validate-input">
              <input
                className="input100"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="focus-input100" data-placeholder="Email"></span>
            </div>

            {/* Password */}
            <div className="wrap-input100 validate-input">
              <span className="btn-show-pass">
                <i className="zmdi zmdi-eye"></i>
              </span>
              <input
                className="input100"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="focus-input100" data-placeholder="Password"></span>
            </div>

            {/* Confirm Password */}
            <div className="wrap-input100 validate-input">
              <input
                className="input100"
                type="password"
                name="confirmPassword"
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
            <div className="wrap-input100 validate-input">
              <select
                className="input100"
                name="school"
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
              <div style={{ color: "red", textAlign: "center", marginTop: 10 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="container-login100-form-btn">
              <div className="wrap-login100-form-btn">
                <div className="login100-form-bgbtn"></div>
                <button className="login100-form-btn" type="submit">
                  Sign Up
                </button>
              </div>
            </div>

            {/* Login link */}
            <div className="text-center p-t-115">
              <span className="txt1">Already have an account?</span>
              <a className="txt2" href="/">
                Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
