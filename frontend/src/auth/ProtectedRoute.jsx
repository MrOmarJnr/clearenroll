import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");

  // No token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Validate token + handle expiry
  let payload = null;
  try {
    payload = jwtDecode(token);

    // If exp exists (seconds), enforce it
    if (payload?.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }


  if (Array.isArray(roles) && roles.length > 0) {
    const userRole = payload?.role;
    if (!roles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children ? children : <Outlet />;
}
