import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../assets/css/dashboard.css";

export default function DashboardAdmissionLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">📦</div>
          <div className="brand-text">
            <div className="brand-title">Fees Defaulters Registry</div>
            <div className="brand-sub">Platform Admin</div>
          </div>
        </div>

        <div className="top-actions">
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="nav">
        <NavLink to="/dashboard/admissions" className={({isActive}) => isActive ? "navlink active" : "navlink"}>Dashboard</NavLink>
        <NavLink to="/admissions/verify" className={({isActive}) => isActive ? "navlink active" : "navlink"}>Verify</NavLink>
        <NavLink to="/admissions/verify/enrollment" className={({isActive}) => isActive ? "navlink active" : "navlink"}>Verify Enrollment</NavLink>
        <NavLink to="/admissions/consents" className={({isActive}) => isActive ? "navlink active" : "navlink"}>Consents</NavLink>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
