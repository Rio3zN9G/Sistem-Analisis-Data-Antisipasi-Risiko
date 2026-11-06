"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type StatCategory = "scam" | "link" | "edu";

export type StatActivity = {
  id: string;
  category: StatCategory;
  label: string;
  timestamp: string;
};

type StatsState = {
  scamDetected: number;
  linksScanned: number;
  usersEducated: number;
  sessionActions: number;
  lastUpdatedCategory: StatCategory | null;
  lastUpdatedAt: number;
  recentActivities: StatActivity[];
};

type StatsContextValue = StatsState & {
  recordScamCheck: (label?: string) => void;
  recordLinkScan: (label?: string) => void;
  recordEducationAction: (label?: string) => void;
  resetStats: () => void;
};

const STORAGE_KEY = "sadar_interactive_stats_v2";

const INITIAL_STATS: StatsState = {
  scamDetected: 12840,
  linksScanned: 8420,
  usersEducated: 24610,
  sessionActions: 0,
  lastUpdatedCategory: null,
  lastUpdatedAt: 0,
  recentActivities: [
    {
      id: "init-1",
      category: "scam",
      label: "Deteksi pola pesan OTP mencurigakan",
      timestamp: "Baru saja",
    },
    {
      id: "init-2",
      category: "link",
      label: "Pemindaian domain tiruan kurir (.xyz)",
      timestamp: "2 mnt lalu",
    },
    {
      id: "init-3",
      category: "edu",
      label: "Simulasi keamanan akun selesai",
      timestamp: "5 mnt lalu",
    },
  ],
};

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StatsState>(INITIAL_STATS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState((prev) => ({
          ...prev,
          scamDetected:
            typeof parsed.scamDetected === "number" ? parsed.scamDetected : prev.scamDetected,
          linksScanned:
            typeof parsed.linksScanned === "number" ? parsed.linksScanned : prev.linksScanned,
          usersEducated:
            typeof parsed.usersEducated === "number" ? parsed.usersEducated : prev.usersEducated,
          sessionActions:
            typeof parsed.sessionActions === "number" ? parsed.sessionActions : 0,
          recentActivities: Array.isArray(parsed.recentActivities)
            ? parsed.recentActivities.slice(0, 6)
            : prev.recentActivities,
        }));
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, []);

  const persist = useCallback((next: StatsState) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scamDetected: next.scamDetected,
          linksScanned: next.linksScanned,
          usersEducated: next.usersEducated,
          sessionActions: next.sessionActions,
          recentActivities: next.recentActivities,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, []);

  const addActivity = useCallback(
    (category: StatCategory, defaultLabel: string) => {
      setState((prev) => {
        const activity: StatActivity = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category,
          label: defaultLabel,
          timestamp: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };

        const next: StatsState = {
          scamDetected: prev.scamDetected + (category === "scam" ? 1 : 0),
          linksScanned: prev.linksScanned + (category === "link" ? 1 : 0),
          usersEducated: prev.usersEducated + (category === "edu" ? 1 : 0),
          sessionActions: prev.sessionActions + 1,
          lastUpdatedCategory: category,
          lastUpdatedAt: Date.now(),
          recentActivities: [activity, ...prev.recentActivities].slice(0, 6),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const recordScamCheck = useCallback(
    (label = "Analisis pesan chat selesai diperiksa") => {
      addActivity("scam", label);
    },
    [addActivity]
  );

  const recordLinkScan = useCallback(
    (label = "URL selesai dipindai oleh pemindai tautan") => {
      addActivity("link", label);
    },
    [addActivity]
  );

  const recordEducationAction = useCallback(
    (label = "Interaksi edukasi & simulasi keamanan selesai") => {
      addActivity("edu", label);
    },
    [addActivity]
  );

  const resetStats = useCallback(() => {
    setState(INITIAL_STATS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <StatsContext.Provider
      value={{
        ...state,
        recordScamCheck,
        recordLinkScan,
        recordEducationAction,
        resetStats,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error("useStats harus digunakan di dalam StatsProvider");
  }
  return context;
}
