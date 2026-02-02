const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const crypto = require("crypto");

module.exports = (pool, uploadUser) => {
  const router = express.Router();

  // ======================
  // JWT SIGN
  // ======================
  function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });
  }

  // ======================
  // VALIDATION
  // ======================
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  // ======================
  // GET SCHOOLS
  // ======================
  router.get("/schools", async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT id, name
        FROM schools
        ORDER BY name ASC
      `);

      res.json({ schools: rows || [] });
    } catch (err) {
      console.error("SCHOOLS LIST ERROR:", err);
      res.status(500).json({ message: "Failed to load schools" });
    }
  });

  // ======================
  // LOGIN
  // ======================
  router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const [rows] = await pool.query(
      `
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.school_id,
        u.full_name,
        u.profile_photo,
        u.is_active,
        r.name AS role
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

    if (!user.is_active) {
      return res.status(403).json({
        message: "Account not activated. Please check your email.",
      });
    }

    // ===== LOGIN LOG =====
    await pool.query(
      `
      INSERT INTO user_login_logs (user_id, action, ip_address, user_agent)
      VALUES (?, 'LOGIN', ?, ?)
      `,
      [user.id, req.ip, req.headers["user-agent"] || null]
    );

    // ✅ UPDATE LAST LOGIN
    await pool.query(
      `
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = ?
      `,
      [user.id]
    );

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id || null,
      full_name: user.full_name || null,
      profile_photo: user.profile_photo || null,
    });

    res.json({ token });
  });

  // ======================
  // REGISTER
  // ======================
  router.post(
    "/register",
    uploadUser.single("profile_photo"),
    async (req, res) => {
      try {
        const { email, password, confirmPassword, fullname, school_id } =
          req.body;

        const profilePhoto = req.file
          ? `uploads/users/${req.file.filename}`
          : null;

        if (!email || !password || !confirmPassword || !fullname || !school_id) {
          return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPassword) {
          return res.status(400).json({ message: "Passwords do not match" });
        }

        const [exists] = await pool.query(
          "SELECT id FROM users WHERE email = ?",
          [email]
        );

        if (exists.length) {
          return res.status(409).json({ message: "User already exists" });
        }

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

        const activationToken = crypto.randomBytes(32).toString("hex");

        await pool.query(
          `
          INSERT INTO users 
            (email, password_hash, role_id, school_id, profile_photo, is_active, activation_token, full_name)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
          `,
          [
            email,
            passwordHash,
            role.id,
            school_id,
            profilePhoto,
            activationToken,
            fullname,
          ]
        );

        const activationLink = `${process.env.CLIENT_ORIGIN}/activate-account?token=${activationToken}`;
        console.log("ACTIVATION LINK:", activationLink);

        res.status(201).json({
          message:
            "Account created successfully. Please check your email to activate your account.",
        });
      } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ message: "Registration failed" });
      }
    }
  );

  // ======================
  // ACTIVATE ACCOUNT
  // ======================
  router.get("/activate", async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Invalid activation link");
    }

    try {
      const [rows] = await pool.query(
        `
        SELECT id FROM users
        WHERE activation_token = ? AND is_active = 0
        `,
        [token]
      );

      if (!rows.length) {
        return res.status(400).send("Activation link expired or invalid");
      }

      await pool.query(
        `
        UPDATE users
        SET is_active = 1,
            activation_token = NULL,
            activated_at = NOW()
        WHERE id = ?
        `,
        [rows[0].id]
      );

      return res.redirect(
        `${process.env.CLIENT_ORIGIN}/login?activated=1`
      );
    } catch (err) {
      console.error("ACTIVATION ERROR:", err);
      res.status(500).send("Activation failed");
    }
  });

  // ======================
  // LOGOUT
  // ======================
  router.post("/logout", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.sendStatus(200);

      await pool.query(
        `
        INSERT INTO user_login_logs (user_id, action, ip_address, user_agent)
        VALUES (?, 'LOGOUT', ?, ?)
        `,
        [userId, req.ip, req.headers["user-agent"] || null]
      );

      // ✅ UPDATE LAST LOGOUT
      await pool.query(
        `
        UPDATE users
        SET last_logout_at = NOW()
        WHERE id = ?
        `,
        [userId]
      );

      res.sendStatus(200);
    } catch (err) {
      console.error("LOGOUT ERROR:", err);
      res.sendStatus(200);
    }
  });

  return router;
};
