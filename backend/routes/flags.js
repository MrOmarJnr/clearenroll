const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  /**
   * ======================================================
   * GET ALL FLAGS
   * - Visible to everyone (SUPER_ADMIN & SCHOOL_ADMIN)
   * - No school filtering here by design
   * ======================================================
   */
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          f.id,
          f.student_id,
          f.parent_id,
          f.amount_owed,
          f.currency,
          f.reason,
          f.status,
          f.created_at,
          f.cleared_at,
          f.created_by_user_id,

          CONCAT(s.first_name, ' ', s.last_name) AS student,
          s.student_photo,

          p.full_name AS parent,

          sc.name AS reported_by,
          sc.location AS school_location

        FROM flags f
        LEFT JOIN students s ON s.id = f.student_id
        LEFT JOIN parents p ON p.id = f.parent_id
        LEFT JOIN schools sc ON sc.id = f.reported_by_school_id
        ORDER BY f.created_at DESC
      `);

      res.json({ flags: rows });
    } catch (err) {
      console.error("FLAGS LIST ERROR:", err);
      res.status(500).json({ message: "Failed to load flags" });
    }
  });

  /**
   * ======================================================
   * CREATE FLAG
   * - User creating the flag is recorded
   * - School is explicitly stored
   * ======================================================
   */
 router.post("/", authMiddleware, async (req, res) => {
  const {
    student_id,
    parent_id,
    amount_owed,
    currency,
    reason,
  } = req.body;

  if (!student_id || amount_owed == null) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const currencyValue = currency === "USD" ? "USD" : "GHS";

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `
      INSERT INTO flags
      (
        student_id,
        parent_id,
        reported_by_school_id,
        amount_owed,
        currency,
        reason,
        status,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, 'FLAGGED', ?)
      `,
      [
        student_id,
        parent_id || null,
        req.user.school_id,   // ✅ FIXED HERE
        amount_owed,
        currencyValue,
        reason || "Unpaid fees",
        req.user.userId,
      ]
    );

    await conn.commit();

    res.status(201).json({
      message: "Flag created",
      flag_id: result.insertId,
    });
  } catch (err) {
    await conn.rollback();
    console.error("FLAG CREATE ERROR:", err);
    res.status(500).json({ message: "Failed to create flag" });
  } finally {
    conn.release();
  }
});

  /**
   * ======================================================
   * CLEAR FLAG
   * - ONLY creator OR SUPER_ADMIN
   * - This is the core security rule
   * ======================================================
   */
  router.patch("/:id/clear", authMiddleware, async (req, res) => {
    const flagId = req.params.id;
    const { id: userId, role } = req.user;

    try {
      const [[flag]] = await pool.query(
        `
        SELECT
          id,
          created_by_user_id,
          status
        FROM flags
        WHERE id = ?
        `,
        [flagId]
      );

      if (!flag) {
        return res.status(404).json({ message: "Flag not found" });
      }

      if (flag.status !== "FLAGGED") {
        return res.status(400).json({ message: "Flag already cleared" });
      }

      // 🔒 CORE AUTHORIZATION RULE
     if (role === "SCHOOL_ADMIN") {
          const [[flagSchool]] = await pool.query(
            "SELECT reported_by_school_id FROM flags WHERE id = ?",
            [flagId]
          );

          if (!flagSchool || Number(flagSchool.reported_by_school_id) !== Number(req.user.school_id)) {
            return res.status(403).json({
              message: "You can only clear flags reported by your school",
            });
          }
        }

      await pool.query(
        `
        UPDATE flags
        SET status = 'CLEARED',
            cleared_at = NOW()
        WHERE id = ?
        `,
        [flagId]
      );

      res.json({ message: "Flag cleared successfully" });
    } catch (err) {
      console.error("FLAG CLEAR ERROR:", err);
      res.status(500).json({ message: "Failed to clear flag" });
    }
  });

  return router;
};
