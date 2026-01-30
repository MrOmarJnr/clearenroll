const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

module.exports = (pool) => {
  const router = express.Router();

  // Helpers
  function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });
  }

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  // ======================
  // Get Schools (for Register dropdown)
  // ======================
  router.get("/schools", async (req, res) => {
    try {
      // Assumes you have a `schools` table with at least: id, name
      // If you also have `status`, you can filter it.
      const [rows] = await pool.query(
        `
        SELECT id, name
        FROM schools
        ORDER BY name ASC
        `
      );

      res.json({ schools: rows || [] });
    } catch (err) {
      console.error("SCHOOLS LIST ERROR:", err);
      res.status(500).json({ message: "Failed to load schools" });
    }
  });

  // ======================
  // Login
  // ======================
  router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const [rows] = await pool.query(
      `
      SELECT u.id, u.email, u.password_hash, u.school_id,u.full_name, r.name AS role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.email = ?
      `,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id || null,
      full_name: user.full_name || null,
    });

    res.json({ token });
  });

  // ======================
  // Register
  // ======================
  router.post("/register", async (req, res) => {
    try {
      const { email, password, confirmPassword, school_id } = req.body;

      if (!email || !password || !confirmPassword || !school_id) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [
        email,
      ]);

      if (exists.length) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Validate school exists
      const [schoolRows] = await pool.query(
        "SELECT id FROM schools WHERE id = ? LIMIT 1",
        [school_id]
      );

      if (!schoolRows.length) {
        return res.status(400).json({ message: "Invalid school selected" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

        const [[role]] = await pool.query(
        "SELECT id FROM roles WHERE name = 'SCHOOL_ADMIN' LIMIT 1"
      );

      if (!role) {
        return res.status(500).json({ message: "Role not configured" });
      }

      const [result] = await pool.query(
        `
        INSERT INTO users (email, password_hash, role_id, school_id)
        VALUES (?, ?, ?, ?)
        `,
        [email, passwordHash, role.id, school_id]
      );

      const token = signToken({
        userId: result.insertId,
        email,
        role: "SCHOOL",
        school_id,
      });

      res.status(201).json({ token });
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  return router;
};
