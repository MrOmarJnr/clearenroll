const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  // ======================
  // Verify (Registry Lookup – Student-first)
  // ======================
  router.post("/", authMiddleware, async (req, res) => {
    let { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: "Search query required" });
    }

    query = query.trim();

    if (query.toUpperCase().startsWith("GHA-")) {
      query = query.toUpperCase();
    }

    try {
      // ======================
      // 1) STUDENTS (PRIMARY)
      // ======================
      const [students] = await pool.query(
        `
        SELECT DISTINCT
          s.id,
          CONCAT(s.first_name,' ',s.last_name) AS name,
          s.date_of_birth,
          s.gender,
          s.student_photo,
          sc.name AS school,

          p.id AS parent_id,
          p.full_name AS parent_name,
          p.phone AS parent_phone,
          p.ghana_card_number

        FROM students s
        JOIN schools sc ON sc.id = s.current_school_id
        LEFT JOIN student_parents sp ON sp.student_id = s.id
        LEFT JOIN parents p ON p.id = sp.parent_id

        WHERE
          CONCAT(s.first_name,' ',s.last_name) LIKE ?
          OR p.full_name LIKE ?
          OR p.phone = ?
          OR p.ghana_card_number = ?

        ORDER BY s.id DESC
        `,
        [`%${query}%`, `%${query}%`, query, query]
      );

      if (!students.length) {
        return res.json({
          status: "NOT_FOUND",
          parents: [],
          students: [],
          flags: [],
        });
      }

      const studentIds = students.map((s) => s.id);

      // ======================
      // 2) FLAGS (AUTHORITATIVE)
      // ======================
      const [flags] = await pool.query(
        `
        SELECT
          f.id,
          f.student_id,

          CONCAT(s.first_name,' ',s.last_name) AS student,
          s.student_photo,

          p.id AS parent_id,
          p.full_name AS parent,
          p.phone AS parent_phone,
          p.ghana_card_number,

          sc.name AS reported_by,
          f.amount_owed,
          f.currency,
          f.reason

        FROM flags f
        JOIN students s ON s.id = f.student_id
        JOIN parents p ON p.id = f.parent_id
        JOIN schools sc ON sc.id = f.reported_by_school_id

        WHERE
          f.status = 'FLAGGED'
          AND f.student_id IN (?)
        `,
        [studentIds]
      );

      // ======================
      // 3) PARENTS (UNIQUE CONTEXT)
      // ======================
      const parentsMap = new Map();

      students.forEach((s) => {
        if (s.parent_id) {
          parentsMap.set(s.parent_id, {
            id: s.parent_id,
            full_name: s.parent_name,
            phone: s.parent_phone,
            ghana_card_number: s.ghana_card_number,
          });
        }
      });

      flags.forEach((f) => {
        if (f.parent_id && !parentsMap.has(f.parent_id)) {
          parentsMap.set(f.parent_id, {
            id: f.parent_id,
            full_name: f.parent,
            phone: f.parent_phone,
            ghana_card_number: f.ghana_card_number,
          });
        }
      });

      const parents = Array.from(parentsMap.values());

      // ======================
      // 4) STATUS (STUDENT-FIRST)
      // FLAGGED if any matched student is flagged
      // ======================
      const status = flags.length > 0 ? "FLAGGED" : "CLEAR";

      return res.json({
        status,
        parents,
        students,
        flags,
      });
    } catch (err) {
      console.error("VERIFY LOOKUP ERROR:", err);
      return res.status(500).json({ message: "Registry lookup failed" });
    }
  });

  return router;
};
