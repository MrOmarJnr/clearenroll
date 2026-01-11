const express = require("express");

module.exports = (pool, auth) => {
  const router = express.Router();

  /**
   * GET /duplicates/pending
   * List all unresolved duplicate reviews
   */
  router.get("/pending", auth, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          dr.id,
          dr.created_at,
          dr.attempted_student_snapshot,
          s.first_name,
          s.last_name,
          s.date_of_birth
        FROM duplicate_reviews dr
        JOIN students s ON s.id = dr.existing_student_id
        WHERE dr.decision IS NULL
        ORDER BY dr.created_at DESC
      `);

      res.json(rows);
    } catch (err) {
      console.error("❌ FETCH DUPLICATES FAILED:", err);
      res.status(500).json({ message: "Failed to load duplicate reviews" });
    }
  });

  /**
   * POST /duplicates/:id/resolve
   * Resolve a duplicate review
   */
  router.post("/:id/resolve", auth, async (req, res) => {
    const { id } = req.params;
    const { decision, reason } = req.body;

    if (!decision || !reason) {
      return res.status(400).json({ message: "Decision and reason required" });
    }

    try {
      await pool.query(
        `
        UPDATE duplicate_reviews
        SET decision = ?, reason = ?, admin_user_id = ?
        WHERE id = ?
      `,
        [decision, reason, req.user.id, id]
      );

      console.log(`✅ DUPLICATE REVIEW ${id} RESOLVED → ${decision}`);

      res.json({ success: true });
    } catch (err) {
      console.error("❌ RESOLVE DUPLICATE FAILED:", err);
      res.status(500).json({ message: "Failed to resolve duplicate review" });
    }
  });

  return router;
};
