/**
 * ARSITEKTUR: Standalone Express API Server (server/index.js)
 * TUJUAN: Layanan mikro REST API untuk mode terpisah (microservice)
 * KATA KUNCI: Express.js, Backend Service, REST API Router
 */

// Modul Node.js: Manipulasi jalur direktori file sistem
const path = require("path");
// Modul Lingkungan: Memuat variabel environment dari file konfigurasi
const dotenv = require("dotenv");
// Framework Web: Inisialisasi Express REST server
const express = require("express");
// Middleware Keamanan: Cross-Origin Resource Sharing (CORS)
const cors = require("cors");
// Router API: Endpoint analisis chat & screenshot OCR
const analyzeRouter = require("./routes/analyze");
// Router API: Endpoint pemindaian tautan phishing & malware
const scanRouter = require("./routes/scan");
// Router API: Endpoint pemeriksaan akun e-wallet & rekening
const ewalletRouter = require("./routes/ewallet");

// Memuat konfigurasi dari .env.local jika tersedia
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
// Memuat konfigurasi dari .env utama
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
// Memuat konfigurasi cadangan dari .env.example
dotenv.config({ path: path.resolve(process.cwd(), ".env.example") });

// Inisialisasi aplikasi Express
const app = express();
// Menentukan port API mandiri (default: 4000)
const PORT = Number(process.env.API_PORT) || 4000;
// Menentukan domain origin frontend yang diizinkan mengakses API
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

// Mendaftarkan middleware CORS untuk mencegah request dari domain tidak sah
app.use(
  cors({
    origin: [WEB_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "OPTIONS"],
  })
);

// Mendaftarkan middleware parser JSON dengan batas ukuran aman 256kb
app.use(express.json({ limit: "256kb" }));

// Route Diagnostics: Pengecekan kesehatan server backend
app.get("/api/health", (_req, res) => {
  // Mengembalikan status ok dan timestamp server
  res.json({
    status: "ok",
    service: "sadar-api",
    timestamp: new Date().toISOString(),
  });
});

// Memasang router endpoint analisis pesan dan gambar
app.use("/api/analyze", analyzeRouter);
// Memasang router endpoint pemindaian tautan
app.use("/api/scan", scanRouter);
// Memasang router endpoint pemeriksaan nomor e-wallet dan bank
app.use("/api/ewallet-check", ewalletRouter);

// Global Error Handler Middleware: Menangkap semua galat yang tidak tertangani
app.use((err, _req, res, _next) => {
  // Menentukan status galat HTTP (default 500)
  const status = err.status || 500;
  // Mengirim respon JSON pesan galat
  res.status(status).json({
    error: err.message || "Terjadi kesalahan pada server SADAR.",
  });
});

// Menjalankan server Express pada port yang ditentukan
app.listen(PORT, () => {
  // Mencatat log server aktif ke console
  console.log(`[SADAR API] Berjalan di http://localhost:${PORT}`);
});
