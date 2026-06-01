import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";

import "../../assets/css/util.css";
import "../../assets/css/main.css";
import "../../assets/css/auth-layout.css";

import backgroundImage from "../../assets/images/backgroundimg.jpeg";

export default function VerifyOTP() {
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  const userId = sessionStorage.getItem("otp_user_id");
  const email = sessionStorage.getItem("otp_email");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const inputs = document.querySelectorAll(".input100");

    inputs.forEach((input) => {
      if (input.value.trim() !== "") {
        input.classList.add("has-val");
      } else {
        input.classList.remove("has-val");
      }
    });
  }, [otp]);

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      localStorage.setItem("token", data.token);

      sessionStorage.removeItem("otp_user_id");
      sessionStorage.removeItem("otp_email");

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <h2>ClearEnroll School Portal</h2>

        <p style={{ color: "#f4f4f4" }}>
          Enter your verification code
        </p>

        <div
          style={{
            background: "#e6fffa",
            color: "#065f46",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 20,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Verification code sent to:
          <br />
          {email}
        </div>

        <form className="login100-form" onSubmit={handleVerify}>
          <div className="wrap-input100">
            <input
              className="input100"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
            <span
              className="focus-input100"
              data-placeholder="6 Digit Verification Code"
            />
          </div>

          {error && (
            <div
              style={{
                color: "#ffd34e",
                marginBottom: 15,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="login100-form-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        <div className="auth-footer-disclaimer">
          By enrolling on this platform, you agree to the intended use of its
          contents. Any misuse of the information is liable to legal action.
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
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      />
    </div>
  );
}