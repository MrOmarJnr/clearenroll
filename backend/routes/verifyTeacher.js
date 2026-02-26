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
    // =============================
    //  FETCH TEACHERS
    // =============================
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
        sc.name AS school,
        sc.id AS school_id
      FROM school_teachers t
      JOIN schools sc ON sc.id = t.current_school_id
      WHERE
        CONCAT(t.first_name,' ',t.last_name) LIKE ?
        OR t.phone = ?
        OR t.ghana_card_number = ?
      ORDER BY t.id DESC
      `,
      [`%${query}%`, query, query]
    );

    if (!teachers.length) {
      return res.json({
        status: "NOT_FOUND",
        teachers: [],
      });
    }

    // =============================
    // FETCH EVIDENCE
    // =============================
    const teacherIds = teachers.map(t => t.id);

    const [evidenceRows] = await pool.query(
      `
      SELECT id, teacher_id, file_name, file_path
      FROM teacher_evidence
      WHERE teacher_id IN (?)
      `,
      [teacherIds]
    );

    // =============================
    //  GROUP EVIDENCE PER TEACHER
    // =============================
    const evidenceMap = {};

    evidenceRows.forEach(ev => {
      if (!evidenceMap[ev.teacher_id]) {
        evidenceMap[ev.teacher_id] = [];
      }
      evidenceMap[ev.teacher_id].push(ev);
    });

    // Attach evidence
    teachers.forEach(t => {
      t.evidence = evidenceMap[t.id] || [];
    });

    // =============================
    //  SUMMARY LOGIC
    // =============================
    const flaggedCount = teachers.filter(t => t.status === "FLAGGED").length;
    const engagedCount = teachers.filter(t => t.status === "ENGAGED").length;

    let registryStatus = "ENGAGED";
    if (flaggedCount > 0) {
      registryStatus = "FLAGGED";
    }

    return res.json({
      status: registryStatus,
      summary: {
        engaged: engagedCount,
        flagged: flaggedCount,
      },
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