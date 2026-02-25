import { useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function TeachersImport() {
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

      const res = await api("/import/teachers", {
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
      <h2>Bulk Import Teachers</h2>
      <p>
        Upload a CSV or Excel file to import teachers into the ClearEnroll
        registry.
      </p>

      {/* TEMPLATE DOWNLOAD */}
      <div style={{ marginBottom: 15 }}>
        <a
          href="/templates/teachers_import_template.csv"
          download
          className="btn"
        >
          Download Sample Template
        </a>
      </div>

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
        <button className="btn btn-primary" onClick={upload} disabled={loading}>
          {loading ? "Uploading..." : "Upload File"}
        </button>

        <button
          className="btn"
          type="button"
          onClick={() => navigate("/teachersrecords")}
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