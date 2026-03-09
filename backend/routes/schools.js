const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  // GET /api/schools
  router.get("/", authMiddleware, async (req, res) => {
    const [rows] = await pool.query(`
      SELECT id, name, location, is_verified, created_at
      FROM schools
      ORDER BY created_at DESC
    `);
    res.json({ schools: rows });
  });


  router.post("/", authMiddleware, async (req, res) => {
    try {
      const name = (req.body?.name || "").trim();
      if (!name) return res.status(400).json({ message: "School name is required" });

 
      const [existing] = await pool.query(`SELECT id FROM schools WHERE name = ? LIMIT 1`, [name]);
      if (existing.length) return res.status(409).json({ message: "School already exists" });

      const [result] = await pool.query(
        `INSERT INTO schools (name, created_at) VALUES (?, NOW())`,
        [name]
      );

      res.status(201).json({ id: result.insertId, name });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to add school" });
    }
  });

  return router;
};