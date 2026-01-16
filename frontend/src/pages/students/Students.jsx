import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setError("");
    try {
      const data = await api("/students");
      setStudents(data.students || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <h2>Students</h2>


      <div className="row-actions">
        <Link className="link" to="/students/add">
          Add Student
        </Link>
      
      </div>

      {error && <div className="danger">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Name</th> 
            <th>Student ID</th>
            <th>DOB</th>
            <th>Gender</th>
            <th>School</th>
            <th>Parent</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.id}</td>
              <td>{String(s.date_of_birth).slice(0, 10)}</td>
              <td>{s.gender}</td>
              <td>{s.school}</td>
              <td>{s.parent}</td>
            </tr>
          ))}
          {!students.length && (
            <tr>
              <td colSpan="5">No students yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
