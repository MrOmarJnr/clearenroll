const express = require("express");

module.exports = (pool, auth) => {
  const router = express.Router();

  /**
   * POST /consents/request
   * Create a consent request
   */
  router.post("/request", auth, async (req, res) => {
    const { student_id, requesting_school_id } = req.body;

    if (!student_id || !requesting_school_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      await pool.query(
        `
        INSERT INTO consents (student_id, requesting_school_id, status)
        VALUES (?, ?, 'PENDING')
        `,
        [student_id, requesting_school_id]
      );

      console.log("🟡 CONSENT REQUESTED:", { student_id, requesting_school_id });

      res.json({ success: true });
    } catch (err) {
      console.error("❌ CONSENT REQUEST FAILED:", err);
      res.status(500).json({ message: "Failed to request consent" });
    }
  });

  /**
   * GET /consents/pending
   * Admin: list all pending consents
   */
  router.get("/pending", auth, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          c.id,
          c.created_at,
          s.first_name,
          s.last_name,
          sch.name AS requesting_school
        FROM consents c
        JOIN students s ON s.id = c.student_id
        JOIN schools sch ON sch.id = c.requesting_school_id
        WHERE c.status = 'PENDING'
        ORDER BY c.created_at DESC
      `);

      res.json(rows);
    } catch (err) {
      console.error("❌ FETCH CONSENTS FAILED:", err);
      res.status(500).json({ message: "Failed to load consents" });
    }
  });

  /**
   * POST /consents/:id/approve
   * Admin approves consent
   */
router.post("/:id/approve", auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `
      UPDATE consents
      SET status = 'GRANTED',
          approved_by = ?,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [req.user.id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Consent not found or already processed",
      });
    }

    console.log("✅ CONSENT GRANTED:", id);

    res.json({ message: "Consent granted" });
  } catch (err) {
    console.error("APPROVE CONSENT ERROR:", err);
    res.status(500).json({ message: "Failed to approve consent" });
  }
});


  /**
 * POST /consents/:id/reject
 */
router.post("/:id/reject", auth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Reason required" });
  }

  try {
    await pool.query(
      `
      UPDATE consents
      SET status = 'REJECTED',
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?
      `,
      [req.user.id, id]
    );

    console.log("❌ CONSENT REJECTED:", id);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ REJECT CONSENT FAILED:", err);
    res.status(500).json({ message: "Failed to reject consent" });
  }
});


  return router;
};
