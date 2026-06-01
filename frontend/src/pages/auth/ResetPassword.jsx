import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import "../../assets/css/util.css";
import "../../assets/css/main.css";
import "../../assets/css/auth-layout.css";

import backgroundImage from "../../assets/images/backgroundimg.jpeg";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const API_URL = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const inputs = document.querySelectorAll(".input100");

    inputs.forEach((input) => {
      if (input.value.trim() !== "") {
        input.classList.add("has-val");
      } else {
        input.classList.remove("has-val");
      }
    });
  }, [password, confirmPassword]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Invalid password reset link");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${API_URL}/auth/reset-token/${token}`
        );

        const data = await res.json();

        if (!res.ok || !data.valid) {
          throw new Error(
            data.message ||
              "Password reset link is invalid or expired"
          );
        }

        setFullName(data.full_name);
        setEmail(data.email);
        setValidToken(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [API_URL, token]);

  const handleReset = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters long"
      );
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Password reset failed"
        );
      }

      setSuccess(
        "Password reset successfully. Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <h2>ClearEnroll School Portal</h2>

        <p style={{ color: "#f4f4f4" }}>
          Reset your password
        </p>

        {loading && (
          <div
            style={{
              color: "#ffffff",
              marginTop: 20,
            }}
          >
            Validating password reset link...
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              background: "#7f1d1d",
              color: "#ffffff",
              padding: "12px 15px",
              borderRadius: 8,
              marginTop: 15,
            }}
          >
            {error}
          </div>
        )}

        {!loading && validToken && (
          <>
            <div
              style={{
                color: "#ffffff",
                marginBottom: 20,
                marginTop: 10,
              }}
            >
              <strong>Welcome {fullName}</strong>
              <br />
              <span
                style={{
                  color: "#d1d5db",
                  fontSize: 14,
                }}
              >
                {email}
              </span>
            </div>

            <form
              className="login100-form"
              onSubmit={handleReset}
            >
              <div className="wrap-input100">
                <span
                  className="btn-show-pass"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  <i
                    className={`zmdi ${
                      showPassword
                        ? "zmdi-eye-off"
                        : "zmdi-eye"
                    }`}
                  ></i>
                </span>

                <input
                  className="input100"
                  type={
                    showPassword ? "text" : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <span
                  className="focus-input100"
                  data-placeholder="New Password"
                />
              </div>

              <div className="wrap-input100">
                <span
                  className="btn-show-pass"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  <i
                    className={`zmdi ${
                      showConfirmPassword
                        ? "zmdi-eye-off"
                        : "zmdi-eye"
                    }`}
                  ></i>
                </span>

                <input
                  className="input100"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  required
                />

                <span
                  className="focus-input100"
                  data-placeholder="Confirm New Password"
                />
              </div>

              {success && (
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
                  {success}
                </div>
              )}

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
              >
                Reset Password
              </button>
            </form>
          </>
        )}

        <div className="auth-footer-disclaimer">
          By enrolling on this platform, you agree to the
          intended use of its contents. Any misuse of the
          information is liable to legal action.
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