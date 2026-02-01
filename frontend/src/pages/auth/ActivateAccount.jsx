import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../assets/css/auth-layout.css";

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  const API_BASE =
    import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid activation link");
      return;
    }

    const activate = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/auth/activate?token=${token}`
        );

        if (res.redirected) {
          window.location.href = res.url;
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Activation failed");
        }

        setStatus("success");
        setMessage("Account activated successfully");
        setTimeout(() => navigate("/login"), 2500);
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Activation failed");
      }
    };

    activate();
  }, [API_BASE, searchParams, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-left">
        <h2>Account Activation</h2>

        {status === "loading" && (
          <p>Activating your account, please wait...</p>
        )}

        {status === "success" && (
          <p style={{ color: "green" }}>
            ✅ Your account has been activated.
            <br />
            Redirecting to login…
          </p>
        )}

        {status === "error" && (
          <p style={{ color: "red" }}>
            ❌ {message}
          </p>
        )}
      </div>

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
