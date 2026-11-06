"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  MessageSquareWarning,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
  WandSparkles,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStats } from "@/components/StatsContext";
import { useNetwork } from "@/components/NetworkStatus";
import { Tilt3DCard } from "@/components/CyberMesh3D";

export type AnalysisResult = {
  score: number | null;
  level: "aman" | "waspada" | "berbahaya" | "belum-dianalisis";
  category?: string;
  reasons: string[];
  recommendations?: string[];
  extractedNumbers?: string[];
  extractedUrls?: string[];
  ocrText?: string;
  source:
    | "gemini-ai"
    | "openai-ai"
    | "groq-ai"
    | "heuristic-engine"
    | "demo"
    | "ocr-placeholder"
    | "offline-local";
  providerLabel?: string;
};

const SAMPLE_MESSAGES = [
  {
    label: "Modus Kurir .APK",
    tone: "berbahaya",
    text: "INFO PENGIRIMAN: Paket Anda tertahan di gudang transit karena resi rusak. Segera unduh dan buka aplikasi Cek-Foto-Paket.apk melalui https://kurir-paket.xyz dalam 15 menit atau hubungi admin 085711223344.",
  },
  {
    label: "Modus Hadiah & E-Wallet",
    tone: "berbahaya",
    text: "SELAMAT! Akun Anda terpilih mendapatkan bonus saldo Rp10.000.000. Klaim sekarang di bit.ly/klaim-hadiah-resmi, transfer biaya aktivasi Rp150.000 ke DANA 081299887766 dan sebutkan 6 digit kode OTP Anda.",
  },
  {
    label: "Pesan Normal (Aman)",
    tone: "aman",
    text: "Halo teman-teman, jangan lupa jadwal diskusi kelompok keamanan siber kita hari Jumat pukul 14.00 di ruang kelas biasa ya. Terima kasih!",
  },
];

function localFallbackEvaluate(rawMessage: string, hasScreenshot: boolean): AnalysisResult {
  const text = rawMessage.trim();
  const rawPhones =
    text.match(/(?:\+62|62|08)\d[\d\s-]{7,14}\d|\b\d{10,16}\b/g) || [];
  const extractedNumbers = Array.from(
    new Set(
      rawPhones
        .map((n) => n.replace(/[\s-]/g, ""))
        .filter((n) => n.length >= 10 && n.length <= 16)
    )
  ).slice(0, 4);

  if (!text && hasScreenshot) {
    return {
      score: 48,
      level: "waspada",
      category: "Pemeriksaan Screenshot (Mode Lokal)",
      reasons: [
        "Screenshot diterima dalam mode lokal. Hubungkan internet & isi GEMINI_API_KEY di .env untuk membaca gambar (OCR Vision) otomatis.",
        "Periksa secara manual apakah pengirim meminta kode OTP, PIN, kata sandi, atau file .apk.",
        "Hubungi lembaga terkait melalui kanal resmi bila pesan mencurigakan.",
      ],
      recommendations: [
        "Jangan pernah menginstal file .apk yang dikirim melalui WhatsApp/Telegram.",
        "Periksa nomor telepon pengirim pada menu Cek E-Wallet.",
      ],
      extractedNumbers: [],
      source: "offline-local",
      providerLabel: "Mesin Heuristik Lokal (Offline)",
    };
  }

  const lower = text.toLowerCase();
  let score = 8;
  let category = "Analisis Percakapan";
  const reasons: string[] = [];

  if (/(malware|trojan|ransomware|phish|exploit|testing\.google\.test|testsafebrowsing)/i.test(lower)) {
    score = Math.max(score, 92);
    category = "Tautan Distribusi Malware / Phishing Berbahaya";
    reasons.push(
      "Memuat tautan pengujian malware/phishing berbahaya (Google Safe Browsing Malware Signature)."
    );
  }

  if (/(otp|kode rahasia|pin|password|kata sandi|cvv|kode verifikasi)/i.test(lower)) {
    score += 42;
    category = "Pencurian Kredensial / Phishing OTP";
    reasons.push(
      "Meminta kredensial rahasia (OTP/PIN/kata sandi) yang tidak pernah diminta petugas resmi."
    );
  }
  if (/(\.apk\b|undangan\.apk|resi\.apk|cek-foto-paket)/i.test(lower)) {
    score += 46;
    category = "Malware Pencuri SMS (.APK Scam)";
    reasons.push(
      "Mengarahkan pemasangan file aplikasi (.apk) berbahaya yang dapat menyadap SMS OTP perbankan."
    );
  }
  if (/(menang|hadiah|undian|klaim sekarang|bonus|saldo gratis|giveaway|jutawan)/i.test(lower)) {
    score += 26;
    if (category === "Analisis Percakapan") category = "Penipuan Undian & Hadiah Palsu";
    reasons.push("Mengandung iming-iming hadiah atau bonus instan untuk memancing emosi penerima.");
  }
  if (
    /(segera|dalam \d+ menit|diblokir|ditangguhkan|hangus|darurat|terakhir hari ini|paket tertahan)/i.test(
      lower
    )
  ) {
    score += 24;
    reasons.push(
      "Menggunakan tekanan waktu atau ancaman pemblokiran agar korban panik dan terburu-buru."
    );
  }
  if (/(https?:\/\/|bit\.ly|tinyurl|s\.id|t\.me|wa\.me|\.xyz|\.top|\.click|\.apk)/i.test(lower)) {
    score += 22;
    reasons.push(
      "Memuat tautan eksternal, pemendek URL, atau file aplikasi (.apk) yang berisiko berbahaya."
    );
  }
  if (/(transfer|biaya admin|rekening|dana|gopay|ovo|qris|bayar)/i.test(lower)) {
    score += 18;
    reasons.push("Menyebutkan instruksi pembayaran atau transfer dana secara langsung.");
  }

  score = Math.min(98, Math.max(5, score));
  const level = score >= 65 ? "berbahaya" : score >= 35 ? "waspada" : "aman";

  if (reasons.length === 0) {
    reasons.push("Tidak ditemukan kata kunci penipuan umum, namun tetap verifikasi identitas pengirim.");
    reasons.push("Jangan pernah mengklik tautan atau membagikan data pribadi bila ragu.");
  }

  return {
    score,
    level,
    category,
    reasons,
    recommendations:
      level === "berbahaya"
        ? [
            "Abaikan dan blokir kontak pengirim segera.",
            "Jangan mengklik tautan atau mentransfer uang ke nomor yang tercantum.",
          ]
        : [
            "Tetap jaga kerahasiaan kode OTP, PIN, dan password Anda.",
          ],
    extractedNumbers,
    source: "offline-local",
    providerLabel: "Mesin Heuristik Lokal (Offline)",
  };
}

export function Analyzer({
  onInspectEWallet,
}: {
  onInspectEWallet?: (accountNumber: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statIncrementNotice, setStatIncrementNotice] = useState(false);

  const { scamDetected, recordScamCheck } = useStats();
  const { isOffline } = useNetwork();

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");
    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Gunakan file PNG, JPG, atau WEBP.");
      event.target.value = "";
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : "");
    setResult(null);
  };

  const analyze = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() && !image) {
      setError("Masukkan isi pesan atau unggah screenshot terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setStatIncrementNotice(false);

    try {
      await new Promise((r) => setTimeout(r, 380));

      let analysisPayload: AnalysisResult | null = null;

      if (!isOffline) {
        try {
          const response = image
            ? await (() => {
                const body = new FormData();
                body.append("screenshot", image);
                if (message.trim()) body.append("message", message.trim());
                return fetch("/api/analyze", { method: "POST", body });
              })()
            : await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: message.trim() }),
              });

          const payload = await response.json();
          if (response.ok) {
            analysisPayload = payload as AnalysisResult;
          }
        } catch {
          // Fallback to local engine if API unreachable
        }
      }

      if (!analysisPayload) {
        analysisPayload = localFallbackEvaluate(message, Boolean(image));
      }

      setResult(analysisPayload);
      recordScamCheck(
        `Analisis chat (${analysisPayload.level.toUpperCase()} · Skor ${analysisPayload.score ?? 0}%)`
      );
      setStatIncrementNotice(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Terjadi kesalahan saat menganalisis pesan."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setMessage("");
    setImage(null);
    setPreview("");
    setResult(null);
    setError("");
    setStatIncrementNotice(false);
  };

  const levelBadgeStyle =
    result?.level === "berbahaya"
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : result?.level === "aman"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-amber-300 bg-amber-50 text-amber-800";

  const barColor =
    result?.level === "berbahaya"
      ? "from-amber-500 via-rose-500 to-red-600"
      : result?.level === "aman"
      ? "from-emerald-400 to-teal-600"
      : "from-amber-400 to-orange-500";

  const isCloudAi =
    result?.source === "gemini-ai" ||
    result?.source === "openai-ai" ||
    result?.source === "groq-ai";

  return (
    <section className="mx-auto max-w-[1000px]">
      <PageHeading
        eyebrow="ANALISIS PESAN · AI VISION & HEURISTIK MULTI-LAPIS"
        title="Jangan buru-buru percaya."
        description="Tempel pesan mencurigakan atau unggah screenshot. Terhubung dengan integrasi AI Pihak Ketiga (Google Gemini Vision / OpenAI / Groq) dan detektor heuristik untuk membedah modus penipuan."
        badgeText={`Total Deteksi: ${new Intl.NumberFormat("id-ID").format(scamDetected)}`}
      />

      {/* Interactive Quick Sample Pills */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1458d4]">
          <WandSparkles size={14} /> Coba Contoh Cepat:
        </span>
        {SAMPLE_MESSAGES.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => {
              setMessage(sample.text);
              setResult(null);
              setError("");
            }}
            className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#172944] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100/80"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        {/* Form Card with Out-of-bounds 3D Top Badge */}
        <div className="pt-2">
          <form
            onSubmit={analyze}
            className="relative overflow-visible rounded-[26px] border border-blue-100/90 bg-white/95 p-5 shadow-[0_14px_40px_rgba(20,57,108,0.07)] backdrop-blur-md sm:p-7"
          >
            <div className="absolute -top-3.5 right-6 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-gradient-to-r from-[#1458d4] to-[#0d3b94] px-3.5 py-1 text-[10px] font-bold text-white shadow-md">
              <Sparkles size={11} className="text-[#c6f329]" />
              {isOffline ? "Mesin Lokal Offline" : "API AI & Heuristik Aktif"}
            </div>

            <label
              htmlFor="chat-message"
              className="flex items-center gap-2 text-xs font-bold text-[#12284b]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-[#1458d4]">
                <MessageSquareWarning size={15} />
              </span>
              Isi Pesan atau Chat yang Mencurigakan
            </label>

            <textarea
              id="chat-message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setResult(null);
              }}
              maxLength={5000}
              rows={7}
              placeholder="Contoh: Selamat! Anda memenangkan hadiah. Klik link ini dan kirim kode OTP untuk klaim..."
              className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-[#f8faff] px-4 py-3.5 text-sm leading-6 text-[#172944] placeholder:text-slate-400 transition focus:border-[#1458d4] focus:bg-white focus:outline-none"
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
              <span>Jangan masukkan OTP, PIN, atau password asli.</span>
              <span className="tabular-nums font-medium">{message.length}/5000</span>
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-bold tracking-wider text-slate-400">
                ATAU UNGGAH SCREENSHOT
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-3.5 transition hover:border-[#1458d4] hover:bg-blue-50/80">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1458d4] text-white shadow-sm transition group-hover:scale-105">
                <Upload size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-[#12284b]">
                  {image ? image.name : "Pilih gambar screenshot percakapan"}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Format PNG, JPG, WEBP · Maksimal 5 MB (Mendukung AI Vision OCR)
                </span>
              </span>
              <FileImage size={18} className="text-blue-600" />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={onFileChange}
              />
            </label>

            {preview && (
              <div className="relative mt-3 inline-block">
                <img
                  src={preview}
                  alt="Pratinjau screenshot yang dipilih"
                  className="max-h-36 rounded-xl border border-blue-200 object-contain shadow-sm"
                />
                <button
                  type="button"
                  aria-label="Hapus screenshot"
                  onClick={() => {
                    setImage(null);
                    setPreview("");
                  }}
                  className="absolute -right-2 -top-2 rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow hover:bg-rose-50 hover:text-rose-600"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1458d4] px-5 py-3 text-xs font-bold text-white shadow-[0_10px_25px_rgba(20,88,212,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0f46ad] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <MessageSquareWarning size={15} />
                )}
                {loading ? "Memindai Pola Pesan..." : "Analisis Pesan Sekarang"}
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <RotateCcw size={14} /> Bersihkan
              </button>
            </div>
          </form>
        </div>

        {/* Result & Telemetry Column */}
        <aside className="space-y-4 pt-2">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-skeleton"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-[26px] border border-blue-100 bg-white p-6 shadow-[0_14px_40px_rgba(20,57,108,0.07)]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#1458d4]">
                    <LoaderCircle size={22} className="animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#12284b]">Menganalisis Struktur Pesan...</p>
                    <p className="text-[11px] text-slate-500">
                      Memeriksa indikasi urgensi, tautan, nomor E-Wallet, &amp; permintaan OTP
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-12 w-1/3 animate-pulse rounded-2xl bg-blue-100/70" />
                  <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
                  <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-50" />
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result-card"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
              >
                <Tilt3DCard
                  intensity={7}
                  className="relative overflow-visible rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_16px_42px_rgba(20,57,108,0.09)] sm:p-6"
                >
                  {/* Out-of-bounds 3D Floating Status Badge */}
                  <div
                    style={{ transform: "translateZ(38px)" }}
                    className={`absolute -top-3.5 right-5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-md ${levelBadgeStyle}`}
                  >
                    {result.level === "berbahaya" ? (
                      <ShieldAlert size={14} />
                    ) : result.level === "aman" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                    {result.level === "belum-dianalisis" ? "Belum dianalisis" : result.level}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                      SKOR INDIKASI RISIKO
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <p className="tabular-nums text-4xl font-black tracking-tight text-[#12284b]">
                        {result.score === null ? "—" : `${result.score}%`}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isCloudAi
                            ? "bg-blue-100 text-[#1458d4]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Cpu size={11} />
                        {result.providerLabel ||
                          (result.source === "offline-local"
                            ? "Heuristik Lokal"
                            : "Mesin Heuristik SADAR")}
                      </span>
                    </div>
                    {result.category && (
                      <p className="mt-1.5 text-xs font-bold text-[#1458d4]">
                        Kategori: {result.category}
                      </p>
                    )}
                  </div>

                  {/* Animated Risk Meter Bar */}
                  <div className="my-4 h-3 overflow-hidden rounded-full bg-slate-100 p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.score ?? 0}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                    />
                  </div>

                  {/* Live Stat Increment Confirmation Banner */}
                  {statIncrementNotice && (
                    <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-lime-300 bg-[#f4fce0] px-3 py-2 text-[11px] font-bold text-[#1d3b0e]">
                      <span className="inline-flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-emerald-700" />
                        Statistik Deteksi Scam Bertambah +1
                      </span>
                      <span className="tabular-nums rounded-md bg-white px-2 py-0.5 text-[10px] shadow-sm">
                        Total: {new Intl.NumberFormat("id-ID").format(scamDetected)}
                      </span>
                    </div>
                  )}

                  {result.ocrText && (
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1458d4]">
                        Teks Terbaca dari Screenshot (AI Vision OCR):
                      </p>
                      <p className="mt-1 text-xs italic leading-5 text-slate-700">
                        &ldquo;{result.ocrText}&rdquo;
                      </p>
                    </div>
                  )}

                  <p className="text-xs font-bold text-[#12284b]">Temuan &amp; Indikator:</p>
                  <ul className="mt-2.5 space-y-2">
                    {result.reasons.map((reason) => (
                      <li
                        key={reason}
                        className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs leading-5 text-slate-700"
                      >
                        <AlertTriangle
                          size={15}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>

                  {result.recommendations && result.recommendations.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-[#12284b]">Langkah Rekomendasi:</p>
                      <ul className="mt-2 space-y-1.5">
                        {result.recommendations.map((rec) => (
                          <li
                            key={rec}
                            className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[11px] leading-5 text-emerald-950"
                          >
                            <CheckCircle2
                              size={14}
                              className="mt-0.5 shrink-0 text-emerald-600"
                            />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Bridge to E-Wallet Checker if phone/account number detected in chat */}
                  {result.extractedNumbers &&
                    result.extractedNumbers.length > 0 &&
                    onInspectEWallet && (
                      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5">
                        <p className="text-[11px] font-extrabold text-[#12284b]">
                          Terdeteksi Nomor Akun/Telepon di Dalam Chat:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.extractedNumbers.map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => onInspectEWallet(num)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1458d4] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0f46ad]"
                            >
                              <Wallet size={13} />
                              Cek E-Wallet/Rekening: {num}
                              <ArrowUpRight size={12} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  <p className="mt-4 border-t border-slate-100 pt-3.5 text-[11px] leading-5 text-slate-500">
                    Hasil ini bersifat bantuan edukatif &amp; deteksi dini. Hubungi institusi
                    melalui kanal resmi bila ragu.
                  </p>
                </Tilt3DCard>
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-[260px] flex-col items-center justify-center rounded-[26px] border border-dashed border-blue-200 bg-white/75 p-6 text-center shadow-sm backdrop-blur-sm"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-[#1458d4] shadow-sm">
                  <MessageSquareWarning size={24} />
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#12284b]">
                  Hasil Analisismu Muncul di Sini
                </h3>
                <p className="mx-auto mt-1.5 max-w-[280px] text-xs leading-5 text-slate-500">
                  Kami akan memindai ciri manipulasi seperti ancaman blokir, iming-iming hadiah,
                  tautan tiruan, nomor E-Wallet penipu, atau permintaan kode OTP.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <div className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <LockKeyhole size={15} />
              </span>
              <p className="text-[11px] leading-5 text-slate-600">
                <span className="font-bold text-[#12284b]">Privasi Kamu Utama.</span> Pesan diproses
                secara instan dan tidak disimpan permanen. Jangan pernah mengirimkan OTP atau PIN.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  badgeText,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badgeText?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mb-7 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1458d4]">
          <ShieldCheck size={12} />
          {eyebrow}
        </div>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.035em] text-[#11264a] sm:text-[36px]">
          {title}
        </h1>
        <p className="mt-2 max-w-[660px] text-xs leading-6 text-slate-600 sm:text-sm">
          {description}
        </p>
      </div>
      {badgeText && (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-[#1458d4] shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {badgeText}
        </div>
      )}
    </motion.div>
  );
}
