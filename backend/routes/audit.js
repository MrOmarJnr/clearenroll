
const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  // ======================
  // Login / Logout Logs
  // ======================
  router.get("/login-logs", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          l.id,
          l.user_id,
          u.email,
          u.full_name,
          r.name AS role,
          l.action,
          l.ip_address,
          l.user_agent,
          l.created_at
        FROM user_login_logs l
        JOIN users u ON u.id = l.user_id
        JOIN roles r ON r.id = u.role_id
        ORDER BY l.created_at DESC
        LIMIT 500
      `);

      res.json({ logs: rows });
    } catch (err) {
      console.error("LOGIN LOGS ERROR:", err);
      res.status(500).json({ message: "Failed to load login logs" });
    }
  });

  return router;
};
