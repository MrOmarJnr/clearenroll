import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import "../assets/css/dashboard.css";
import { jwtDecode } from "jwt-decode";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");

  const getRoleSafe = () => {
    try {
      if (!token) return null;
      const payload = jwtDecode(token);

      if (payload?.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        return null;
      }

      return payload?.role || null;
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  };

  const role = getRoleSafe();

  // ✅ UPDATED: include CREATE / ADD routes
  const ROLE_ALLOW = {
    SUPER_ADMIN: [
      "/dashboard",

      "/verify",
      "/verify/enrollment",

      "/parents",
      "/parents/add",

      "/students",
      "/students/add",

      "/flags",
      "/flags/create",

      "/schools",
      "/duplicates",
      "/consents",
    ],

    SCHOOL_ADMIN: [
      "/dashboard",

      "/verify",
      "/verify/enrollment",

      "/parents",
      "/parents/add",

      "/students",
      "/students/add",

      "/flags",
      "/flags/create",
    ],

    ADMISSIONS: [
      "/dashboard",
      "/verify",
      "/verify/enrollment",
      "/students",
    ],

    TEST_RECEIVING_SCHOOL: [
      "/dashboard",
      "/verify",
      "/verify/enrollment",
      "/students",
    ],

    BURSAR: [
      "/dashboard",
      "/verify",
      "/flags",
      "/flags/create",
      "/students",
      "/students/add",
    ],
  };

  const allowedPaths = role ? (ROLE_ALLOW[role] || ["/dashboard"]) : ["/dashboard"];
  const isAllowed = (path) => allowedPaths.includes(path);

  // Block unauthorized deep links
  if (role && location?.pathname && !isAllowed(location.pathname)) {
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard", { replace: true });
    }
  }

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"></div>
          <div className="brand-text">
            <div className="brand-title">Clear Enroll System</div>
            <div className="brand-sub">Platform Admin</div>
          </div>
        </div>

        <div className="top-actions">
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
          Dashboard
        </NavLink>

        {isAllowed("/verify") && (
          <NavLink to="/verify" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Verify
          </NavLink>
        )}

        {isAllowed("/parents") && (
          <NavLink to="/parents" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Parents
          </NavLink>
        )}

        {isAllowed("/students") && (
          <NavLink to="/students" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Students
          </NavLink>
        )}

        {isAllowed("/flags") && (
          <NavLink to="/flags" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Flags
          </NavLink>
        )}

        {isAllowed("/schools") && (
          <NavLink to="/schools" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Schools
          </NavLink>
        )}

        {isAllowed("/verify/enrollment") && (
          <NavLink to="/verify/enrollment" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Verify Enrollment
          </NavLink>
        )}

        {isAllowed("/duplicates") && (
          <NavLink to="/duplicates" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Duplicates
          </NavLink>
        )}

        {isAllowed("/consents") && (
          <NavLink to="/consents" className={({isActive}) => isActive ? "navlink active" : "navlink"}>
            Consents
          </NavLink>
        )}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
