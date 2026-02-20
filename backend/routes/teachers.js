const express = require("express");
const { z } = require("zod");

module.exports = (pool, authMiddleware, upload) => {
  const router = express.Router();

  /* ==========================================
     VALIDATION SCHEMA
  ========================================== */

  const teacherCreateSchema = z.object({
    first_name: z.string().min(2),
    last_name: z.string().min(2),
    other_names: z.string().optional(),
    date_of_birth: z.string().min(8),
    gender: z.enum(["Male", "Female"]),
    current_school_id: z.union([z.string(), z.number()]),
    qualification: z.string().optional(),
    employment_year: z.string().optional(),
    reason: z.string().optional(),
    status: z.string().optional(),
    ghana_card_number: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  });

  /* ==========================================
     LIST TEACHERS
     SCHOOL_ADMIN → Only their school
  ========================================== */

  router.get("/", authMiddleware, async (req, res) => {
    const { role, school_id } = req.user;

    let sql = `
      SELECT
        t.*,
        sch.name AS school
      FROM school_teachers t
      JOIN schools sch ON sch.id = t.current_school_id
    `;

    const params = [];

    if (role === "SCHOOL_ADMIN") {
      sql += " WHERE t.current_school_id = ?";
      params.push(school_id);
    }

    sql += " ORDER BY t.created_at DESC";

    const [rows] = await pool.query(sql, params);

    res.json({ teachers: rows });
  });

  /* ==========================================
     CREATE TEACHER (with photo upload)
  ========================================== */

  router.post(
    "/",
    authMiddleware,
    upload.single("teacher_photo"),
    async (req, res) => {
      const parsed = teacherCreateSchema.safeParse({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        other_names: req.body.other_names || "",
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        current_school_id: req.body.current_school_id,
        qualification: req.body.qualification || "",
        employment_year: req.body.employment_year || "",
        reason: req.body.reason || "",
        status: req.body.status || "ACTIVE",
        ghana_card_number: req.body.ghana_card_number || "",
        address: req.body.address || "",
        phone: req.body.phone || "",
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
        qualification,
        employment_year,
        reason,
        status,
        ghana_card_number,
        address,
        phone,
      } = parsed.data;

      const schoolIdNum = Number(current_school_id);
      const teacherPhotoFilename = req.file ? req.file.filename : null;

      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const [result] = await conn.query(
          `
          INSERT INTO school_teachers
          (
            first_name,
            last_name,
            other_names,
            date_of_birth,
            gender,
            current_school_id,
            qualification,
            teacher_photo,
            employment_year,
            reason,
            status,
            ghana_card_number,
            address,
            phone
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            first_name,
            last_name,
            other_names || null,
            date_of_birth,
            gender,
            schoolIdNum,
            qualification || null,
            teacherPhotoFilename,
            employment_year || null,
            reason || null,
            status || "ACTIVE",
            ghana_card_number || null,
            address || null,
            phone || null,
          ]
        );

        await conn.commit();

        res.status(201).json({
          status: "CREATED",
          teacher_id: result.insertId,
        });
      } catch (err) {
        await conn.rollback();
        console.error("CREATE TEACHER ERROR:", err);
        res.status(500).json({ message: "Failed to create teacher" });
      } finally {
        conn.release();
      }
    }
  );

  /* ==========================================
     GET SINGLE TEACHER
  ========================================== */

  router.get("/:id", authMiddleware, async (req, res) => {
    const [rows] = await pool.query(
      `
      SELECT t.*, sch.name AS school
      FROM school_teachers t
      JOIN schools sch ON sch.id = t.current_school_id
      WHERE t.id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ teacher: rows[0] });
  });

  /* ==========================================
     UPDATE TEACHER
  ========================================== */

  router.put(
    "/:id",
    authMiddleware,
    upload.single("teacher_photo"),
    async (req, res) => {
      const {
        first_name,
        last_name,
        other_names,
        date_of_birth,
        gender,
        current_school_id,
        qualification,
        employment_year,
        reason,
        status,
        ghana_card_number,
        address,
        phone,
      } = req.body || {};

      const teacherPhotoFilename = req.file ? req.file.filename : null;

      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        await conn.query(
          `
          UPDATE school_teachers SET
            first_name=?,
            last_name=?,
            other_names=?,
            date_of_birth=?,
            gender=?,
            current_school_id=?,
            qualification=?,
            employment_year=?,
            reason=?,
            status=?,
            ghana_card_number=?,
            address=?,
            phone=?,
            teacher_photo = COALESCE(?, teacher_photo)
          WHERE id=?
          `,
          [
            first_name,
            last_name,
            other_names || null,
            date_of_birth,
            gender,
            current_school_id,
            qualification || null,
            employment_year || null,
            reason || null,
            status || "ACTIVE",
            ghana_card_number || null,
            address || null,
            phone || null,
            teacherPhotoFilename,
            req.params.id,
          ]
        );

        await conn.commit();
        res.json({ message: "Teacher updated" });
      } catch (err) {
        await conn.rollback();
        console.error("UPDATE TEACHER ERROR:", err);
        res.status(500).json({ message: "Failed to update teacher" });
      } finally {
        conn.release();
      }
    }
  );

  /* ==========================================
     DELETE TEACHER
  ========================================== */

  router.delete("/:id", authMiddleware, async (req, res) => {
    await pool.query("DELETE FROM school_teachers WHERE id = ?", [
      req.params.id,
    ]);

    res.json({ message: "Teacher deleted" });
  });

  return router;
};