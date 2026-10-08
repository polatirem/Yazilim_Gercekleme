"use client";
import { useEffect, useRef } from "react";

/*
 * A murmuration of model answers. Every particle is one answer drifting through a flow field;
 * a few are made up. The lens (the pointer, or an autonomous scanner when there is no pointer)
 * reads the answers it passes over: grounded ones brighten, made-up ones are caught, ringed in
 * coral and pulled down onto the hold line at the bottom of the scene.
 */
type P = { x: number; y: number; vx: number; vy: number; r: number; bad: boolean; caught: number; id: string; score: number; held: boolean };

const LABELS = ["kaynakla çelişiyor", "uydurma sayı", "sahte kaynak", "dayanağı zayıf", "kişisel veri"];

export function Sky({ density = 1, lensLabel = true, className = "" }: { density?: number; lensLabel?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gazeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, t = 0;
    let particles: P[] = [];
    const pointer = { x: -999, y: -999, active: false, lastMove: 0 };
    const lens = { x: 0, y: 0, r: 112 };
    let focus: P | null = null;

    const hex = () => Math.random().toString(16).slice(2, 6);
    function spawn(): P {
      const bad = Math.random() < 0.075;
      return { x: Math.random() * w, y: Math.random() * h * 0.92, vx: 0, vy: 0, r: Math.random() * 1.3 + 0.7, bad, caught: 0, held: false, id: `cvp_${hex()}`, score: bad ? Math.round(8 + Math.random() * 36) : Math.round(82 + Math.random() * 17) };
    }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(560, (w * h) / 2500) * density);
      particles = Array.from({ length: target }, spawn);
      lens.x = w * 0.6; lens.y = h * 0.27; lens.r = Math.max(70, Math.min(120, w * 0.08));
    }

    // Smooth pseudo-noise flow field: cheap layered sines give a flock-like drift.
    const field = (x: number, y: number) => {
      const a = Math.sin(x * 0.0021 + t * 0.00023) + Math.cos(y * 0.0027 - t * 0.00017) + Math.sin((x + y) * 0.0011 + t * 0.0001);
      return a * 1.2;
    };

    function step() {
      t += 16;
      const now = performance.now();
      const auto = !pointer.active || now - pointer.lastMove > 3500;
      const tx = auto ? w * (0.5 + 0.34 * Math.sin(t * 0.00013)) : pointer.x;
      const ty = auto ? h * (0.27 + 0.1 * Math.sin(t * 0.00029 + 1.3)) : pointer.y;
      lens.x += (tx - lens.x) * (auto ? 0.03 : 0.16);
      lens.y += (ty - lens.y) * (auto ? 0.03 : 0.16);

      const holdY = h - 46;
      let nearest: P | null = null, nearestD = Infinity;
      for (const p of particles) {
        if (p.held) {
          p.vx *= 0.9; p.vy *= 0.9;
          p.x += Math.sin(t * 0.001 + p.r * 9) * 0.15; p.y = holdY + Math.sin(t * 0.002 + p.x) * 1.5;
          continue;
        }
        const ang = field(p.x, p.y);
        p.vx += Math.cos(ang) * 0.035 + 0.012; p.vy += Math.sin(ang) * 0.03;
        const dx = p.x - lens.x, dy = p.y - lens.y, d = Math.hypot(dx, dy);
        if (d < lens.r) {
          if (p.bad && p.caught === 0) p.caught = 1;
          if (d < nearestD) { nearestD = d; nearest = p; }
        }
        if (p.caught > 0) {
          p.caught = Math.min(p.caught + 0.012, 3);
          if (p.caught > 1.6) { p.vx += (lens.x - p.x) * 0.0006; p.vy += (holdY - p.y) * 0.0009; }
          if (p.caught >= 3 && Math.abs(p.y - holdY) < 6) p.held = true;
        }
        p.vx *= 0.94; p.vy *= 0.94;
        p.x += p.vx; p.y += p.vy;
        if (p.x > w + 10) p.x = -10; if (p.x < -10) p.x = w + 10;
        if (p.y < -10) p.y = h * 0.9; if (p.y > h * 0.94 && p.caught === 0) p.y = -10;
      }
      // Keep the hold line from overflowing: release the oldest held answers back as fresh ones.
      const held = particles.filter(p => p.held);
      if (held.length > 26) Object.assign(held[0], spawn(), { x: -10 });
      // Keep a steady supply of made-up answers in flight.
      if (Math.random() < 0.01) { const p = particles[Math.floor(Math.random() * particles.length)]; if (p && !p.bad && !p.held) { p.bad = true; p.score = Math.round(8 + Math.random() * 36); } }
      focus = nearest;
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      // hold line
      const holdY = h - 46;
      ctx!.strokeStyle = "rgba(255,110,90,.18)"; ctx!.setLineDash([2, 6]); ctx!.beginPath(); ctx!.moveTo(0, holdY); ctx!.lineTo(w, holdY); ctx!.stroke(); ctx!.setLineDash([]);
      for (const p of particles) {
        const d = Math.hypot(p.x - lens.x, p.y - lens.y), inLens = d < lens.r;
        if (p.caught > 0 || p.held) {
          ctx!.fillStyle = "#FF6E5A";
          ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r + 1, 0, Math.PI * 2); ctx!.fill();
          if (!p.held && p.caught < 2.4) {
            const k = (p.caught - 1) / 1.4;
            ctx!.strokeStyle = `rgba(255,110,90,${0.8 * (1 - Math.max(0, k))})`;
            ctx!.beginPath(); ctx!.arc(p.x, p.y, 4 + Math.max(0, k) * 16, 0, Math.PI * 2); ctx!.stroke();
          }
        } else {
          const a = inLens ? 0.95 : 0.3 + p.r * 0.22;
          ctx!.fillStyle = inLens ? `rgba(214,204,255,${a})` : `rgba(196,186,255,${a})`;
          ctx!.beginPath(); ctx!.arc(p.x, p.y, inLens ? p.r + 0.6 : p.r, 0, Math.PI * 2); ctx!.fill();
        }
      }
      // lens
      const g = ctx!.createRadialGradient(lens.x, lens.y, lens.r * 0.2, lens.x, lens.y, lens.r);
      g.addColorStop(0, "rgba(139,108,255,.10)"); g.addColorStop(1, "rgba(139,108,255,0)");
      ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2); ctx!.fill();
      ctx!.strokeStyle = "rgba(185,168,255,.35)"; ctx!.beginPath(); ctx!.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2); ctx!.stroke();
      ctx!.strokeStyle = "rgba(185,168,255,.6)";
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 0.0004; ctx!.beginPath(); ctx!.arc(lens.x, lens.y, lens.r + 5, a, a + 0.22); ctx!.stroke(); }

      const gaze = gazeRef.current;
      if (gaze && lensLabel) {
        gaze.style.transform = `translate(${lens.x}px,${lens.y}px)`;
        gaze.style.setProperty("--gr", `${lens.r}px`);
        gaze.classList.toggle("l", lens.x > w * 0.72);
        const span = gaze.firstElementChild as HTMLElement | null;
        if (span) {
          if (focus) {
            const label = focus.bad ? LABELS[parseInt(focus.id.slice(4), 16) % LABELS.length] : "doğrulandı";
            span.innerHTML = focus.bad ? `${focus.id} · <b>${focus.score} · ${label}</b>` : `${focus.id} · ${focus.score} · ${label}`;
            span.style.opacity = "1";
          } else span.style.opacity = "0";
        }
      }
    }

    function loop() { step(); draw(); if (visible) raf = requestAnimationFrame(loop); }

    resize();
    if (reduced) { for (let i = 0; i < 120; i++) step(); draw(); }
    else raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => { resize(); if (reduced) draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      const was = visible; visible = entry.isIntersecting;
      if (visible && !was && !reduced) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const host = canvas.parentElement!;
    const move = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = e.pointerType === "mouse"; pointer.lastMove = performance.now(); };
    const leave = () => { pointer.active = false; };
    host.addEventListener("pointermove", move); host.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); };
  }, [density, lensLabel]);

  return (
    <>
      <canvas ref={canvasRef} className={`sky ${className}`} aria-hidden="true" />
      {lensLabel && <div ref={gazeRef} className="gaze" aria-hidden="true"><span /></div>}
    </>
  );
}
