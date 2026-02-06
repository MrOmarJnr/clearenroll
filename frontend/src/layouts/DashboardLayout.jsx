import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../assets/css/new_style.css";
import { api } from "../services/api";
import ConsentModal from "../components/ConsentModal";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);

  // ====== UI state (AdminHub behaviors) ======
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("ce_dark_mode") === "1";
  });

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

  // ===== CONSENT / LOADING STATE =====
  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);

  // ===== CONSENT CHECK (FIXED, NO EARLY RETURN) =====
 useEffect(() => {
  // DO NOT check consent if not logged in
  if (!token) {
    setLoading(false);
    return;
  }

  const checkConsent = async () => {
    try {
      const res = await api("/user/consent-status");

      if (!res.has_consented) {
        setNeedsConsent(true);
      }
    } catch (err) {
      localStorage.removeItem("token");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  checkConsent();
}, [navigate, token]);


  // ===== USER / ROLE =====
  const user = getUserSafe();
  const role = user?.role;

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const profileImage =
    user?.profile_photo
      ? user.profile_photo.startsWith("http")
        ? user.profile_photo
        : `${API_BASE}/${user.profile_photo}`
      : null;

  // ===== ROLE ACCESS =====
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
        "/students/import",
        "/parents/import",
        "/allrecords",
        "/parents/:id/edit",
        "/students/:id/edit",
        "/flags/audit",
        "/dashboard/analytics",
        "/register",
        "/users",
        "/audit/login-logs",
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
    }),
    []
  );

  const allowedPaths = role ? ROLE_ALLOW[role] || ["/dashboard"] : ["/dashboard"];

  const isAllowed = (path) => {
    return allowedPaths.some((allowed) => {
      if (allowed.includes(":")) {
        const regex = new RegExp(
          "^" + allowed.replace(/:[^/]+/g, "[^/]+") + "$"
        );
        return regex.test(path);
      }
      return allowed === path;
    });
  };

  // ===== ROUTE GUARD =====
  useEffect(() => {
    if (role && location?.pathname && !isAllowed(location.pathname)) {
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [role, location?.pathname]);

  // ===== LOGOUT =====
  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = jwtDecode(token);
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: payload.userId }),
        });
      }
    } catch (err) {
      console.warn("Logout log failed:", err);
    }

    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  // ===== RESPONSIVE UI =====
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

  const profileInitial =
    user?.full_name?.trim()?.[0]?.toUpperCase() ||
    user?.email?.trim()?.[0]?.toUpperCase() ||
    "U";

  const sideLinkClass = ({ isActive }) => (isActive ? "active" : "");


  useEffect(() => {
  const IDLE_LIMIT = 30 * 60 * 1000; // 15 minutes

  const updateActivity = () => {
    localStorage.setItem("lastActivity", Date.now().toString());
  };

  const checkIdle = () => {
    const last = Number(localStorage.getItem("lastActivity") || 0);

    if (Date.now() - last > IDLE_LIMIT) {
      localStorage.removeItem("token");
      localStorage.removeItem("lastActivity");

      navigate("/login", { replace: true });
    }
  };

  // Track user activity
  const events = ["mousemove", "keydown", "click", "scroll"];
  events.forEach((e) =>
    window.addEventListener(e, updateActivity)
  );

  // Set initial activity timestamp
  updateActivity();

  // Check idle status every minute
  const interval = setInterval(checkIdle, 60 * 1000);

  return () => {
    events.forEach((e) =>
      window.removeEventListener(e, updateActivity)
    );
    clearInterval(interval);
  };
}, [navigate]);

  


  // RENDER 
 
  return (
    <>
      {loading ? (
        <div className="app-loading">Loading...</div>
      ) : (
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
              <li
                className={sideLinkClass({
                  isActive: location.pathname === "/dashboard",
                })}
              >
                <NavLink to="/dashboard" end>
                  <i className="bx bxs-dashboard" />
                  <span className="text">Dashboard</span>
                </NavLink>
              </li>

              {isAllowed("/verify") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/verify"),
                  })}
                >
                  <NavLink to="/verify">
                    <i className="bx bxs-check-shield" />
                    <span className="text">Verify</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/students") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/students"),
                  })}
                >
                  <NavLink to="/students">
                    <i className="bx bxs-group" />
                    <span className="text">My Debtors</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/parents") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/parents"),
                  })}
                >
                  <NavLink to="/parents">
                    <i className="bx bxs-user-detail" />
                    <span className="text">Parents</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/flags") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/flags"),
                  })}
                >
                  <NavLink to="/flags">
                    <i className="bx bxs-flag-alt" />
                    <span className="text">Flags</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/duplicates") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/duplicates"),
                  })}
                >
                  <NavLink to="/duplicates">
                    <i className="bx bxs-copy" />
                    <span className="text">Duplicates</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/schools") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/schools"),
                  })}
                >
                  <NavLink to="/schools">
                    <i className="bx bxs-school" />
                    <span className="text">Schools</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/consents") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/consents"),
                  })}
                >
                  <NavLink to="/consents">
                    <i className="bx bxs-lock-alt" />
                    <span className="text">Consents</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/allrecords") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/allrecords"),
                  })}
                >
                  <NavLink to="/allrecords">
                    <i className="bx bxs-plus-circle" />
                    <span className="text">Create Record</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/flags/audit") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/flags/audit"),
                  })}
                >
                  <NavLink to="/flags/audit">
                    <i className="bx bxs-book" />
                    <span className="text">Audit Logs</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/dashboard/analytics") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith(
                      "/dashboard/analytics"
                    ),
                  })}
                >
                  <NavLink to="/dashboard/analytics">
                    <i className="bx bxs-doughnut-chart" />
                    <span className="text">Analytics</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/register") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/register"),
                  })}
                >
                  <NavLink to="/register">
                    <i className="bx bxs-user-plus" />
                    <span className="text">Register School</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/users") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith("/users"),
                  })}
                >
                  <NavLink to="/users">
                    <i className="bx bxs-user-plus" />
                    <span className="text">Users</span>
                  </NavLink>
                </li>
              )}

              {isAllowed("/audit/login-logs") && (
                <li
                  className={sideLinkClass({
                    isActive: location.pathname.startsWith(
                      "/audit/login-logs"
                    ),
                  })}
                >
                  <NavLink to="/audit/login-logs">
                    <i className="bx bxs-user-plus" />
                    <span className="text">Login Logs</span>
                  </NavLink>
                </li>
              )}
            </ul>
          </section>

          {/* CONTENT */}
          <section id="content">
            <nav>
              <div style={{ flex: 1 }} />
              <div className="nav-right">
                <div className="profile-wrapper">
                  <div
                    className="profile"
                    onClick={() => setProfileOpen((v) => !v)}
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div className="avatar">{profileInitial}</div>
                    )}

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

            <main>
              <ConsentModal
                open={needsConsent}
                onAccept={async () => {
                  await api("/user/consent", { method: "POST" });
                  setNeedsConsent(false);
                }}
                onDecline={logout}
              />

              <Outlet />
            </main>
          </section>
        </>
      )}
    </>
  );
}
