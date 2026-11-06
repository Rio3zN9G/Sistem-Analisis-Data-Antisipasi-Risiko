"use client";

import {
  Gamepad2,
  Keyboard,
  RotateCcw,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/Analyzer";
import { useStats } from "@/components/StatsContext";
import { Tilt3DCard } from "@/components/CyberMesh3D";

const WIDTH = 900;
const HEIGHT = 280;
const FLOOR = 226;

type Obstacle = { x: number; width: number; height: number; label: string };
type PowerUp = { x: number; y: number; taken: boolean; label: string };
type GameState = {
  running: boolean;
  over: boolean;
  score: number;
  speed: number;
  playerY: number;
  velocityY: number;
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  spawnIn: number;
  powerIn: number;
  shieldUntil: number;
  lastTime: number;
};

const freshState = (): GameState => ({
  running: false,
  over: false,
  score: 0,
  speed: 5,
  playerY: FLOOR - 35,
  velocityY: 0,
  obstacles: [],
  powerUps: [],
  spawnIn: 70,
  powerIn: 190,
  shieldUntil: 0,
  lastTime: 0,
});

export function SadarRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(freshState());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [shielded, setShielded] = useState(false);
  const { usersEducated, recordEducationAction } = useStats();

  const start = useCallback(() => {
    gameRef.current = { ...freshState(), running: true };
    setScore(0);
    setOver(false);
    setRunning(true);
    setShielded(false);
    recordEducationAction("Memulai sesi latihan refleks SADAR Run");
  }, [recordEducationAction]);

  const jump = useCallback(() => {
    const game = gameRef.current;
    if (game.running && game.playerY >= FLOOR - 35) game.velocityY = -12;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let frame = 0;
    let scoreTick = 0;

    const draw = (time: number) => {
      const game = gameRef.current;
      const ctx = context;
      const dt = game.lastTime ? Math.min((time - game.lastTime) / 16.67, 2) : 1;
      game.lastTime = time;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // 3D Perspective Cyber Sky & Grid
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#eef5ff");
      sky.addColorStop(1, "#dbeafe");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let i = 0; i < 32; i++) {
        ctx.fillStyle =
          i % 4 === 0 ? "rgba(37,99,235,.4)" : "rgba(91,129,183,.22)";
        ctx.fillRect(
          (i * 137 + 41) % WIDTH,
          22 + ((i * 43) % 115),
          i % 5 === 0 ? 2.5 : 1.5,
          1.5
        );
      }

      // 3D Perspective Floor Grid Lines
      ctx.strokeStyle = "rgba(37, 99, 235, 0.16)";
      ctx.lineWidth = 1;
      const offset = (time * 0.08) % 38;
      for (let x = -30; x < WIDTH + 40; x += 38) {
        ctx.beginPath();
        ctx.moveTo(x - offset, FLOOR + 2);
        ctx.lineTo(x - offset - 46, HEIGHT);
        ctx.stroke();
      }
      ctx.fillStyle = "#cfe2fc";
      ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
      ctx.strokeStyle = "rgba(20, 88, 212, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, FLOOR);
      ctx.lineTo(WIDTH, FLOOR);
      ctx.stroke();

      if (game.running) {
        game.score += dt * 0.12;
        game.speed = Math.min(5 + game.score / 115, 10);
        game.velocityY += 0.62 * dt;
        game.playerY = Math.min(
          FLOOR - 35,
          game.playerY + game.velocityY * dt
        );
        if (game.playerY >= FLOOR - 35) game.velocityY = 0;

        game.spawnIn -= dt;
        if (game.spawnIn <= 0) {
          game.obstacles.push({
            x: WIDTH + 20,
            width: 26 + Math.random() * 8,
            height: 28 + Math.random() * 14,
            label: Math.random() > 0.5 ? "PHISH" : "SCAM",
          });
          game.spawnIn = 68 + Math.random() * 58;
        }
        game.powerIn -= dt;
        if (game.powerIn <= 0) {
          game.powerUps.push({
            x: WIDTH + 16,
            y: FLOOR - 56 - Math.random() * 35,
            taken: false,
            label: Math.random() > 0.5 ? "SHIELD" : "2FA",
          });
          game.powerIn = 210 + Math.random() * 110;
        }
        game.obstacles = game.obstacles.filter((obstacle) => obstacle.x > -50);
        game.powerUps = game.powerUps.filter(
          (power) => power.x > -35 && !power.taken
        );
        game.obstacles.forEach((obstacle) => {
          obstacle.x -= game.speed * dt;
        });
        game.powerUps.forEach((power) => {
          power.x -= game.speed * dt;
        });
        const player = {
          left: 80,
          right: 108,
          top: game.playerY,
          bottom: game.playerY + 33,
        };
        for (const obstacle of game.obstacles) {
          const hit =
            player.right > obstacle.x + 2 &&
            player.left < obstacle.x + obstacle.width - 2 &&
            player.bottom > FLOOR - obstacle.height;
          if (hit && game.shieldUntil > time) {
            obstacle.x = -100;
            game.shieldUntil = 0;
            setShielded(false);
          } else if (hit) {
            game.running = false;
            game.over = true;
            setRunning(false);
            setOver(true);
            const finalScore = Math.floor(game.score);
            setScore(finalScore);
            setHighScore((prev) => Math.max(prev, finalScore));
          }
        }
        for (const power of game.powerUps) {
          const close =
            player.right > power.x - 4 &&
            player.left < power.x + 22 &&
            player.bottom > power.y - 2 &&
            player.top < power.y + 22;
          if (close) {
            power.taken = true;
            game.score += 35;
            if (power.label === "SHIELD") {
              game.shieldUntil = time + 7000;
              setShielded(true);
            }
          }
        }
        scoreTick += dt;
        if (scoreTick > 8) {
          setScore(Math.floor(game.score));
          scoreTick = 0;
        }
      }

      // Draw Player Character
      const glow = ctx.createRadialGradient(
        94,
        game.playerY + 18,
        3,
        94,
        game.playerY + 18,
        45
      );
      glow.addColorStop(0, "rgba(20, 88, 212, 0.25)");
      glow.addColorStop(1, "rgba(20, 88, 212, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(50, game.playerY - 25, 90, 90);

      if (game.shieldUntil > time) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(94, game.playerY + 17, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "#1458d4";
      ctx.beginPath();
      ctx.roundRect(80, game.playerY, 28, 33, 8);
      ctx.fill();
      ctx.fillStyle = "#c6f329";
      ctx.fillRect(97, game.playerY + 8, 6, 4);
      ctx.fillStyle = "#0b327e";
      ctx.fillRect(83, game.playerY + 29, 8, 5);
      ctx.fillRect(99, game.playerY + 29, 8, 5);

      // Obstacles
      game.obstacles.forEach((obstacle) => {
        ctx.fillStyle = "#e11d48";
        ctx.beginPath();
        ctx.roundRect(
          obstacle.x,
          FLOOR - obstacle.height,
          obstacle.width,
          obstacle.height,
          6
        );
        ctx.fill();
        ctx.fillStyle = "#fff1f2";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          obstacle.label,
          obstacle.x + obstacle.width / 2,
          FLOOR - obstacle.height + 15
        );
      });

      // PowerUps
      game.powerUps.forEach((power) => {
        ctx.fillStyle = power.label === "SHIELD" ? "#10b981" : "#0284c7";
        ctx.beginPath();
        ctx.roundRect(power.x, power.y, 22, 22, 7);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          power.label === "SHIELD" ? "S" : "2F",
          power.x + 11,
          power.y + 15
        );
        ctx.fillStyle = "#1e3a8a";
        ctx.font = "bold 8px sans-serif";
        ctx.fillText(power.label, power.x + 11, power.y - 5);
      });

      if (!game.running && !game.over) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.textAlign = "center";
        ctx.fillStyle = "#12284b";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(
          "Tekan tombol MULAI BERMAIN atau ketuk area ini",
          WIDTH / 2,
          HEIGHT / 2
        );
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        if (!gameRef.current.running) {
          start();
        } else {
          jump();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump, start]);

  return (
    <section className="mx-auto max-w-[1020px]">
      <PageHeading
        eyebrow="SADAR RUN · MINIGAME REFLEKS"
        title="Lari dari jebakan digital."
        description="Lompati rintangan phishing dan scam bot, serta kumpulkan perisai keamanan (Shield & 2FA). Setiap sesi latihan turut meningkatkan statistik pengguna teredukasi."
        badgeText={`Teredukasi: ${new Intl.NumberFormat("id-ID").format(usersEducated)}`}
      />

      <div className="pt-2">
        <div className="relative overflow-visible rounded-[26px] border border-blue-100 bg-white/95 shadow-[0_16px_45px_rgba(20,57,108,0.08)]">
          {/* Out-of-bounds 3D Top Badge */}
          <div className="absolute -top-3.5 right-6 inline-flex items-center gap-1.5 rounded-full border border-lime-400 bg-[#c6f329] px-3.5 py-1 text-[10px] font-extrabold text-[#16300b] shadow-md">
            <TrendingUp size={12} /> +1 Statistik Edukasi Setiap Bermain
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1458d4]">
                <Gamepad2 size={19} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#12284b]">SADAR Cyber Runner</p>
                <p className="text-[11px] text-slate-500">
                  Ketuk layar atau tekan Space / Panah Atas untuk melompat
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {shielded && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <Shield size={13} /> Shield Aktif
                </span>
              )}
              <span className="rounded-xl border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
                SKOR{" "}
                <b className="ml-1.5 tabular-nums text-base font-extrabold text-[#1458d4]">
                  {score}
                </b>
              </span>
              {highScore > 0 && (
                <span className="hidden rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:inline-block">
                  REKOR <b className="ml-1 tabular-nums">{highScore}</b>
                </span>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              onPointerDown={() => {
                if (!running) start();
                else jump();
              }}
              aria-label="Area permainan SADAR Run, ketuk untuk melompat"
              className="w-full cursor-pointer touch-manipulation rounded-2xl border border-blue-100 shadow-inner"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Keyboard size={14} className="text-[#1458d4]" /> Space / ↑ atau Ketuk Layar
                  untuk Lompat
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" /> Kumpulkan Shield &amp; 2FA
                </span>
              </div>
              <button
                type="button"
                onClick={start}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1458d4] px-5 py-2.5 text-xs font-bold text-white shadow-[0_10px_25px_rgba(20,88,212,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0f46ad]"
              >
                {over ? <RotateCcw size={14} /> : <Gamepad2 size={14} />}
                {over ? "Main Lagi" : running ? "Mulai Ulang" : "Mulai Bermain"}
              </button>
            </div>

            {over && (
              <div
                role="status"
                className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-950"
              >
                <span>
                  Permainan selesai! Skor akhir kamu:{" "}
                  <b className="font-extrabold">{score}</b>. Tetap waspada terhadap jebakan
                  phishing!
                </span>
                <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
                  +1 Tercatat di Statistik Edukasi
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <GameLegend
          icon={
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-xs font-black text-rose-700">
              !
            </span>
          }
          title="Phishing & Scam Bot"
          text="Hindari balok merah yang melambangkan tautan jebakan dan penipuan otomatis."
        />
        <GameLegend
          icon={
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Shield size={17} />
            </span>
          }
          title="Cyber Shield (Perisai)"
          text="Memberikan perlindungan ekstra yang menahan 1x benturan rintangan berbahaya."
        />
        <GameLegend
          icon={
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <Trophy size={17} />
            </span>
          }
          title="Autentikasi 2FA & Sandi Kuat"
          text="Ambil ikon biru untuk menambah +35 poin keamanan digitalmu secara instan."
        />
      </div>
    </section>
  );
}

function GameLegend({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Tilt3DCard
      intensity={6}
      className="flex gap-3.5 rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm"
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-bold text-[#12284b]">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-600">{text}</p>
      </div>
    </Tilt3DCard>
  );
}
