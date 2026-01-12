import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../../assets/css/util.css";
import "../../assets/css/main.css";

export default function Login() {
  const navigate = useNavigate();
  const existingToken = localStorage.getItem("token");

  if (existingToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ✅ NEW
  const [error, setError] = useState("");

    const API_URL = import.meta.env.VITE_API_URL;
  // ✅ FIX 1: floating labels stay up
  useEffect(() => {
    const inputs = document.querySelectorAll(".input100");

    inputs.forEach((input) => {
      if (input.value.trim() !== "") {
        input.classList.add("has-val");
      } else {
        input.classList.remove("has-val");
      }
    });
  }, [email, password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      jwtDecode(data.token); // validate token
      navigate("/dashboard", { replace: true });

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="limiter">
      <div className="container-login100">
        <div className="wrap-login100">

          <form className="login100-form validate-form" onSubmit={handleLogin}>
            <span className="login100-form-title p-b-26">
              Clear Enroll System
            </span>

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
              {/* ✅ FIX 2: working eye icon */}
              <span
                className="btn-show-pass"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{ cursor: "pointer" }}
              >
                <i className={`zmdi ${showPassword ? "zmdi-eye-off" : "zmdi-eye"}`}></i>
              </span>

              <input
                className="input100"
                type={showPassword ? "text" : "password"} // ✅ toggle
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="focus-input100" data-placeholder="Password"></span>
            </div>

            {error && (
              <div style={{ color: "red", textAlign: "center", marginTop: 10 }}>
                {error}
              </div>
            )}

            <div className="container-login100-form-btn">
              <div className="wrap-login100-form-btn">
                <div className="login100-form-bgbtn"></div>
                <button className="login100-form-btn" type="submit">
                  Login
                </button>
              </div>
            </div>

            <div className="text-center p-t-115">
              <span className="txt1">Don’t have an account?</span>
              <a className="txt2" href="/register">Sign Up</a>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
