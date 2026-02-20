import { useState } from "react";
import { api } from "../../services/api";
import "../../assets/css/verify.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function VerifyTeacher() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const openPreview = (url) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewUrl(null);
  };

  // ===============================
  // SEARCH
  // ===============================
  const run = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setSelectedTeacher(null);

    const cleaned = query.trim();
    if (!cleaned) {
      setError(
        "Please enter a teacher name, phone number or Ghana Card number."
      );
      return;
    }

    setLoading(true);

    try {
      const data = await api("/verifyteacher", {
        method: "POST",
        body: JSON.stringify({ query: cleaned }),
      });

      if (data.status === "NOT_FOUND") {
        setError("No teacher record found.");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // IMAGE
  // ===============================
  const buildPhotoUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith("http")) return photo;
    return `${API_URL}/uploads/teachers/${photo}`;
  };

  const renderTeacherPhoto = (photo, size = 90) => {
    const url = buildPhotoUrl(photo);

    if (!url) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          N/A
        </div>
      );
    }

    return (
      <img
        src={url}
        alt="Teacher"
        onClick={() => openPreview(url)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid #ddd",
          cursor: "zoom-in",
        }}
      />
    );
  };

  // ===============================
  // SELECTED TEACHER FLAGS
  // ===============================
  const getSelectedTeacherFlags = () => {
    if (!result || !selectedTeacher) return [];

    return (result.flags || []).filter(
      (f) => Number(f.teacher_id) === Number(selectedTeacher.id)
    );
  };

  const selectedFlags = getSelectedTeacherFlags();

  const closeModal = () => setSelectedTeacher(null);

  return (
    <>
      <div className="verify-page">
        {/* SEARCH */}
        <div className="card">
          <div className="page-head">
            <div>
              <h1 className="page-title">Verify Teacher Status</h1>
              <div className="page-subtitle">
                Verify eligibility of teachers within ClearEnroll system
              </div>
            </div>
          </div>

          <form onSubmit={run}>
            <div className="form-row">
              <input
                placeholder="Search by teacher name, phone, or Ghana Card"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ maxWidth: 800 }}
              />
            </div>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: 200 }}
              >
                {loading ? "Searching..." : "Search Registry"}
              </button>
            </div>
          </form>

          {error && (
            <div className="danger" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>

        {/* RESULTS */}
        {result && (
          <>
            {/* STATUS */}
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Registry Status</h3>
              <span
                className={
                  result.status === "FLAGGED"
                    ? "badge badge-danger"
                    : "badge badge-danger"
                }
                style={{ fontSize: 22, padding: "20px 14px" }}
              >
                {result.status}
              </span>
            </div>

            {/* TEACHERS TABLE */}
            <div className="card">
              <h3>Matching Teachers</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>School</th>
                    <th>Address</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {result.teachers?.map((t) => (
                    <tr key={t.id}>
                      <td>{renderTeacherPhoto(t.teacher_photo)}</td>
                      <td>
                        {t.first_name} {t.last_name}
                      </td>
                      <td>{t.school}</td>
                      <td>{t.address || "-"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn"
                          onClick={() => setSelectedTeacher(t)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {selectedTeacher && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "min(900px, 96vw)",
              borderRadius: 10,
              padding: 22,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
              }}
            >
              <div>
                <h2>
                  {selectedTeacher.first_name}{" "}
                  {selectedTeacher.last_name}
                </h2>
                <div style={{ opacity: 0.7 }}>
                  {selectedTeacher.school}
                </div>
              </div>

              {renderTeacherPhoto(
                selectedTeacher.teacher_photo,
                140
              )}
            </div>

            <hr style={{ margin: "16px 0" }} />

            <div className="card" style={{ marginBottom: 14 }}>
              <h3>Teacher Information</h3>
              <table className="table">
                <tbody>
                  <tr>
                    <td><strong>Address</strong></td>
                    <td>{selectedTeacher.address || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Phone</strong></td>
                    <td>{selectedTeacher.phone || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Ghana Card</strong></td>
                    <td>{selectedTeacher.ghana_card_number || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

           <div className="card">
  <h3>Outstanding Issue</h3>

  {selectedTeacher.reason ? (
    <table className="table">
      <tbody>
        <tr>
          <td style={{ width: 200 }}>
            <strong>Reason</strong>
          </td>
          <td>{selectedTeacher.reason}</td>
        </tr>
      </tbody>
    </table>
  ) : (
    <div>No outstanding issue for this teacher.</div>
  )}
</div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 18,
              }}
            >
              <button className="btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW */}
      {previewOpen && (
        <div className="img-lightbox" onClick={closePreview}>
          <div
            className="img-lightbox-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="img-lightbox-close"
              onClick={closePreview}
              type="button"
            >
              ✕
            </button>

            <img
              className="img-lightbox-img"
              src={previewUrl}
              alt="Preview"
            />
          </div>
        </div>
      )}
    </>
  );
}