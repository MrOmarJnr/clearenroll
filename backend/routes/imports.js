const express = require("express");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");

module.exports = (pool, authMiddleware, upload) => {
  const router = express.Router();

  router.post(
    "/students",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: "File required" });
      }

      const filePath = req.file.path;

      // SAME SCHOOL VALUE USED EVERYWHERE
      const currentSchoolId =
        req.user.school_id || req.user.schoolId || req.user.current_school_id;

      const reportedBySchoolId = currentSchoolId;

      if (!currentSchoolId) {
        return res.status(400).json({
          message: "School ID not found on logged-in user",
        });
      }

      let rows = [];

      try {
        // ================= CSV =================
        if (req.file.mimetype.includes("csv")) {
          await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
              .pipe(csv())
              .on("data", (data) => rows.push(data))
              .on("end", resolve)
              .on("error", reject);
          });
        }

        // ================= XLSX =================
        else if (req.file.mimetype.includes("sheet")) {
          const workbook = XLSX.readFile(filePath);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet);
        } else {
          return res.status(400).json({ message: "Invalid file type" });
        }

        let inserted = 0;
        let skipped = 0;
        const rowErrors = [];


                const formatDate = (dateStr) => {
          if (!dateStr) return null;

          const parts = dateStr.split('/');

          if (parts.length === 3) {
            const [month, day, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          return dateStr;
        };

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          const first_name = row.first_name?.trim();
          const last_name = row.last_name?.trim();
          const other_names = row.other_names || null;
          const date_of_birth = formatDate(row.date_of_birth);
          const gender = row.gender || "Male";
          const student_school_id = row.student_school_id || null;
          const leaving_class = row.leaving_class || null;

          const parent_full_name = row.parent_full_name?.trim();
          const parent_phone = row.parent_phone?.trim();
          const parent_ghana_card = row.parent_ghana_card || null;
          const parent_address = row.parent_address || null;

          const amount_owed = Number(row.amount_owed || 0);
          const currency = row.currency || "GHS";
          const reason = row.reason || null;

          if (
            !first_name ||
            !last_name ||
            !date_of_birth ||
            !gender ||
            !parent_full_name ||
            !parent_phone
          ) {
            skipped++;
            rowErrors.push({
              row: i + 2,
              error: "Missing required fields",
            });
            continue;
          }

          const conn = await pool.getConnection();

          try {
            await conn.beginTransaction();

            // ================= STUDENT =================
            const [studentResult] = await conn.query(
              `
              INSERT INTO students
              (
                first_name,
                last_name,
                other_names,
                date_of_birth,
                gender,
                current_school_id,
                student_school_id,
                leaving_class
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                first_name,
                last_name,
                other_names,
                date_of_birth,
                gender,
                currentSchoolId,
                student_school_id,
                leaving_class,
              ]
            );

            const studentId = studentResult.insertId;

            // ================= PARENT =================
            const [parentResult] = await conn.query(
              `
              INSERT INTO parents
              (
                full_name,
                phone,
                ghana_card_number,
                address
              )
              VALUES (?, ?, ?, ?)
              `,
              [
                parent_full_name,
                parent_phone,
                parent_ghana_card,
                parent_address,
              ]
            );

            const parentId = parentResult.insertId;

            // ================= LINK STUDENT + PARENT =================
            await conn.query(
              `
              INSERT INTO student_parents
              (
                student_id,
                parent_id,
                relationship
              )
              VALUES (?, ?, 'Guardian')
              `,
              [studentId, parentId]
            );

            // ================= FLAG =================
            if (amount_owed > 0) {
              await conn.query(
                `
                INSERT INTO flags
                (
                  student_id,
                  parent_id,
                  reported_by_school_id,
                  amount_owed,
                  currency,
                  reason,
                  status
                )
                VALUES (?, ?, ?, ?, ?, ?, 'FLAGGED')
                `,
                [
                  studentId,
                  parentId,
                  reportedBySchoolId,
                  amount_owed,
                  currency,
                  reason,
                ]
              );
            }

            await conn.commit();
            inserted++;
          } catch (err) {
            await conn.rollback();

            console.log("IMPORT ERROR ROW:", i + 2);
            console.log("ROW DATA:", row);
            console.log("ERROR:", err);

            skipped++;
            rowErrors.push({
              row: i + 2,
              error: err.message,
            });
          } finally {
            conn.release();
          }
        }

        fs.unlinkSync(filePath);

        return res.json({
          inserted,
          skipped,
          rowErrors,
        });
      } catch (err) {
        console.error("IMPORT ERROR:", err);

        return res.status(500).json({
          message: "Student import failed",
        });
      }
    }
  );

  return router;
};