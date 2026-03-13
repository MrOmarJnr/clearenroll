const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const isSuperAdmin = req.user.role === "SUPER_ADMIN";
      const schoolId = req.user.school_id;

      const from = req.query.from;
      const to = req.query.to;
      const status = req.query.status;

      let whereParts = [];
      let params = [];

      if (!isSuperAdmin) {
        whereParts.push("f.reported_by_school_id = ?");
        params.push(schoolId);
      }

      if (from && to) {
        whereParts.push("DATE(f.created_at) BETWEEN ? AND ?");
        params.push(from, to);
      }

      if (status && (status === "FLAGGED" || status === "CLEARED")) {
        whereParts.push("f.status = ?");
        params.push(status);
      }

      const where =
        whereParts.length > 0 ? "WHERE " + whereParts.join(" AND ") : "";

      /* PIE: FLAGGED vs CLEARED */

      const [[pie]] = await pool.query(
        `
        SELECT
          SUM(CASE WHEN f.status = 'FLAGGED' THEN f.amount_owed ELSE 0 END) AS flagged_amount,
          SUM(CASE WHEN f.status = 'CLEARED' THEN f.amount_owed ELSE 0 END) AS cleared_amount
        FROM flags f
        ${where}
        `,
        params
      );

      /* MONTHLY AMOUNT */

      const [monthly] = await pool.query(
        `
        SELECT
          DATE_FORMAT(f.created_at, '%Y-%m') AS month,
          SUM(CASE WHEN f.status = 'CLEARED' THEN f.amount_owed ELSE 0 END) AS cleared,
          SUM(CASE WHEN f.status = 'FLAGGED' THEN f.amount_owed ELSE 0 END) AS flagged
        FROM flags f
        ${where}
        GROUP BY month
        ORDER BY month ASC
        `,
        params
      );

      /* CURRENCY TOTALS */

      const [currency] = await pool.query(
        `
        SELECT
          f.currency,
          SUM(CASE WHEN f.status = 'FLAGGED' THEN f.amount_owed ELSE 0 END) AS flagged,
          SUM(CASE WHEN f.status = 'CLEARED' THEN f.amount_owed ELSE 0 END) AS cleared
        FROM flags f
        ${where}
        GROUP BY f.currency
        `,
        params
      );

      /* TREND */

      const [trend] = await pool.query(
        `
        SELECT
          DATE_FORMAT(f.created_at, '%Y-%m') AS month,
          SUM(CASE WHEN f.status = 'FLAGGED' THEN f.amount_owed ELSE 0 END) AS flagged,
          SUM(CASE WHEN f.status = 'CLEARED' THEN f.amount_owed ELSE 0 END) AS cleared
        FROM flags f
        ${where}
        GROUP BY month
        ORDER BY month ASC
        `,
        params
      );

      res.json({
        scope: isSuperAdmin ? "GLOBAL" : "SCHOOL",
        school_id: isSuperAdmin ? null : schoolId,
        pieTotals: pie || { flagged_amount: 0, cleared_amount: 0 },
        monthlyBar: monthly || [],
        currencyBar: currency || [],
        trendData: trend || [],
      });
    } catch (err) {
      console.error("DASHBOARD ANALYTICS ERROR:", err);
      res.status(500).json({ message: "Analytics failed" });
    }
  });

  return router;
};