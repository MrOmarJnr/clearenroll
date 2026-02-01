import { useEffect, useState } from "react";
import "../../assets/css/create-records.css"; // ⬅️ your pasted CSS file

export default function Register() {
  // ===== STATE (UNCHANGED) =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState("");

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // ===== LOAD SCHOOLS =====
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

  // ===== PHOTO =====
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProfilePhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // ===== SUBMIT =====
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
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);
      formData.append("school_id", schoolId);

      if (profilePhoto) {
        formData.append("profile_photo", profilePhoto);
      }

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      alert("Account created. Activation email sent.");
          navigate("/users");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="create-records">
      {/* HEADER */}
      <div className="create-records-head">
        <div>
          <div className="create-records-title">Create User Account</div>
          <div className="create-records-subtitle">
            School administrator onboarding
          </div>
        </div>
      </div>

      {/* STEPPER */}
      <div className="stepper">
        <div className="step active">Account</div>
    
      </div>

      {/* FORM */}
      <form onSubmit={handleRegister}>
        <div className="form-section">
          <h3>Account Information</h3>

          <div className="form-grid">
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <select
              className="select"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select School
              </option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              className="input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />

            {photoPreview && (
              <div>
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid #e5e7eb",
                  }}
                />
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: "#dc2626", marginTop: 12 }}>
              {error}
            </div>
          )}

          <div className="form-footer">
            <button type="submit" className="btn btn-primary">
              Create Account
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
