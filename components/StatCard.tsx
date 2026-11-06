"use client";

import React, { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Tilt3DCard } from "@/components/CyberMesh3D";

const toneStyles = {
  violet: {
    badge: "border-blue-200 bg-gradient-to-br from-[#1458d4] to-[#0d3b94] text-white shadow-[0_12px_25px_rgba(20,88,212,0.35)]",
    cardBorder: "border-blue-100/90 hover:border-blue-300/80",
    pill: "bg-blue-50 text-blue-700 border-blue-200/70",
    stroke: "#1458d4",
    fill: "rgba(20, 88, 212, 0.12)",
  },
  blue: {
    badge: "border-sky-200 bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-[0_12px_25px_rgba(14,165,233,0.35)]",
    cardBorder: "border-sky-100/90 hover:border-sky-300/80",
    pill: "bg-sky-50 text-sky-700 border-sky-200/70",
    stroke: "#0284c7",
    fill: "rgba(2, 132, 199, 0.12)",
  },
  mint: {
    badge: "border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-[0_12px_25px_rgba(16,185,129,0.35)]",
    cardBorder: "border-emerald-100/90 hover:border-emerald-300/80",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    stroke: "#059669",
    fill: "rgba(5, 150, 105, 0.12)",
  },
};

type StatCardProps = {
  label: string;
  numericValue?: number;
  value?: string;
  change: string;
  icon: LucideIcon;
  tone: keyof typeof toneStyles;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  onQuickIncrement?: () => void;
  highlighted?: boolean;
};

export function StatCard({
  label,
  numericValue,
  value,
  change,
  icon: Icon,
  tone,
  subtitle,
  actionLabel,
  onAction,
  onQuickIncrement,
  highlighted = false,
}: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const targetNumber =
    typeof numericValue === "number"
      ? numericValue
      : parseFallbackNumber(value || "0");

  const [displayNumber, setDisplayNumber] = useState(0);
  const prevTargetRef = useRef<number>(0);
  const [pulseCount, setPulseCount] = useState(0);

  // IntersectionObserver: start counting when card enters viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animate counter when inView becomes true OR when targetNumber increments
  useEffect(() => {
    if (!inView) return;

    const fromValue = prevTargetRef.current;
    const toValue = targetNumber;

    if (fromValue !== 0 && toValue > fromValue) {
      setPulseCount((c) => c + 1);
    }

    prevTargetRef.current = toValue;

    let rafId = 0;
    const startTime = performance.now();
    const duration = fromValue === 0 ? 1450 : 650;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(fromValue + (toValue - fromValue) * eased);
      setDisplayNumber(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [inView, targetNumber]);

  const theme = toneStyles[tone];
  const formattedExact = new Intl.NumberFormat("id-ID").format(displayNumber);
  const compactBadge =
    displayNumber >= 1000
      ? `${(displayNumber / 1000).toFixed(1).replace(".", ",")}K+`
      : `${displayNumber}`;

  return (
    <div ref={cardRef} className="pt-3">
      <Tilt3DCard
        intensity={8}
        className={`group relative overflow-visible rounded-[24px] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(20,57,108,0.06)] transition-all duration-300 hover:shadow-[0_20px_45px_rgba(20,88,212,0.13)] ${theme.cardBorder}`}
      >
        {/* Out-of-bounds 3D Pop-Out Icon Badge (protrudes above top-right border) */}
        <div
          style={{ transform: "translateZ(36px)" }}
          className={`absolute -top-4 right-5 grid h-12 w-12 place-items-center rounded-2xl border-2 border-white transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105 ${theme.badge}`}
        >
          <Icon size={21} strokeWidth={2} />
        </div>

        {/* Live "+1" Increment Floating Pop-out Notification */}
        <AnimatePresence>
          {(pulseCount > 0 || highlighted) && (
            <motion.div
              key={pulseCount}
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: -12, scale: 1 }}
              exit={{ opacity: 0, y: -22, scale: 0.9 }}
              transition={{ duration: 0.45 }}
              style={{ transform: "translateZ(48px)" }}
              className="pointer-events-none absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full border border-lime-400 bg-[#c6f329] px-2.5 py-0.5 text-[10px] font-extrabold text-[#152e0b] shadow-md"
            >
              <Sparkles size={11} /> +1 Interaksi Real-Time!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Row: Change Badge & Compact Tag */}
        <div className="flex items-center gap-2 pr-14">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight size={12} /> {change}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${theme.pill}`}
          >
            {compactBadge}
          </span>
        </div>

        {/* Animated Counter Value */}
        <div className="mt-4 flex items-baseline justify-between gap-2" style={{ transform: "translateZ(22px)" }}>
          <div>
            <p className="tabular-nums text-[30px] font-extrabold tracking-tight text-[#11284c] sm:text-[33px]">
              {formattedExact}
            </p>
            <h3 className="mt-1 text-xs font-bold text-[#1a335c]">{label}</h3>
            {subtitle && (
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{subtitle}</p>
            )}
          </div>

          {/* Animated Mini Sparkline SVG */}
          <svg
            width="76"
            height="34"
            viewBox="0 0 76 34"
            aria-hidden="true"
            className="shrink-0 overflow-visible opacity-90"
          >
            <path
              d="M2 28 C16 26, 22 18, 34 20 C46 22, 54 9, 74 4 L74 32 L2 32 Z"
              fill={theme.fill}
            />
            <path
              d="M2 28 C16 26, 22 18, 34 20 C46 22, 54 9, 74 4"
              fill="none"
              stroke={theme.stroke}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="74" cy="4" r="3.2" fill={theme.stroke} />
          </svg>
        </div>

        {/* Interactive Footer Controls */}
        {(onAction || onQuickIncrement) && (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            {onAction ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1458d4] transition hover:text-[#0c3b91]"
              >
                {actionLabel || "Buka fitur"} <ArrowUpRight size={13} />
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">Terhubung ke aktivitasmu</span>
            )}

            {onQuickIncrement && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickIncrement();
                }}
                title="Simulasikan pertambahan statistik +1"
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50/70 px-2.5 py-1 text-[10px] font-bold text-blue-700 transition hover:bg-[#1458d4] hover:text-white active:scale-95"
              >
                <Plus size={11} /> Uji +1
              </button>
            )}
          </div>
        )}
      </Tilt3DCard>
    </div>
  );
}

function parseFallbackNumber(str: string): number {
  const cleaned = str.trim().toUpperCase();
  if (cleaned.endsWith("K")) {
    return Math.round(parseFloat(cleaned.replace("K", "")) * 1000);
  }
  const digits = parseInt(cleaned.replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(digits) ? 0 : digits;
}
