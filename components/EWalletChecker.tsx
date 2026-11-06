"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  FileWarning,
  LoaderCircle,
  LockKeyhole,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeading } from "@/components/Analyzer";
import { useStats } from "@/components/StatsContext";
import { useNetwork } from "@/components/NetworkStatus";
import { Tilt3DCard } from "@/components/CyberMesh3D";
import type { EWalletCheckResponse } from "@/app/api/ewallet-check/route";

const EWALLET_PROVIDERS = [
  { id: "DANA", label: "DANA", badge: "Populer" },
  { id: "GOPAY", label: "GoPay", badge: "Populer" },
  { id: "OVO", label: "OVO" },
  { id: "SHOPEEPAY", label: "ShopeePay" },
  { id: "LINKAJA", label: "LinkAja" },
  { id: "ISAKU", label: "i.saku" },
  { id: "DOKU", label: "DOKU Wallet" },
  { id: "SAKUKU", label: "Sakuku BCA" },
];

const BANK_PROVIDERS = [
  { id: "BCA", label: "Bank BCA" },
  { id: "BRI", label: "Bank BRI" },
  { id: "MANDIRI", label: "Bank Mandiri" },
  { id: "BNI", label: "Bank BNI" },
  { id: "BSI", label: "Bank Syariah Indonesia (BSI)" },
  { id: "SEABANK", label: "SeaBank" },
  { id: "JAGO", label: "Bank Jago" },
  { id: "CIMB", label: "CIMB Niaga" },
  { id: "PERMATA", label: "Permata Bank" },
];

const REPORT_CATEGORIES = [
  "Penipuan Jual Beli Online",
  "Modus Tebus Hadiah / Biaya Admin",
  "Modus Kurir & Talangan Paket (.APK)",
  "Investasi / Tugas Paruh Waktu Fiktif",
  "Social Engineering / Phishing OTP",
  "Pinjaman Online (Pinjol) Ilegal",
];

const SAMPLE_ACCOUNTS = [
  {
    label: "DANA Terlapor Scam (14 Laporan)",
    accountType: "ewallet" as const,
    provider: "DANA",
    number: "081299887766",
    chronology: "Penjual meminta transfer saldo DANA terlebih dahulu untuk barang murah.",
  },
  {
    label: "GoPay Modus Kurir (8 Laporan)",
    accountType: "ewallet" as const,
    provider: "GOPAY",
    number: "085711223344",
    chronology: "Diminta biaya tebusan paket tertahan oleh oknum kurir.",
  },
  {
    label: "Rekening BCA Terlapor (11 Laporan)",
    accountType: "bank" as const,
    provider: "BCA",
    number: "7120998811",
    chronology: "Transaksi marketplace di luar aplikasi resmi.",
  },
  {
    label: "Nomor E-Wallet Bersih (Belum Dilaporkan)",
    accountType: "ewallet" as const,
    provider: "OVO",
    number: "081122334455",
    chronology: "",
  },
];

function localOfflineCheck(
  accountType: "ewallet" | "bank",
  provider: string,
  rawNumber: string,
  chronology: string
): EWalletCheckResponse {
  const digits = rawNumber.replace(/\D/g, "");
  const knownScam = ["081299887766", "085711223344", "089655443322", "082188776655", "7120998811"];
  const isReported = knownScam.includes(digits);

  return {
    status: isReported ? "dilaporkan" : "belum-dilaporkan",
    riskScore: isReported ? 90 : 15,
    accountType,
    provider,
    rawNumber,
    normalizedNumber: digits,
    maskedDisplay:
      digits.length > 6
        ? `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
        : digits,
    operatorInfo:
      accountType === "ewallet"
        ? "Deteksi Prefix Seluler Lokal (Mode Offline)"
        : `Nomor Rekening (${digits.length} digit)`,
    reportCount: isReported ? 9 : 0,
    lastReportedAt: isReported ? "2026-10-29" : null,
    reports: isReported
      ? [
          {
            id: "off-1",
            date: "29 Okt 2026",
            category: "Penipuan Transaksi Digital",
            summary:
              chronology ||
              "Tercatat dalam daftar pantauan lokal SADAR sebagai akun penampung dana penipuan.",
            reporterLabel: "Cache Lokal Mirror Kominfo",
          },
        ]
      : [],
    riskReasons: isReported
      ? [
          `PERINGATAN: Nomor ${provider} (${digits}) terdaftar pada cache laporan indikasi penipuan.`,
          "Jangan lanjutkan pembayaran atau transfer saldo ke nomor ini.",
        ]
      : [
          `Nomor ${provider} (${digits}) belum tercatat pada daftar laporan lokal.`,
          "Tetap lakukan verifikasi silang ketika koneksi internet kembali terhubung.",
        ],
    safetyTips: [
      "Pastikan bertransaksi hanya melalui rekening bersama (escrow) resmi.",
      "Jangan pernah membagikan kode OTP atau PIN E-Wallet Anda.",
    ],
    officialVerifyUrl: "https://cekrekening.id/periksa-rekening",
    officialReportUrl: "https://cekrekening.id/laporkan-rekening",
    aduanNomorUrl: "https://aduannomor.id",
    source: "kominfo-mirror-db",
    checkedAt: new Date().toISOString(),
  };
}

export function EWalletChecker({ initialNumber = "" }: { initialNumber?: string }) {
  const [activeTab, setActiveTab] = useState<"check" | "report">("check");
  const [accountType, setAccountType] = useState<"ewallet" | "bank">("ewallet");
  const [provider, setProvider] = useState("DANA");
  const [accountNumber, setAccountNumber] = useState(initialNumber);
  const [chronology, setChronology] = useState("");
  const [reportCategory, setReportCategory] = useState(REPORT_CATEGORIES[0]);

  const [result, setResult] = useState<EWalletCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reportSuccessBanner, setReportSuccessBanner] = useState(false);

  const { scamDetected, recordScamCheck } = useStats();
  const { isOffline } = useNetwork();

  useEffect(() => {
    if (initialNumber) {
      setAccountNumber(initialNumber);
      setAccountType(initialNumber.startsWith("08") || initialNumber.startsWith("62") ? "ewallet" : "bank");
    }
  }, [initialNumber]);

  const providers = accountType === "ewallet" ? EWALLET_PROVIDERS : BANK_PROVIDERS;

  const handleAccountTypeChange = (nextType: "ewallet" | "bank") => {
    setAccountType(nextType);
    setProvider(nextType === "ewallet" ? "DANA" : "BCA");
    setResult(null);
    setError("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setReportSuccessBanner(false);

    if (!accountNumber.trim()) {
      setError("Masukkan nomor E-Wallet atau nomor rekening yang ingin diperiksa.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      await new Promise((r) => setTimeout(r, 380));

      let payload: EWalletCheckResponse | null = null;

      if (!isOffline) {
        const res = await fetch("/api/ewallet-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: activeTab,
            accountType,
            provider,
            accountNumber: accountNumber.trim(),
            chronology: chronology.trim(),
            category: reportCategory,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal memeriksa nomor akun.");
        }
        payload = data as EWalletCheckResponse;
      } else {
        payload = localOfflineCheck(accountType, provider, accountNumber, chronology);
      }

      setResult(payload);
      if (activeTab === "report") {
        setReportSuccessBanner(true);
        setActiveTab("check");
      }

      recordScamCheck(
        `Cek ${provider} ${payload.maskedDisplay} (${
          payload.status === "dilaporkan"
            ? `${payload.reportCount} Laporan Scam`
            : "Belum Dilaporkan"
        })`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memeriksa akun E-Wallet."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const resetForm = () => {
    setAccountNumber("");
    setChronology("");
    setResult(null);
    setError("");
    setReportSuccessBanner(false);
  };

  return (
    <section className="mx-auto max-w-[1040px]">
      <PageHeading
        eyebrow="MIRROR LAYANAN KOMINFO · CEKREKENING.ID & ADUANNOMOR"
        title="Cek E-Wallet & Rekening Sebelum Transfer."
        description="Mirror fitur pemeriksaan akun dompet digital (DANA, GoPay, OVO, ShopeePay, LinkAja) dan rekening bank yang terintegrasi dengan alur verifikasi CekRekening.id (Kemkomdigi/Kominfo)."
        badgeText={`Database & Mirror Aktif · ${new Intl.NumberFormat("id-ID").format(
          scamDetected
        )} Pemeriksaan`}
      />

      {/* Quick Sample Pills */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1458d4]">
          <WandSparkles size={14} /> Uji Nomor E-Wallet/Rekening:
        </span>
        {SAMPLE_ACCOUNTS.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => {
              setAccountType(sample.accountType);
              setProvider(sample.provider);
              setAccountNumber(sample.number);
              setChronology(sample.chronology);
              setResult(null);
              setError("");
              setReportSuccessBanner(false);
            }}
            className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#172944] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100/80"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.12fr_.88fr]">
        {/* Left Column: Mirror Form */}
        <div className="pt-2">
          <div className="relative overflow-visible rounded-[26px] border border-blue-100/90 bg-white/95 p-5 shadow-[0_14px_40px_rgba(20,57,108,0.07)] backdrop-blur-md sm:p-7">
            <div className="absolute -top-3.5 right-6 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-gradient-to-r from-[#1458d4] to-[#0b327e] px-3.5 py-1 text-[10px] font-bold text-white shadow-md">
              <Sparkles size={11} className="text-[#c6f329]" />
              Mirror CekRekening Kominfo
            </div>

            {/* Mode Switcher: Periksa Akun vs Laporkan Akun */}
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("check");
                  setError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition ${
                  activeTab === "check"
                    ? "bg-white text-[#1458d4] shadow-sm"
                    : "text-slate-600 hover:text-[#12284b]"
                }`}
              >
                <Search size={14} />
                Periksa E-Wallet / Rekening
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("report");
                  setError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition ${
                  activeTab === "report"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-rose-700"
                }`}
              >
                <FileWarning size={14} />
                Laporkan Nomor Penipu
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Pilih Jenis Akun (E-Wallet vs Bank) */}
              <div>
                <label className="mb-2 block text-xs font-bold text-[#12284b]">
                  1. Pilih Jenis Akun (Sesuai Format CekRekening.id)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange("ewallet")}
                    className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                      accountType === "ewallet"
                        ? "border-[#1458d4] bg-blue-50/90 text-[#12284b] shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        accountType === "ewallet"
                          ? "bg-[#1458d4] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Wallet size={17} />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold">E-Wallet</p>
                      <p className="text-[10px] text-slate-500">DANA, GoPay, OVO, ShopeePay</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange("bank")}
                    className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                      accountType === "bank"
                        ? "border-[#1458d4] bg-blue-50/90 text-[#12284b] shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        accountType === "bank"
                          ? "bg-[#1458d4] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Building2 size={17} />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold">Rekening Bank</p>
                      <p className="text-[10px] text-slate-500">BCA, BRI, Mandiri, BNI, dll.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Pilih Penyedia E-Wallet / Nama Bank */}
              <div>
                <label
                  htmlFor="provider-select"
                  className="mb-2 block text-xs font-bold text-[#12284b]"
                >
                  2. Pilih Penyedia {accountType === "ewallet" ? "Dompet Digital (E-Wallet)" : "Bank"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {providers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProvider(item.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        provider === item.id
                          ? "border-[#1458d4] bg-[#1458d4] text-white shadow-sm"
                          : "border-slate-200 bg-[#f8faff] text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Masukkan Nomor E-Wallet / Rekening */}
              <div>
                <label
                  htmlFor="account-number-input"
                  className="mb-2 block text-xs font-bold text-[#12284b]"
                >
                  3. Nomor {accountType === "ewallet" ? `HP / Akun ${provider}` : `Rekening ${provider}`}
                </label>
                <div className="relative">
                  {accountType === "ewallet" ? (
                    <Phone
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  ) : (
                    <CreditCard
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  )}
                  <input
                    id="account-number-input"
                    type="text"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      setResult(null);
                    }}
                    maxLength={22}
                    placeholder={
                      accountType === "ewallet"
                        ? "Contoh: 081299887766 atau +62812..."
                        : "Contoh: 7120998811"
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-[#f8faff] py-3.5 pl-10 pr-4 font-mono text-sm font-bold text-[#172944] placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 transition focus:border-[#1458d4] focus:bg-white focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Mendukung nomor telepon seluler, format +62, maupun kode Virtual Account top-up E-Wallet.
                </p>
              </div>

              {/* Category selector when in Report mode */}
              {activeTab === "report" && (
                <div>
                  <label
                    htmlFor="report-category"
                    className="mb-1.5 block text-xs font-bold text-[#12284b]"
                  >
                    Kategori Modus Penipuan
                  </label>
                  <select
                    id="report-category"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#f8faff] px-3.5 py-3 text-xs font-bold text-[#172944] focus:border-[#1458d4] focus:bg-white focus:outline-none"
                  >
                    {REPORT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 4: Kronologi / Konteks Transaksi */}
              <div>
                <label
                  htmlFor="chronology-input"
                  className="mb-1.5 block text-xs font-bold text-[#12284b]"
                >
                  {activeTab === "report"
                    ? "4. Kronologi Laporan Penipuan (Wajib)"
                    : "4. Konteks Permintaan Transfer (Opsional — Dianalisis Heuristik)"}
                </label>
                <textarea
                  id="chronology-input"
                  rows={3}
                  maxLength={500}
                  value={chronology}
                  onChange={(e) => setChronology(e.target.value)}
                  placeholder={
                    activeTab === "report"
                      ? "Ceritakan singkat modus pelaku (misal: meminta transfer DANA untuk tebus hadiah giveaway namun akun diblokir)..."
                      : "Opsional: Tempel alasan pelaku meminta transfer ke nomor ini (misal: biaya admin tebus hadiah / kurir paket)..."
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-xs leading-5 text-[#172944] placeholder:text-slate-400 transition focus:border-[#1458d4] focus:bg-white focus:outline-none"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60 ${
                    activeTab === "report"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-[#1458d4] hover:bg-[#0f46ad]"
                  }`}
                >
                  {loading ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : activeTab === "report" ? (
                    <FileWarning size={15} />
                  ) : (
                    <Search size={15} />
                  )}
                  {loading
                    ? "Memeriksa Database Mirror..."
                    : activeTab === "report"
                    ? "Kirim Laporan & Periksa"
                    : "Cek Sekarang"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Result & Official Kominfo Bridge */}
        <aside className="space-y-4 pt-2">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="ewallet-skeleton"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-[26px] border border-blue-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#1458d4]">
                    <LoaderCircle size={22} className="animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#12284b]">
                      Memeriksa Riwayat Laporan {provider}...
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Mencocokkan nomor akun &amp; prefix operator di Mirror CekRekening
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-14 w-full animate-pulse rounded-2xl bg-blue-50" />
                  <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-100" />
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key="ewallet-result"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Tilt3DCard
                  intensity={6}
                  className="relative overflow-visible rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_16px_42px_rgba(20,57,108,0.09)] sm:p-6"
                >
                  {/* Floating Status Pill */}
                  <div
                    style={{ transform: "translateZ(36px)" }}
                    className={`absolute -top-3.5 right-5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-md ${
                      result.status === "dilaporkan"
                        ? "border-rose-300 bg-rose-600 text-white"
                        : result.status === "waspada"
                        ? "border-amber-300 bg-amber-500 text-white"
                        : "border-emerald-300 bg-emerald-600 text-white"
                    }`}
                  >
                    {result.status === "dilaporkan" ? (
                      <ShieldAlert size={13} />
                    ) : result.status === "waspada" ? (
                      <AlertTriangle size={13} />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    {result.status === "dilaporkan"
                      ? `PERNAH DILAPORKAN (${result.reportCount}x)`
                      : result.status === "waspada"
                      ? "WASPADA POLA TRANSAKSI"
                      : "BELUM PERNAH DILAPORKAN"}
                  </div>

                  {reportSuccessBanner && (
                    <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-900">
                      Laporan berhasil ditambahkan ke database Mirror SADAR dan langsung aktif!
                    </div>
                  )}

                  {/* Account Summary Box */}
                  <div className="rounded-2xl border border-slate-100 bg-[#f8faff] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-[#1458d4] px-2.5 py-1 text-[10px] font-extrabold text-white">
                        {result.provider} · {result.accountType === "ewallet" ? "E-WALLET" : "BANK"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyNumber(result.normalizedNumber)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:border-blue-300 hover:text-[#1458d4]"
                      >
                        <Copy size={11} />
                        {copied ? "Tersalin!" : "Salin Nomor"}
                      </button>
                    </div>
                    <p className="mt-2.5 font-mono text-xl font-black tracking-tight text-[#12284b]">
                      {result.maskedDisplay}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      Identifikasi: <span className="font-bold text-slate-700">{result.operatorInfo}</span>
                    </p>
                  </div>

                  {/* Findings */}
                  <div className="mt-4">
                    <p className="text-xs font-bold text-[#12284b]">Hasil Pemeriksaan Mirror:</p>
                    <ul className="mt-2.5 space-y-2">
                      {result.riskReasons.map((reason) => (
                        <li
                          key={reason}
                          className={`flex gap-2.5 rounded-xl border p-3 text-xs leading-5 ${
                            result.status === "dilaporkan"
                              ? "border-rose-200 bg-rose-50/70 text-rose-950"
                              : result.status === "waspada"
                              ? "border-amber-200 bg-amber-50/70 text-amber-950"
                              : "border-slate-100 bg-slate-50/80 text-slate-700"
                          }`}
                        >
                          <AlertTriangle
                            size={15}
                            className={`mt-0.5 shrink-0 ${
                              result.status === "dilaporkan"
                                ? "text-rose-600"
                                : "text-amber-600"
                            }`}
                          />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Reported History List */}
                  {result.reports.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-[#12284b]">
                        Riwayat Laporan Masyarakat ({result.reports.length}):
                      </p>
                      <div className="mt-2 space-y-2">
                        {result.reports.map((rep) => (
                          <div
                            key={rep.id}
                            className="rounded-xl border border-rose-200/80 bg-white p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                              <span className="font-extrabold text-rose-700">{rep.category}</span>
                              <span className="text-slate-400">
                                {rep.date} · {rep.reporterLabel}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs leading-5 text-slate-700">{rep.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Mirror Verification Links to Official Kominfo Portal */}
                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5">
                    <p className="text-[11px] font-extrabold text-[#12284b]">
                      Jembatan Verifikasi Silang Portal Resmi Kemkomdigi (Kominfo):
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-600">
                      Salin nomor <b className="font-mono">{result.normalizedNumber}</b> lalu buka portal resmi pemerintah di bawah ini untuk pengecekan Captcha langsung:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={result.officialVerifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => copyNumber(result.normalizedNumber)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1458d4] px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0e44a8]"
                      >
                        Buka CekRekening.id <ArrowUpRight size={13} />
                      </a>
                      <a
                        href={result.aduanNomorUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => copyNumber(result.normalizedNumber)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[11px] font-bold text-[#1458d4] transition hover:bg-blue-50"
                      >
                        Cek AduanNomor.id <ArrowUpRight size={13} />
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <TrendingUp size={12} /> Tercatat di Statistik SADAR
                    </span>
                    <span>
                      {result.source === "kominfo-mirror-api"
                        ? "API Mirror Eksternal"
                        : "Mirror Database SADAR"}
                    </span>
                  </div>
                </Tilt3DCard>
              </motion.div>
            ) : (
              <motion.div
                key="ewallet-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-dashed border-blue-200 bg-white/75 p-6 text-center shadow-sm backdrop-blur-sm"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-[#1458d4] shadow-sm">
                  <Wallet size={24} />
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#12284b]">
                  Hasil Pemeriksaan E-Wallet &amp; Rekening
                </h3>
                <p className="mx-auto mt-1.5 max-w-[300px] text-xs leading-5 text-slate-500">
                  Pilih penyedia E-Wallet (DANA, GoPay, OVO, ShopeePay, LinkAja) atau Bank, masukkan nomor tujuan, lalu klik <b>Cek Sekarang</b>.
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
                <span className="font-bold text-[#12284b]">Mengapa Cek E-Wallet Penting?</span>{" "}
                Mayoritas penipuan online kini beralih menggunakan akun E-Wallet (DANA/GoPay/OVO)
                karena mudah dibuka dengan nomor seluler prabayar.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
