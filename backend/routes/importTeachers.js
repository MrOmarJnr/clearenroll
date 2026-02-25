const express = require("express");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");

module.exports = (pool, authMiddleware, upload) => {
  const router = express.Router();

  router.post(
    "/",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: "File required" });
      }

      const filePath = req.file.path;
      const userSchoolId = req.user.school_id;

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
        }

        else {
          return res.status(400).json({ message: "Invalid file type" });
        }

        let inserted = 0;
        let skipped = 0;

        for (const row of rows) {
          if (!row.first_name || !row.last_name) {
            skipped++;
            continue;
          }

          await pool.query(
            `
            INSERT INTO school_teachers
            (
              first_name,
              last_name,
              other_names,
              date_of_birth,
              gender,
              phone,
              ghana_card_number,
              qualification,
              address,
              current_school_id,
              status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              row.first_name,
              row.last_name,
              row.other_names || null,
              row.date_of_birth,
              row.gender || "Male",
              row.phone || null,
              row.ghana_card_number || null,
              row.qualification || null,
              row.address || null,
              userSchoolId,
              "ENGAGED",
            ]
          );

          inserted++;
        }

        fs.unlinkSync(filePath);

        return res.json({
          inserted,
          skipped,
        });

      } catch (err) {
        console.error("IMPORT TEACHERS ERROR:", err);
        return res.status(500).json({
          message: "Teacher import failed",
        });
      }
    }
  );

  return router;
};