const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
    
      // COUNTS 

      const [[schools]] = await pool.query(
        "SELECT COUNT(*) AS total FROM schools"
      );
      const [[parents]] = await pool.query(
        "SELECT COUNT(*) AS total FROM parents"
      );
      const [[students]] = await pool.query(
        "SELECT COUNT(*) AS total FROM students"
      );
      const [[flagged]] = await pool.query(
        "SELECT COUNT(*) AS total FROM flags WHERE status = 'FLAGGED'"
      );
      const [[pendingDuplicates]] = await pool.query(
        "SELECT COUNT(*) AS total FROM school_teachers"
      );


      // RECENT FLAGS

      const [recentFlags] = await pool.query(`
        SELECT 
          f.id,
          CONCAT(s.first_name,' ',s.last_name) AS student,
          p.full_name AS parent,
          sc.name AS reported_by,
          f.amount_owed,
          f.currency,
          f.status
        FROM flags f
        JOIN students s ON s.id = f.student_id
        LEFT JOIN parents p ON p.id = f.parent_id
        JOIN schools sc ON sc.id = f.reported_by_school_id
        ORDER BY f.created_at DESC
        LIMIT 5
      `);

    
      // MY FLAG ACTIVITY 
      
      let myFlagActivityQuery = `
        SELECT
          CONCAT(s.first_name,' ',s.last_name) AS student,
          p.full_name AS parent,
          sc.name AS school,
          f.amount_owed,
          f.currency,
          f.status,
          CASE
            WHEN f.created_by_user_id = ? THEN 'CREATED'
            WHEN f.cleared_by_user_id = ? THEN 'CLEARED'
            WHEN f.created_by_user_id IS NULL THEN 'CREATED'
          END AS my_action
        FROM flags f
        JOIN students s ON s.id = f.student_id
        LEFT JOIN parents p ON p.id = f.parent_id
        JOIN schools sc ON sc.id = f.reported_by_school_id
        WHERE
          (
            f.created_by_user_id = ?
            OR f.cleared_by_user_id = ?
      `;

      const params = [
        req.user.userId,
        req.user.userId,
        req.user.userId,
        req.user.userId,
      ];

      //  Include legacy / school-created flags
      if (req.user.role === "SCHOOL_ADMIN") {
        myFlagActivityQuery += `
          OR (
            f.created_by_user_id IS NULL
            AND f.reported_by_school_id = ?
          )
        `;
        params.push(req.user.school_id);
      }

      myFlagActivityQuery += `
        )
        ORDER BY f.updated_at DESC
      `;

      const [myFlagActivity] = await pool.query(
        myFlagActivityQuery,
        params
      );
      res.json({
        cards: {
          schools: schools.total,
          parents: parents.total,
          students: students.total,
          flagged: flagged.total,
          pendingDuplicates: pendingDuplicates.total,
        },
        recentFlags,
        myFlagActivity,
      });
    } catch (err) {
      console.error("DASHBOARD ERROR:", err);
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  return router;
};