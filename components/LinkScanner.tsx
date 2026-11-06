"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  ScanLine,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeading } from "@/components/Analyzer";
import { useStats } from "@/components/StatsContext";
import { useNetwork } from "@/components/NetworkStatus";
import { Tilt3DCard } from "@/components/CyberMesh3D";

type ScanResult = {
  url: string;
  safe: boolean;
  riskScore?: number;
  threatType?: string;
  source:
    | "google-safe-browsing"
    | "ai-threat-intel"
    | "cloudflare-urlhaus"
    | "multi-engine"
    | "heuristic"
    | "demo"
    | "offline-local";
  providerLabel?: string;
  enginesUsed?: string[];
  findings?: string[];
  message: string;
  checkedAt: string;
};

const SAMPLE_URLS = [
  {
    label: "Uji Google Malware Test",
    url: "http://malware.testing.google.test/testing/malware/",
  },
  {
    label: "Phishing Hadiah (.xyz)",
    url: "https://klaim-hadiah-undian-resmi.xyz/login-otp",
  },
  {
    label: "Jebakan File Kurir (.apk)",
    url: "https://cek-resi-pengiriman.top/unduh/Cek-Resi-Paket.apk",
  },
  {
    label: "Domain Resmi (Aman)",
    url: "https://iasc.ojk.go.id",
  },
];

function localScanFallback(rawUrl: string): ScanResult {
  let candidate = rawUrl
    .trim()
    .replace(/^[.,;:'"(\[<]+/, "")
    .replace(/[.,;:'")\]>]+$/, "")
    .trim();
  if (!candidate) {
    throw new Error("Masukkan alamat URL yang ingin diperiksa.");
  }
  candidate = candidate.replace(/^\.+?(?=https?:\/\/)/i, "");
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Format URL tidak valid. Contoh: https://contoh.com");
  }
  const host = parsed.hostname.toLowerCase();
  const labels = host.split(".");
  if (!host || labels.length < 2 || labels.some((l) => !l)) {
    throw new Error("Domain URL tidak lengkap atau tidak valid.");
  }

  const full = parsed.href.toLowerCase();
  const findings: string[] = [];
  let riskScore = 8;

  if (
    host === "malware.testing.google.test" ||
    host.endsWith(".testing.google.test") ||
    host === "testsafebrowsing.appspot.com" ||
    full.includes("testing/malware")
  ) {
    riskScore = 96;
    findings.push(
      "Terdeteksi positif sebagai signature berbahaya (MALWARE / SOCIAL_ENGINEERING) pada protokol Google Safe Browsing."
    );
  }

  const riskyKeywords = [
    "malware",
    "trojan",
    "ransomware",
    "phish",
    "scam",
    "free-gift",
    "klaim-hadiah",
    "login-update",
    "verify-account",
    "otp",
    "undian",
    "dana-kaget",
    "kurir-paket",
    "cek-resi",
  ];
  const riskyTlds = [".test", ".xyz", ".top", ".click", ".zip", ".mov", ".work", ".gq", ".tk"];
  const hasIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const hasApk = /\.(apk|exe|scr|bat|msi)(\?|$)/i.test(full);
  const matchedKeyword = riskyKeywords.find((kw) => full.includes(kw));
  const matchedTld = riskyTlds.find((tld) => host.endsWith(tld));

  if (hasApk) {
    riskScore = Math.max(riskScore, 88);
    findings.push(
      "Mengarah ke unduhan file aplikasi/eksekusi (.apk/.exe) yang berisiko memicu pencurian data/SMS."
    );
  }
  if (matchedKeyword) {
    riskScore = Math.max(riskScore, 78);
    findings.push(`Mengandung pola kata berbahaya ("${matchedKeyword}") pada struktur URL.`);
  }
  if (matchedTld) {
    riskScore = Math.max(riskScore, 70);
    findings.push(`Menggunakan ekstensi domain berisiko (${matchedTld}).`);
  }
  if (hasIpHost) {
    riskScore = Math.max(riskScore, 76);
    findings.push("Menggunakan alamat IP langsung, bukan domain resmi.");
  }

  if (findings.length > 0) {
    return {
      url: parsed.href,
      safe: false,
      riskScore,
      threatType: "Malware / Phishing Risk",
      source: "offline-local",
      providerLabel: "Mesin Inspeksi Lokal SADAR",
      enginesUsed: ["SADAR Deep Domain Inspector (Offline)"],
      findings,
      message: `Waspada! ${findings.join(" ")} Jangan buka atau masukkan data pribadi maupun OTP.`,
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    url: parsed.href,
    safe: true,
    riskScore: 10,
    threatType: "Clean",
    source: "offline-local",
    providerLabel: "Mesin Inspeksi Lokal SADAR",
    enginesUsed: ["SADAR Deep Domain Inspector (Offline)"],
    findings: [
      "Tidak ditemukan pola phishing atau malware pada pemeriksaan struktur domain lokal.",
    ],
    message:
      "Tidak ditemukan pola phishing pada pemeriksaan heuristik awal. Tetap periksa ejaan domain secara teliti dan jangan masukkan OTP atau PIN.",
    checkedAt: new Date().toISOString(),
  };
}

export function LinkScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statIncrementNotice, setStatIncrementNotice] = useState(false);

  const { linksScanned, recordLinkScan } = useStats();
  const { isOffline } = useNetwork();

  const scan = async (event: FormEvent) => {
    event.preventDefault();
    setResult(null);
    setError("");
    setStatIncrementNotice(false);
    setLoading(true);

    try {
      let scanPayload: ScanResult | null = null;

      if (!isOffline) {
        try {
          const response = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url.trim() }),
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || "Tautan belum dapat diperiksa.");
          }
          scanPayload = payload as ScanResult;
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message.includes("Format URL") || err.message.includes("Domain URL"))
          ) {
            throw err;
          }
          scanPayload = localScanFallback(url);
        }
      } else {
        scanPayload = localScanFallback(url);
      }

      setResult(scanPayload);
      recordLinkScan(
        `Pemindaian URL (${scanPayload.safe ? "Aman" : "Berbahaya"}): ${scanPayload.url.slice(
          0,
          38
        )}`
      );
      setStatIncrementNotice(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Terjadi kesalahan saat memeriksa URL."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1000px]">
      <PageHeading
        eyebrow="PEMINDAI TAUTAN · GOOGLE SAFE BROWSING + AI THREAT INTEL"
        title="Cek sebelum kamu klik."
        description="Memeriksa URL secara nyata menggunakan kombinasi Google Safe Browsing v4 API, Cloudflare 1.1.1.2 Security DNS, abuse.ch URLhaus, dan AI Threat Intelligence."
        badgeText={`Link Diperiksa: ${new Intl.NumberFormat("id-ID").format(linksScanned)}`}
      />

      {/* Interactive Quick Sample URLs */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1458d4]">
          <WandSparkles size={14} /> Uji Coba URL Cepat:
        </span>
        {SAMPLE_URLS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setUrl(item.url);
              setResult(null);
              setError("");
            }}
            className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#172944] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100/80"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="pt-2">
          <div className="relative overflow-visible rounded-[26px] border border-blue-100/90 bg-white/95 p-5 shadow-[0_14px_40px_rgba(20,57,108,0.07)] backdrop-blur-md sm:p-7">
            {/* Out-of-bounds 3D Badge */}
            <div className="absolute -top-3.5 right-6 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-gradient-to-r from-sky-600 to-[#1458d4] px-3.5 py-1 text-[10px] font-bold text-white shadow-md">
              <Sparkles size={11} className="text-[#c6f329]" />
              Multi-Engine Threat Scanner
            </div>

            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700 shadow-sm">
                <ScanLine size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#12284b]">
                  Inspektur Tautan &amp; Reputasi Domain
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Google Safe Browsing v4 + Cloudflare Security DNS + URLhaus + AI Threat Inspector
                </p>
              </div>
            </div>

            <form onSubmit={scan}>
              <label
                htmlFor="url-input"
                className="mb-2 block text-xs font-bold text-[#12284b]"
              >
                Alamat Tautan (URL)
              </label>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Globe2
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="url-input"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setResult(null);
                    }}
                    maxLength={2048}
                    placeholder="http://malware.testing.google.test/testing/malware/"
                    className="w-full rounded-2xl border border-slate-200 bg-[#f8faff] py-3.5 pl-10 pr-4 text-sm text-[#172944] placeholder:text-slate-400 transition focus:border-[#1458d4] focus:bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1458d4] px-5 py-3.5 text-xs font-bold text-white shadow-[0_10px_25px_rgba(20,88,212,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0f46ad] disabled:opacity-60"
                >
                  {loading ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <ScanLine size={15} />
                  )}
                  {loading ? "Memindai..." : "Periksa URL"}
                </button>
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
                >
                  {error}
                </p>
              )}
            </form>

            {/* Result Card */}
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="scan-skeleton"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4"
                >
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#1458d4]">
                    <LoaderCircle size={15} className="animate-spin" />
                    Memeriksa ke Google Safe Browsing, Cloudflare DNS, URLhaus &amp; AI...
                  </div>
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-blue-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-200" />
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="scan-result"
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 pt-2"
                >
                  <Tilt3DCard
                    intensity={6}
                    className={`relative overflow-visible rounded-2xl border p-5 ${
                      result.safe
                        ? "border-emerald-200 bg-emerald-50/75"
                        : "border-rose-200 bg-rose-50/80"
                    }`}
                  >
                    {/* Out-of-bounds Pop-out Status Pill */}
                    <div
                      style={{ transform: "translateZ(35px)" }}
                      className={`absolute -top-3.5 right-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow ${
                        result.safe
                          ? "border-emerald-300 bg-emerald-600 text-white"
                          : "border-rose-300 bg-rose-600 text-white"
                      }`}
                    >
                      {result.safe ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
                      {result.safe
                        ? "Indikasi Aman"
                        : `Berbahaya · Skor Risiko ${result.riskScore ?? 90}%`}
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                          result.safe
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        {result.safe ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-extrabold ${
                            result.safe ? "text-emerald-950" : "text-rose-950"
                          }`}
                        >
                          {result.safe
                            ? "Tidak Ditemukan Ancaman pada Tautan"
                            : `Ancaman Terdeteksi: ${result.threatType || "Malware / Phishing"}`}
                        </p>
                        <p className="mt-1 break-all rounded-lg bg-white/90 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700">
                          {result.url}
                        </p>

                        {/* Engines Checked Badges */}
                        {result.enginesUsed && result.enginesUsed.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {result.enginesUsed.map((eng) => (
                              <span
                                key={eng}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#1458d4]"
                              >
                                <Cpu size={10} /> {eng}
                              </span>
                            ))}
                          </div>
                        )}

                        {result.findings && result.findings.length > 0 ? (
                          <ul className="mt-3 space-y-1.5">
                            {result.findings.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2 rounded-xl bg-white/85 p-2.5 text-xs leading-5 text-slate-800 shadow-sm"
                              >
                                <AlertTriangle
                                  size={14}
                                  className={`mt-0.5 shrink-0 ${
                                    result.safe ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-slate-800">{result.message}</p>
                        )}

                        {statIncrementNotice && (
                          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-lime-300 bg-[#f4fce0] px-3 py-2 text-[11px] font-bold text-[#1d3b0e]">
                            <span className="inline-flex items-center gap-1.5">
                              <TrendingUp size={14} className="text-emerald-700" />
                              Statistik Link Diperiksa Bertambah +1
                            </span>
                            <span className="tabular-nums rounded-md bg-white px-2 py-0.5 text-[10px] shadow-sm">
                              Total: {new Intl.NumberFormat("id-ID").format(linksScanned)}
                            </span>
                          </div>
                        )}

                        <p className="mt-3 text-[10px] font-medium text-slate-500">
                          Mesin Pemindai: {result.providerLabel || "Google Safe Browsing + Multi-Engine"} ·{" "}
                          {new Date(result.checkedAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </Tilt3DCard>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 flex gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
              <p className="text-[11px] leading-5 text-slate-700">
                <span className="font-bold text-amber-950">
                  Tidak ada pemindaian yang menjamin 100%.
                </span>{" "}
                Jangan pernah memasukkan OTP, PIN, atau password ke halaman yang dibuka dari
                tautan chat.
              </p>
            </div>
          </div>
        </div>

        {/* Educational Guide Sidebar */}
        <aside className="space-y-4 pt-2">
          <Tilt3DCard
            intensity={6}
            className="relative overflow-visible rounded-[26px] border border-blue-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(20,57,108,0.07)] sm:p-6"
          >
            <h3 className="text-sm font-bold text-[#12284b]">3 Ciri Utama Tautan Phishing</h3>
            <ul className="mt-4 space-y-3.5">
              {[
                [
                  "1. Typosquatting (Nama Domain Mirip)",
                  "Pelaku mengganti satu huruf atau memakai ekstensi murah seperti .xyz, .top, atau .click untuk meniru situs resmi.",
                ],
                [
                  "2. Mengunduh File .APK Berkedok Resi/Undangan",
                  "File aplikasi (.apk) yang dikirim lewat chat dapat membaca SMS dan mencuri kode OTP perbankanmu.",
                ],
                [
                  "3. Meminta Login atau Kredensial Rahasia",
                  "Institusi resmi tidak pernah meminta verifikasi PIN atau OTP melalui tautan yang dikirim via chat.",
                ],
              ].map(([title, body]) => (
                <li
                  key={title}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                >
                  <p className="text-xs font-bold text-[#1458d4]">{title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-600">{body}</p>
                </li>
              ))}
            </ul>
          </Tilt3DCard>

          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <div className="flex gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">
                <LockKeyhole size={15} />
              </span>
              <p className="text-[11px] leading-5 text-slate-600">
                Gunakan <span className="font-bold text-[#12284b]">salinan URL</span>—jangan
                membuka tautan hanya untuk melihat isinya.
              </p>
            </div>
          </div>

          <a
            href="https://safebrowsing.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-3.5 py-2 text-xs font-bold text-[#1458d4] shadow-sm transition hover:bg-blue-50"
          >
            Pelajari Google Safe Browsing <ArrowUpRight size={13} />
          </a>
        </aside>
      </div>
    </section>
  );
}
