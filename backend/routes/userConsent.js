const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  // ======================
  // GET CONSENT STATUS
  // ======================
  router.get("/consent-status", authMiddleware, async (req, res) => {
    try {
      const [[user]] = await pool.query(
        `
        SELECT has_consented, consented_at
        FROM users
        WHERE id = ?
        `,
        [req.user.userId]
      );

      res.json({
        has_consented: !!user?.has_consented,
        consented_at: user?.consented_at,
      });
    } catch (err) {
      console.error("CONSENT STATUS ERROR:", err);
      res.status(500).json({ message: "Failed to load consent status" });
    }
  });

  // ======================
  // SAVE CONSENT
  // ======================
  router.post("/consent", authMiddleware, async (req, res) => {
    try {
      await pool.query(
        `
        UPDATE users
        SET has_consented = 1,
            consented_at = NOW()
        WHERE id = ?
        `,
        [req.user.userId]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("CONSENT SAVE ERROR:", err);
      res.status(500).json({ message: "Failed to save consent" });
    }
  });

  return router;
};
