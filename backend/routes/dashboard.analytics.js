const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const isSuperAdmin = req.user.role === "SUPER_ADMIN";
      const schoolId = req.user.school_id;

      const where = isSuperAdmin
        ? ""
        : "WHERE f.reported_by_school_id = ?";
      const params = isSuperAdmin ? [] : [schoolId];

      /* ===============================
         PIE: FLAGGED vs CLEARED (AMOUNT)
      =============================== */
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

      /* ===============================
         MONTHLY TOTAL AMOUNT
      =============================== */
      const [monthly] = await pool.query(
        `
        SELECT
          DATE_FORMAT(f.created_at, '%Y-%m') AS month,
          SUM(f.amount_owed) AS total
        FROM flags f
        ${where}
        GROUP BY month
        ORDER BY month ASC
        `,
        params
      );

      /* ===============================
         AMOUNT BY CURRENCY
      =============================== */
      const [currency] = await pool.query(
        `
        SELECT
          f.currency,
          SUM(f.amount_owed) AS total
        FROM flags f
        ${where}
        GROUP BY f.currency
        `,
        params
      );

      /* ===============================
         FLAG vs CLEAR TREND (AMOUNT)
      =============================== */
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
