const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();


  // GET USERS (ADMIN)
  
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.last_login_at,
          u.last_logout_at,
          u.is_active,
          r.name AS role,
          s.name AS school
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN schools s ON s.id = u.school_id
        ORDER BY u.created_at DESC
      `);

      res.json({ users: rows });
    } catch (err) {
      console.error("USERS LIST ERROR:", err);
      res.status(500).json({ message: "Failed to load users" });
    }
  });


  // TOGGLE ACTIVATION

  router.post("/:id/toggle", authMiddleware, async (req, res) => {
    try {
      await pool.query(
        `UPDATE users SET is_active = IF(is_active=1,0,1) WHERE id = ?`,
        [req.params.id]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("TOGGLE USER ERROR:", err);
      res.status(500).json({ message: "Failed to toggle user" });
    }
  });

  // RESEND ACTIVATION

  router.post("/:id/resend-activation", authMiddleware, async (req, res) => {
    const token = crypto.randomBytes(32).toString("hex");

    try {
      const [[user]] = await pool.query(
        `SELECT email FROM users WHERE id = ?`,
        [req.params.id]
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await pool.query(
        `UPDATE users SET activation_token = ? WHERE id = ?`,
        [token, req.params.id]
      );

      const link = `${process.env.CLIENT_ORIGIN}/activate-account?token=${token}`;
      console.log("RESEND ACTIVATION LINK:", link);

      res.json({ success: true });
    } catch (err) {
      console.error("RESEND ACTIVATION ERROR:", err);
      res.status(500).json({ message: "Failed to resend activation" });
    }
  });


  // RESET PASSWORD

  router.post("/:id/reset-password", authMiddleware, async (req, res) => {
    const tempPassword = crypto.randomBytes(6).toString("hex");

    try {
      const hash = await bcrypt.hash(tempPassword, 10);

      await pool.query(
        `UPDATE users SET password_hash = ? WHERE id = ?`,
        [hash, req.params.id]
      );

      console.log(`TEMP PASSWORD FOR USER ${req.params.id}:`, tempPassword);

      res.json({ success: true });
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  return router;
};
