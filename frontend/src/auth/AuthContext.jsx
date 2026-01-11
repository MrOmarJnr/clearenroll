import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);

        setUser({
          id: decoded.id,
          name: decoded.name,
          role: decoded.role,
          school_id: decoded.school_id ?? null,
          school_name: decoded.school_name ?? null,
        });
      } catch (err) {
        console.error("Invalid token", err);
        localStorage.removeItem("token");
        setUser(null);
      }
    }

    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
