"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cpu,
  Globe2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

type NetworkContextValue = {
  isOffline: boolean;
  openOfflineModal: () => void;
  retryConnection: () => Promise<boolean>;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork harus berada di dalam NetworkProvider");
  return ctx;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [justRestored, setJustRestored] = useState(false);
  const [pingCount, setPingCount] = useState(0);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setModalOpen(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setModalOpen(false);
      setJustRestored(true);
      setTimeout(() => setJustRestored(false), 4000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const retryConnection = useCallback(async () => {
    setChecking(true);
    setPingCount((c) => c + 1);
    await new Promise((r) => setTimeout(r, 650));

    let onlineNow = navigator.onLine;
    if (onlineNow) {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        onlineNow = res.ok;
      } catch {
        onlineNow = navigator.onLine;
      }
    }

    setIsOffline(!onlineNow);
    setChecking(false);
    if (onlineNow) {
      setModalOpen(false);
      setJustRestored(true);
      setTimeout(() => setJustRestored(false), 3800);
    }
    return onlineNow;
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOffline,
        openOfflineModal: () => setModalOpen(true),
        retryConnection,
      }}
    >
      {children}

      {/* Floating Toast Notification when real connection changes */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center px-4 md:bottom-6">
        <AnimatePresence mode="wait">
          {isOffline && (
            <motion.div
              key="offline-toast"
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              role="status"
              aria-live="assertive"
              className="pointer-events-auto relative flex w-full max-w-[560px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-[#0d1c38]/95 p-3.5 text-white shadow-[0_20px_50px_rgba(9,22,52,0.45)] backdrop-blur-xl sm:px-5"
            >
              <div className="absolute -top-3 left-5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-400 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#1a1302] shadow-md">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-rose-700" />
                Koneksi Terputus
              </div>

              <div className="mt-1 flex items-center gap-3">
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/30 bg-amber-400/15 text-amber-300">
                  <WifiOff size={19} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white sm:text-[13px]">
                    Perangkat sedang berada dalam kondisi Offline
                  </p>
                  <p className="mt-0.5 text-[11px] text-blue-100/75">
                    Mode proteksi lokal SADAR tetap aktif — kamu tetap bisa menggunakan analisis dasar &amp; simulasi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-blue-100 transition hover:bg-white/20"
                >
                  Detail Status
                </button>
                <button
                  type="button"
                  onClick={retryConnection}
                  disabled={checking}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#c6f329] px-3.5 py-2 text-[11px] font-bold text-[#142c0b] shadow-sm transition hover:bg-[#d4fa4c] disabled:opacity-60"
                >
                  <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
                  {checking ? "Memeriksa..." : "Cek Ulang"}
                </button>
              </div>
            </motion.div>
          )}

          {!isOffline && justRestored && (
            <motion.div
              key="online-toast"
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              role="status"
              className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-300/50 bg-[#0b2b26]/95 px-4 py-3 text-white shadow-[0_18px_40px_rgba(6,44,34,0.35)] backdrop-blur-xl"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-400/20 text-emerald-300">
                <Wifi size={17} />
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-200">Koneksi Kembali Online</p>
                <p className="text-[11px] text-emerald-100/80">
                  Seluruh layanan API pihak ketiga &amp; statistik real-time SADAR telah aktif kembali.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 'No Internet' Fallback Screen Modal (triggers automatically when connection drops) */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 10, y: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{ perspective: "1200px" }}
              className="relative w-full max-w-[540px] overflow-visible rounded-[28px] border border-blue-200/80 bg-gradient-to-b from-white via-[#f7faff] to-[#eef4ff] p-6 text-[#12284b] shadow-[0_30px_80px_rgba(12,35,78,0.35)] sm:p-8"
            >
              <div className="absolute -top-7 left-7 flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-xs font-extrabold text-[#241502] shadow-[0_12px_28px_rgba(245,158,11,0.38)]">
                <WifiOff size={16} />
                <span>INDIKATOR JARINGAN: OFFLINE</span>
              </div>

              <button
                type="button"
                aria-label="Tutup jendela status koneksi"
                onClick={() => setModalOpen(false)}
                className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={17} />
              </button>

              <div className="mt-4 flex flex-col items-center text-center">
                <div className="relative my-2 grid h-28 w-28 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full border border-amber-400/35 bg-amber-300/10" />
                  <span className="absolute inset-3 rounded-full border border-dashed border-blue-300" />
                  <div className="relative grid h-20 w-20 place-items-center rounded-[24px] border border-blue-200 bg-gradient-to-br from-[#1458d4] to-[#0b327e] text-white shadow-[0_16px_36px_rgba(20,88,212,0.32)]">
                    <WifiOff size={34} strokeWidth={1.7} />
                    <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-xl border-2 border-white bg-[#c6f329] text-[#142c0b] shadow">
                      <ShieldCheck size={14} />
                    </span>
                  </div>
                </div>

                <h2 className="mt-3 text-xl font-bold tracking-tight text-[#12284b] sm:text-2xl">
                  Jaringan Terputus, Proteksi Tetap Jalan
                </h2>
                <p className="mt-2 max-w-[440px] text-xs leading-5 text-slate-600 sm:text-sm">
                  Perangkatmu sedang tidak terhubung ke internet. Selama offline, SADAR otomatis mengalihkan pemeriksaan ke mesin heuristik lokal.
                </p>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
                  <div className="flex items-center justify-between text-amber-700">
                    <Globe2 size={15} />
                    <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-bold">
                      OFFLINE
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#172944]">Jaringan Cloud</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    Ping percobaan: {pingCount}x
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
                  <div className="flex items-center justify-between text-emerald-700">
                    <Cpu size={15} />
                    <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[9px] font-bold">
                      AKTIF
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#172944]">Heuristik Lokal</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    Analisis cadangan siap
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3">
                  <div className="flex items-center justify-between text-blue-700">
                    <Sparkles size={15} />
                    <span className="rounded-full bg-blue-200/80 px-2 py-0.5 text-[9px] font-bold">
                      TERSIMPAN
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#172944]">Statistik Sesi</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    Disimpan di penyimpanan lokal
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-white p-3.5 shadow-sm">
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-blue-600" />
                <p className="text-[11px] leading-5 text-slate-600">
                  <b className="text-[#12284b]">Tips Keamanan Saat Sinyal Hilang:</b> Waspadai modus
                  penipuan yang memanfaatkan gangguan sinyal untuk mendesak pengiriman kode OTP atau
                  pergantian kartu SIM tanpa izin.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={retryConnection}
                  disabled={checking}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1458d4] px-5 py-2.5 text-xs font-bold text-white shadow-[0_10px_25px_rgba(20,88,212,0.28)] transition hover:bg-[#1046ab] disabled:opacity-60"
                >
                  <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
                  {checking ? "Memeriksa Jaringan..." : "Coba Hubungkan Ulang"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </NetworkContext.Provider>
  );
}
