"use client";

import React, { useEffect, useRef, useState } from "react";
import { LockKeyhole, Radar, ShieldCheck, Sparkles } from "lucide-react";

/**
 * Background 3D Interactive Mesh Canvas
 * Renders a living 3D perspective topological mesh + floating cyber nodes
 * that smoothly react to mouse tracking and scroll position.
 */
export function CyberMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: width * 0.65, y: height * 0.35, targetX: width * 0.65, targetY: height * 0.35 };
    let scrollY = window.scrollY || 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleScroll = () => {
      scrollY = window.scrollY || 0;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    const cols = 16;
    const rows = 11;

    const render = (time: number) => {
      const t = time * 0.0012;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // Soft interactive ambient mesh blobs following cursor & scroll
      const grad1 = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        20,
        mouse.x,
        mouse.y,
        Math.max(width, height) * 0.45
      );
      grad1.addColorStop(0, "rgba(37, 99, 235, 0.09)");
      grad1.addColorStop(0.5, "rgba(56, 189, 248, 0.045)");
      grad1.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // 3D Projected Wireframe Mesh Grid
      const normMouseX = (mouse.x / Math.max(1, width) - 0.5) * 2;
      const normMouseY = (mouse.y / Math.max(1, height) - 0.5) * 2;
      const scrollPhase = scrollY * 0.003;

      const points: { x: number; y: number; z: number }[][] = [];
      const fov = 520;

      for (let r = 0; r < rows; r++) {
        points[r] = [];
        for (let c = 0; c < cols; c++) {
          const u = (c / (cols - 1) - 0.5) * width * 1.35;
          const v = (r / (rows - 1) - 0.5) * height * 1.15;

          const distToMouse = Math.hypot(
            c / (cols - 1) - mouse.x / Math.max(1, width),
            r / (rows - 1) - mouse.y / Math.max(1, height)
          );
          const mouseWave = Math.max(0, 1 - distToMouse * 2.4) * 58;

          const waveZ =
            Math.sin(c * 0.48 + t + scrollPhase) * 26 +
            Math.cos(r * 0.52 - t * 0.8 + scrollPhase) * 24 +
            mouseWave;

          // Apply subtle camera tilt from cursor
          const rotX = u + normMouseX * 28 * (r / rows);
          const rotY = v + normMouseY * 22 * (c / cols) - scrollY * 0.08;
          const z = waveZ + 180;

          const scale = fov / Math.max(120, fov + z);
          const projX = width * 0.5 + rotX * scale;
          const projY = height * 0.52 + rotY * scale;

          points[r][c] = { x: projX, y: projY, z: waveZ };
        }
      }

      // Draw mesh connections
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p = points[r][c];
          const alpha = Math.min(0.16, Math.max(0.03, (p.z + 50) / 700));
          ctx.strokeStyle = `rgba(30, 94, 219, ${alpha.toFixed(3)})`;

          if (c < cols - 1) {
            const right = points[r][c + 1];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(right.x, right.y);
            ctx.stroke();
          }
          if (r < rows - 1) {
            const down = points[r + 1][c];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(down.x, down.y);
            ctx.stroke();
          }
        }
      }

      // Draw glowing vertices near cursor
      for (let r = 0; r < rows; r += 2) {
        for (let c = 0; c < cols; c += 2) {
          const p = points[r][c];
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (d < 260) {
            const intensity = (1 - d / 260) * 0.45;
            ctx.fillStyle = `rgba(20, 88, 212, ${intensity.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.2 + intensity * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-90"
    />
  );
}

/**
 * Interactive 3D Cyber Shield & Mesh Sphere for Hero Section
 * Reacts to mouse cursor position and scroll with 3D rotation + floating out-of-bounds layers
 */
export function Hero3DCore() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.45)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.45)));
      setTilt({
        rx: -dy * 16,
        ry: dx * 20,
        gx: 50 + dx * 30,
        gy: 50 + dy * 30,
      });
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 260;
    canvas.width = size;
    canvas.height = size;

    // Generate 3D sphere & orbital ring vertices
    const vertices: { x: number; y: number; z: number; ring?: boolean }[] = [];
    const latSteps = 7;
    const lonSteps = 12;
    const radius = 84;

    for (let i = 1; i < latSteps; i++) {
      const theta = (i * Math.PI) / latSteps;
      for (let j = 0; j < lonSteps; j++) {
        const phi = (j * 2 * Math.PI) / lonSteps;
        vertices.push({
          x: radius * Math.sin(theta) * Math.cos(phi),
          y: radius * Math.cos(theta),
          z: radius * Math.sin(theta) * Math.sin(phi),
        });
      }
    }

    // Outer orbital ring
    const ringCount = 24;
    const ringRadius = 112;
    for (let k = 0; k < ringCount; k++) {
      const angle = (k * 2 * Math.PI) / ringCount;
      vertices.push({
        x: ringRadius * Math.cos(angle),
        y: ringRadius * Math.sin(angle) * 0.35,
        z: ringRadius * Math.sin(angle),
        ring: true,
      });
    }

    let frameId = 0;
    let pointerAngleX = 0.35;
    let pointerAngleY = 0.5;

    const onMouseMove = (e: MouseEvent) => {
      pointerAngleY = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 1.9;
      pointerAngleX = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 1.4;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    let smoothAx = 0;
    let smoothAy = 0;

    const draw = (time: number) => {
      const t = time * 0.001;
      smoothAx += (pointerAngleX - smoothAx) * 0.06;
      smoothAy += (pointerAngleY - smoothAy) * 0.06;

      const ax = t * 0.35 + smoothAx;
      const ay = t * 0.55 + smoothAy;

      ctx.clearRect(0, 0, size, size);

      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);

      const projected = vertices.map((v) => {
        // Rotate Y
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.z * cosY + v.x * sinY;
        // Rotate X
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + v.y * sinX;

        const scale = 260 / (260 + z2);
        return {
          x: size / 2 + x1 * scale,
          y: size / 2 + y2 * scale,
          z: z2,
          scale,
          ring: v.ring,
        };
      });

      // Connect nearby sphere nodes to form 3D wireframe mesh
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          if (projected[i].ring !== projected[j].ring) continue;
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.hypot(dx, dy);
          const maxDist = projected[i].ring ? 38 : 44;
          if (dist < maxDist) {
            const depthAlpha = ((projected[i].z + projected[j].z + 220) / 440) * 0.38;
            ctx.strokeStyle = projected[i].ring
              ? `rgba(198, 243, 41, ${Math.max(0.08, depthAlpha).toFixed(2)})`
              : `rgba(191, 219, 254, ${Math.max(0.08, depthAlpha).toFixed(2)})`;
            ctx.lineWidth = projected[i].ring ? 1.2 : 0.9;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw 3D vertices
      projected.forEach((p) => {
        const alpha = Math.max(0.2, Math.min(0.95, (p.z + 110) / 220));
        ctx.fillStyle = p.ring
          ? `rgba(198, 243, 41, ${alpha.toFixed(2)})`
          : `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.ring ? 2.1 : 1.8) * p.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[260px] w-[260px] select-none items-center justify-center sm:h-[290px] sm:w-[290px]"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center transition-transform duration-150 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
      >
        {/* Ambient 3D Backplate */}
        <div
          className="absolute h-52 w-52 rounded-full bg-gradient-to-tr from-sky-400/30 via-blue-300/20 to-lime-300/25 blur-2xl"
          style={{ transform: "translateZ(-35px)" }}
        />

        {/* 3D Wireframe Sphere Canvas */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 m-auto h-[250px] w-[250px]"
          style={{ transform: "translateZ(10px)" }}
        />

        {/* Center Floating 3D Glass Core with Official SADAR Logo */}
        <div
          className="relative grid h-28 w-28 place-items-center rounded-[32px] border-2 border-white/80 bg-white/95 p-2.5 shadow-[0_24px_55px_rgba(3,18,62,0.45)] backdrop-blur-md"
          style={{ transform: "translateZ(48px)" }}
        >
          <div className="absolute -inset-1.5 rounded-[35px] border border-sky-300/45 opacity-80" />
          <img
            src="/logo.png"
            alt="Logo SADAR"
            className="h-full w-full object-contain drop-shadow-[0_6px_14px_rgba(4,31,86,0.18)]"
          />
        </div>

        {/* Out-of-bounds Pop-out Floating Badge 1 (Top Right) */}
        <div
          className="absolute -right-4 top-3 flex items-center gap-1.5 rounded-2xl border border-white/35 bg-[#0d3580]/90 px-3 py-2 text-[10px] font-semibold text-white shadow-[0_14px_28px_rgba(4,16,52,0.45)] backdrop-blur-md"
          style={{ transform: "translateZ(72px)" }}
        >
          <span className="grid h-5 w-5 place-items-center rounded-lg bg-[#c6f329] text-[#142c0b]">
            <Radar size={12} />
          </span>
          <span>AI &amp; Heuristik Aktif</span>
        </div>

        {/* Out-of-bounds Pop-out Floating Badge 2 (Bottom Left) */}
        <div
          className="absolute -left-5 bottom-5 flex items-center gap-1.5 rounded-2xl border border-white/35 bg-white/95 px-3 py-2 text-[10px] font-bold text-[#102a56] shadow-[0_16px_32px_rgba(4,16,52,0.38)]"
          style={{ transform: "translateZ(64px)" }}
        >
          <span className="grid h-5 w-5 place-items-center rounded-lg bg-blue-600 text-white">
            <LockKeyhole size={11} />
          </span>
          <span>Proteksi 360°</span>
        </div>

        {/* Out-of-bounds Pop-out Floating Mini Orb (Top Left) */}
        <div
          className="absolute left-3 top-5 grid h-9 w-9 place-items-center rounded-2xl border border-white/35 bg-gradient-to-br from-lime-300 to-emerald-300 text-[#122b18] shadow-lg"
          style={{ transform: "translateZ(56px)" }}
        >
          <Sparkles size={15} />
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable 3D Perspective Tilt Card with Cursor Glare & Out-of-Bounds Pop-Out Support
 */
export function Tilt3DCard({
  children,
  className = "",
  intensity = 10,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    hovered: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * intensity * 2;
    const rotateX = (0.5 - y) * intensity * 2;
    setStyle({
      rotateX,
      rotateY,
      glareX: x * 100,
      glareY: y * 100,
      hovered: true,
    });
  };

  const handleMouseLeave = () => {
    setStyle({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, hovered: false });
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: "1100px",
      }}
      className={`relative select-none ${onClick ? "cursor-pointer" : ""}`}
    >
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: style.hovered
            ? `rotateX(${style.rotateX.toFixed(2)}deg) rotateY(${style.rotateY.toFixed(2)}deg) translateY(-4px)`
            : "rotateX(0deg) rotateY(0deg) translateY(0px)",
          transition: style.hovered
            ? "transform 90ms ease-out"
            : "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`relative ${className}`}
      >
        {/* Specular Cursor Spotlight Glare */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: style.hovered ? 1 : 0,
            background: `radial-gradient(280px circle at ${style.glareX}% ${style.glareY}%, rgba(255,255,255,0.55), transparent 70%)`,
          }}
        />
        {children}
      </div>
    </div>
  );
}
