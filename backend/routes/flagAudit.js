const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  /**
   * GET /flags/audit
   * Super Admin only
   * Read-only system audit log (last 92 days)
   */
  router.get("/audit", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { q } = req.query;

      let sql = `
        SELECT
          l.id,
          l.flag_id,
          CONCAT(s.first_name,' ',s.last_name) AS student,
          p.full_name AS parent,
          sc.name AS school,
          l.action,
          l.amount_owed,
          l.currency,
          u.email AS performed_by,
          l.created_at
        FROM flag_audit_logs l
        JOIN students s ON s.id = l.student_id
        LEFT JOIN parents p ON p.id = l.parent_id
        JOIN schools sc ON sc.id = l.school_id
        JOIN users u ON u.id = l.performed_by_user_id
        WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 92 DAY)
      `;

      const params = [];

      if (q) {
        const term = `%${q}%`;
        sql += `
          AND (
            s.first_name LIKE ?
            OR s.last_name LIKE ?
            OR p.full_name LIKE ?
            OR sc.name LIKE ?
            OR l.action LIKE ?
          )
        `;
        params.push(term, term, term, term, term);
      }

      sql += " ORDER BY l.created_at DESC";

      const [rows] = await pool.query(sql, params);

      res.json({ logs: rows });
    } catch (err) {
      console.error("FLAG AUDIT ERROR:", err);
      res.status(500).json({ message: "Failed to load audit logs" });
    }
  });

  return router;
};
