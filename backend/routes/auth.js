const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const crypto = require("crypto");
const { sendEmail } = require("../utils/emailService");

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

  try {
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
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message:
          "Account not activated. Please check your email.",
      });
    }

    // ======================
    // REMOVE OLD UNUSED OTPs
    // ======================
    await pool.query(
      `
      DELETE FROM user_otp_codes
      WHERE user_id = ?
      `,
      [user.id]
    );

    // ======================
    // GENERATE OTP
    // ======================
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // ======================
    // STORE OTP
    // ======================
    await pool.query(
      `
      INSERT INTO user_otp_codes
      (
        user_id,
        otp_code,
        expires_at
      )
      VALUES
      (
        ?,
        ?,
        DATE_ADD(NOW(), INTERVAL 2 MINUTE)
      )
      `,
      [
        user.id,
        otp,
      ]
    );

    // ======================
    // EMAIL OTP
    // ======================
    await sendEmail({
      to: user.email,
      subject: "ClearEnroll Verification Code",
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Login Verification</h2>

          <p>Hello ${user.full_name || "User"},</p>

          <p>
            Your ClearEnroll verification code is:
          </p>

          <h1
            style="
              letter-spacing:5px;
              color:#2563eb;
            "
          >
            ${otp}
          </h1>

          <p>
            This code expires in 2 minutes.
          </p>

          <p>
            If you did not attempt to sign in,
            please ignore this email.
          </p>
        </div>
      `,
    });

    // ======================
    // RETURN OTP REQUIRED
    // ======================
    return res.json({
      otp_required: true,
      userId: user.id,
      email: user.email,
      message:
        "Verification code sent to your email.",
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      message: "Login failed",
    });
  }
});

// ======================
// VERIFY OTP
// ======================
router.post("/verify-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        message: "OTP is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        o.otp_code,
        o.attempts,
        o.expires_at,
        u.email,
        u.school_id,
        u.full_name,
        u.profile_photo,
        r.name AS role
      FROM user_otp_codes o
      JOIN users u ON u.id = o.user_id
      JOIN roles r ON r.id = u.role_id
      WHERE
        o.user_id = ?
        AND o.otp_code = ?
        AND o.used_at IS NULL
        AND o.expires_at > NOW()
      LIMIT 1
      `,
      [userId, otp]
    );

   if (!rows.length) {

  await pool.query(
    `
    UPDATE user_otp_codes
    SET attempts = attempts + 1
    WHERE
      user_id = ?
      AND used_at IS NULL
      AND expires_at > NOW()
    `,
    [userId]
  );

  const [[attemptRow]] = await pool.query(
    `
    SELECT attempts
    FROM user_otp_codes
    WHERE
      user_id = ?
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    [userId]
  );

  if (
    attemptRow &&
    attemptRow.attempts >= 5
  ) {

    await pool.query(
      `
      DELETE FROM user_otp_codes
      WHERE user_id = ?
      `,
      [userId]
    );

    return res.status(401).json({
      message:
        "Maximum OTP attempts exceeded. Please login again.",
    });
  }

  return res.status(401).json({
    message: "Invalid OTP",
  });
}

    const record = rows[0];

    await pool.query(
      `
      UPDATE user_otp_codes
      SET used_at = NOW()
      WHERE id = ?
      `,
      [record.id]
    );

    // LOGIN LOG
    await pool.query(
      `
      INSERT INTO user_login_logs
      (
        user_id,
        action,
        ip_address,
        user_agent
      )
      VALUES
      (
        ?,
        'LOGIN',
        ?,
        ?
      )
      `,
      [
        record.user_id,
        req.ip,
        req.headers["user-agent"] || null,
      ]
    );

    // UPDATE LAST LOGIN
    await pool.query(
      `
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = ?
      `,
      [record.user_id]
    );

    const token = signToken({
      userId: record.user_id,
      email: record.email,
      role: record.role,
      school_id: record.school_id || null,
      full_name: record.full_name || null,
      profile_photo: record.profile_photo || null,
    });

    res.json({
      token,
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);

    res.status(500).json({
      message: "OTP verification failed",
    });
  }
});
 
// ======================
// REGISTER
// ======================
router.post(
  "/register",
  uploadUser.single("profile_photo"),
  async (req, res) => {
    try {
      const { email, fullname, school_id, phone} = req.body;

      const profilePhoto = req.file
        ? `uploads/users/${req.file.filename}`
        : null;

      if (!email || !fullname || !school_id) {
        return res.status(400).json({
          message: "Email, Full Name and School are required",
        });
      }

      const [exists] = await pool.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (exists.length) {
        return res.status(409).json({
          message: "User already exists",
        });
      }

      const [schoolRows] = await pool.query(
        "SELECT id FROM schools WHERE id = ? LIMIT 1",
        [school_id]
      );

      if (!schoolRows.length) {
        return res.status(400).json({
          message: "Invalid school selected",
        });
      }

      const [[role]] = await pool.query(
        "SELECT id FROM roles WHERE name = 'SCHOOL_ADMIN' LIMIT 1"
      );

      if (!role) {
        return res.status(500).json({
          message: "Role not configured",
        });
      }

      const activationToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
  `
  INSERT INTO users
  (
    email,
    password_hash,
    role_id,
    school_id,
    profile_photo,
    phone,
    is_active,
    activation_token,
    full_name
  )
  VALUES (?, NULL, ?, ?, ?, ?, 0, ?, ?)
  `,
  [
    email,
    role.id,
    school_id,
    profilePhoto,
    phone,
    activationToken,
    fullname,
  ]
);  



      const activationLink =
        `${process.env.CLIENT_ORIGIN}/activate-account?token=${activationToken}`;

      await sendEmail({
        to: email,
        subject: "Activate Your ClearEnroll Account",
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Welcome to ClearEnroll</h2>

            <p>Hello ${fullname},</p>

            <p>
              A ClearEnroll account has been created for you.
            </p>

            <p>
              Click the button below to activate your account.
            </p>

            <p>
              <a
                href="${activationLink}"
                style="
                  background:#2563eb;
                  color:#ffffff;
                  padding:12px 20px;
                  text-decoration:none;
                  border-radius:6px;
                  display:inline-block;
                "
              >
                Activate Account
              </a>
            </p>

            <p>
              If the button does not work, use this link:
            </p>

            <p>
              <a href="${activationLink}">
                ${activationLink}
              </a>
            </p>

            <hr />

            <small>
              This email was sent by ClearEnroll.
            </small>
          </div>
        `,
      });

      res.status(201).json({
        message:
          "Account created successfully. Activation email has been sent.",
      });
    } catch (err) {
      console.error("REGISTER ERROR:", err);

      res.status(500).json({
        message: "Registration failed",
      });
    }
  }
);

 // ======================
// VALIDATE ACTIVATION TOKEN
// ======================
router.get("/activation-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [rows] = await pool.query(
      `
      SELECT id, email, full_name
      FROM users
      WHERE activation_token = ?
      AND is_active = 0
      LIMIT 1
      `,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({
        valid: false,
        message: "Activation link is invalid or expired",
      });
    }

    res.json({
      valid: true,
      email: rows[0].email,
      full_name: rows[0].full_name,
    });
  } catch (err) {
    console.error("TOKEN VALIDATION ERROR:", err);

    res.status(500).json({
      valid: false,
      message: "Unable to validate activation link",
    });
  }
});

// ======================
// ACTIVATE ACCOUNT
// ======================
router.post("/activate", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE activation_token = ?
      AND is_active = 0
      LIMIT 1
      `,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({
        message: "Activation link expired or invalid",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET
        password_hash = ?,
        is_active = 1,
        activation_token = NULL,
        activated_at = NOW()
      WHERE id = ?
      `,
      [passwordHash, rows[0].id]
    );

    res.json({
      success: true,
      message: "Account activated successfully",
    });
  } catch (err) {
    console.error("ACTIVATE ACCOUNT ERROR:", err);

    res.status(500).json({
      message: "Activation failed",
    });
  }
});

// ======================
// VALIDATE RESET TOKEN
// ======================
router.get("/reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        id,
        email,
        full_name
      FROM users
      WHERE password_reset_token = ?
      AND password_reset_expires > NOW()
      LIMIT 1
      `,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({
        valid: false,
        message: "Password reset link is invalid or expired",
      });
    }

    res.json({
      valid: true,
      email: rows[0].email,
      full_name: rows[0].full_name,
    });

  } catch (err) {
    console.error("RESET TOKEN ERROR:", err);

    res.status(500).json({
      valid: false,
      message: "Unable to validate reset link",
    });
  }
});

// ======================
// RESET PASSWORD
// ======================
router.post("/reset-password", async (req, res) => {
  try {
    const {
      token,
      password,
      confirmPassword,
    } = req.body;

    if (
      !token ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE password_reset_token = ?
      AND password_reset_expires > NOW()
      LIMIT 1
      `,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({
        message:
          "Password reset link is invalid or expired",
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET
        password_hash = ?,
        password_reset_token = NULL,
        password_reset_expires = NULL
      WHERE id = ?
      `,
      [
        passwordHash,
        rows[0].id,
      ]
    );

    res.json({
      success: true,
      message:
        "Password reset successfully",
    });

  } catch (err) {
    console.error(
      "RESET PASSWORD ERROR:",
      err
    );

    res.status(500).json({
      message:
        "Password reset failed",
    });
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

      //  UPDATE LAST LOGOUT
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
