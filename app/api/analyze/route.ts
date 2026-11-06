import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { scanUrlComplete } from "@/lib/scanner";

export type AnalyzeResponsePayload = {
  score: number;
  level: "aman" | "waspada" | "berbahaya";
  category: string;
  reasons: string[];
  recommendations: string[];
  extractedNumbers: string[];
  extractedUrls: string[];
  ocrText?: string;
  source: "gemini-ai" | "openai-ai" | "groq-ai" | "heuristic-engine";
  providerLabel: string;
  checkedAt: string;
};

function extractEntities(text: string) {
  const rawUrlMatches =
    text.match(
      /(?:\.*https?:\/\/|www\.|bit\.ly\/|s\.id\/|tinyurl\.com\/|t\.me\/|wa\.me\/)[^\s)"<>]+/gi
    ) || [];

  const urls = Array.from(
    new Set(
      rawUrlMatches.map((u) =>
        u
          .replace(/^[.,;:'"(\[<]+/, "")
          .replace(/[.,;!?)'"\]]+$/, "")
          .trim()
      )
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

function evaluateHeuristic(
  rawMessage = "",
  hasScreenshot = false,
  urlScanFindings: { flagged: boolean; riskScore: number; findings: string[]; url: string } | null = null
): AnalyzeResponsePayload {
  const text = String(rawMessage || "").trim();
  const { urls, numbers } = extractEntities(text);

  if (!text && hasScreenshot) {
    return {
      score: 48,
      level: "waspada",
      category: "Pemeriksaan Screenshot (Tanpa API Key Vision)",
      reasons: [
        "Screenshot diterima, namun kunci API AI Vision pihak ketiga (GEMINI_API_KEY / OPENAI_API_KEY) belum merespons.",
        "Periksa secara teliti apakah gambar percakapan meminta kode OTP, PIN, password, atau mengirim file .apk.",
        "Pastikan nomor pengirim atau akun tujuan pembayaran diperiksa terlebih dahulu pada menu Cek E-Wallet.",
      ],
      recommendations: [
        "Pastikan GEMINI_API_KEY atau OPENAI_API_KEY aktif pada file .env untuk pembacaan gambar (OCR Vision) otomatis.",
        "Jangan pernah memberikan kode OTP 6 digit atau menginstal file .apk dari chat.",
      ],
      extractedNumbers: [],
      extractedUrls: [],
      source: "heuristic-engine",
      providerLabel: "Mesin Heuristik Multi-Lapis SADAR",
      checkedAt: new Date().toISOString(),
    };
  }

  const lower = text.toLowerCase();
  let score = 8;
  const reasons: string[] = [];
  let category = "Percakapan Umum";

  if (urlScanFindings?.flagged) {
    score = Math.max(score, urlScanFindings.riskScore, 88);
    category = "Tautan Berbahaya / Malware & Phishing di Dalam Chat";
    reasons.push(
      `Tautan di dalam pesan (${urlScanFindings.url}) terdeteksi BERBAHAYA: ${urlScanFindings.findings.join(" ")}`
    );
  }

  if (/(malware|trojan|ransomware|phish|exploit|testing\.google\.test|testsafebrowsing)/i.test(lower)) {
    score = Math.max(score, 92);
    category = "Tautan Distribusi Malware / Uji Keamanan Berbahaya";
    reasons.push(
      "Pesan memuat alamat uji malware/phishing atau tautan distribusi perangkat lunak berbahaya."
    );
  }

  if (/(otp|kode rahasia|pin|password|kata sandi|cvv|kode verifikasi|6 digit)/i.test(lower)) {
    score += 44;
    if (category === "Percakapan Umum") category = "Pencurian Kredensial / Phishing OTP";
    reasons.push(
      "Meminta kredensial rahasia (OTP/PIN/kata sandi/CVV) yang tidak pernah diminta oleh petugas bank atau e-wallet resmi."
    );
  }

  if (/(\.apk\b|\.exe\b|\.scr\b|undangan\.apk|resi\.apk|cek-foto-paket|instal aplikasi)/i.test(lower)) {
    score += 48;
    category = "Malware Pencuri SMS (.APK / File Eksekusi)";
    reasons.push(
      "Mengarahkan pengunduhan atau pemasangan file aplikasi (.apk/.exe) di luar toko resmi yang berisiko menyadap SMS OTP."
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

  if (/(https?:\/\/|bit\.ly|tinyurl|s\.id|t\.me|wa\.me|\.xyz|\.top|\.click|\.work|\.test)/i.test(lower)) {
    score += 22;
    reasons.push(
      "Memuat tautan eksternal, pemendek URL, atau ekstensi domain berisiko yang perlu diverifikasi keamanannya."
    );
  }

  if (/(transfer|biaya admin|rekening|dana|gopay|ovo|shopeepay|linkaja|qris|bayar|tebus)/i.test(lower)) {
    score += 18;
    if (category === "Percakapan Umum") category = "Permintaan Transaksi / E-Wallet Mencurigakan";
    reasons.push(
      "Menyebutkan instruksi pembayaran, biaya tebusan/admin, atau transfer saldo e-wallet/rekening secara langsung."
    );
  }

  score = Math.min(99, Math.max(5, score));

  let level: "aman" | "waspada" | "berbahaya" = "aman";
  if (score >= 65) {
    level = "berbahaya";
  } else if (score >= 35) {
    level = "waspada";
  }

  if (reasons.length === 0) {
    reasons.push(
      "Tidak ditemukan kata kunci manipulasi psikologis atau penipuan umum pada teks pesan."
    );
    reasons.push(
      "Tetap verifikasi identitas pengirim jika pesan berkaitan dengan transaksi keuangan atau data pribadi."
    );
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
    reasons: Array.from(new Set(reasons)).slice(0, 5),
    recommendations,
    extractedNumbers: numbers,
    extractedUrls: urls,
    source: "heuristic-engine",
    providerLabel: "Mesin Heuristik Multi-Lapis SADAR",
    checkedAt: new Date().toISOString(),
  };
}

const SYSTEM_PROMPT = `Anda adalah sistem pakar keamanan siber Indonesia bernama SADAR (Sistem Analisis Data & Antisipasi Risiko) yang bertugas mendeteksi penipuan chat (WhatsApp/Telegram/SMS/DM), tautan berbahaya (malware/phishing), dan screenshot percakapan.
Analisis pesan atau gambar screenshot yang diberikan pengguna secara teliti. Jika pesan berisi URL berbahaya (seperti malware, phishing, domain testing malware seperti malware.testing.google.test, .apk, atau penipuan), berikan skor risiko tinggi (>=85) dan level "berbahaya".
Kembalikan HANYA objek JSON valid tanpa markdown fence dengan struktur persis berikut:
{
  "score": number (antara 5 sampai 99, semakin tinggi semakin berbahaya/indikasi scam atau malware kuat),
  "level": "aman" | "waspada" | "berbahaya" (aman: <35, waspada: 35-64, berbahaya: >=65),
  "category": string (misal: "Tautan Malware / Phishing Berbahaya", "Modus Kurir File .APK", "Phishing Pencurian OTP", "Penipuan Undian & Hadiah", "Penipuan Jual Beli / E-Wallet", "Pinjol / Investasi Ilegal", "Percakapan Aman"),
  "reasons": string[] (minimal 2 dan maksimal 4 poin analisis tajam dalam Bahasa Indonesia yang menjelaskan tanda bahaya atau keamanannya),
  "recommendations": string[] (2 sampai 3 langkah konkret yang harus dilakukan pengguna),
  "ocrText": string (jika ada gambar screenshot, tuliskan ringkasan teks yang terbaca dari gambar; jika tidak ada gambar, isi string kosong "")
}`;

function sanitizeAiPayload(
  parsed: Record<string, unknown>,
  fallback: AnalyzeResponsePayload,
  source: AnalyzeResponsePayload["source"],
  providerLabel: string,
  urlScanFindings: { flagged: boolean; riskScore: number; findings: string[]; url: string } | null
): AnalyzeResponsePayload {
  const rawScore = Number(parsed.score);
  let score = Number.isFinite(rawScore)
    ? Math.min(99, Math.max(5, Math.round(rawScore)))
    : fallback.score;

  // Jika ada URL di dalam chat yang positif berbahaya dari Safe Browsing / Threat Scanner, pastikan skor tinggi
  if (urlScanFindings?.flagged) {
    score = Math.max(score, urlScanFindings.riskScore, 90);
  }

  let level: "aman" | "waspada" | "berbahaya" =
    score >= 65 ? "berbahaya" : score >= 35 ? "waspada" : "aman";
  if (
    !urlScanFindings?.flagged &&
    (parsed.level === "aman" ||
      parsed.level === "waspada" ||
      parsed.level === "berbahaya")
  ) {
    level = parsed.level;
    if (score >= 65) level = "berbahaya";
  }

  const aiReasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.map((r) => String(r)).filter(Boolean)
    : [];

  if (urlScanFindings?.flagged) {
    aiReasons.unshift(
      `Tautan di dalam chat (${urlScanFindings.url}) terdeteksi berbahaya oleh pemindai URL: ${urlScanFindings.findings[0]}`
    );
  }

  const reasons =
    aiReasons.length > 0
      ? Array.from(new Set(aiReasons)).slice(0, 5)
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
    reasons,
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

async function analyzeWithGemini(
  message: string,
  imageBase64: string | null,
  imageMimeType: string | null,
  fallback: AnalyzeResponsePayload,
  urlScanFindings: { flagged: boolean; riskScore: number; findings: string[]; url: string } | null
): Promise<AnalyzeResponsePayload | null> {
  const apiKey = getEnv("GEMINI_API_KEY");
  if (!apiKey) {
    return null;
  }

  const configuredModel = getEnv("GEMINI_MODEL", "gemini-3-flash-preview");
  const candidateModels = Array.from(
    new Set([configuredModel, "gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"])
  );

  const urlContext = urlScanFindings
    ? `\n\n[Konteks Pemindaian Tautan di dalam Pesan]: URL ${urlScanFindings.url} -> Status: ${
        urlScanFindings.flagged ? "BERBAHAYA / MALWARE / PHISHING" : "Aman"
      } (${urlScanFindings.findings.join("; ")})`
    : "";

  const parts: Array<Record<string, unknown>> = [
    {
      text: `${SYSTEM_PROMPT}\n\nTeks pesan dari pengguna:\n${
        message || "(Pengguna hanya mengunggah screenshot gambar, baca teks pada gambar)"
      }${urlContext}`,
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

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 11000);

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
      clearTimeout(timeout);

      if (!response.ok) continue;
      const data = await response.json();
      const allParts: Array<{ text?: string }> =
        data?.candidates?.[0]?.content?.parts || [];
      const combinedText = allParts.map((p) => p.text || "").join("\n");
      const jsonMatch = combinedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      return sanitizeAiPayload(
        parsed,
        fallback,
        "gemini-ai",
        `Google Gemini AI (${model})`,
        urlScanFindings
      );
    } catch {
      clearTimeout(timeout);
    }
  }

  return null;
}

async function analyzeWithGroqOrOpenAI(
  message: string,
  imageBase64: string | null,
  imageMimeType: string | null,
  fallback: AnalyzeResponsePayload,
  urlScanFindings: { flagged: boolean; riskScore: number; findings: string[]; url: string } | null
): Promise<AnalyzeResponsePayload | null> {
  const groqKey = getEnv("GROQ_API_KEY");
  const openaiKey = getEnv("OPENAI_API_KEY");

  const providersToTry: Array<{
    type: "openai" | "groq";
    key: string;
    endpoint: string;
    model: string;
  }> = [];

  if (openaiKey) {
    providersToTry.push({
      type: "openai",
      key: openaiKey,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: getEnv("OPENAI_MODEL", "gpt-4o-mini"),
    });
  }
  if (groqKey && !imageBase64) {
    providersToTry.push({
      type: "groq",
      key: groqKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: getEnv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    });
  }

  const urlContext = urlScanFindings
    ? `\n\n[Konteks Pemindaian Tautan]: URL ${urlScanFindings.url} -> ${
        urlScanFindings.flagged ? "BERBAHAYA" : "Aman"
      } (${urlScanFindings.findings.join("; ")})`
    : "";

  for (const prov of providersToTry) {
    const userContent: unknown =
      prov.type === "openai" && imageBase64 && imageMimeType
        ? [
            {
              type: "text",
              text: `Analisis pesan/screenshot berikut:\n${
                message || "(Baca teks dari gambar screenshot terlampir)"
              }${urlContext}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageMimeType};base64,${imageBase64}`,
              },
            },
          ]
        : `Analisis pesan berikut:\n${message}${urlContext}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 11000);

    try {
      const response = await fetch(prov.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${prov.key}`,
        },
        body: JSON.stringify({
          model: prov.model,
          temperature: 0.15,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) continue;
      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      return sanitizeAiPayload(
        parsed,
        fallback,
        prov.type === "openai" ? "openai-ai" : "groq-ai",
        prov.type === "openai"
          ? `OpenAI (${prov.model})`
          : `Groq Cloud AI (${prov.model})`,
        urlScanFindings
      );
    } catch {
      clearTimeout(timeout);
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let message = "";
    let hasScreenshot = false;
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawMsg = formData.get("message");
      const file = formData.get("screenshot");
      message = typeof rawMsg === "string" ? rawMsg.trim() : "";

      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const typedFile = file as File;
        if (!["image/png", "image/jpeg", "image/webp"].includes(typedFile.type)) {
          return NextResponse.json(
            { error: "Gunakan file PNG, JPG, atau WEBP." },
            { status: 400 }
          );
        }
        if (typedFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Ukuran gambar maksimal 5 MB." },
            { status: 400 }
          );
        }
        hasScreenshot = true;
        imageMimeType = typedFile.type;
        const ab = await typedFile.arrayBuffer();
        imageBase64 = Buffer.from(ab).toString("base64");
      }
    } else {
      const body = await request.json();
      message = typeof body?.message === "string" ? body.message.trim() : "";
    }

    if (!message && !hasScreenshot) {
      return NextResponse.json(
        { error: "Masukkan isi pesan atau unggah screenshot terlebih dahulu." },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Panjang pesan maksimal 5000 karakter." },
        { status: 400 }
      );
    }

    // Jika di dalam pesan terdapat URL (atau pengguna menempelkan link langsung di kolom chat),
    // jalankan pemindaian URL Multi-Engine (Safe Browsing + DNS Threat + AI) terlebih dahulu!
    const { urls } = extractEntities(message);
    let urlScanFindings: {
      flagged: boolean;
      riskScore: number;
      findings: string[];
      url: string;
    } | null = null;

    if (urls.length > 0) {
      try {
        const scanRes = await scanUrlComplete(urls[0]);
        urlScanFindings = {
          flagged: !scanRes.safe,
          riskScore: scanRes.riskScore,
          findings: scanRes.findings,
          url: scanRes.url,
        };
      } catch {
        // Ignore URL scan error if invalid format
      }
    }

    const fallback = evaluateHeuristic(message, hasScreenshot, urlScanFindings);

    // 1. Try Google Gemini API (supports both Text & Screenshot Vision OCR)
    const geminiResult = await analyzeWithGemini(
      message,
      imageBase64,
      imageMimeType,
      fallback,
      urlScanFindings
    );
    if (geminiResult) {
      return NextResponse.json(geminiResult);
    }

    // 2. Try OpenAI / Groq API
    const altAiResult = await analyzeWithGroqOrOpenAI(
      message,
      imageBase64,
      imageMimeType,
      fallback,
      urlScanFindings
    );
    if (altAiResult) {
      return NextResponse.json(altAiResult);
    }

    // 3. Fallback to Multi-Layer Heuristic Engine
    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json(
      { error: "Analisis tidak dapat dilakukan saat ini." },
      { status: 400 }
    );
  }
}
