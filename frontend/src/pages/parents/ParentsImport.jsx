import { useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function ParentsImport() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) {
      setError("Please select a CSV or Excel file");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api("/import/parents", {
        method: "POST",
        body: formData,
      });

      setResult(res);
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Bulk Import Parents</h2>
      <p>Upload CSV or Excel file to import parents.</p>

      {/* FILE INPUT */}
      <div className="form-row">
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      {/* ACTIONS */}
      <div className="form-actions">
        <button className="btn" onClick={upload} disabled={loading}>
          {loading ? "Uploading..." : "Upload File"}
        </button>

        <button
          className="btn"
          type="button"
          onClick={() => navigate("/parents")}
        >
          Cancel
        </button>
      </div>

      {/* ERROR */}
      {error && <div className="danger">{error}</div>}

      {/* RESULT */}
      {result && (
        <div className="success">
          <strong>Import Completed</strong>
          <div>Inserted: {result.inserted}</div>
          <div>Skipped: {result.skipped}</div>
        </div>
      )}
    </div>
  );
}
