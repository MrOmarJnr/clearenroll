const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Try to read response body safely
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  // Handle auth expiry
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return;
  }

  // Handle errors (INCLUDING duplicates)
  if (!res.ok) {
    const err = new Error(
      data?.message || data?.error || "Request failed"
    );
    err.status = res.status;
    err.data = data; // 🔑 REQUIRED for duplicate UI
    throw err;
  }

  return data;
}
