const express = require("express");
const { z } = require("zod");

module.exports = (pool, authMiddleware, upload) => {
  const router = express.Router();


 
  const studentCreateSchema = z.object({
    first_name: z.string().min(2),
    last_name: z.string().min(2),
    other_names: z.string().optional(),
    date_of_birth: z.string().min(8),
    gender: z.enum(["Male", "Female"]),
    current_school_id: z.union([z.string(), z.number()]),
    leaving_class: z.string().min(1),
    student_school_id: z.string().optional(),
  });

  // list only my school for SCHOOL_ADMIN
  router.get("/", authMiddleware, async (req, res) => {
    const { role, school_id } = req.user;

    let sql = `
      SELECT 
        s.id,
        si.identifier_value AS student_identifier,
        CONCAT(s.first_name,' ',s.last_name) AS name,
        s.date_of_birth,
        s.gender,

        s.current_school_id AS school_id,
        sp.parent_id,

        sch.name AS school,
        p.full_name AS parent,

        s.student_school_id,
        s.leaving_class,
        s.student_photo,

        --  NEW: provide latest active FLAGGED info for Students page "Clear"
        (
          SELECT f.id
          FROM flags f
          WHERE f.student_id = s.id AND f.status = 'FLAGGED'
          ORDER BY f.created_at DESC
          LIMIT 1
        ) AS active_flag_id,

       (
          SELECT f.reported_by_school_id
          FROM flags f
          WHERE f.student_id = s.id AND f.status = 'FLAGGED'
          ORDER BY f.created_at DESC
          LIMIT 1
        ) AS reported_by_school_id

      FROM students s
      JOIN schools sch ON sch.id = s.current_school_id

      LEFT JOIN student_parents sp ON sp.student_id = s.id
      LEFT JOIN parents p ON p.id = sp.parent_id

      LEFT JOIN student_identifiers si
        ON si.student_id = s.id AND si.is_primary = true
    `;

    const params = [];

    //  Show records for only my SCHOOL_ADMIN for only their school
    if (role === "SCHOOL_ADMIN") {
      sql += " WHERE s.current_school_id = ?";
      params.push(school_id);
    }

    sql += " ORDER BY s.created_at DESC";

    const [rows] = await pool.query(sql, params);

    res.json({ students: rows });
  });

  // create (multipart/form-data + photo)
  router.post(
    "/",
    authMiddleware,
    upload.single("student_photo"),
    async (req, res) => {
      const parsed = studentCreateSchema.safeParse({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        other_names: req.body.other_names || "",
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        current_school_id: req.body.current_school_id,
        leaving_class: req.body.leaving_class,
        student_school_id: req.body.student_school_id || "",
      });

      if (!parsed.success) {
        return res.status(400).json(parsed.error.flatten());
      }

      const {
        first_name,
        last_name,
        other_names,
        date_of_birth,
        gender,
        current_school_id,
        leaving_class,
        student_school_id,
      } = parsed.data;

      const schoolIdNum = Number(current_school_id);

      const studentPhotoFilename = req.file ? req.file.filename : null;

      // DUPLICATE CHECK

      const [matches] = await pool.query(
        `
        SELECT
          s.id,
          s.first_name,
          s.last_name,
          s.date_of_birth,
          sch.name AS school,
          si.identifier_value AS student_identifier
        FROM students s
        JOIN schools sch ON sch.id = s.current_school_id
        LEFT JOIN student_identifiers si
          ON si.student_id = s.id AND si.is_primary = true
        WHERE
          LOWER(s.first_name) = LOWER(?)
          AND LOWER(s.last_name) = LOWER(?)
          AND s.date_of_birth = ?
        `,
        [first_name, last_name, date_of_birth]
      );

      if (matches.length > 0) {
        console.log("DUPLICATE DETECTED — WILL CREATE REVIEW");

        try {
          const [insertResult] = await pool.query(
            `
            INSERT INTO duplicate_reviews
              (existing_student_id, attempted_student_snapshot)
            VALUES (?, ?)
            `,
            [
              matches[0].id,
              JSON.stringify({
                first_name,
                last_name,
                other_names,
                date_of_birth,
                gender,
                current_school_id: schoolIdNum,
                leaving_class,
                student_school_id,
                student_photo: studentPhotoFilename,
              }),
            ]
          );

          console.log(" DUPLICATE REVIEW INSERTED:", insertResult);
        } catch (err) {
          console.error(" DUPLICATE REVIEW INSERT FAILED:", err);
        }

        return res.status(409).json({
          status: "POSSIBLE_DUPLICATE",
          message: "Possible existing student found. Admin review required.",
        });
      }

  
      //  CREATE STUDENT 
    
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const [studentResult] = await conn.query(
          `
          INSERT INTO students
          (first_name, last_name, other_names, date_of_birth, gender, current_school_id,
           student_school_id, leaving_class, student_photo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            first_name,
            last_name,
            other_names || null,
            date_of_birth,
            gender,
            schoolIdNum,
            student_school_id || null,
            leaving_class || null,
            studentPhotoFilename,
          ]
        );

        const studentId = studentResult.insertId;

        const systemStudentId = `STD-${studentId}`;

        await conn.query(
          `
          INSERT INTO student_identifiers
          (student_id, identifier_type, identifier_value, is_primary)
          VALUES (?, 'SYSTEM_STUDENT_ID', ?, true)
          `,
          [studentId, systemStudentId]
        );

        await conn.commit();

        res.status(201).json({
          status: "CREATED",
          student_id: studentId,
          system_student_id: systemStudentId,
        });
      } catch (err) {
        await conn.rollback();
        console.error("CREATE STUDENT ERROR:", err);
        res.status(500).json({ message: "Failed to create student" });
      } finally {
        conn.release();
      }
    }
  );

  // assign guardian
  router.patch("/:id/assign-parent", authMiddleware, async (req, res) => {
    const { parent_id } = req.body;

    if (!parent_id) {
      return res.status(400).json({ message: "parent_id is required" });
    }

    const studentId = Number(req.params.id);
    const parentId = Number(parent_id);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query(
        "SELECT parent_id FROM student_parents WHERE student_id = ? LIMIT 1",
        [studentId]
      );

      if (existing.length) {
        await conn.query(
          `
          UPDATE student_parents
          SET parent_id = ?
          WHERE student_id = ?
          `,
          [parentId, studentId]
        );
      } else {
        await conn.query(
          `
          INSERT INTO student_parents (student_id, parent_id, relationship)
          VALUES (?, ?, 'Guardian')
          `,
          [studentId, parentId]
        );
      }

      await conn.commit();
      res.json({ message: "Guardian linked to student" });
    } catch (err) {
      await conn.rollback();
      console.error("ASSIGN GUARDIAN ERROR:", err);
      res.status(500).json({ message: "Failed to link guardian" });
    } finally {
      conn.release();
    }
  });

  // get single
  router.get("/:id", authMiddleware, async (req, res) => {
    const [rows] = await pool.query(
      `
      SELECT
        s.*,
        sp.parent_id
      FROM students s
      LEFT JOIN student_parents sp
        ON sp.student_id = s.id
      WHERE s.id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ student: rows[0] });
  });

  // update
 router.put(
  "/:id",
  authMiddleware,
  upload.single("student_photo"), 
  async (req, res) => {
    const {
      first_name,
      last_name,
      other_names,
      date_of_birth,
      gender,
      current_school_id,
      parent_id,
      student_school_id,
      leaving_class,
    } = req.body || {};

    const studentPhotoFilename = req.file ? req.file.filename : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `
        UPDATE students SET
          first_name=?,
          last_name=?,
          other_names=?,
          date_of_birth=?,
          gender=?,
          current_school_id=?,
          student_school_id=?,
          leaving_class=?,
          student_photo = COALESCE(?, student_photo)
        WHERE id=?
        `,
        [
          first_name,
          last_name,
          other_names || null,
          date_of_birth,
          gender,
          current_school_id,
          student_school_id || null,
          leaving_class || null,
          studentPhotoFilename, // ✅ only updates if new photo
          req.params.id,
        ]
      );

      // 🔁 KEEP YOUR PARENT LOGIC EXACTLY
      if (parent_id) {
        const [existing] = await conn.query(
          "SELECT id FROM student_parents WHERE student_id = ? LIMIT 1",
          [req.params.id]
        );

        if (existing.length) {
          await conn.query(
            `
            UPDATE student_parents
            SET parent_id=?
            WHERE student_id=?
            `,
            [parent_id, req.params.id]
          );
        } else {
          await conn.query(
            `
            INSERT INTO student_parents (student_id, parent_id, relationship)
            VALUES (?, ?, 'Guardian')
            `,
            [req.params.id, parent_id]
          );
        }
      }

      await conn.commit();
      res.json({ message: "Student updated" });
    } catch (err) {
      await conn.rollback();
      console.error("UPDATE STUDENT ERROR:", err);
      res.status(500).json({ message: "Failed to update student" });
    } finally {
      conn.release();
    }
  }
);


  // delete
  router.delete("/:id", authMiddleware, async (req, res) => {
    await pool.query("DELETE FROM students WHERE id = ?", [req.params.id]);
    res.json({ message: "Student deleted" });
  });

  return router;
};
