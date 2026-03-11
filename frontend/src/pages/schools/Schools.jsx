import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { jwtDecode } from "jwt-decode";

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const getUserSafe = () => {
    try {
      if (!token) return null;
      const payload = jwtDecode(token);

      if (payload?.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        return null;
      }

      return payload;
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  };

  const user = getUserSafe();

  // Load schools
  const load = async () => {
    try {
      const data = await api("/schools");
      setSchools(data.schools || []);
    } catch (err) {
      setError(err.message || "Failed to load schools");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Add school
  const addSchool = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError("");
    setLoading(true);

    try {
      await api("/schools", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });

      setName("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to add school");
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const filteredSchools = schools.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* PAGE HEADER */}
      <div className="card">
        <div className="page-head">
          <div>
            <h1 className="page-title">Schools Registry</h1>
            <div className="page-subtitle">
              Manage registered schools within the ClearEnroll system
            </div>
          </div>
        </div>
      </div>

      {/* ADD SCHOOL (SUPER ADMIN ONLY) */}
      {user?.role === "SUPER_ADMIN" && (
        <div className="card">
          <h3 className="card-title">Add New School</h3>

          <form onSubmit={addSchool} className="row-actions">
            <input
              className="input"
              placeholder="Enter school name here"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ maxWidth: "10%" }}
            >
              {loading ? "Adding..." : "Add School"}
            </button>
          </form>

          {error && (
            <div className="danger" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* SCHOOLS TABLE */}
      <div className="card">
        <h3 className="card-title">Registered Schools</h3>

        {/* SEARCH */}
        <div style={{ marginBottom: "15px" }}>
          <input
            className="input"
            placeholder="Search school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "300px" }}
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>School Name</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>{s.location || "-"}</td>
                </tr>
              ))}

              {!filteredSchools.length && (
                <tr>
                  <td colSpan="3">No matching schools found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}