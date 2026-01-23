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
  express.static(path.join(__dirname, "uploads/students"))
);

const authMiddleware = require("./middleware/auth");

// ======================
// Ensure upload folder exists
// ======================
const uploadDir = path.join(__dirname, "uploads", "students");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ======================
// Multer config (store file with original extension)
// ======================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

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
  host: process.env.DB_SOCKET,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ======================
// Health
// ======================
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ======================
// Mount grouped routes
// ======================
app.use("/auth", require("./routes/auth")(pool));
app.use("/schools", require("./routes/schools")(pool, authMiddleware));
app.use("/parents", require("./routes/parents")(pool, authMiddleware));
app.use("/students", require("./routes/students")(pool, authMiddleware, upload));
app.use("/dashboard", require("./routes/dashboard")(pool, authMiddleware));
app.use("/flags", require("./routes/flags")(pool, authMiddleware));
app.use("/verify", require("./routes/verify")(pool, authMiddleware));
app.use("/import", require("./routes/imports")(pool, authMiddleware, upload));

// ======================
// Existing modules (keep as-is)
// ======================
const duplicateReviewsRoutes = require("./routes/duplicateReviews");
app.use("/duplicates", duplicateReviewsRoutes(pool, authMiddleware));

const consentsRoutes = require("./routes/consents");
app.use("/consents", consentsRoutes(pool, authMiddleware));

const disputesRoutes = require("./routes/disputes");
app.use("/disputes", disputesRoutes(pool, authMiddleware));

// ======================
// Start server
// ======================
app.listen(process.env.PORT, () => {
  console.log(`API running on http://localhost:${process.env.PORT}`);
});
