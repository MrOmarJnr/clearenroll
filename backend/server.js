require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const { z } = require("zod");

const app = express();
app.use(express.json());
const auth = require("./middleware/auth"); // keeping as-is (not used below)

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

// ======================
// MySQL connection pool
// ======================
const pool = mysql.createPool({
  host: process.env.DB_SOCKET, // (you named it DB_SOCKET; it can be host/IP)
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ======================
// Helpers
// ======================
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// ======================
// Validation (Zod)
// ======================
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const parentSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(7),
  ghana_card_number: z.string().optional(),
  address: z.string().optional(),
});

const studentSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  // keep string here because the browser sends date as string
  date_of_birth: z.string().min(8),
  gender: z.enum(["Male", "Female"]),
  current_school_id: z.number(),
  parent_id: z.number(),
});

// ======================
// Health
// ======================
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ======================
// Auth
// ======================
app.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const { email, password } = parsed.data;

  const [rows] = await pool.query(
    `
    SELECT u.id, u.email, u.password_hash, r.name AS role
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


  const [schoolRow] = await pool.query(
  "SELECT school_id FROM users WHERE id = ?",
  [user.id]
);

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    school_id: schoolRow[0]?.school_id || null,
  });

  res.json({ token });
});

// ======================
// Register
// ======================
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if user exists
    const [exists] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (exists.length) {
      return res.status(409).json({ message: "User already exists" });
    }

    // 🔐 HASH PASSWORD (THIS IS THE KEY)
    const passwordHash = await bcrypt.hash(password, 10);

    // Default role (e.g. SCHOOL)
    const [[role]] = await pool.query(
      "SELECT id FROM roles WHERE name = 'SCHOOL' LIMIT 1"
    );

    if (!role) {
      return res.status(500).json({ message: "Role not configured" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO users (email, password_hash, role_id)
      VALUES (?, ?, ?)
      `,
      [email, passwordHash, role.id]
    );

    // Auto-login after register
    const token = signToken({
      userId: result.insertId,
      email,
      role: "SCHOOL",
    });

    res.status(201).json({ token });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});


// ======================
// Schools (Option A response shape)
// ======================
app.get("/schools", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT id, name, location, is_verified, created_at
    FROM schools
    ORDER BY created_at DESC
  `);

  res.json({ schools: rows });
});

// ======================
// Parents (Option A response shape)
// ======================
app.get("/parents", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT id, full_name, phone, ghana_card_number, address, created_at
    FROM parents
    ORDER BY created_at DESC
  `);

  res.json({ parents: rows });
});

app.post("/parents", authMiddleware, async (req, res) => {
  const parsed = parentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const { full_name, phone, ghana_card_number, address } = parsed.data;

  // If Ghana card is provided, prevent duplicates
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

// ======================
// Students (Option A response shape)
// ======================
app.get("/students", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      s.id,
      si.identifier_value AS student_identifier,
      CONCAT(s.first_name,' ',s.last_name) AS name,
      s.date_of_birth,
      s.gender,
      sch.name AS school,
      p.full_name AS parent
    FROM students s
    JOIN schools sch ON sch.id = s.current_school_id
    JOIN student_parents sp ON sp.student_id = s.id
    JOIN parents p ON p.id = sp.parent_id
    LEFT JOIN student_identifiers si
      ON si.student_id = s.id AND si.is_primary = true
    ORDER BY s.created_at DESC
  `);

  res.json({ students: rows });
});

app.post("/students", authMiddleware, async (req, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    current_school_id,
    parent_id,
  } = parsed.data;

  // ======================
  // 1. DUPLICATE CHECK
  // ======================
  const [matches] = await pool.query(
    `
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.date_of_birth,
      sch.name AS school,
      si.identifier_value AS student_identifier
    FROM students s
    JOIN schools sch ON sch.id = s.current_school_id
    LEFT JOIN student_identifiers si
      ON si.student_id = s.id AND si.is_primary = true
    WHERE
      LOWER(s.first_name) = LOWER(?)
      AND LOWER(s.last_name) = LOWER(?)
      AND s.date_of_birth = ?
    `,
    [first_name, last_name, date_of_birth]
  );

if (matches.length > 0) {
  console.log("🚨 DUPLICATE DETECTED — WILL CREATE REVIEW");

  try {
    const [insertResult] = await pool.query(
      `
      INSERT INTO duplicate_reviews
        (existing_student_id, attempted_student_snapshot)
      VALUES (?, ?)
      `,
      [
        matches[0].id,
        JSON.stringify({
          first_name,
          last_name,
          date_of_birth,
          gender,
          current_school_id,
          parent_id,
        }),
      ]
    );

    console.log("✅ DUPLICATE REVIEW INSERTED:", insertResult);
  } catch (err) {
    console.error("❌ DUPLICATE REVIEW INSERT FAILED:", err);
  }

  return res.status(409).json({
    status: "POSSIBLE_DUPLICATE",
    message: "Possible existing student found. Admin review required.",
  });
}


  // ======================
  // 2. CREATE STUDENT
  // ======================
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [studentResult] = await conn.query(
      `
      INSERT INTO students
      (first_name, last_name, date_of_birth, gender, current_school_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [first_name, last_name, date_of_birth, gender, current_school_id]
    );

    const studentId = studentResult.insertId;

    await conn.query(
      `
      INSERT INTO student_parents
      (student_id, parent_id, relationship)
      VALUES (?, ?, 'Guardian')
      `,
      [studentId, parent_id]
    );

    const systemStudentId = `STD-${studentId}`;

    await conn.query(
      `
      INSERT INTO student_identifiers
      (student_id, identifier_type, identifier_value, is_primary)
      VALUES (?, 'SYSTEM_STUDENT_ID', ?, true)
      `,
      [studentId, systemStudentId]
    );

    await conn.commit();

    res.status(201).json({
      status: "CREATED",
      student_id: studentId,
      system_student_id: systemStudentId,
    });
  } catch (err) {
    await conn.rollback();
    console.error("CREATE STUDENT ERROR:", err);
    res.status(500).json({ message: "Failed to create student" });
  } finally {
    conn.release();
  }
});

// ======================
// Dashboard (UPDATED: pendingDuplicates badge count)
// ======================
app.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const [[schools]] = await pool.query("SELECT COUNT(*) AS total FROM schools");
    const [[parents]] = await pool.query("SELECT COUNT(*) AS total FROM parents");
    const [[students]] = await pool.query("SELECT COUNT(*) AS total FROM students");
    const [[flagged]] = await pool.query(
      "SELECT COUNT(*) AS total FROM flags WHERE status = 'FLAGGED'"
    );

    // ✅ NEW: pending duplicate reviews count
    const [[pendingDuplicates]] = await pool.query(
      "SELECT COUNT(*) AS total FROM duplicate_reviews WHERE decision IS NULL"
    );

    const [recentFlags] = await pool.query(`
      SELECT 
        f.id,
        CONCAT(s.first_name,' ',s.last_name) AS student,
        p.full_name AS parent,
        sc.name AS reported_by,
        f.amount_owed,
        f.status
      FROM flags f
      JOIN students s ON s.id = f.student_id
      LEFT JOIN parents p ON p.id = f.parent_id
      JOIN schools sc ON sc.id = f.reported_by_school_id
      ORDER BY f.created_at DESC
      LIMIT 5
    `);

    res.json({
      cards: {
        schools: schools.total,
        parents: parents.total,
        students: students.total,
        flagged: flagged.total,
        // ✅ NEW
        pendingDuplicates: pendingDuplicates.total,
      },
      recentFlags,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
});


// ======================
// Flags (Option A response shape + clear endpoint)
// ======================
app.get("/flags", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        f.id,
        CONCAT(s.first_name,' ',s.last_name) AS student,
        p.full_name AS parent,
        sc.name AS reported_by,
        f.amount_owed,
        f.status,
        f.created_at
      FROM flags f
      JOIN students s ON s.id = f.student_id
      LEFT JOIN parents p ON p.id = f.parent_id
      JOIN schools sc ON sc.id = f.reported_by_school_id
      ORDER BY f.created_at DESC
    `);

    res.json({ flags: rows });
  } catch (err) {
    console.error("FLAGS LIST ERROR:", err);
    res.status(500).json({ message: "Failed to load flags" });
  }
});


app.post("/flags", authMiddleware, async (req, res) => {
  const {
    student_id,
    parent_id,
    reported_by_school_id,
    amount_owed,
    reason,
  } = req.body;

  if (!student_id) {
    return res.status(400).json({ message: "Student is required" });
  }

  if (!reported_by_school_id) {
    return res.status(400).json({ message: "Reported by school is required" });
  }

  if (amount_owed === undefined || amount_owed === null) {
    return res.status(400).json({ message: "Amount owed is required" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // ======================
    // 1. CREATE FLAG
    // ======================
    const [flagResult] = await conn.query(
      `
      INSERT INTO flags
      (student_id, parent_id, reported_by_school_id, amount_owed, reason, status)
      VALUES (?, ?, ?, ?, ?, 'FLAGGED')
      `,
      [
        student_id,
        parent_id || null,
        reported_by_school_id,
        amount_owed,
        reason || "Unpaid fees",
      ]
    );

    const flagId = flagResult.insertId;

    // ======================
    // 2. CREATE CONSENT (TEST MODE)
    // ======================
    await conn.query(
      `
      INSERT INTO consents
      (
        student_id,
        requesting_school_id,
        granting_party,
        status,
        scope,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'PENDING', 'CLEARANCE', NOW(), NOW())
      `,
      [
        student_id,
        reported_by_school_id,
        "PARENT", // logical placeholder for now
      ]
    );

    await conn.commit();

    res.status(201).json({
      message: "Flag created and consent requested",
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






app.patch("/flags/:id/clear", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `
      UPDATE flags
      SET status = 'CLEARED',
          cleared_at = NOW(),
          cleared_by_user_id = ?
      WHERE id = ?
      `,
      [req.user.userId || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Flag not found" });
    }

    res.json({ message: "Flag cleared" });
  } catch (err) {
    console.error("CLEAR FLAG ERROR:", err);
    res.status(500).json({ message: "Failed to clear flag" });
  }
});

// ======================
// Verify (Registry Lookup – Admin)  ✅ matches Verify.jsx
// ======================
app.post("/verify", authMiddleware, async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ message: "Search query required" });
  }

  const [parents] = await pool.query(
    `
    SELECT id, full_name, phone, ghana_card_number
    FROM parents
    WHERE phone = ?
       OR ghana_card_number = ?
       OR full_name LIKE ?
    `,
    [query, query, `%${query}%`]
  );

  const [students] = await pool.query(
    `
    SELECT s.id, CONCAT(s.first_name,' ',s.last_name) AS name, sc.name AS school
    FROM students s
    JOIN schools sc ON sc.id = s.current_school_id
    WHERE CONCAT(s.first_name,' ',s.last_name) LIKE ?
    `,
    [`%${query}%`]
  );

  const [flags] = await pool.query(
    `
    SELECT
      f.id,
      CONCAT(s.first_name,' ',s.last_name) AS student,
      p.full_name AS parent,
      sc.name AS reported_by,
      f.amount_owed,
      f.reason
    FROM flags f
    JOIN students s ON s.id = f.student_id
    LEFT JOIN parents p ON p.id = f.parent_id
    JOIN schools sc ON sc.id = f.reported_by_school_id
    WHERE f.status = 'FLAGGED'
      AND (
        p.phone = ?
        OR p.ghana_card_number = ?
        OR p.full_name LIKE ?
        OR CONCAT(s.first_name,' ',s.last_name) LIKE ?
      )
    `,
    [query, query, `%${query}%`, `%${query}%`]
  );

  res.json({
    status: flags.length ? "FLAGGED" : "CLEAR",
    parents,
    students,
    flags,
  });
});

// ======================
// Verify Student (Enrollment Check)
// ✅ UPDATED: blocks if pending duplicate OR flagged fees
// ======================
// ======================
// Verify Student (Enrollment Check)
// ======================
app.post("/verify/student", authMiddleware, async (req, res) => {
  try {
    const { student_id, first_name, last_name, date_of_birth } = req.body;
    const requestingSchoolId = req.user.school_id; // ✅ REQUIRED

    let students = [];

    if (student_id) {
      const [rows] = await pool.query(
        `SELECT id, first_name, last_name, date_of_birth FROM students WHERE id = ?`,
        [student_id]
      );
      students = rows;
    } else if (first_name && last_name && date_of_birth) {
      const [rows] = await pool.query(
        `
        SELECT id, first_name, last_name, date_of_birth
        FROM students
        WHERE first_name = ?
          AND last_name = ?
          AND date_of_birth = ?
        `,
        [first_name, last_name, date_of_birth]
      );
      students = rows;
    } else {
      return res.status(400).json({
        message: "Provide student_id OR first_name + last_name + date_of_birth",
      });
    }

    if (students.length === 0) {
      return res.json({ status: "NOT_FOUND" });
    }

    if (students.length > 1) {
      return res.json({
        status: "MULTIPLE_MATCHES",
        candidates: students.map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          date_of_birth: s.date_of_birth,
        })),
      });
    }

    const student = students[0];

    // ----------------------
    // DUPLICATE CHECK
    // ----------------------
    const [[dup]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM duplicate_reviews
      WHERE existing_student_id = ?
        AND decision IS NULL
      `,
      [student.id]
    );

    if (Number(dup.total) > 0) {
      return res.json({
        status: "DUPLICATE_PENDING",
        blocked: true,
        message:
          "Enrollment blocked: student has a pending duplicate review. Contact administrator.",
        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
        },
      });
    }

    // ----------------------
    // DISPUTE CHECK
    // ----------------------
    const [disputes] = await pool.query(
      `
      SELECT id
      FROM disputes
      WHERE student_id = ?
        AND status IN ('OPEN','UNDER_REVIEW')
      LIMIT 1
      `,
      [student.id]
    );

    if (disputes.length) {
      return res.json({
        status: "DISPUTED",
        blocked: true,
        message: "Enrollment blocked: dispute in progress.",
        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
        },
      });
    }

    // ----------------------
    // ✅ CONSENT CHECK (FIXED)
  // ----------------------
// ✅ CONSENT CHECK (FIXED)
// ----------------------
// ✅ CONSENT CHECK (MVP RULE)
// ----------------------
const [consents] = await pool.query(
  `
  SELECT id
  FROM consents
  WHERE student_id = ?
    AND status = 'GRANTED'
  LIMIT 1
  `,
  [student.id]
);

let consent_status = consents.length ? "APPROVED" : "REQUIRED";

// 🔁 AUTO-CREATE CONSENT IF NONE EXISTS (still keep this)
if (!consents.length) {
  await pool.query(
    `
    INSERT INTO consents
      (student_id, requesting_school_id, granting_party, status, scope, created_at, updated_at)
    VALUES
      (?, ?, 'PARENT', 'PENDING', 'BALANCE_SUMMARY', NOW(), NOW())
    `,
    [student.id, requestingSchoolId]
  );
}

    // ----------------------
    // FLAG CHECK
    // ----------------------
    const [flags] = await pool.query(
      `
      SELECT id, amount_owed, reason
      FROM flags
      WHERE student_id = ?
        AND status = 'FLAGGED'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [student.id]
    );

    if (flags.length) {
      return res.json({
        status: "FLAGGED",
        blocked: true,
        consent_status,
        message: "Enrollment blocked: outstanding fees must be cleared.",
        amount_owed:
          consent_status === "APPROVED" ? flags[0].amount_owed : null,
        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
        },
      });
    }

    // ----------------------
    // CLEAR
    // ----------------------
    res.json({
      status: "CLEAR",
      blocked: false,
      consent_status,
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
      },
    });
  } catch (err) {
    console.error("VERIFY STUDENT ERROR:", err);
    res.status(500).json({ message: "Student verification failed" });
  }
});

// ======================
// Duplicate Reviews routes (keep using authMiddleware)
// ======================
const duplicateReviewsRoutes = require("./routes/duplicateReviews");
app.use("/duplicates", duplicateReviewsRoutes(pool, authMiddleware));


// ======================
// Consent  routes (keep using authMiddleware)
// ======================

const consentsRoutes = require("./routes/consents");
app.use("/consents", consentsRoutes(pool, authMiddleware));

// ======================
// disputes  routes (keep using authMiddleware)
// ======================s

const disputesRoutes  = require("./routes/disputes");
app.use("/disputes", disputesRoutes(pool, authMiddleware));

// ======================
// Start server
// ======================
app.listen(process.env.PORT, () => {
  console.log(`API running on http://localhost:${process.env.PORT}`);
});
