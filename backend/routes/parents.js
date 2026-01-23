const express = require("express");
const { z } = require("zod");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  const parentSchema = z.object({
    full_name: z.string().min(2),
    phone: z.string().min(7),
    ghana_card_number: z.string().optional(),
    address: z.string().optional(),
  });

  // list
  router.get("/", authMiddleware, async (req, res) => {
    const [rows] = await pool.query(`
      SELECT id, full_name, phone, ghana_card_number, address, created_at
      FROM parents
      ORDER BY created_at DESC
    `);

    res.json({ parents: rows });
  });

  // create
  router.post("/", authMiddleware, async (req, res) => {
    const parsed = parentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error.flatten());
    }

    const { full_name, phone, ghana_card_number, address } = parsed.data;

    if (ghana_card_number) {
      const [exists] = await pool.query(
        "SELECT id FROM parents WHERE ghana_card_number = ?",
        [ghana_card_number]
      );
      if (exists.length) {
        return res.status(409).json({ message: "Parent already exists" });
      }
    }

    const [result] = await pool.query(
      `
      INSERT INTO parents (full_name, phone, ghana_card_number, address)
      VALUES (?, ?, ?, ?)
      `,
      [full_name, phone, ghana_card_number || null, address || null]
    );

    res.status(201).json({
      message: "Parent added successfully",
      parent_id: result.insertId,
    });
  });

  // update
  router.put("/:id", authMiddleware, async (req, res) => {
    await pool.query(
      `UPDATE parents SET full_name=?, phone=?, ghana_card_number=?, address=? WHERE id=?`,
      [
        req.body.full_name,
        req.body.phone,
        req.body.ghana_card_number,
        req.body.address,
        req.params.id,
      ]
    );
    res.json({ message: "Parent updated" });
  });

  // delete
  router.delete("/:id", authMiddleware, async (req, res) => {
    await pool.query(`DELETE FROM parents WHERE id=?`, [req.params.id]);
    res.json({ message: "Parent deleted" });
  });

  // single
  router.get("/:id", authMiddleware, async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM parents WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length) {
      return res.status(404).json({ message: "Parent not found" });
    }
    res.json({ parent: rows[0] });
  });

  return router;
};
