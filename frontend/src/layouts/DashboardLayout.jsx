import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import "../assets/css/dashboard.css";
import { jwtDecode } from "jwt-decode";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const role = user?.role;

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
      "/students/import",
      "/parents/import",
      "/allrecords",
      "/parents/:id/edit",
       "/students/:id/edit",
       "/flags/audit",
       "/dashboard/analytics"
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
      "/schools",
      "/duplicates",
      "/consents",
      "/students/import",
      "/parents/import",
      "/allrecords",
      "/parents/:id/edit",
       "/students/:id/edit",
         "/dashboard/analytics"
    ],

    ADMISSIONS: [
      "/dashboard",
      "/verify",
      "/verify/enrollment",
      "/students",
      "/students/add",
      "/parents",
      "/parents/add",
    ],

    TEST_RECEIVING_SCHOOL: ["/dashboard", "/verify", "/verify/enrollment", "/students"],

    BURSAR: ["/dashboard", "/verify", "/flags", "/flags/create", "/students", "/students/add"],
  };

  const allowedPaths = role ? ROLE_ALLOW[role] || ["/dashboard"] : ["/dashboard"];
const isAllowed = (path) => {
  return allowedPaths.some((allowed) => {
    if (allowed.includes(":")) {
      // convert /parents/:id/edit → regex
      const regex = new RegExp(
        "^" + allowed.replace(/:[^/]+/g, "[^/]+") + "$"
      );
      return regex.test(path);
    }
    return allowed === path;
  });
};

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
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">CE</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-title">Clear Enroll</div>
            <div className="sidebar-subtitle">Registry System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" end className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
            Dashboard
          </NavLink>

          {isAllowed("/verify") && (
            <NavLink to="/verify" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
              Verify New Student
            </NavLink>
          )}

          {isAllowed("/parents") && (
            <NavLink to="/parents" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
              Parents
            </NavLink>
          )}

          {isAllowed("/students") && (
            <NavLink to="/students" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
             My Students / Debtors List
            </NavLink>
          )}

          {isAllowed("/flags") && (
            <NavLink to="/flags" end className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
              Flags in System
            </NavLink>
          )}

          {isAllowed("/schools") && (
            <NavLink to="/schools" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
              Schools
            </NavLink>
          )}

     
          {isAllowed("/duplicates") && (
            <NavLink to="/duplicates" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
              Duplicates
            </NavLink>
          )}


             {isAllowed("/allrecords") && (
            <NavLink to="/allrecords" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
             Add & Create Record
            </NavLink>
          )}

          
             {isAllowed("/flags/audit") && (
            <NavLink to="/flags/audit" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
            Audit Logs
            </NavLink>
          )}

          

              {isAllowed("/dashboard/analytics") && (
            <NavLink to="/dashboard/analytics" className={({ isActive }) => (isActive ? "sidelink active" : "sidelink")}>
            Dashboard Analytics
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-chip">
              <div className="user-avatar">{String(user.email || "U").slice(0, 1).toUpperCase()}</div>
              <div className="user-meta">
                <div className="user-email">{user.email}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
          )}

          {/* Logout should NOT look like the primary blue action */}
          <button className="btn btn-secondary btn-block" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <div className="topbar-h1">Clear Enroll System</div>
            {user && (
              <div className="topbar-h2">
                Logged in as <strong>{user.email}</strong> ({user.role})
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
