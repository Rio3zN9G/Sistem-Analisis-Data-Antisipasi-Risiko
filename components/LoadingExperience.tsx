"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, ShieldCheck, Sparkles } from "lucide-react";

const BOOT_STEPS = [
  "Memetakan vektor keamanan SADAR...",
  "Merangkai garis optik & enkripsi...",
  "Mengaktifkan sensor deteksi siber...",
  "Ruang Aman Digital siap digunakan.",
];

/**
 * Creative Bright Motion-Graphics Loading Screen
 * Animates lines forming the exact SADAR logo (from src/logo.png / public/logo.png),
 * followed by a luminous color-fill reveal and lens pulse.
 */
export function InitialLoadingScreen({
  forcePlayKey = 0,
  onFinish,
}: {
  forcePlayKey?: number;
  onFinish?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setVisible(true);
    setProgress(0);

    let raf = 0;
    const start = performance.now();
    const duration = 2650; // 2.65s creative motion-graphics sequence

    const tick = (now: number) => {
      const elapsed = now - start;
      const rawPct = Math.min(1, elapsed / duration);
      // Smooth easeInOutCubic curve for percentage display
      const easedPct =
        rawPct < 0.5
          ? 4 * rawPct * rawPct * rawPct
          : 1 - Math.pow(-2 * rawPct + 2, 3) / 2;

      const pct = Math.min(100, Math.round(easedPct * 100));
      setProgress(pct);

      if (rawPct < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setVisible(false);
          onFinish?.();
        }, 320);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [forcePlayKey, onFinish]);

  // Real-time Pixel-Contour Edge Line Drawing + Color Morph on Canvas using /logo.png
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 420;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/logo.png";

    type EdgePoint = {
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
      angle: number;
      dist: number;
      isCyan: boolean;
    };

    let edgePoints: EdgePoint[] = [];
    let imageLoaded = false;

    img.onload = () => {
      imageLoaded = true;
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(img, 0, 0, size, size);
      const imgData = octx.getImageData(0, 0, size, size).data;

      const pts: EdgePoint[] = [];
      const cx = size / 2;
      const cy = size / 2;

      // Extract contour edge pixels of the logo
      for (let y = 2; y < size - 2; y += 2) {
        for (let x = 2; x < size - 2; x += 2) {
          const idx = (y * size + x) * 4;
          const a = imgData[idx + 3];
          if (a < 80) continue;

          const aRight = imgData[(y * size + (x + 2)) * 4 + 3];
          const aLeft = imgData[(y * size + (x - 2)) * 4 + 3];
          const aUp = imgData[((y - 2) * size + x) * 4 + 3];
          const aDown = imgData[((y + 2) * size + x) * 4 + 3];

          const isBoundary =
            aRight < 80 || aLeft < 80 || aUp < 80 || aDown < 80;

          // Also detect internal color transitions (cyan vs dark navy)
          const bDiff =
            Math.abs(imgData[idx + 1] - imgData[(y * size + (x + 2)) * 4 + 1]) +
            Math.abs(imgData[idx + 2] - imgData[(y * size + (x + 2)) * 4 + 2]);

          if (isBoundary || bDiff > 90) {
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const isCyan = g > 110 && b > 170;
            const angle = Math.atan2(y - cy, x - cx);
            const dist = Math.hypot(x - cx, y - cy);
            pts.push({ x, y, r, g, b, angle, dist, isCyan });
          }
        }
      }

      // Sort edge points along a sweeping path from top-center around the logo & down
      pts.sort((a, b) => {
        const scoreA = a.y * 0.65 + Math.sin(a.angle * 2) * 45;
        const scoreB = b.y * 0.65 + Math.sin(b.angle * 2) * 45;
        return scoreA - scoreB;
      });

      edgePoints = pts;
    };

    let animId = 0;
    const startTime = performance.now();
    const totalDuration = 2650;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / totalDuration);

      ctx.clearRect(0, 0, size, size);

      if (imageLoaded && edgePoints.length > 0) {
        // Phase 1 (t: 0 -> 0.72): Draw progressive contour lines forming the logo
        const drawFraction = Math.min(1, t / 0.64);
        const maxIndex = Math.floor(edgePoints.length * drawFraction);

        // Fade out raw contour dots slightly once full logo is revealed
        const contourAlpha = t > 0.75 ? Math.max(0.15, 1 - (t - 0.75) * 3) : 1;

        for (let i = 0; i < maxIndex; i++) {
          const p = edgePoints[i];
          const isHead = i > maxIndex - 140;

          if (isHead && t < 0.68) {
            // Glowing laser drawing head sparks
            ctx.fillStyle = p.isCyan ? "#00d4ff" : "#1458d4";
            ctx.fillRect(p.x - 1.2, p.y - 1.2, 3.2, 3.2);
          } else {
            ctx.fillStyle = p.isCyan
              ? `rgba(0, 178, 255, ${(0.92 * contourAlpha).toFixed(2)})`
              : `rgba(5, 36, 96, ${(0.88 * contourAlpha).toFixed(2)})`;
            ctx.fillRect(p.x, p.y, 1.9, 1.9);
          }
        }

        // Connect active laser tips with motion-graphics construction lines
        if (t > 0.04 && t < 0.66 && maxIndex > 20) {
          ctx.save();
          ctx.strokeStyle = "rgba(0, 180, 255, 0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let k = Math.max(0, maxIndex - 45); k < maxIndex; k += 5) {
            const pt = edgePoints[k];
            if (k === Math.max(0, maxIndex - 45)) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // Phase 2 (t: 0.42 -> 0.88): Smooth progressive scanline + radial fill of actual logo.png
        if (t > 0.4) {
          const fillProgress = Math.min(1, (t - 0.4) / 0.44);
          const easedFill = 1 - Math.pow(1 - fillProgress, 3);
          const scanY = easedFill * size;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, size, scanY);
          ctx.clip();
          ctx.globalAlpha = Math.min(1, fillProgress * 1.25);
          ctx.drawImage(img, 0, 0, size, size);
          ctx.restore();

          // Luminous Cyan Scanline Bar sweeping down as it fills the logo
          if (fillProgress < 0.98) {
            const grad = ctx.createLinearGradient(0, scanY - 14, 0, scanY + 4);
            grad.addColorStop(0, "rgba(0, 195, 255, 0)");
            grad.addColorStop(0.8, "rgba(0, 195, 255, 0.65)");
            grad.addColorStop(1, "rgba(20, 88, 212, 0.9)");
            ctx.fillStyle = grad;
            ctx.fillRect(size * 0.08, scanY - 12, size * 0.84, 14);
          }
        }

        // Phase 3 (t: 0.76 -> 1.0): CCTV Lens Cyan Security Pulse & Gloss Sweep
        if (t > 0.74) {
          const pulseT = (t - 0.74) / 0.26;
          // CCTV lens center in 420x420 cropped space is around (140, 148)
          const lensX = size * 0.335;
          const lensY = size * 0.352;
          const pulseRadius = 14 + pulseT * 75;
          const pulseAlpha = Math.max(0, (1 - pulseT) * 0.65);

          ctx.save();
          ctx.strokeStyle = `rgba(0, 200, 255, ${pulseAlpha.toFixed(2)})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(lensX, lensY, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (t < 1) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [visible, forcePlayKey]);

  const stepIndex = Math.min(
    BOOT_STEPS.length - 1,
    Math.floor((progress / 100) * BOOT_STEPS.length)
  );

  // SVG stroke progress (0 to 1)
  const strokeRatio = Math.min(1, progress / 68);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`sadar-bright-loader-${forcePlayKey}`}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: "blur(10px)",
            transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#f8fbff] via-[#ffffff] to-[#eaf3ff] px-6 text-[#0b2558]"
        >
          {/* Creative Bright Motion-Graphics Background Elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Subtle architectural blueprint grid */}
            <div
              className="absolute inset-0 opacity-45"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(20, 88, 212, 0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 88, 212, 0.055) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />

            {/* Soft luminous ambient orbs */}
            <motion.div
              animate={{
                scale: [1, 1.12, 1],
                x: [0, 24, 0],
                y: [0, -18, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                x: [0, -24, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl"
            />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Top Creative Motion Pill */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/90 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#1458d4] shadow-[0_8px_24px_rgba(20,88,212,0.08)] backdrop-blur-md"
            >
              <Sparkles size={12} className="text-sky-500" />
              SISTEM ANALISIS DATA &amp; ANTISIPASI RISIKO
            </motion.div>

            {/* Centerpiece Logo Line-Drawing Stage */}
            <div className="relative flex h-[270px] w-[270px] items-center justify-center sm:h-[310px] sm:w-[310px]">
              {/* Rotating Outer Motion-Graphics Rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none absolute -inset-4 rounded-full border border-dashed border-sky-400/40"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none absolute -inset-8 rounded-full border border-blue-300/25"
              />

              {/* Glassmorphic Studio Pedestal */}
              <div className="absolute inset-1 rounded-[42px] border border-white bg-white/75 shadow-[0_24px_70px_rgba(12,48,116,0.12)] backdrop-blur-xl" />

              {/* Synchronized SVG Vector Blueprint Stroke Layer (Draws exact geometry of SADAR Logo) */}
              <svg
                viewBox="0 0 800 800"
                className="pointer-events-none absolute inset-4 h-[calc(100%-32px)] w-[calc(100%-32px)]"
                fill="none"
              >
                <defs>
                  <linearGradient id="sadarLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00b4ff" />
                    <stop offset="55%" stopColor="#1458d4" />
                    <stop offset="100%" stopColor="#041f56" />
                  </linearGradient>
                </defs>

                {/* 1. Outer Circular Security Arc */}
                <path
                  d="M 116 622 A 376 376 0 1 1 684 622"
                  stroke="url(#sadarLineGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - strokeRatio * 100}
                  style={{ transition: "stroke-dashoffset 60ms linear", opacity: progress > 75 ? 0.25 : 0.85 }}
                />

                {/* 2. CCTV Camera Body & Lens Vector Trace */}
                <path
                  d="M 372 30 L 460 52 L 452 152 L 428 188 L 282 282 C 242 296 208 242 214 196 L 395 92 Z"
                  stroke="#041f56"
                  strokeWidth="9"
                  strokeLinejoin="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - strokeRatio * 100}
                  style={{ transition: "stroke-dashoffset 60ms linear", opacity: progress > 75 ? 0.2 : 0.8 }}
                />
                <ellipse
                  cx="268"
                  cy="228"
                  rx="36"
                  ry="48"
                  transform="rotate(-18 268 228)"
                  stroke="#00b4ff"
                  strokeWidth="8"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - strokeRatio * 100}
                  style={{ transition: "stroke-dashoffset 60ms linear", opacity: progress > 75 ? 0.2 : 0.9 }}
                />

                {/* 3. Flowing S-Curve Ribbon into Padlock Body */}
                <path
                  d="M 455 96 C 562 128 575 218 500 232 L 415 242 C 332 258 345 338 450 368 C 565 402 585 520 515 620 L 472 608 C 392 608 320 608 286 525 C 282 478 332 450 475 450"
                  stroke="#00b4ff"
                  strokeWidth="11"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - strokeRatio * 100}
                  style={{ transition: "stroke-dashoffset 60ms linear", opacity: progress > 75 ? 0.2 : 0.9 }}
                />

                {/* 4. Padlock Shackle & Keyhole Vector Trace */}
                <path
                  d="M 342 444 L 342 396 A 56 56 0 0 1 454 396 L 454 444"
                  stroke="#00b4ff"
                  strokeWidth="12"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - strokeRatio * 100}
                  style={{ transition: "stroke-dashoffset 60ms linear", opacity: progress > 75 ? 0.2 : 0.9 }}
                />
                <path
                  d="M 398 492 A 20 20 0 1 1 397.9 492 Z M 388 525 L 408 525 L 414 568 L 382 568 Z"
                  stroke="#041f56"
                  strokeWidth="7"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - strokeRatio * 100}
                  style={{ transition: "stroke-dashoffset 60ms linear", opacity: progress > 75 ? 0.2 : 0.85 }}
                />

                {/* 5. Wordmark "SADAR" Baseline Construction Path */}
                <path
                  d="M 80 650 L 195 650 L 195 750 L 80 750 M 215 750 L 270 645 L 325 750 M 355 645 L 445 645 C 480 645 480 750 445 750 L 355 750 Z M 488 750 L 542 645 L 598 750 M 622 750 L 622 645 L 705 645 C 730 645 730 698 700 698 L 622 698 M 682 698 L 728 750"
                  stroke="#041f56"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - strokeRatio * 100}
                  style={{ transition: "stroke-dashoffset 60ms linear", opacity: progress > 75 ? 0.15 : 0.85 }}
                />
              </svg>

              {/* High-Resolution Pixel-Contour Line Tracer + Full Logo Reveal Canvas */}
              <canvas
                ref={canvasRef}
                className="relative z-10 h-[238px] w-[238px] sm:h-[272px] sm:w-[272px]"
              />
            </div>

            {/* Dynamic Step Label */}
            <p className="mt-5 min-h-[22px] text-xs font-bold tracking-wide text-[#1458d4] sm:text-sm">
              {BOOT_STEPS[stepIndex]}
            </p>

            {/* Sleek Bright Progress Bar */}
            <div className="mt-4 w-64 max-w-full overflow-hidden rounded-full border border-blue-200/80 bg-white p-1 shadow-inner sm:w-72">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-[#041f56] via-[#1458d4] to-[#00b4ff] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2.5 flex w-64 max-w-full items-center justify-between text-[11px] font-bold text-slate-500 sm:w-72">
              <span className="inline-flex items-center gap-1.5 text-[#0b2558]">
                <ShieldCheck size={14} className="text-[#00aeef]" /> Proteksi Visual &amp; Data
              </span>
              <span className="tabular-nums font-extrabold text-[#1458d4]">
                {progress}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setVisible(false);
                onFinish?.();
              }}
              className="mt-5 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-[#1458d4]"
            >
              Lewati animasi
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Smooth Skeleton Loader for Content & Cards
 */
export function ModuleSkeletonLoader({
  label = "Memuat modul interaktif...",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-5 rounded-3xl border border-blue-100/90 bg-white/85 p-6 shadow-[0_12px_35px_rgba(20,62,120,0.06)] backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2.5">
          <div className="h-3 w-28 animate-pulse rounded-full bg-blue-100" />
          <div className="h-7 w-64 animate-pulse rounded-xl bg-slate-200/90 sm:w-80" />
          <div className="h-3.5 w-48 animate-pulse rounded-full bg-slate-100 sm:w-72" />
        </div>
        <div className="hidden h-12 w-12 animate-pulse rounded-2xl bg-blue-50 sm:block" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-blue-100/80" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-emerald-100/80" />
            </div>
            <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200/70" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
        <span className="h-2 w-2 animate-ping rounded-full bg-blue-600" />
        {label}
      </div>
    </div>
  );
}
