const express = require("express");
const crypto = require("crypto");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  // ======================
  // Get Users (Admin)
  // ======================
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.profile_photo,
          u.is_active,
          u.created_at,
          u.last_login_at,
          r.name AS role,
          s.name AS school
        FROM users u
        JOIN roles r ON r.id = u.role_id
        LEFT JOIN schools s ON s.id = u.school_id
        ORDER BY u.created_at DESC
      `);

      res.json({ users: rows });
    } catch (err) {
      console.error("USERS LIST ERROR:", err);
      res.status(500).json({ message: "Failed to load users" });
    }
  });

  // ======================
  // Toggle Activation
  // ======================
  router.post("/:id/toggle", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
      await pool.query(
        `UPDATE users SET is_active = IF(is_active=1,0,1) WHERE id = ?`,
        [id]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to toggle user" });
    }
  });

  // ======================
  // Resend Activation
  // ======================
  router.post("/:id/resend-activation", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const token = crypto.randomBytes(32).toString("hex");

    try {
      const [[user]] = await pool.query(
        `SELECT email FROM users WHERE id = ?`,
        [id]
      );

      await pool.query(
        `UPDATE users SET activation_token = ? WHERE id = ?`,
        [token, id]
      );

      const link = `${process.env.CLIENT_ORIGIN}/activate-account?token=${token}`;
      console.log("RESEND ACTIVATION LINK:", link);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to resend activation" });
    }
  });

  // ======================
  // Reset Password
  // ======================
  router.post("/:id/reset-password", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const tempPassword = crypto.randomBytes(6).toString("hex");

    const bcrypt = require("bcryptjs");
    const hash = await bcrypt.hash(tempPassword, 10);

    try {
      await pool.query(
        `UPDATE users SET password_hash = ? WHERE id = ?`,
        [hash, id]
      );

      console.log(`TEMP PASSWORD FOR USER ${id}:`, tempPassword);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  return router;
};
