"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileWarning,
  Gamepad2,
  Globe2,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareWarning,
  QrCode,
  Radar,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Analyzer } from "@/components/Analyzer";
import { EWalletChecker } from "@/components/EWalletChecker";
import { LearningCenter } from "@/components/LearningCenter";
import { LinkScanner } from "@/components/LinkScanner";
import { SadarRun } from "@/components/SadarRun";
import { StatCard } from "@/components/StatCard";
import { StatsProvider, useStats } from "@/components/StatsContext";
import { NetworkProvider, useNetwork } from "@/components/NetworkStatus";
import {
  CyberMeshBackground,
  Hero3DCore,
  Tilt3DCard,
} from "@/components/CyberMesh3D";
import {
  InitialLoadingScreen,
  ModuleSkeletonLoader,
} from "@/components/LoadingExperience";

export type Screen = "dashboard" | "analyzer" | "ewallet" | "scanner" | "game" | "learn";

const navItems: {
  id: Screen;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}[] = [
  { id: "dashboard", label: "Beranda", shortLabel: "Beranda", icon: LayoutDashboard },
  {
    id: "analyzer",
    label: "Analisis Chat",
    shortLabel: "Analisis",
    icon: MessageSquareWarning,
    badge: "AI API",
  },
  {
    id: "ewallet",
    label: "Cek E-Wallet",
    shortLabel: "E-Wallet",
    icon: Wallet,
    badge: "Kominfo",
  },
  {
    id: "scanner",
    label: "Pemindai Link",
    shortLabel: "Scanner",
    icon: Globe2,
    badge: "URL",
  },
  { id: "game", label: "SADAR Run", shortLabel: "Game", icon: Gamepad2 },
  { id: "learn", label: "Simulasi", shortLabel: "Simulasi", icon: BookOpen },
];

const HERO_DYNAMIC_PHRASES = [
  "Kenali Modus Penipuan Chat & File .APK",
  "Pindai Tautan Phishing Sebelum Diklik",
  "Lindungi Kode OTP & Data Pribadimu",
  "Latih Pengetahuan Keamanan Siber Setiap Hari",
];

const INTERACTIVE_THREAT_MODULES = [
  {
    id: "apk-scam",
    tag: "MODUS POPULER #1",
    title: "Jebakan File .APK Kurir & Undangan",
    risk: "Sangat Berbahaya",
    icon: FileWarning,
    summary:
      "Pelaku mengirim file berekstensi .apk dengan nama seperti 'Lihat-Foto-Paket.apk' atau 'Surat-Undangan.apk'.",
    mechanism:
      "Jika dipasang, aplikasi jahat meminta izin akses SMS lalu meneruskan seluruh kode OTP perbankan ke server pelaku di latar belakang.",
    prevention:
      "Jangan pernah menginstal aplikasi dari luar Play Store/App Store, terutama yang dikirim lewat WhatsApp atau Telegram.",
  },
  {
    id: "otp-soceng",
    tag: "REKAYASA SOSIAL",
    title: "Pencurian OTP Berkedok Petugas Resmi",
    risk: "Tinggi",
    icon: KeyRound,
    summary:
      "Penelepon menciptakan kepanikan (misal: transaksi mencurigakan atau pemblokiran akun) agar korban menyebutkan kode OTP.",
    mechanism:
      "Pelaku sebenarnya sedang mencoba masuk ke akunmu dan membutuhkan 6 digit kode verifikasi yang dikirim ke ponselmu.",
    prevention:
      "Ingat aturan emas: Petugas bank, e-wallet, atau instansi resmi TIDAK PERNAH meminta kode OTP atau PIN.",
  },
  {
    id: "typosquatting",
    tag: "TAUTAN TIRUAN",
    title: "Domain Phishing Mirip Situs Resmi",
    risk: "Tinggi",
    icon: Globe2,
    summary:
      "Halaman login palsu menggunakan alamat domain yang sekilas mirip situs asli namun memakai akhiran .xyz, .top, atau .click.",
    mechanism:
      "Saat kamu mengetik username, password, dan PIN di halaman tiruan tersebut, data langsung terekam oleh pelaku.",
    prevention:
      "Selalu periksa ejaan domain utama dengan fitur Pemindai Link SADAR atau ketik sendiri alamat situs resmi di browser.",
  },
  {
    id: "quishing",
    tag: "MODUS BARU",
    title: "Quishing (Kode QR Palsu)",
    risk: "Waspada",
    icon: QrCode,
    summary:
      "Kode QR ditempelkan atau dikirim untuk mengarahkan korban ke situs phishing atau memicu otorisasi pembayaran.",
    mechanism:
      "Karena URL tersembunyi di balik visual QR, pengguna sering langsung memindai tanpa memeriksa tujuan domain.",
    prevention:
      "Periksa pratinjau URL yang tampil di layar pemindai sebelum menekan tombol lanjut atau memasukkan PIN.",
  },
];

export function AppShell() {
  return (
    <NetworkProvider>
      <StatsProvider>
        <AppShellInner />
      </StatsProvider>
    </NetworkProvider>
  );
}

function AppShellInner() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [direction, setDirection] = useState<number>(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [skeletonTransition, setSkeletonTransition] = useState(false);
  const [prefillEWalletNumber, setPrefillEWalletNumber] = useState("");

  const {
    scamDetected,
    linksScanned,
    usersEducated,
    sessionActions,
  } = useStats();
  const { isOffline } = useNetwork();

  const navigate = (next: Screen) => {
    if (next === screen) {
      setMobileMenuOpen(false);
      return;
    }
    const currIdx = navItems.findIndex((i) => i.id === screen);
    const nextIdx = navItems.findIndex((i) => i.id === next);
    setDirection(nextIdx >= currIdx ? 1 : -1);
    setSkeletonTransition(true);
    setScreen(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setSkeletonTransition(false);
    }, 220);
  };

  // 3D Camera Pan & Perspective Shift Variants
  const cameraVariants = {
    initial: (dir: number) => ({
      opacity: 0,
      x: dir * 64,
      y: 16,
      scale: 0.96,
      rotateY: dir * -7,
      rotateX: 3,
      filter: "blur(6px)",
    }),
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      rotateY: 0,
      rotateX: 0,
      filter: "blur(0px)",
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir * -54,
      y: -10,
      scale: 0.96,
      rotateY: dir * 6,
      rotateX: -2,
      filter: "blur(5px)",
    }),
  };

  return (
    <div className="app-shell relative min-h-screen overflow-x-hidden md:flex">
      {/* Initial Boot Loading Screen */}
      <InitialLoadingScreen />

      {/* Interactive 3D Wireframe & Ambient Mesh Background */}
      <CyberMeshBackground />

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[266px] flex-col border-r border-blue-100/90 bg-white/90 px-5 py-7 shadow-[4px_0_30px_rgba(18,40,75,0.04)] backdrop-blur-xl md:flex">
        <Brand onClick={() => navigate("dashboard")} />

        <p className="mb-3 mt-10 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          NAVIGASI RUANG AMAN
        </p>
        <nav className="space-y-1.5" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={screen === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        {/* Live Telemetry Mini Widget in Sidebar with Out-of-bounds Badge */}
        <div className="relative mt-auto pt-4">
          <div className="relative overflow-visible rounded-2xl border border-blue-200/80 bg-gradient-to-br from-[#eef4ff] via-white to-[#f0fdf4] p-4 shadow-sm">
            <div className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full border border-lime-400 bg-[#c6f329] px-2.5 py-0.5 text-[9px] font-extrabold text-[#16300b] shadow-sm">
              <Activity size={10} /> LIVE STATS
            </div>
            <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1458d4] text-white shadow-sm">
              <ShieldCheck size={18} />
            </div>
            <p className="text-xs font-extrabold text-[#12284b]">
              Statistik Interaktif Aktif
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">
              Setiap cek chat, E-Wallet, URL, &amp; simulasi langsung menambah penghitung komunitas.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-blue-100 bg-white/90 p-2 text-center">
              <div>
                <p className="tabular-nums text-[11px] font-extrabold text-[#1458d4]">
                  {new Intl.NumberFormat("id-ID").format(scamDetected)}
                </p>
                <p className="text-[9px] text-slate-500">Chat/Akun</p>
              </div>
              <div className="border-x border-slate-100">
                <p className="tabular-nums text-[11px] font-extrabold text-sky-700">
                  {new Intl.NumberFormat("id-ID").format(linksScanned)}
                </p>
                <p className="text-[9px] text-slate-500">URL</p>
              </div>
              <div>
                <p className="tabular-nums text-[11px] font-extrabold text-emerald-700">
                  {new Intl.NumberFormat("id-ID").format(usersEducated)}
                </p>
                <p className="text-[9px] text-slate-500">Edukasi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("analyzer")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1458d4] hover:text-[#0c3b91]"
            >
              Mulai deteksi sekarang <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1458d4] to-[#0b327e] text-xs font-extrabold text-white shadow-sm">
            S
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#12284b]">Sahabat SADAR</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {sessionActions > 0
                ? `${sessionActions} aksi keamanan sesi ini`
                : "Mode Edukasi Interaktif"}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 min-w-0 flex-1 md:ml-[266px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-blue-100/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6 md:px-10">
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-[#12284b] shadow-sm"
            >
              <Menu size={18} />
            </button>
            <Brand compact onClick={() => navigate("dashboard")} />
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
            <span>Ruang Aman Digital</span>
            <ChevronRight size={13} />
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-bold text-[#1458d4]">
              {navItems.find((item) => item.id === screen)?.label}
            </span>
            {sessionActions > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-lime-300 bg-[#f4fce0] px-2.5 py-0.5 text-[10px] font-extrabold text-[#19360c]">
                <TrendingUp size={11} /> +{sessionActions} Interaksi Statistik
              </span>
            )}
          </div>

          {/* Right Header Controls: Passive Online/Offline Network Indicator & Quick Simulasi Link */}
          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
            <div
              role="status"
              aria-live="polite"
              aria-label={isOffline ? "Status koneksi: Offline" : "Status koneksi: Online"}
              className={`inline-flex select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                isOffline
                  ? "border-amber-300 bg-amber-100 text-amber-900 shadow-sm"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-800"
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff size={13} className="text-amber-700" />
                  <span>Offline</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <Wifi size={13} className="text-emerald-600" />
                  <span>Online</span>
                </>
              )}
            </div>

            <button
              type="button"
              aria-label="Buka simulasi keamanan"
              onClick={() => navigate("learn")}
              className="rounded-xl border border-blue-100 bg-blue-50/70 p-2.5 text-[#1458d4] transition hover:bg-[#1458d4] hover:text-white"
            >
              <BookOpen size={16} />
            </button>
          </div>
        </header>

        {/* 3D Camera Perspective Stage */}
        <main
          className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-8 md:px-10 md:pb-14 md:pt-8"
          style={{ perspective: "1400px" }}
        >
          {skeletonTransition ? (
            <ModuleSkeletonLoader label="Menyiapkan modul keamanan & menyinkronkan data..." />
          ) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={screen}
                custom={direction}
                variants={cameraVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                  duration: 0.38,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {screen === "dashboard" && <Dashboard onNavigate={navigate} />}
                {screen === "analyzer" && (
                  <Analyzer
                    onInspectEWallet={(num) => {
                      setPrefillEWalletNumber(num);
                      navigate("ewallet");
                    }}
                  />
                )}
                {screen === "ewallet" && (
                  <EWalletChecker initialNumber={prefillEWalletNumber} />
                )}
                {screen === "scanner" && <LinkScanner />}
                {screen === "game" && <SadarRun />}
                {screen === "learn" && <LearningCenter />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-blue-100 bg-white/95 px-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_26px_rgba(20,54,91,0.07)] backdrop-blur-xl md:hidden"
        aria-label="Navigasi bawah"
      >
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={screen === item.id}
            onClick={() => navigate(item.id)}
            mobile
          />
        ))}
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/40 p-4 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              className="h-full max-w-[310px] rounded-3xl border border-blue-100 bg-white p-5 shadow-2xl"
              initial={{ x: -24 }}
              animate={{ x: 0 }}
              exit={{ x: -24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-8 flex items-center justify-between">
                <Brand onClick={() => navigate("dashboard")} />
                <button
                  type="button"
                  aria-label="Tutup menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                MENU UTAMA
              </p>
              <nav className="space-y-1.5">
                {navItems.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={screen === item.id}
                    onClick={() => navigate(item.id)}
                  />
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Brand({
  compact = false,
  onClick,
}: {
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 text-left focus:outline-none"
    >
      <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-blue-200/80 bg-white p-1 shadow-[0_8px_22px_rgba(20,88,212,0.14)] transition-transform duration-200 group-hover:scale-105">
        <img
          src="/logo.png"
          alt="Logo SADAR"
          className="h-full w-full object-contain"
        />
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-[#00aeef]" />
      </div>
      {!compact && (
        <div>
          <p className="text-[18px] font-black tracking-[0.1em] text-[#052460]">
            SADAR<span className="text-[#00aeef]">.</span>
          </p>
          <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
            RUANG AMAN DIGITAL
          </p>
        </div>
      )}
    </button>
  );
}

function NavButton({
  item,
  active,
  onClick,
  mobile = false,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onClick: () => void;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  if (mobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] transition ${
          active
            ? "font-extrabold text-[#1458d4]"
            : "font-medium text-slate-500 hover:text-[#12284b]"
        }`}
      >
        <Icon size={18} className={active ? "text-[#1458d4]" : ""} />
        <span className="truncate">{item.shortLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[13px] transition-all ${
        active
          ? "border border-blue-200 bg-gradient-to-r from-[#1458d4] to-[#0f45aa] font-bold text-white shadow-[0_10px_24px_rgba(20,88,212,0.24)]"
          : "font-medium text-slate-600 hover:bg-blue-50/80 hover:text-[#12284b]"
      }`}
    >
      <Icon
        size={17}
        className={
          active
            ? "text-[#c6f329]"
            : "text-slate-400 transition group-hover:text-[#1458d4]"
        }
      />
      <span>{item.label}</span>
      {item.badge && (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
            active
              ? "bg-white/20 text-white"
              : "bg-blue-50 text-[#1458d4]"
          }`}
        >
          {item.badge}
        </span>
      )}
      {!item.badge && active && (
        <span className="ml-auto h-2 w-2 rounded-full bg-[#c6f329]" />
      )}
    </button>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [activeThreatId, setActiveThreatId] = useState(
    INTERACTIVE_THREAT_MODULES[0].id
  );

  const {
    scamDetected,
    linksScanned,
    usersEducated,
    lastUpdatedCategory,
    recentActivities,
    recordScamCheck,
    recordLinkScan,
    recordEducationAction,
  } = useStats();

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % HERO_DYNAMIC_PHRASES.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const activeThreat =
    INTERACTIVE_THREAT_MODULES.find((m) => m.id === activeThreatId) ??
    INTERACTIVE_THREAT_MODULES[0];

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Top Welcome Bar with Scroll-Reveal */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1458d4]">
            <Radar size={12} /> RUANG BELAJAR &amp; ANTISIPASI RISIKO DIGITAL
          </div>
          <h1 className="mt-2.5 text-[26px] font-extrabold tracking-[-0.04em] text-[#11264a] sm:text-[34px]">
            Selamat datang, Sahabat SADAR{" "}
            <span className="inline-block text-[#1458d4]" aria-hidden="true">
              ✦
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Eksplorasi alat deteksi interaktif, visualisasi 3D, dan simulasi perlindungan diri di ruang siber.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("analyzer")}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-bold text-[#1458d4] shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            <MessageSquareWarning size={16} /> Cek Pesan Cepat
          </button>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white p-1.5 shadow-sm sm:flex">
            <img src="/logo.png" alt="Logo SADAR" className="h-full w-full object-contain" />
          </div>
        </div>
      </motion.section>

      {/* Hero Section with 3D Interactive Illustration & Out-of-bounds Floating Elements */}
      <motion.section
        aria-label="Fitur utama"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#172944]">Jelajahi Ekosistem SADAR</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-semibold text-[#1458d4] shadow-sm">
            <Sparkles size={13} /> Interaktif 3D
          </span>
        </div>

        {/* Interactive Quick Navigation Pills */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
          <span className="shrink-0 rounded-full bg-[#c6f329] px-4 py-2 text-[11px] font-extrabold text-[#183117] shadow-sm">
            Semua Fitur
          </span>
          <button
            type="button"
            onClick={() => onNavigate("analyzer")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-[#1458d4]"
          >
            Deteksi Chat &amp; Screenshot
          </button>
          <button
            type="button"
            onClick={() => onNavigate("ewallet")}
            className="shrink-0 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-2 text-[11px] font-bold text-[#1458d4] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100"
          >
            Cek E-Wallet (Mirror Kominfo)
          </button>
          <button
            type="button"
            onClick={() => onNavigate("scanner")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-[#1458d4]"
          >
            Pemindai Tautan Phishing
          </button>
          <button
            type="button"
            onClick={() => onNavigate("game")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-[#1458d4]"
          >
            Minigame SADAR Run
          </button>
          <button
            type="button"
            onClick={() => onNavigate("learn")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-[#1458d4]"
          >
            Simulasi Keputusan
          </button>
          <a
            href="#statistik"
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-[#1458d4]"
          >
            Statistik Real-Time
          </a>
        </div>

        {/* Hero Banner with overflow-visible so 3D Core & Badges pop out of the card */}
        <div className="dashboard-hero relative overflow-visible rounded-[30px] p-6 text-white shadow-[0_24px_60px_rgba(16,61,145,0.25)] sm:p-9 lg:min-h-[320px] lg:p-11">
          {/* Decorative background orbits inside clipped inner layer */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <div className="grid-dots absolute inset-0 opacity-35" />
          </div>

          {/* Out-of-bounds Top-Left Floating Pill */}
          <div className="absolute -top-3.5 left-7 z-20 inline-flex items-center gap-1.5 rounded-full border border-lime-300 bg-[#c6f329] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#13290a] shadow-[0_10px_24px_rgba(198,243,41,0.35)]">
            <Sparkles size={12} /> 3D INTERACTIVE CYBER SHIELD
          </div>

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.2fr_.8fr]">
            <div className="max-w-[600px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-bold tracking-wider text-blue-50 backdrop-blur-sm">
                KENALI · VERIFIKASI · LINDUNGI
              </span>

              <h2 className="mt-4 text-[28px] font-extrabold leading-[1.12] tracking-[-0.04em] sm:text-[40px]">
                Mencegah lebih baik dari mengobati.
              </h2>

              {/* Dynamic Rotating Text Banner */}
              <div className="mt-3 flex min-h-[34px] items-center gap-2">
                <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-[#c6f329]" />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={phraseIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                    className="text-sm font-bold text-[#c6f329] sm:text-base"
                  >
                    {HERO_DYNAMIC_PHRASES[phraseIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <p className="mt-2.5 max-w-[510px] text-xs leading-6 text-blue-50/90 sm:text-sm">
                Kenali tanda manipulasi psikologis lebih awal, periksa pesan dan tautan mencurigakan,
                lalu ambil keputusan dengan tenang dan percaya diri.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate("analyzer")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-extrabold text-[#124296] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Coba Deteksi Sekarang <ArrowUpRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("scanner")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-xs font-bold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  Pindai URL Mencurigakan
                </button>
              </div>
            </div>

            {/* Interactive 3D Sphere & Floating Shield Illustration */}
            <div className="flex items-center justify-center lg:justify-end">
              <Hero3DCore />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Feature Shortcuts with Out-of-bounds Pop-out 3D Elements */}
      <motion.section
        aria-label="Pintasan fitur"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#1458d4]">
              MULAI DARI SINI
            </p>
            <h2 className="mt-1.5 text-lg font-extrabold text-[#172944] sm:text-xl">
              Alat Bantu Keamananmu
            </h2>
          </div>
          <span className="hidden text-xs font-medium text-slate-500 sm:block">
            Arahkan kursor pada kartu untuk merasakan efek 3D
          </span>
        </div>

        <div className="grid gap-5 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FeatureCard
            icon={MessageSquareWarning}
            eyebrow="CEK PESAN AI"
            title="Deteksi Chat"
            body="Analisis indikasi urgensi palsu, hadiah, & permintaan OTP menggunakan AI & Heuristik."
            action="Analisis chat"
            popBadge={`${new Intl.NumberFormat("id-ID").format(scamDetected)} dicek`}
            onClick={() => onNavigate("analyzer")}
            tone="violet"
          />
          <FeatureCard
            icon={Wallet}
            eyebrow="MIRROR KOMINFO"
            title="Cek E-Wallet"
            body="Periksa riwayat laporan nomor DANA, GoPay, OVO, ShopeePay, & Bank via mirror CekRekening."
            action="Cek akun sekarang"
            popBadge="E-Wallet & Bank"
            onClick={() => onNavigate("ewallet")}
            tone="blue"
          />
          <FeatureCard
            icon={Globe2}
            eyebrow="CEK TAUTAN"
            title="Pemindai Link"
            body="Periksa anatomi domain, ekstensi .apk, dan indikasi phishing sebelum diklik."
            action="Pindai tautan"
            popBadge={`${new Intl.NumberFormat("id-ID").format(linksScanned)} URL`}
            onClick={() => onNavigate("scanner")}
            tone="mint"
          />
          <FeatureCard
            icon={Gamepad2}
            eyebrow="BELAJAR SERU"
            title="SADAR Run"
            body="Latih refleks menghindari jebakan phishing & kumpulkan perisai keamanan 2FA."
            action="Main SADAR Run"
            popBadge="Minigame"
            onClick={() => onNavigate("game")}
            tone="blue"
          />
          <FeatureCard
            icon={BookOpen}
            eyebrow="LATIHAN KEAMANAN"
            title="Simulasi Keputusan"
            body="Uji langkah terbaik menghadapi berbagai modus penipuan & panduan pemulihan."
            action="Mulai simulasi"
            popBadge="4 Skenario"
            onClick={() => onNavigate("learn")}
            tone="violet"
          />
        </div>
      </motion.section>

      {/* Interactive Threat Radar & Anatomy Section (Informasi Interaktif) */}
      <motion.section
        aria-label="Ensiklopedia modus penipuan interaktif"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
        className="pt-2"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1458d4]">
              INFORMASI INTERAKTIF · RADAR ANCAMAN
            </p>
            <h2 className="mt-1.5 text-lg font-extrabold text-[#172944] sm:text-xl">
              Bedah Modus Penipuan Digital Terkini
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Klik kartu ancaman untuk membedah cara kerja &amp; pencegahannya
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          {/* Threat Selector Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {INTERACTIVE_THREAT_MODULES.map((mod) => {
              const Icon = mod.icon;
              const selected = mod.id === activeThreat.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveThreatId(mod.id)}
                  className={`group relative overflow-visible rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? "-translate-y-1 border-[#1458d4] bg-gradient-to-br from-[#1458d4] to-[#0c3b91] text-white shadow-[0_16px_35px_rgba(20,88,212,0.26)]"
                      : "border-blue-100 bg-white/95 text-[#172944] shadow-sm hover:-translate-y-0.5 hover:border-blue-300"
                  }`}
                >
                  {/* Out-of-bounds Risk Pill */}
                  <span
                    className={`absolute -top-2.5 right-3 rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-sm ${
                      selected
                        ? "border-lime-300 bg-[#c6f329] text-[#13290a]"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {mod.risk}
                  </span>

                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      selected
                        ? "bg-white/15 text-[#c6f329]"
                        : "bg-blue-50 text-[#1458d4]"
                    }`}
                  >
                    <Icon size={19} />
                  </div>
                  <p
                    className={`mt-3 text-[9px] font-extrabold tracking-wider ${
                      selected ? "text-blue-200" : "text-slate-400"
                    }`}
                  >
                    {mod.tag}
                  </p>
                  <h3 className="mt-1 text-xs font-extrabold leading-5">
                    {mod.title}
                  </h3>
                </button>
              );
            })}
          </div>

          {/* Interactive Detail Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeThreat.id}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Tilt3DCard
                intensity={6}
                className="relative h-full overflow-visible rounded-[26px] border border-blue-100 bg-white/95 p-6 shadow-[0_14px_40px_rgba(20,57,108,0.07)]"
              >
                <div
                  style={{ transform: "translateZ(32px)" }}
                  className="absolute -top-3.5 right-6 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-600 px-3.5 py-1 text-[10px] font-extrabold text-white shadow"
                >
                  <ShieldAlert size={12} /> BEDAH MODUS
                </div>

                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1458d4]">
                  {activeThreat.tag}
                </span>
                <h3 className="mt-1.5 text-lg font-extrabold text-[#12284b]">
                  {activeThreat.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {activeThreat.summary}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                      Cara Kerja Pelaku
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-700">
                      {activeThreat.mechanism}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                      Langkah Pencegahan
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-700">
                      {activeThreat.prevention}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                  <span className="text-[11px] text-slate-500">
                    Menerima pesan dengan ciri serupa?
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate("analyzer")}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-[#1458d4] hover:underline"
                  >
                    Periksa di Analisis Chat <ArrowUpRight size={14} />
                  </button>
                </div>
              </Tilt3DCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Animated Statistics Section (IntersectionObserver + Real-time Interaction Increment) */}
      <motion.section
        id="statistik"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#1458d4]">
              DAMPAK KOMUNITAS · ANIMATED STATISTICS
            </p>
            <h2 className="mt-1.5 text-lg font-extrabold text-[#172944] sm:text-xl">
              Overview Statistik Real-Time
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Angka bergerak naik otomatis saat masuk layar dan bertambah setiap kali kamu mengecek
              chat, memindai URL, atau menyelesaikan simulasi.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
            <Activity size={13} className="text-emerald-600" /> Terhubung ke Aktivitas Pengguna
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <StatCard
            label="Total deteksi scam & pesan"
            numericValue={scamDetected}
            change="+12.4%"
            icon={ShieldCheck}
            tone="violet"
            subtitle="Bertambah saat kamu menganalisis pesan/chat"
            actionLabel="Cek Pesan"
            onAction={() => onNavigate("analyzer")}
            onQuickIncrement={() =>
              recordScamCheck("Uji cepat deteksi pesan mencurigakan (+1)")
            }
            highlighted={lastUpdatedCategory === "scam"}
          />
          <StatCard
            label="Link diperiksa & diblokir"
            numericValue={linksScanned}
            change="+8.2%"
            icon={LockKeyhole}
            tone="blue"
            subtitle="Bertambah saat kamu memindai alamat URL"
            actionLabel="Pindai URL"
            onAction={() => onNavigate("scanner")}
            onQuickIncrement={() =>
              recordLinkScan("Uji cepat pemindaian tautan berbahaya (+1)")
            }
            highlighted={lastUpdatedCategory === "link"}
          />
          <StatCard
            label="Pengguna & aksi teredukasi"
            numericValue={usersEducated}
            change="+18.6%"
            icon={BookOpen}
            tone="mint"
            subtitle="Bertambah saat bermain SADAR Run / Simulasi"
            actionLabel="Mulai Simulasi"
            onAction={() => onNavigate("learn")}
            onQuickIncrement={() =>
              recordEducationAction("Uji cepat aksi edukasi keamanan (+1)")
            }
            highlighted={lastUpdatedCategory === "edu"}
          />
        </div>

        {/* Live Interaction Log Feed */}
        <div className="mt-5 rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xs font-extrabold text-[#12284b]">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
              Log Aktivitas Statistik Terkini
            </p>
            <span className="text-[11px] text-slate-500">
              Coba fitur atau tekan tombol &ldquo;+ Uji +1&rdquo; pada kartu di atas
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {recentActivities.slice(0, 3).map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-[#f8faff] px-3 py-2 text-[11px]"
              >
                <span className="flex items-center gap-2 truncate font-medium text-slate-700">
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                  <span className="truncate">{act.label}</span>
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                  {act.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Bottom CTA Banner */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-cta flex items-center justify-between gap-4 rounded-full p-2.5 pl-6 text-white sm:pl-9"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold sm:text-base">
            Siap lebih aman di dunia digital hari ini?
          </p>
          <p className="mt-0.5 text-[11px] text-blue-100/80 sm:text-xs">
            Mulai dari satu pemeriksaan sederhana sebelum kamu mengklik atau membalas pesan.
          </p>
        </div>
        <button
          type="button"
          aria-label="Mulai sekarang"
          onClick={() => onNavigate("analyzer")}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#c6f329] text-[#17320c] shadow-lg transition hover:scale-105"
        >
          <ChevronRight size={24} />
        </button>
      </motion.section>

      {/* Disclaimer Footer Card */}
      <section className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex gap-3">
          <div className="mt-0.5 text-[#1458d4]">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#172944]">
              SADAR adalah platform edukasi &amp; antisipasi risiko digital
            </h3>
            <p className="mt-1 max-w-[660px] text-[11px] leading-5 text-slate-500">
              Hasil analisis bersifat bantuan edukatif dan tidak menggantikan verifikasi resmi
              institusi. Jangan pernah membagikan kata sandi, PIN, atau kode OTP kepada siapa pun.
            </p>
          </div>
        </div>
        <span className="whitespace-nowrap text-[11px] font-bold text-emerald-700">
          Privasi Diutamakan <ShieldCheck className="ml-1 inline text-emerald-600" size={14} />
        </span>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  action,
  popBadge,
  onClick,
  tone,
}: {
  icon: typeof MessageSquareWarning;
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  popBadge: string;
  onClick: () => void;
  tone: "violet" | "blue" | "mint";
}) {
  return (
    <Tilt3DCard
      intensity={10}
      onClick={onClick}
      className={`feature-card feature-card-${tone} group relative flex min-h-[205px] flex-col justify-between overflow-visible rounded-[24px] border p-5 text-left transition duration-300 hover:shadow-[0_20px_42px_rgba(20,88,212,0.14)]`}
    >
      {/* Clipped Decorative Mesh Orb inside Card */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
        <div className="feature-card-orb" />
      </div>

      {/* OUT-OF-BOUNDS 3D Pop-Out Icon Box (Protrudes above top-left border) */}
      <div
        style={{ transform: "translateZ(42px)" }}
        className="absolute -top-4 left-5 grid h-12 w-12 place-items-center rounded-2xl border-2 border-white bg-gradient-to-br from-[#1458d4] to-[#0b327e] text-white shadow-[0_12px_25px_rgba(20,88,212,0.35)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105"
      >
        <Icon size={21} />
      </div>

      {/* OUT-OF-BOUNDS 3D Pop-Out Metric/Status Pill (Protrudes above top-right border) */}
      <div
        style={{ transform: "translateZ(34px)" }}
        className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full border border-white bg-[#c6f329] px-3 py-1 text-[10px] font-extrabold text-[#16300b] shadow-md transition-transform duration-300 group-hover:-translate-y-0.5"
      >
        <span>{popBadge}</span>
        <ArrowUpRight
          size={13}
          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>

      <div className="relative pt-6" style={{ transform: "translateZ(20px)" }}>
        <p className="text-[9px] font-extrabold tracking-[0.16em] text-blue-800/75">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-base font-extrabold text-[#12284b]">{title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">{body}</p>
      </div>

      <div
        className="relative mt-4 flex items-center justify-between border-t border-blue-900/10 pt-3"
        style={{ transform: "translateZ(26px)" }}
      >
        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#1458d4]">
          {action}
          <ChevronRight
            size={14}
            className="transition group-hover:translate-x-1"
          />
        </span>
      </div>
    </Tilt3DCard>
  );
}
