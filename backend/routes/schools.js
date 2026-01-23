const express = require("express");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    const [rows] = await pool.query(`
      SELECT id, name, location, is_verified, created_at
      FROM schools
      ORDER BY created_at DESC
    `);

    res.json({ schools: rows });
  });

  return router;
};
