require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// static serve student uploads
app.use(
  "/uploads/students",
  express.static(path.join(__dirname, "/var/www/clearenroll-uploads/students"))
);

// static serve user  and registration uploads
app.use(
  "/uploads/users",
  express.static(path.join(__dirname, "/var/www/clearenroll-uploads/users"))
);

app.use(
  "/uploads/teachers",
  express.static(path.join(__dirname, "/var/www/clearenroll-uploads/teachers"))
);


const authMiddleware = require("./middleware/auth");

const uploadDir = path.join(__dirname, "uploads", "students");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const userUploadDir = path.join(__dirname, "uploads", "users");
if (!fs.existsSync(userUploadDir)) {
  fs.mkdirSync(userUploadDir, { recursive: true });
}


const teacherUploadDir = path.join(__dirname, "uploads", "teachers");
if (!fs.existsSync(teacherUploadDir)) {
  fs.mkdirSync(teacherUploadDir, { recursive: true });
}

// config for student profile photos

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});



//  config for USER profile photos

const userStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, userUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadUser = multer({ storage: userStorage })


const upload = multer({ storage });

// config for teacher profile photos

const teacherStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, teacherUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadTeacher = multer({ storage: teacherStorage });


app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);


// MySQL connection pool

const pool = mysql.createPool({
  host: process.env.DB_SOCKET,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});


app.get("/health", (req, res) => {
  res.json({ ok: true });
});


// routes

app.use("/auth", require("./routes/auth")(pool, uploadUser));
app.use("/users", require("./routes/users")(pool, authMiddleware));
app.use("/audit", require("./routes/audit")(pool, authMiddleware));
app.use("/schools", require("./routes/schools")(pool, authMiddleware));
app.use("/parents", require("./routes/parents")(pool, authMiddleware));
app.use("/students", require("./routes/students")(pool, authMiddleware, upload));
app.use("/teachers", require("./routes/teachers")(pool, authMiddleware, uploadTeacher));
app.use("/dashboard", require("./routes/dashboard")(pool, authMiddleware));
app.use("/flags", require("./routes/flags")(pool, authMiddleware));
app.use("/verify", require("./routes/verify")(pool, authMiddleware));
app.use("/import", require("./routes/imports")(pool, authMiddleware, upload));
app.use("/dashboard/analytics", require("./routes/dashboard.analytics")(pool, authMiddleware));
app.use("/user", require("./routes/userConsent")(pool, authMiddleware));
app.use("/verifyteacher", require("./routes/verifyTeacher")(pool, authMiddleware));



const duplicateReviewsRoutes = require("./routes/duplicateReviews");
app.use("/duplicates", duplicateReviewsRoutes(pool, authMiddleware));

const consentsRoutes = require("./routes/consents");
app.use("/consents", consentsRoutes(pool, authMiddleware));

const disputesRoutes = require("./routes/disputes");
app.use("/disputes", disputesRoutes(pool, authMiddleware));

const flagAuditRoutes = require("./routes/flagAudit");
app.use("/flags", flagAuditRoutes(pool, authMiddleware));

const importTeachers = require("./routes/importTeachers");
app.use("/import/teachers",importTeachers(pool, authMiddleware, upload));

app.use("/dashboard/analytics", require("./routes/dashboard.analytics")(pool, authMiddleware));




// Start server

app.listen(process.env.PORT, () => {
  console.log(`API running on http://localhost:${process.env.PORT}`);
});
