const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Gunakan file PNG, JPG, atau WEBP."));
    }
  },
});

function extractEntities(text) {
  const urls = Array.from(
    new Set(
      (
        text.match(
          /(?:https?:\/\/|www\.|bit\.ly\/|s\.id\/|tinyurl\.com\/|t\.me\/|wa\.me\/)[^\s)"]+/gi
        ) || []
      ).map((u) => u.replace(/[.,;!?]+$/, ""))
    )
  ).slice(0, 5);

  const rawPhones =
    text.match(/(?:\+62|62|08)\d[\d\s-]{7,14}\d|\b\d{10,16}\b/g) || [];
  const numbers = Array.from(
    new Set(
      rawPhones
        .map((n) => n.replace(/[\s-]/g, ""))
        .filter((n) => n.length >= 10 && n.length <= 16)
    )
  ).slice(0, 5);

  return { urls, numbers };
}

function evaluateMessage(rawMessage = "", hasScreenshot = false) {
  const text = String(rawMessage || "").trim();
  const { urls, numbers } = extractEntities(text);

  if (!text && hasScreenshot) {
    return {
      score: 48,
      level: "waspada",
      category: "Pemeriksaan Screenshot (Tanpa API Key Vision)",
      reasons: [
        "Screenshot diterima, namun kunci API AI Vision pihak ketiga (GEMINI_API_KEY / OPENAI_API_KEY) belum diisi di server.",
        "Periksa secara teliti apakah gambar percakapan meminta kode OTP, PIN, password, atau mengirim file .apk.",
        "Pastikan nomor pengirim atau akun tujuan pembayaran diperiksa terlebih dahulu pada menu Cek E-Wallet.",
      ],
      recommendations: [
        "Isi GEMINI_API_KEY atau OPENAI_API_KEY pada file .env untuk mengaktifkan pembacaan gambar (OCR Vision) otomatis.",
        "Jangan pernah memberikan kode OTP 6 digit atau menginstal file .apk dari chat.",
      ],
      extractedNumbers: [],
      extractedUrls: [],
      source: "heuristic-engine",
      providerLabel: "Mesin Heuristik Multi-Lapis SADAR (Lokal)",
      checkedAt: new Date().toISOString(),
    };
  }

  const lower = text.toLowerCase();
  let score = 8;
  const reasons = [];
  let category = "Percakapan Umum";

  if (/(otp|kode rahasia|pin|password|kata sandi|cvv|kode verifikasi|6 digit)/i.test(lower)) {
    score += 44;
    category = "Pencurian Kredensial / Phishing OTP";
    reasons.push(
      "Meminta kredensial rahasia (OTP/PIN/kata sandi/CVV) yang tidak pernah diminta oleh petugas bank atau e-wallet resmi."
    );
  }

  if (/(\.apk\b|undangan\.apk|resi\.apk|cek-foto-paket|instal aplikasi)/i.test(lower)) {
    score += 48;
    category = "Malware Pencuri SMS (.APK Scam)";
    reasons.push(
      "Mengarahkan pengunduhan atau pemasangan file aplikasi (.apk) di luar toko resmi yang berisiko menyadap SMS OTP."
    );
  }

  if (/(menang|hadiah|undian|klaim sekarang|bonus|saldo gratis|giveaway|jutawan|terpilih mendapatkan)/i.test(lower)) {
    score += 28;
    if (category === "Percakapan Umum") category = "Penipuan Hadiah / Giveaway Palsu";
    reasons.push(
      "Mengandung iming-iming hadiah, bonus saldo, atau undian instan untuk memancing emosi penerima."
    );
  }

  if (
    /(segera|dalam \d+ menit|diblokir|ditangguhkan|hangus|darurat|terakhir hari ini|pajak tertahan|paket tertahan|rekening dibekukan)/i.test(
      lower
    )
  ) {
    score += 25;
    if (category === "Percakapan Umum") category = "Rekayasa Sosial (Ancaman & Urgensi)";
    reasons.push(
      "Menggunakan tekanan waktu atau ancaman pemblokiran agar korban panik dan mengambil keputusan tergesa-gesa."
    );
  }

  if (/(https?:\/\/|bit\.ly|tinyurl|s\.id|t\.me|wa\.me|\.xyz|\.top|\.click|\.work)/i.test(lower)) {
    score += 22;
    reasons.push(
      "Memuat tautan eksternal, pemendek URL, atau ekstensi domain berisiko yang kerap digunakan untuk situs phishing."
    );
  }

  if (/(transfer|biaya admin|rekening|dana|gopay|ovo|shopeepay|linkaja|qris|bayar|tebus)/i.test(lower)) {
    score += 18;
    if (category === "Percakapan Umum") category = "Permintaan Transaksi / E-Wallet Mencurigakan";
    reasons.push(
      "Menyebutkan instruksi pembayaran, biaya tebusan/admin, atau transfer saldo e-wallet/rekening secara langsung."
    );
  }

  score = Math.min(98, Math.max(5, score));

  let level = "aman";
  if (score >= 65) {
    level = "berbahaya";
  } else if (score >= 35) {
    level = "waspada";
  }

  if (reasons.length === 0) {
    reasons.push("Tidak ditemukan kata kunci manipulasi psikologis atau penipuan umum pada teks pesan.");
    reasons.push("Tetap verifikasi identitas pengirim jika pesan berkaitan dengan transaksi keuangan atau data pribadi.");
  }

  const recommendations =
    level === "berbahaya"
      ? [
          "JANGAN membalas pesan, mengklik tautan, atau mengunduh lampiran file (.apk) apa pun.",
          "Blokir nomor pengirim dan periksa nomor telepon/e-wallet terkait di menu Cek E-Wallet Kominfo.",
          "Hubungi call center resmi institusi terkait jika pesan mengatasnamakan bank atau kurir.",
        ]
      : level === "waspada"
      ? [
          "Verifikasi kebenaran informasi melalui aplikasi atau situs web resmi, bukan dari link di dalam chat.",
          "Periksa nomor rekening atau e-wallet pengirim melalui fitur Cek E-Wallet sebelum bertransaksi.",
        ]
      : [
          "Pesan tampak wajar, namun tetap jaga kerahasiaan PIN, password, dan kode OTP Anda setiap saat.",
        ];

  return {
    score,
    level,
    category,
    reasons,
    recommendations,
    extractedNumbers: numbers,
    extractedUrls: urls,
    source: "heuristic-engine",
    providerLabel: "Mesin Heuristik Multi-Lapis SADAR",
    checkedAt: new Date().toISOString(),
  };
}

const SYSTEM_PROMPT = `Anda adalah sistem pakar keamanan siber Indonesia bernama SADAR (Sistem Analisis Data & Antisipasi Risiko) yang bertugas mendeteksi penipuan chat (WhatsApp/Telegram/SMS/DM) dan screenshot percakapan.
Analisis pesan atau gambar screenshot yang diberikan pengguna dan kembalikan HANYA objek JSON valid tanpa markdown fence dengan struktur persis berikut:
{
  "score": number (antara 5 sampai 99),
  "level": "aman" | "waspada" | "berbahaya" (aman: <35, waspada: 35-64, berbahaya: >=65),
  "category": string,
  "reasons": string[] (minimal 2 dan maksimal 4 poin analisis tajam dalam Bahasa Indonesia),
  "recommendations": string[] (2 sampai 3 langkah konkret),
  "ocrText": string (jika ada gambar screenshot, tuliskan ringkasan teks yang terbaca dari gambar; jika tidak ada, "")
}`;

function sanitizeAiPayload(parsed, fallback, source, providerLabel) {
  const rawScore = Number(parsed.score);
  const score = Number.isFinite(rawScore)
    ? Math.min(99, Math.max(5, Math.round(rawScore)))
    : fallback.score;

  let level = score >= 65 ? "berbahaya" : score >= 35 ? "waspada" : "aman";
  if (["aman", "waspada", "berbahaya"].includes(parsed.level)) {
    level = parsed.level;
  }

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.map((r) => String(r)).filter(Boolean).slice(0, 5)
    : fallback.reasons;

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.map((r) => String(r)).filter(Boolean).slice(0, 4)
    : fallback.recommendations;

  const ocrText =
    typeof parsed.ocrText === "string" && parsed.ocrText.trim()
      ? parsed.ocrText.trim()
      : undefined;

  const extraEntities = extractEntities(ocrText || "");

  return {
    score,
    level,
    category:
      typeof parsed.category === "string" && parsed.category.trim()
        ? parsed.category.trim()
        : fallback.category,
    reasons: reasons.length > 0 ? reasons : fallback.reasons,
    recommendations:
      recommendations.length > 0 ? recommendations : fallback.recommendations,
    extractedNumbers: Array.from(
      new Set([...fallback.extractedNumbers, ...extraEntities.numbers])
    ).slice(0, 5),
    extractedUrls: Array.from(
      new Set([...fallback.extractedUrls, ...extraEntities.urls])
    ).slice(0, 5),
    ocrText,
    source,
    providerLabel,
    checkedAt: new Date().toISOString(),
  };
}

async function analyzeWithGemini(message, imageBase64, imageMimeType, fallback) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey.startsWith("ISI_") || apiKey === "your_gemini_api_key") {
    return null;
  }

  const model = (process.env.GEMINI_MODEL || "gemini-3-flash-preview").trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts = [
    {
      text: `${SYSTEM_PROMPT}\n\nTeks pesan dari pengguna:\n${
        message || "(Pengguna hanya mengunggah screenshot gambar, baca teks pada gambar)"
      }`,
    },
  ];

  if (imageBase64 && imageMimeType) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64,
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!rawText) return null;

    const cleaned = rawText.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return sanitizeAiPayload(parsed, fallback, "gemini-ai", `Google Gemini AI (${model})`);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

router.post("/", upload.single("screenshot"), async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const hasScreenshot = Boolean(req.file);

  if (!message && !hasScreenshot) {
    return res.status(400).json({
      error: "Masukkan isi pesan atau unggah screenshot terlebih dahulu.",
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({
      error: "Panjang pesan maksimal 5000 karakter.",
    });
  }

  const fallback = evaluateMessage(message, hasScreenshot);
  const imageBase64 = req.file ? req.file.buffer.toString("base64") : null;
  const imageMimeType = req.file ? req.file.mimetype : null;

  const geminiResult = await analyzeWithGemini(message, imageBase64, imageMimeType, fallback);
  if (geminiResult) {
    return res.json(geminiResult);
  }

  return res.json(fallback);
});

module.exports = router;
module.exports.evaluateMessage = evaluateMessage;
