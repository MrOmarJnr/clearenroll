const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  // ==========================================
  // VERIFY TEACHER (Registry Lookup Only)
  // ==========================================

  router.post("/", authMiddleware, async (req, res) => {
    let { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: "Search query required" });
    }

    query = query.trim();

    try {
    

      const [teachers] = await pool.query(
        `
        SELECT
          t.id,
          t.first_name,
          t.last_name,
          t.other_names,
          t.date_of_birth,
          t.gender,
          t.teacher_photo,
          t.phone,
          t.ghana_card_number,
          t.qualification,
          t.status,
          t.reason,
          t.address,
          sc.name AS school

        FROM school_teachers t
        JOIN schools sc ON sc.id = t.current_school_id

        WHERE
          CONCAT(t.first_name,' ',t.last_name) LIKE ?
          OR t.phone = ?
          OR t.ghana_card_number = ?

        ORDER BY t.id DESC
        `,
        [
          `%${query}%`,
          query,
          query,
        ]
      );

      if (!teachers.length) {
        return res.json({
          status: "NOT_FOUND",
          teachers: [],
        });
      }

      return res.json({
        status: "FOUND",
        teachers,
      });

    } catch (err) {
      console.error("VERIFY TEACHER ERROR:", err);
      return res.status(500).json({
        message: "Teacher registry lookup failed",
      });
    }
  });

  return router;
};