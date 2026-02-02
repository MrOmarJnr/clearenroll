const express = require("express");

module.exports = (pool, auth) => {
  const router = express.Router();

  /**
   * check if student has an active dispute
   */
  async function getActiveDispute(studentId) {
    const [rows] = await pool.query(
      `
      SELECT id, status
      FROM disputes
      WHERE student_id = ?
        AND status IN ('OPEN', 'UNDER_REVIEW')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [studentId]
    );

    return rows.length ? rows[0] : null;
  }

  /**
   * POST /disputes
   * Raise a dispute (Parent / Student / Admin)
   */
  router.post("/", auth, async (req, res) => {
    const { student_id, reason, description, proof_url, raised_by } = req.body;

    if (!student_id || !reason) {
      return res.status(400).json({ message: "student_id and reason are required" });
    }

    try {
      // Validate student exists
      const [students] = await pool.query(
        `SELECT id FROM students WHERE id = ? LIMIT 1`,
        [student_id]
      );

      if (!students.length) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Enforce single active dispute
      const active = await getActiveDispute(student_id);
      if (active) {
        return res.status(409).json({
          message: "Student already has an active dispute",
          dispute: active,
        });
      }

      const finalRaisedBy = (raised_by || "PARENT").toUpperCase();

      await pool.query(
        `
        INSERT INTO disputes
          (student_id, raised_by, reason, description, proof_url, status)
        VALUES (?, ?, ?, ?, ?, 'OPEN')
        `,
        [
          student_id,
          finalRaisedBy,
          reason,
          description || null,
          proof_url || null,
        ]
      );

      console.log(" DISPUTE CREATED:", { student_id, finalRaisedBy });

      res.json({ success: true });
    } catch (err) {
      console.error(" CREATE DISPUTE FAILED:", err);
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  /**
   * GET /disputes?student_id=#
   * List disputes for a student
   */
  router.get("/", auth, async (req, res) => {
    const { student_id } = req.query;

    if (!student_id) {
      return res.status(400).json({ message: "student_id is required" });
    }

    try {
      const [rows] = await pool.query(
        `
        SELECT *
        FROM disputes
        WHERE student_id = ?
        ORDER BY created_at DESC
        `,
        [student_id]
      );

      res.json(rows);
    } catch (err) {
      console.error(" FETCH DISPUTES FAILED:", err);
      res.status(500).json({ message: "Failed to load disputes" });
    }
  });

  /**
   * POST /disputes/:id/review
   */
  router.post("/:id/review", auth, async (req, res) => {
    const { id } = req.params;

    try {
      await pool.query(
        `
        UPDATE disputes
        SET status = 'UNDER_REVIEW',
            updated_at = NOW()
        WHERE id = ?
        `,
        [id]
      );

      console.log(" DISPUTE UNDER REVIEW:", id);

      res.json({ success: true });
    } catch (err) {
      console.error(" DISPUTE REVIEW FAILED:", err);
      res.status(500).json({ message: "Failed to update dispute" });
    }
  });

  /**
   * POST /disputes/:id/resolve
   * Resolve dispute (ACCEPTED / REJECTED)
   */
  router.post("/:id/resolve", auth, async (req, res) => {
    const { id } = req.params;
    const { status, resolution_note } = req.body;

    if (!status || !["RESOLVED_ACCEPTED", "RESOLVED_REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "status must be RESOLVED_ACCEPTED or RESOLVED_REJECTED",
      });
    }

    try {
      await pool.query(
        `
        UPDATE disputes
        SET status = ?,
            resolution_note = ?,
            resolved_by = ?,
            updated_at = NOW()
        WHERE id = ?
        `,
        [status, resolution_note || null, req.user.id, id]
      );

      console.log(" DISPUTE RESOLVED:", { id, status });

      res.json({ success: true });
    } catch (err) {
      console.error(" RESOLVE DISPUTE FAILED:", err);
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  return router;
};
