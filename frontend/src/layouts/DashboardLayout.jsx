import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";


// ✅ Use your AdminHub CSS (paste your provided CSS into this file or create style.css)
import "../assets/css/new_style.css";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);

  // ====== UI state (AdminHub behaviors) ======
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // optional: persist (won’t break anything if not present)
    return localStorage.getItem("ce_dark_mode") === "1";
  });

  // ====== AUTH + RBAC (KEEP YOUR EXISTING LOGIC) ======
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

  const ROLE_ALLOW = useMemo(
    () => ({
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
        "/dashboard/analytics",
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
        "/duplicates",
        "/consents",
        "/students/import",
        "/parents/import",
        "/allrecords",
        "/parents/:id/edit",
        "/students/:id/edit",
        "/dashboard/analytics",
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
    }),
    []
  );

  const allowedPaths = role ? ROLE_ALLOW[role] || ["/dashboard"] : ["/dashboard"];

  const isAllowed = (path) => {
    return allowedPaths.some((allowed) => {
      if (allowed.includes(":")) {
        const regex = new RegExp("^" + allowed.replace(/:[^/]+/g, "[^/]+") + "$");
        return regex.test(path);
      }
      return allowed === path;
    });
  };

  // keep your redirect behavior
  useEffect(() => {
    if (role && location?.pathname && !isAllowed(location.pathname)) {
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [role, location?.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  // ====== AdminHub responsive defaults (from script.js) ======
  useEffect(() => {
    const applyResponsiveDefaults = () => {
      if (window.innerWidth < 768) {
        setSidebarHidden(true);
      }
      if (window.innerWidth > 576) {
        setMobileSearchOpen(false);
      }
    };

    applyResponsiveDefaults();

    const onResize = () => {
      if (window.innerWidth > 576) {
        setMobileSearchOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ====== Dark mode (AdminHub) ======
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("ce_dark_mode", "1");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("ce_dark_mode", "0");
    }
  }, [darkMode]);

  const profileInitial =
    user?.full_name?.trim()?.[0]?.toUpperCase() ||
    user?.email?.trim()?.[0]?.toUpperCase() ||
    "U";

  // helper to style active li like AdminHub
  const sideLinkClass = ({ isActive }) => (isActive ? "active" : "");

  return (
    <>
      {/* SIDEBAR */}
      <section id="sidebar" className={sidebarHidden ? "hide" : ""}>
        <a href="#" className="brand" onClick={(e) => e.preventDefault()}>
          <i
            className="bx bx-menu"
            onClick={() => setSidebarHidden((s) => !s)}
          />          
          <span className="text">ClearEnroll</span>
        </a>

        <ul className="side-menu top">
          <li className={sideLinkClass({ isActive: location.pathname === "/dashboard" })}>
            <NavLink to="/dashboard" end>
              <i className="bx bxs-dashboard" />
              <span className="text">Dashboard</span>
            </NavLink>
          </li>

          {isAllowed("/verify") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/verify") })}>
              <NavLink to="/verify">
                <i className="bx bxs-check-shield" />
                <span className="text">Verify</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/students") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/students") })}>
              <NavLink to="/students">
                <i className="bx bxs-group" />
                <span className="text">My Debtors</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/parents") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/parents") })}>
              <NavLink to="/parents">
                <i className="bx bxs-user-detail" />
                <span className="text">Parents</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/flags") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/flags") })}>
              <NavLink to="/flags">
                <i className="bx bxs-flag-alt" />
                <span className="text">Flags</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/duplicates") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/duplicates") })}>
              <NavLink to="/duplicates">
                <i className="bx bxs-copy" />
                <span className="text">Duplicates</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/schools") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/schools") })}>
              <NavLink to="/schools">
                <i className="bx bxs-school" />
                <span className="text">Schools</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/consents") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/consents") })}>
              <NavLink to="/consents">
                <i className="bx bxs-lock-alt" />
                <span className="text">Consents</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/allrecords") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/allrecords") })}>
              <NavLink to="/allrecords">
                <i className="bx bxs-plus-circle" />
                <span className="text">Create Record</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/flags/audit") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/flags/audit") })}>
              <NavLink to="/flags/audit">
                <i className="bx bxs-book" />
                <span className="text">Audit Logs</span>
              </NavLink>
            </li>
          )}

          {isAllowed("/dashboard/analytics") && (
            <li className={sideLinkClass({ isActive: location.pathname.startsWith("/dashboard/analytics") })}>
              <NavLink to="/dashboard/analytics">
                <i className="bx bxs-doughnut-chart" />
                <span className="text">Analytics</span>
              </NavLink>
            </li>
          )}
        </ul>

        <ul className="side-menu">
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="logout">
              <i className="bx bxs-log-out-circle" />
              <span className="text">Logout</span>
            </a>
          </li>
        </ul>
      </section>

      {/* CONTENT */}
      <section id="content">
        {/* NAVBAR */}
    <nav>
  {/* LEFT */}
  

  {/* SPACER */}
  <div style={{ flex: 1 }} />

  {/* RIGHT */}
  <div className="nav-right">


    <div className="profile-wrapper">
      <div
        className="profile"
        onClick={() => setProfileOpen((v) => !v)}
      >
        <div className="avatar">{profileInitial}</div>
        <span className="profile-name-inline">
          {user?.full_name || "User"}
        </span>
      </div>

      {profileOpen && (
        <div className="profile-dropdown">
          <div className="profile-name">
            {user?.full_name || user?.email}
            <small>{role}</small>
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </div>
  </div>
</nav>




        {/* MAIN */}
        <main>
          <Outlet />
        </main>
      </section>
    </>
  );
}
