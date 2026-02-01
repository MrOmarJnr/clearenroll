import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function Users() {
  const [users, setUsers] = useState([]);

  const loadUsers = async () => {
    const data = await api("/users");
    setUsers(data.users || []);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggle = async (id) => {
    await api(`/users/${id}/toggle`, { method: "POST" });
    loadUsers();
  };

  const resend = async (id) => {
    await api(`/users/${id}/resend-activation`, { method: "POST" });
    alert("Activation link resent");
  };

  const reset = async (id) => {
    if (!confirm("Reset password?")) return;
    await api(`/users/${id}/reset-password`, { method: "POST" });
    alert("Temporary password generated (check server logs)");
  };

  return (
    <div className="card">
      <h3>Users</h3>

      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>School</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.school || "-"}</td>
              <td>
                <span
                  className={`badge ${
                    u.is_active ? "badge-success" : "badge-danger"
                  }`}
                >
                  {u.is_active ? "Activated" : "Pending"}
                </span>
              </td>
              <td>{u.last_login_at || "-"}</td>
              <td>
                <button onClick={() => toggle(u.id)}>Toggle</button>{" "}
                <button onClick={() => resend(u.id)}>Resend</button>{" "}
                <button onClick={() => reset(u.id)}>Reset</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
