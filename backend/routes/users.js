const express = require("express");
const crypto = require("crypto");

const { sendEmail } = require("../utils/emailService");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

  // ======================
  // GET USERS
  // ======================
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.last_login_at,
          u.last_logout_at,
          u.is_active,
          u.phone,
          r.name AS role,
          s.name AS school
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN schools s ON s.id = u.school_id
        ORDER BY u.created_at DESC
      `);

      res.json({
        users: rows,
      });
    } catch (err) {
      console.error("USERS LIST ERROR:", err);

      res.status(500).json({
        message: "Failed to load users",
      });
    }
  });

  // ======================
  // TOGGLE ACTIVATION
  // ======================
  router.post("/:id/toggle", authMiddleware, async (req, res) => {
    try {
      await pool.query(
        `
        UPDATE users
        SET is_active = IF(is_active = 1, 0, 1)
        WHERE id = ?
        `,
        [req.params.id]
      );

      res.json({
        success: true,
      });
    } catch (err) {
      console.error("TOGGLE USER ERROR:", err);

      res.status(500).json({
        message: "Failed to toggle user",
      });
    }
  });

  // ======================
  // RESEND ACTIVATION EMAIL
  // ======================
  router.post("/:id/resend-activation", authMiddleware, async (req, res) => {
    try {
      const [[user]] = await pool.query(
        `
        SELECT
          id,
          email,
          full_name
        FROM users
        WHERE id = ?
        `,
        [req.params.id]
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const activationToken =
        crypto.randomBytes(32).toString("hex");

      await pool.query(
        `
        UPDATE users
        SET activation_token = ?
        WHERE id = ?
        `,
        [activationToken, user.id]
      );

      const activationLink =
        `${process.env.CLIENT_ORIGIN}/activate-account?token=${activationToken}`;

      await sendEmail({
        to: user.email,
        subject: "Activate Your ClearEnroll Account",
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Activate Your Account</h2>

            <p>Hello ${user.full_name || "User"},</p>

            <p>
              A new activation link has been generated
              for your ClearEnroll account.
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
              If the button does not work:
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

      res.json({
        success: true,
        message: "Activation email resent",
      });

    } catch (err) {
      console.error("RESEND ACTIVATION ERROR:", err);

      res.status(500).json({
        message: "Failed to resend activation email",
      });
    }
  });

  // ======================
  // SEND PASSWORD RESET EMAIL
  // ======================
  router.post("/:id/reset-password", authMiddleware, async (req, res) => {
    try {
      const [[user]] = await pool.query(
        `
        SELECT
          id,
          email,
          full_name
        FROM users
        WHERE id = ?
        `,
        [req.params.id]
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const resetToken =
        crypto.randomBytes(32).toString("hex");

      await pool.query(
        `
        UPDATE users
        SET
          password_reset_token = ?,
          password_reset_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR)
        WHERE id = ?
        `,
        [resetToken, user.id]
      );

      const resetLink =
        `${process.env.CLIENT_ORIGIN}/reset-password?token=${resetToken}`;

      await sendEmail({
        to: user.email,
        subject: "ClearEnroll Password Reset",
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Password Reset Request</h2>

            <p>Hello ${user.full_name || "User"},</p>

            <p>
              A password reset has been requested for your
              ClearEnroll account.
            </p>

            <p>
              Click the button below to create a new password.
            </p>

            <p>
              <a
                href="${resetLink}"
                style="
                  background:#2563eb;
                  color:#ffffff;
                  padding:12px 20px;
                  text-decoration:none;
                  border-radius:6px;
                  display:inline-block;
                "
              >
                Reset Password
              </a>
            </p>

            <p>
              If the button does not work:
            </p>

            <p>
              <a href="${resetLink}">
                ${resetLink}
              </a>
            </p>

            <hr />

            <small>
              This link expires in 1 hour.
            </small>
          </div>
        `,
      });

      res.json({
        success: true,
        message: "Password reset email sent",
      });

    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);

      res.status(500).json({
        message: "Password reset failed",
      });
    }
  });

  return router;
};