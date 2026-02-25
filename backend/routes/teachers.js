const express = require("express");
const { z } = require("zod");
const fs = require("fs");
const path = require("path");

module.exports = (pool, authMiddleware, upload) => {
  const router = express.Router();

  /* ==========================================
     HELPERS: FILE DELETE (safe)
  ========================================== */

  const safeUnlink = async (filePath) => {
    try {
      if (!filePath) return;

      // if stored as absolute disk path, use directly
      // if stored as relative, resolve it from project root
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      if (fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch (e) {
      // do not crash request if file deletion fails
      console.warn("FILE DELETE WARNING:", e?.message || e);
    }
  };

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

    // NOTE: reason optional but DB may require NOT NULL
    reason: z.string().optional(),

    status: z.enum(["ENGAGED", "FLAGGED", "CLEARED"]).optional(),
    ghana_card_number: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  });

  // Update schema (partial)
  const teacherUpdateSchema = z.object({
    first_name: z.string().min(2).optional(),
    last_name: z.string().min(2).optional(),
    other_names: z.string().optional(),
    date_of_birth: z.string().min(8).optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    current_school_id: z.union([z.string(), z.number()]).optional(),
    qualification: z.string().optional(),
    employment_year: z.string().optional(),
    reason: z.string().optional(),
    status: z.enum(["ENGAGED", "FLAGGED", "CLEARED"]).optional(),
    ghana_card_number: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  });

  /* ==========================================
     LIST TEACHERS
     - keep your existing school restriction logic
     - LEFT JOIN so CLEARED teachers (school_id NULL) don't disappear
  ========================================== */

  router.get("/", authMiddleware, async (req, res) => {
    const { role, school_id } = req.user;

    let sql = `
      SELECT t.*, sch.name AS school
      FROM school_teachers t
      LEFT JOIN schools sch ON sch.id = t.current_school_id
    `;

    const params = [];

    // keep your existing logic:
    // school admin only sees teachers currently engaged/flagged in their school.
    if (role === "SCHOOL_ADMIN") {
      sql += " WHERE t.current_school_id = ?";
      params.push(school_id);
    }

    sql += " ORDER BY t.created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json({ teachers: rows });
  });

  /* ==========================================
     CREATE TEACHER (PHOTO + MULTIPLE EVIDENCE)
     (keeps your structure)
  ========================================== */

  router.post(
    "/",
    authMiddleware,
    upload.fields([
      { name: "teacher_photo", maxCount: 1 },
      { name: "evidence_files[]", maxCount: 10 },
    ]),
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
        status: req.body.status || "ENGAGED",
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

      const teacherPhotoFilename =
        req.files?.teacher_photo?.[0]?.filename || null;

      const evidenceFiles = req.files?.["evidence_files[]"] || [];

      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        // ✅ DB safety: if ENGAGED and reason missing, set empty string (avoid NOT NULL error)
        const safeReason =
          (status || "ENGAGED") === "ENGAGED"
            ? String(reason || "")
            : String(reason || "");

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
            safeReason, // <-- avoid NULL
            status || "ENGAGED",
            ghana_card_number || null,
            address || null,
            phone || null,
          ]
        );

        const teacherId = result.insertId;

        // Evidence records
        for (const file of evidenceFiles) {
          await conn.query(
            `
            INSERT INTO teacher_evidence
            (teacher_id, file_name, file_path)
            VALUES (?, ?, ?)
            `,
          [teacherId, file.originalname, `uploads/teachers/${file.filename}`]
          );
        }

        await conn.commit();

        res.status(201).json({
          status: "CREATED",
          teacher_id: teacherId,
          evidence_uploaded: evidenceFiles.length,
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


   router.get("/:id/evidence/:evidenceId/download", authMiddleware, async (req, res) => {
  const teacherId = Number(req.params.id);
  const evidenceId = Number(req.params.evidenceId);

  if (!Number.isInteger(teacherId) || !Number.isInteger(evidenceId)) {
    return res.status(400).json({ message: "Invalid IDs" });
  }

  try {
    const [[ev]] = await pool.query(
      `
      SELECT file_name, file_path
      FROM teacher_evidence
      WHERE id=? AND teacher_id=?
      `,
      [evidenceId, teacherId]
    );

    if (!ev) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    const fileFullPath = path.join(process.cwd(), ev.file_path);

    if (!fs.existsSync(fileFullPath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    return res.download(fileFullPath, ev.file_name);

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    return res.status(500).json({ message: "Download failed" });
  }
});
  /* ==========================================
     GET SINGLE TEACHER + EVIDENCE
     ✅ Needed for Edit page
     - keep school restriction logic
  ========================================== */

  router.get("/:id", authMiddleware, async (req, res) => {
    const teacherId = Number(req.params.id);
    if (!Number.isInteger(teacherId)) {
      return res.status(400).json({ message: "Invalid teacher ID" });
    }

    const { role, school_id } = req.user;

    try {
      const [[teacher]] = await pool.query(
        `
        SELECT t.*, sch.name AS school
        FROM school_teachers t
        LEFT JOIN schools sch ON sch.id = t.current_school_id
        WHERE t.id = ?
        LIMIT 1
        `,
        [teacherId]
      );

      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      // SCHOOL_ADMIN can only view teachers from their school
    if (
          role === "SCHOOL_ADMIN" &&
          teacher.current_school_id !== null &&
          Number(teacher.current_school_id) !== Number(school_id)
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }

      const [evidence] = await pool.query(
        `
        SELECT id, teacher_id, file_name, file_path, uploaded_at
        FROM teacher_evidence
        WHERE teacher_id = ?
        ORDER BY uploaded_at DESC
        `,
        [teacherId]
      );

      res.json({ teacher, evidence });
    } catch (err) {
      console.error("GET TEACHER ERROR:", err);
      res.status(500).json({ message: "Failed to load teacher" });
    }
  });

  /* ==========================================
     UPDATE TEACHER (EDIT PAGE)
     - optional teacher_photo
     - optional add more evidence_files[]
     - keeps school restriction logic
  ========================================== */

  router.put(
    "/:id",
    authMiddleware,
    upload.fields([
      { name: "teacher_photo", maxCount: 1 },
      { name: "evidence_files[]", maxCount: 10 },
    ]),
    async (req, res) => {
      const teacherId = Number(req.params.id);
      if (!Number.isInteger(teacherId)) {
        return res.status(400).json({ message: "Invalid teacher ID" });
      }

      const { role, school_id } = req.user;

      // parse (partial)
      const parsed = teacherUpdateSchema.safeParse({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        other_names: req.body.other_names,
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        current_school_id: req.body.current_school_id,
        qualification: req.body.qualification,
        employment_year: req.body.employment_year,
        reason: req.body.reason,
        status: req.body.status,
        ghana_card_number: req.body.ghana_card_number,
        address: req.body.address,
        phone: req.body.phone,
      });

      if (!parsed.success) {
        return res.status(400).json(parsed.error.flatten());
      }

      const teacherPhotoFilename =
        req.files?.teacher_photo?.[0]?.filename || null;

      const evidenceFiles = req.files?.["evidence_files[]"] || [];

      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query(
          `SELECT id, current_school_id, teacher_photo FROM school_teachers WHERE id=?`,
          [teacherId]
        );

        if (!existing) {
          return res.status(404).json({ message: "Teacher not found" });
        }

        if (
          role !== "SUPER_ADMIN" &&
          Number(existing.current_school_id) !== Number(school_id)
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }

        // Build update values - keep simple & safe
        const d = parsed.data;

        // DB safety for NOT NULL reason
        const safeReason =
          typeof d.reason === "string" ? d.reason : undefined;

        await conn.query(
          `
          UPDATE school_teachers SET
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            other_names = COALESCE(?, other_names),
            date_of_birth = COALESCE(?, date_of_birth),
            gender = COALESCE(?, gender),
            current_school_id = COALESCE(?, current_school_id),
            qualification = COALESCE(?, qualification),
            employment_year = COALESCE(?, employment_year),
            reason = COALESCE(?, reason),
            status = COALESCE(?, status),
            ghana_card_number = COALESCE(?, ghana_card_number),
            address = COALESCE(?, address),
            phone = COALESCE(?, phone),
            teacher_photo = COALESCE(?, teacher_photo)
          WHERE id = ?
          `,
          [
            d.first_name ?? null,
            d.last_name ?? null,
            d.other_names ?? null,
            d.date_of_birth ?? null,
            d.gender ?? null,
            d.current_school_id ?? null,
            d.qualification ?? null,
            d.employment_year ?? null,
            safeReason ?? null,
            d.status ?? null,
            d.ghana_card_number ?? null,
            d.address ?? null,
            d.phone ?? null,
            teacherPhotoFilename,
            teacherId,
          ]
        );

        // Add new evidence (do NOT wipe old)
        for (const file of evidenceFiles) {
          await conn.query(
            `
            INSERT INTO teacher_evidence (teacher_id, file_name, file_path)
            VALUES (?, ?, ?)
            `,
           [teacherId, file.originalname, `uploads/teachers/${file.filename}`]
          );
        }

        await conn.commit();

        res.json({
          message: "Teacher updated",
          added_evidence: evidenceFiles.length,
        });
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
     DELETE ONE EVIDENCE FILE (optional but useful for edit)
     - removes db row + deletes file from disk
  ========================================== */

  router.delete("/:id/evidence/:evidenceId", authMiddleware, async (req, res) => {
    const teacherId = Number(req.params.id);
    const evidenceId = Number(req.params.evidenceId);
    if (!Number.isInteger(teacherId) || !Number.isInteger(evidenceId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const { role, school_id } = req.user;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [[teacher]] = await conn.query(
        `SELECT id, current_school_id FROM school_teachers WHERE id=?`,
        [teacherId]
      );

      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (
        role !== "SUPER_ADMIN" &&
        Number(teacher.current_school_id) !== Number(school_id)
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const [[ev]] = await conn.query(
        `SELECT id, file_path FROM teacher_evidence WHERE id=? AND teacher_id=?`,
        [evidenceId, teacherId]
      );

      if (!ev) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      await conn.query(`DELETE FROM teacher_evidence WHERE id=?`, [evidenceId]);

      await conn.commit();

      // delete file after commit
      await safeUnlink(ev.file_path);

      res.json({ message: "Evidence deleted" });
    } catch (err) {
      await conn.rollback();
      console.error("DELETE EVIDENCE ERROR:", err);
      res.status(500).json({ message: "Failed to delete evidence" });
    } finally {
      conn.release();
    }
  });

  /* ==========================================
     FLAG TEACHER
     - reason + optional evidence
     - keeps your permission logic
  ========================================== */

  router.patch(
    "/:id/flag",
    authMiddleware,
    upload.array("evidence_files[]", 10),
    async (req, res) => {
      const teacherId = Number(req.params.id);
      const { role, school_id } = req.user;
      const { reason } = req.body;

      if (!Number.isInteger(teacherId)) {
        return res.status(400).json({ message: "Invalid teacher ID" });
      }

      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const [[teacher]] = await conn.query(
          `SELECT id, current_school_id FROM school_teachers WHERE id = ?`,
          [teacherId]
        );

        if (!teacher) {
          return res.status(404).json({ message: "Teacher not found" });
        }

        if (
          role !== "SUPER_ADMIN" &&
          Number(teacher.current_school_id) !== Number(school_id)
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }

        await conn.query(
          `UPDATE school_teachers
           SET status='FLAGGED', reason=?
           WHERE id=?`,
          [String(reason || "Misconduct"), teacherId]
        );

        const evidenceFiles = req.files || [];

        for (const file of evidenceFiles) {
          await conn.query(
            `INSERT INTO teacher_evidence (teacher_id, file_name, file_path)
             VALUES (?, ?, ?)`,
            [teacherId, file.originalname, `uploads/teachers/${file.filename}`]
          );
        }

        await conn.commit();

        res.json({
          message: "Teacher flagged successfully",
          evidence_uploaded: evidenceFiles.length,
        });
      } catch (err) {
        await conn.rollback();
        console.error("FLAG TEACHER ERROR:", err);
        res.status(500).json({ message: "Failed to flag teacher" });
      } finally {
        conn.release();
      }
    }
  );

  /* ==========================================
     CLEAR TEACHER
     - status= CLEARED
     - current_school_id = NULL
     - reason = "" (safer than NULL for NOT NULL columns)
     - delete evidence rows + delete evidence files
  ========================================== */

  router.patch("/:id/clear", authMiddleware, async (req, res) => {
    const teacherId = Number(req.params.id);
    const { role, school_id } = req.user;

    if (!Number.isInteger(teacherId)) {
      return res.status(400).json({ message: "Invalid teacher ID" });
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [[teacher]] = await conn.query(
        `SELECT id, current_school_id FROM school_teachers WHERE id = ?`,
        [teacherId]
      );

      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (
        role !== "SUPER_ADMIN" &&
        Number(teacher.current_school_id) !== Number(school_id)
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // get evidence file paths before deleting rows
      const [evidence] = await conn.query(
        `SELECT file_path FROM teacher_evidence WHERE teacher_id=?`,
        [teacherId]
      );

      await conn.query(
        `UPDATE school_teachers
         SET status='CLEARED',
             current_school_id=NULL,
             reason=''
         WHERE id=?`,
        [teacherId]
      );

      await conn.query(`DELETE FROM teacher_evidence WHERE teacher_id=?`, [
        teacherId,
      ]);

      await conn.commit();

      // delete evidence files after commit
      for (const ev of evidence) {
        await safeUnlink(ev.file_path);
      }

      res.json({ message: "Teacher cleared successfully" });
    } catch (err) {
      await conn.rollback();
      console.error("CLEAR TEACHER ERROR:", err);
      res.status(500).json({ message: "Failed to clear teacher" });
    } finally {
      conn.release();
    }
  });

  /* ==========================================
     DELETE TEACHER
     - deletes evidence rows + deletes evidence files
     - optionally delete teacher_photo file too
  ========================================== */

  router.delete("/:id", authMiddleware, async (req, res) => {
    const teacherId = Number(req.params.id);
    if (!Number.isInteger(teacherId)) {
      return res.status(400).json({ message: "Invalid teacher ID" });
    }

    const { role, school_id } = req.user;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [[teacher]] = await conn.query(
        `SELECT id, current_school_id, teacher_photo FROM school_teachers WHERE id=?`,
        [teacherId]
      );

      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (
        role !== "SUPER_ADMIN" &&
        Number(teacher.current_school_id) !== Number(school_id)
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const [evidence] = await conn.query(
        `SELECT file_path FROM teacher_evidence WHERE teacher_id=?`,
        [teacherId]
      );

      await conn.query(`DELETE FROM teacher_evidence WHERE teacher_id=?`, [
        teacherId,
      ]);

      await conn.query(`DELETE FROM school_teachers WHERE id=?`, [teacherId]);

      await conn.commit();

      // delete evidence files
      for (const ev of evidence) {
        await safeUnlink(ev.file_path);
      }

      // delete teacher photo file (if you want)
      // your teacher_photo stores only filename, so reconstruct typical uploads path:
      if (teacher.teacher_photo) {
        const photoPath = path.join(
          process.cwd(),
          "uploads",
          "teachers",
          teacher.teacher_photo
        );
        await safeUnlink(photoPath);
      }

      res.json({ message: "Teacher deleted" });
    } catch (err) {
      await conn.rollback();
      console.error("DELETE TEACHER ERROR:", err);
      res.status(500).json({ message: "Failed to delete teacher" });
    } finally {
      conn.release();
    }
  });



  return router;
};