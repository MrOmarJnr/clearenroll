const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  /**
   * ======================================================
   * GET ALL FLAGS (SYSTEM VIEW)
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
   * FLAG AUDIT LOGS (READ ONLY)
   * ⚠️ MUST COME BEFORE /:id
   * ======================================================
   */
  router.get("/audit", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          al.id,
          al.flag_id,
          CONCAT(s.first_name, ' ', s.last_name) AS student,
          p.full_name AS parent,
          sc.name AS school,
          al.amount_owed,
          al.currency,
          al.action,
          u.email AS performed_by,
          al.created_at
        FROM flag_audit_logs al
        LEFT JOIN students s ON s.id = al.student_id
        LEFT JOIN parents p ON p.id = al.parent_id
        LEFT JOIN schools sc ON sc.id = al.school_id
        LEFT JOIN users u ON u.id = al.performed_by_user_id
        ORDER BY al.created_at DESC
      `);

      res.json({ logs: rows });
    } catch (err) {
      console.error("FLAG AUDIT ERROR:", err);
      res.status(500).json({ message: "Failed to load audit logs" });
    }
  });

  /**
   * ======================================================
   * CREATE FLAG
   * ======================================================
   */
  router.post("/", authMiddleware, async (req, res) => {
    const {
      student_id,
      parent_id,
      reported_by_school_id,
      amount_owed,
      currency,
      reason,
    } = req.body;

    if (!student_id || !reported_by_school_id || amount_owed == null) {
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
          reported_by_school_id,
          amount_owed,
          currencyValue,
          reason || "Unpaid fees",
          req.user.userId,
        ]
      );

      const flagId = result.insertId;

      await conn.query(
        `
        INSERT INTO flag_audit_logs
        (
          flag_id,
          student_id,
          parent_id,
          school_id,
          action,
          amount_owed,
          currency,
          performed_by_user_id
        )
        VALUES (?, ?, ?, ?, 'FLAGGED', ?, ?, ?)
        `,
        [
          flagId,
          student_id,
          parent_id || null,
          reported_by_school_id,
          amount_owed,
          currencyValue,
          req.user.userId,
        ]
      );

      await conn.commit();

      res.status(201).json({
        message: "Flag created",
        flag_id: flagId,
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
   * GET SINGLE FLAG (VIEW MODAL)
   * ======================================================
   */
  router.get("/:id", authMiddleware, async (req, res) => {
    const flagId = Number(req.params.id);

    // 🔒 HARD GUARD — FIXES NaN BUG
    if (!Number.isInteger(flagId)) {
      return res.status(400).json({ message: "Invalid flag ID" });
    }

    try {
      const [rows] = await pool.query(
        `
        SELECT
          f.id,
          f.student_id,
          f.parent_id,
          f.amount_owed,
          f.currency,
          f.reason,
          f.status,
          sc.name AS reported_by,
          f.reported_by_school_id
        FROM flags f
        JOIN schools sc ON sc.id = f.reported_by_school_id
        WHERE f.id = ?
        LIMIT 1
        `,
        [flagId]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Flag not found" });
      }

      const flag = rows[0];

      if (req.user.role === "SCHOOL_ADMIN") {
        if (
          Number(flag.reported_by_school_id) !==
          Number(req.user.school_id)
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      res.json({ flag });
    } catch (err) {
      console.error("GET FLAG ERROR:", err);
      res.status(500).json({ message: "Failed to load flag" });
    }
  });

  /**
   * ======================================================
   * CLEAR FLAG
   * ======================================================
   */
  router.patch("/:id/clear", authMiddleware, async (req, res) => {
    const flagId = Number(req.params.id);
    const { userId, role } = req.user;

    if (!Number.isInteger(flagId)) {
      return res.status(400).json({ message: "Invalid flag ID" });
    }

    try {
      const [[flag]] = await pool.query(
        `
        SELECT
          id,
          student_id,
          parent_id,
          reported_by_school_id,
          amount_owed,
          currency,
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

      if (
        role !== "SUPER_ADMIN" &&
        Number(flag.created_by_user_id) !== Number(userId)
      ) {
        return res
          .status(403)
          .json({ message: "You can only clear flags you created" });
      }

      await pool.query(
        `
        UPDATE flags
        SET status = 'CLEARED',
            cleared_at = NOW(),
            cleared_by_user_id = ?
        WHERE id = ?
        `,
        [userId, flagId]
      );

      await pool.query(
        `
        INSERT INTO flag_audit_logs
        (
          flag_id,
          student_id,
          parent_id,
          school_id,
          action,
          amount_owed,
          currency,
          performed_by_user_id
        )
        VALUES (?, ?, ?, ?, 'CLEARED', ?, ?, ?)
        `,
        [
          flagId,
          flag.student_id,
          flag.parent_id,
          flag.reported_by_school_id,
          flag.amount_owed,
          flag.currency,
          userId,
        ]
      );

      res.json({ message: "Flag cleared successfully" });
    } catch (err) {
      console.error("FLAG CLEAR ERROR:", err);
      res.status(500).json({ message: "Failed to clear flag" });
    }
  });

  return router;
};
