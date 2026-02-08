import { useState, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import "../../assets/css/util.css";
import "../../assets/css/main.css";
import "../../assets/css/auth-layout.css";

import backgroundImage from "../../assets/images/backgroundimg.jpeg";

export default function Login() {
  const navigate = useNavigate();
  const existingToken = localStorage.getItem("token");

  // (for activation success)
  const [searchParams] = useSearchParams();
  const activated = searchParams.get("activated");

  if (existingToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

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
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      jwtDecode(data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <h2>ClearEnroll School Portal</h2>
        <p style={{ color: "#f4f4f4" }}>Sign in to your account</p>

        <form className="login100-form" onSubmit={handleLogin}>

          {/*  ACTIVATION SUCCESS MESSAGE */}
          {activated && (
            <div
              style={{
                background: "#e6fffa",
                color: "#065f46",
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 15,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
               Account activated successfully. You may now sign in.
            </div>
          )}

          <div className="wrap-input100">
            <input
              className="input100"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span
              className="focus-input100"
              data-placeholder="Email or Username"
            />
          </div>

          <div className="wrap-input100">
            <span
              className="btn-show-pass"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i
                className={`zmdi ${
                  showPassword ? "zmdi-eye-off" : "zmdi-eye"
                }`}
              ></i>
            </span>

            <input
              className="input100"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="focus-input100"
              data-placeholder="Password"
            />
          </div>

          {error && (
            <div style={{ color: "#ffd34e", marginBottom: 15 }}>
              {error}
            </div>
          )}

          <button className="login100-form-btn" type="submit">
            Sign in to your account
          </button>

      {/*    <div className="auth-links">
            <a href="/register">Register Now</a>
          </div>
          */}

        </form>

        {/* FOOTER */}
        <div className="auth-footer-disclaimer">
          By enrolling on this platform, you agree to the intended use of its contents. Any misuse of the information is liable to legal action.
        </div>

        <div className="auth-footer">
          <span className="auth-disclaimer">
            Authorized institutional use only.
          </span>

          <span className="auth-brand">
            Powered by <strong>LEF Signature</strong>
          </span>
        </div>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <div
        className="auth-right"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
    </div>
  );
}
