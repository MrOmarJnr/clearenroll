const express = require("express");
const { sendEmail } = require("../utils/emailService");

module.exports = (pool, authMiddleware) => {
  const router = express.Router();

   // GET ALL FLAGS (SYSTEM VIEW)
  
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          f.id,
          f.student_id,
          f.parent_id,
          f.amount_owed,
          f.currency,
          f.reason,
          f.status,
          f.created_at,
          f.cleared_at,
          f.created_by_user_id,

          CONCAT(s.first_name, ' ', s.last_name) AS student,
          s.student_photo,

          p.full_name AS parent,
          sc.name AS reported_by,
          sc.location AS school_location

        FROM flags f
        LEFT JOIN students s ON s.id = f.student_id
        LEFT JOIN parents p ON p.id = f.parent_id
        LEFT JOIN schools sc ON sc.id = f.reported_by_school_id
        ORDER BY f.created_at DESC
      `);

      res.json({ flags: rows });
    } catch (err) {
      console.error("FLAGS LIST ERROR:", err);
      res.status(500).json({ message: "Failed to load flags" });
    }
  });


   // FLAG AUDIT LOGS (READ ONLY)

  router.get("/audit", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          al.id,
          al.flag_id,
          CONCAT(s.first_name, ' ', s.last_name) AS student,
          p.full_name AS parent,
          sc.name AS school,
          al.amount_owed,
          al.currency,
          al.action,
          u.email AS performed_by,
          al.created_at
        FROM flag_audit_logs al
        LEFT JOIN students s ON s.id = al.student_id
        LEFT JOIN parents p ON p.id = al.parent_id
        LEFT JOIN schools sc ON sc.id = al.school_id
        LEFT JOIN users u ON u.id = al.performed_by_user_id
        ORDER BY al.created_at DESC
      `);

      res.json({ logs: rows });
    } catch (err) {
      console.error("FLAG AUDIT ERROR:", err);
      res.status(500).json({ message: "Failed to load audit logs" });
    }
  });


   // CREATE FLAG
 
  router.post("/", authMiddleware, async (req, res) => {
    const {
      student_id,
      parent_id,
      reported_by_school_id,
      amount_owed,
      currency,
      reason,
    } = req.body;

    if (!student_id || !reported_by_school_id || amount_owed == null) {
      return res.status(400).json({ message: "Enter a valid amount owed without comma or currency symbol" });
    }

    const currencyValue = currency === "USD" ? "USD" : "GHS";
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `
        INSERT INTO flags
        (
          student_id,
          parent_id,
          reported_by_school_id,
          amount_owed,
          currency,
          reason,
          status,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, 'FLAGGED', ?)
        `,
        [
          student_id,
          parent_id || null,
          reported_by_school_id,
          amount_owed,
          currencyValue,
          reason || "Unpaid fees",
          req.user.userId,
        ]
      );

      const flagId = result.insertId;

      await conn.query(
        `
        INSERT INTO flag_audit_logs
        (
          flag_id,
          student_id,
          parent_id,
          school_id,
          action,
          amount_owed,
          currency,
          performed_by_user_id
        )
        VALUES (?, ?, ?, ?, 'FLAGGED', ?, ?, ?)
        `,
        [
          flagId,
          student_id,
          parent_id || null,
          reported_by_school_id,
          amount_owed,
          currencyValue,
          req.user.userId,
        ]
      );

      await conn.commit();

      res.status(201).json({
        message: "Flag created",
        flag_id: flagId,
      });
    } catch (err) {
      await conn.rollback();
      console.error("FLAG CREATE ERROR:", err);
      res.status(500).json({ message: "Failed to create flag" });
    } finally {
      conn.release();
    }
  });


  // UPDATE FLAG AMOUNT / REASON
router.put("/:id", authMiddleware, async (req, res) => {
  const flagId = Number(req.params.id);
  const { amount_owed, reason } = req.body;
  const { userId, role } = req.user;

  if (!Number.isInteger(flagId)) {
    return res.status(400).json({ message: "Invalid flag ID" });
  }

  if (amount_owed === undefined || amount_owed === null || amount_owed === "") {
    return res.status(400).json({ message: "Amount owed is required" });
  }

  try {
    const [[flag]] = await pool.query(
      `
      SELECT
        id,
        student_id,
        parent_id,
        reported_by_school_id,
        amount_owed,
        currency,
        created_by_user_id,
        status
      FROM flags
      WHERE id = ?
      LIMIT 1
      `,
      [flagId]
    );

    if (!flag) {
      return res.status(404).json({ message: "Flag not found" });
    }

    if (
      role !== "SUPER_ADMIN" &&
      Number(flag.created_by_user_id) !== Number(userId)
    ) {
      return res.status(403).json({
        message: "You can only update flags you created",
      });
    }

    const newAmount = Number(amount_owed);
    const newStatus = newAmount <= 0 ? "CLEARED" : "FLAGGED";

    await pool.query(
      `
      UPDATE flags
      SET
        amount_owed = ?,
        reason = ?,
        status = ?,
        cleared_at =
          CASE
            WHEN ? = 'CLEARED' THEN NOW()
            ELSE NULL
          END,
        cleared_by_user_id =
          CASE
            WHEN ? = 'CLEARED' THEN ?
            ELSE NULL
          END
      WHERE id = ?
      `,
      [
        newAmount,
        reason || flag.reason || "Unpaid fees",
        newStatus,
        newStatus,
        newStatus,
        userId,
        flagId,
      ]
    );

    await pool.query(
      `
      INSERT INTO flag_audit_logs
      (
        flag_id,
        student_id,
        parent_id,
        school_id,
        action,
        amount_owed,
        currency,
        performed_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        flagId,
        flag.student_id,
        flag.parent_id,
        flag.reported_by_school_id,
        newStatus === "CLEARED" ? "CLEARED" : "UPDATED",
        newAmount,
        flag.currency,
        userId,
      ]
    );

    res.json({
      message:
        newStatus === "CLEARED"
          ? "Flag updated and cleared"
          : "Flag updated",
    });
  } catch (err) {
    console.error("FLAG UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update flag" });
  }
});


   // GET SINGLE FLAG (VIEW MODAL)
 
  router.get("/:id", authMiddleware, async (req, res) => {
    const flagId = Number(req.params.id);

   
    if (!Number.isInteger(flagId)) {
      return res.status(400).json({ message: "Invalid flag ID" });
    }

    try {
      const [rows] = await pool.query(
        `
        SELECT
          f.id,
          f.student_id,
          f.parent_id,
          f.amount_owed,
          f.currency,
          f.reason,
          f.status,
          sc.name AS reported_by,
          f.reported_by_school_id
        FROM flags f
        JOIN schools sc ON sc.id = f.reported_by_school_id
        WHERE f.id = ?
        LIMIT 1
        `,
        [flagId]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Flag not found" });
      }

      const flag = rows[0];

      if (req.user.role === "SCHOOL_ADMIN") {
        if (
          Number(flag.reported_by_school_id) !==
          Number(req.user.school_id)
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      res.json({ flag });
    } catch (err) {
      console.error("GET FLAG ERROR:", err);
      res.status(500).json({ message: "Failed to load flag" });
    }
  });

 
   //CLEAR FLAG
 
  router.patch("/:id/clear", authMiddleware, async (req, res) => {
    const flagId = Number(req.params.id);
    const { userId, role } = req.user;

    if (!Number.isInteger(flagId)) {
      return res.status(400).json({ message: "Invalid flag ID" });
    }

    try {
      const [[flag]] = await pool.query(
        `
        SELECT
          id,
          student_id,
          parent_id,
          reported_by_school_id,
          amount_owed,
          currency,
          created_by_user_id,
          status
        FROM flags
        WHERE id = ?
        `,
        [flagId]
      );

      if (!flag) {
        return res.status(404).json({ message: "Flag not found" });
      }

      if (flag.status !== "FLAGGED") {
        return res.status(400).json({ message: "Flag already cleared" });
      }

      if (
        role !== "SUPER_ADMIN" &&
        Number(flag.created_by_user_id) !== Number(userId)
      ) {
        return res
          .status(403)
          .json({ message: "You can only clear flags you created" });
      }

      await pool.query(
        `
        UPDATE flags
        SET status = 'CLEARED',
            cleared_at = NOW(),
            cleared_by_user_id = ?
        WHERE id = ?
        `,
        [userId, flagId]
      );

      await pool.query(
        `
        INSERT INTO flag_audit_logs
        (
          flag_id,
          student_id,
          parent_id,
          school_id,
          action,
          amount_owed,
          currency,
          performed_by_user_id
        )
        VALUES (?, ?, ?, ?, 'CLEARED', ?, ?, ?)
        `,
        [
          flagId,
          flag.student_id,
          flag.parent_id,
          flag.reported_by_school_id,
          flag.amount_owed,
          flag.currency,
          userId,
        ]
      );

      // =====================================
// EMAIL NOTIFICATION
// =====================================

const [[creator]] = await pool.query(
  `
  SELECT
    email,
    full_name
  FROM users
  WHERE id = ?
  LIMIT 1
  `,
  [flag.created_by_user_id]
);

const [[student]] = await pool.query(
  `
  SELECT
    first_name,
    last_name
  FROM students
  WHERE id = ?
  LIMIT 1
  `,
  [flag.student_id]
);

const [[parent]] = await pool.query(
  `
  SELECT
    full_name
  FROM parents
  WHERE id = ?
  LIMIT 1
  `,
  [flag.parent_id]
);

if (creator?.email) {
  try {
    await sendEmail({
      to: creator.email,
      subject: "ClearEnroll - Flag Successfully Cleared",
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Flag Cleared Successfully</h2>

          <p>Hello ${creator.full_name || "User"},</p>

          <p>
            A student flag has been cleared successfully.
          </p>

          <table style="border-collapse:collapse;">
            <tr>
              <td style="padding:6px 12px;"><strong>Student</strong></td>
              <td style="padding:6px 12px;">
                ${student?.first_name || ""} ${student?.last_name || ""}
              </td>
            </tr>

            <tr>
              <td style="padding:6px 12px;"><strong>Parent</strong></td>
              <td style="padding:6px 12px;">
                ${parent?.full_name || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:6px 12px;"><strong>Amount</strong></td>
              <td style="padding:6px 12px;">
                ${flag.currency} ${Number(flag.amount_owed).toLocaleString()}
              </td>
            </tr>

            <tr>
              <td style="padding:6px 12px;"><strong>Status</strong></td>
              <td style="padding:6px 12px;">
                CLEARED
              </td>
            </tr>
          </table>

          <br>

          <p>
            This notification was generated automatically by ClearEnroll.
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error(
      "FLAG CLEAR EMAIL ERROR:",
      emailErr
    );
  }
}

      res.json({ message: "Flag cleared successfully" });
    } catch (err) {
      console.error("FLAG CLEAR ERROR:", err);
      res.status(500).json({ message: "Failed to clear flag" });
    }
  });


  // =====================================
// RECORD PARTIAL PAYMENT
// =====================================

router.post("/:id/payment", authMiddleware, async (req, res) => {
  const flagId = Number(req.params.id);
  const { amount_paid, payment_note } = req.body;
  const { userId, role } = req.user;

  try {
    const [[flag]] = await pool.query(
      `
      SELECT *
      FROM flags
      WHERE id = ?
      LIMIT 1
      `,
      [flagId]
    );

    if (!flag) {
      return res.status(404).json({
        message: "Flag not found",
      });
    }

    if (
      role !== "SUPER_ADMIN" &&
      Number(flag.created_by_user_id) !== Number(userId)
    ) {
      return res.status(403).json({
        message: "You can only update flags you created",
      });
    }

    const payment = Number(amount_paid);

    if (!payment || payment <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount",
      });
    }

    if (payment > Number(flag.amount_owed)) {
      return res.status(400).json({
        message: "Payment cannot exceed outstanding balance",
      });
    }

    // Save payment history
 await pool.query(
  `
  UPDATE flags
  SET
    amount_owed = ?,
    status = ?,

    cleared_at =
      CASE
        WHEN ? = 'CLEARED'
        THEN NOW()
        ELSE cleared_at
      END,

    cleared_by_user_id =
      CASE
        WHEN ? = 'CLEARED'
        THEN ?
        ELSE cleared_by_user_id
      END

  WHERE id = ?
  `,
  [
    remainingBalance,
    newStatus,

    newStatus,

    newStatus,
    userId,

    flagId,
  ]
);

    const remainingBalance =
      Number(flag.amount_owed) - payment;

    const newStatus =
      remainingBalance <= 0
        ? "CLEARED"
        : "FLAGGED";

    await pool.query(
      `
      UPDATE flags
      SET
        amount_owed = ?,
        status = ?,
        cleared_at =
          CASE
            WHEN ? = 'CLEARED'
            THEN NOW()
            ELSE NULL
          END
      WHERE id = ?
      `,
      [
        remainingBalance,
        newStatus,
        newStatus,
        flagId,
      ]
    );

    await pool.query(
      `
      INSERT INTO flag_audit_logs
      (
        flag_id,
        student_id,
        parent_id,
        school_id,
        action,
        amount_owed,
        currency,
        performed_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        flagId,
        flag.student_id,
        flag.parent_id,
        flag.reported_by_school_id,
        "PARTIAL_PAYMENT",
        payment,
        flag.currency,
        userId,
      ]
    );

    res.json({
      success: true,
      remaining_balance: remainingBalance,
      status: newStatus,
    });

  } catch (err) {
    console.error("PAYMENT ERROR:", err);

    res.status(500).json({
      message: "Failed to record payment",
    });
  }
});

router.get("/:id/payments", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    `
    SELECT
      fp.*,
      u.full_name
    FROM flag_payments fp
    LEFT JOIN users u
      ON u.id = fp.created_by_user_id
    WHERE fp.flag_id = ?
    ORDER BY fp.created_at DESC
    `,
    [req.params.id]
  );

  res.json({
    payments: rows,
  });
});

  return router;
};
