const express = require("express");
const XLSX = require("xlsx");

module.exports = (pool, authMiddleware, upload) => {
  const router = express.Router();

  // ======================
  // parent import
  // ======================
  router.post(
    "/parents",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      let inserted = 0;
      let skipped = 0;

      for (const r of rows) {
        if (!r.full_name || !r.phone) {
          skipped++;
          continue;
        }

        const [exists] = await pool.query(
          "SELECT id FROM parents WHERE ghana_card_number = ?",
          [r.ghana_card_number]
        );

        if (exists.length) {
          skipped++;
          continue;
        }

        await pool.query(
          `
          INSERT INTO parents (full_name, phone, ghana_card_number, address)
          VALUES (?, ?, ?, ?)
          `,
          [r.full_name, r.phone, r.ghana_card_number || null, r.address || null]
        );

        inserted++;
      }

      res.json({ inserted, skipped });
    }
  );

  // ======================
  // student import 
  // ======================
  router.post(
    "/students",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      let inserted = 0;
      let skipped = 0;
      const rowErrors = [];

      const norm = (v) =>
        String(v || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "");

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        const first_name = String(r.first_name || "").trim();
        const last_name = String(r.last_name || "").trim();
        const date_of_birth = r.date_of_birth
          ? String(r.date_of_birth).slice(0, 10)
          : "";
        const gender = String(r.gender || "").trim();
        const schoolName = String(r.school || "").trim();
        const parentName = String(r.parent || "").trim();

        if (
          !first_name ||
          !last_name ||
          !date_of_birth ||
          !gender ||
          !schoolName ||
          !parentName
        ) {
          skipped++;
          rowErrors.push({
            row: i + 2,
            error:
              "Missing required fields (first_name, last_name, date_of_birth, gender, school, parent)",
          });
          continue;
        }

        if (gender !== "Male" && gender !== "Female") {
          skipped++;
          rowErrors.push({
            row: i + 2,
            error: "Invalid gender (must be Male or Female)",
            value: gender,
          });
          continue;
        }

        let school = null;
        {
          const [[s1]] = await pool.query(
            "SELECT id, name FROM schools WHERE name = ? LIMIT 1",
            [schoolName]
          );

          if (s1) school = s1;

          if (!school) {
            const [[s2]] = await pool.query(
              "SELECT id, name FROM schools WHERE LOWER(REPLACE(name,' ','')) = ? LIMIT 1",
              [norm(schoolName)]
            );
            if (s2) school = s2;
          }
        }

        if (!school) {
          skipped++;
          rowErrors.push({
            row: i + 2,
            error: "School not found in database (school must match schools.name)",
            value: schoolName,
          });
          continue;
        }

        let parent = null;
        {
          const [[p1]] = await pool.query(
            "SELECT id, full_name FROM parents WHERE full_name = ? LIMIT 1",
            [parentName]
          );

          if (p1) parent = p1;

          if (!parent) {
            const [[p2]] = await pool.query(
              "SELECT id, full_name FROM parents WHERE LOWER(REPLACE(full_name,' ','')) = ? LIMIT 1",
              [norm(parentName)]
            );
            if (p2) parent = p2;
          }
        }

        if (!parent) {
          skipped++;
          rowErrors.push({
            row: i + 2,
            error: "Parent not found in database (parent must match parents.full_name)",
            value: parentName,
          });
          continue;
        }

        const [dup] = await pool.query(
          `
          SELECT id FROM students
          WHERE LOWER(first_name) = LOWER(?)
            AND LOWER(last_name) = LOWER(?)
            AND date_of_birth = ?
          LIMIT 1
          `,
          [first_name, last_name, date_of_birth]
        );

        if (dup.length) {
          skipped++;
          rowErrors.push({
            row: i + 2,
            error:
              "Duplicate student (same first_name + last_name + date_of_birth already exists)",
          });
          continue;
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          const [studentResult] = await conn.query(
            `
            INSERT INTO students
            (first_name, last_name, date_of_birth, gender, current_school_id)
            VALUES (?, ?, ?, ?, ?)
            `,
            [first_name, last_name, date_of_birth, gender, school.id]
          );

          const studentId = studentResult.insertId;

          await conn.query(
            `
            INSERT INTO student_parents
            (student_id, parent_id, relationship)
            VALUES (?, ?, 'Guardian')
            `,
            [studentId, parent.id]
          );

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
          inserted++;
        } catch (err) {
          await conn.rollback();
          skipped++;
          rowErrors.push({
            row: i + 2,
            error: "Insert failed",
            details: err.message,
          });
        } finally {
          conn.release();
        }
      }

      res.json({ inserted, skipped, rowErrors });
    }
  );

  return router;
};
