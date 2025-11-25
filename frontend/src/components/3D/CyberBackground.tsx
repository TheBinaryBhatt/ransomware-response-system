// src/components/3d/CyberBackground.tsx
import React, { useRef, useEffect } from "react";

const TAU = Math.PI * 2;

const CyberBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const devicePixelRatioRef = useRef<number>(1);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    let width = 0;
    let height = 0;
    let last = performance.now();
    let t = 0;

    const gridColor = "rgba(50,200,198,0.08)";
    const highlightColor = "rgba(50,200,198,0.14)";
    const particleColor = "rgba(160,220,218,0.12)";

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      devicePixelRatioRef.current = dpr;
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / (rect.width || 1);
      mouseRef.current.y = (e.clientY - rect.top) / (rect.height || 1);
    };

    const particles = new Array(60).fill(0).map(() => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0006,
      r: 0.3 + Math.random() * 1.6,
      alpha: 0.06 + Math.random() * 0.12,
    }));

    const drawGrid = (_dt: number) => {
      const spacing = 36;
      const offsetX = Math.sin(t * 0.0005) * 40;
      const offsetY = Math.cos(t * 0.0004) * 30;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.lineWidth = 1;

      ctx.strokeStyle = gridColor;
      for (let x = -spacing; x < width + spacing; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, -spacing);
        ctx.lineTo(x, height + spacing);
        ctx.stroke();
      }

      for (let y = -spacing; y < height + spacing; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(-spacing, y);
        ctx.lineTo(width + spacing, y);
        ctx.stroke();
      }

      const mx = mouseRef.current.x * width;
      const my = mouseRef.current.y * height;
      const gradRadius = Math.max(width, height) * 0.3;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, gradRadius);
      g.addColorStop(0, highlightColor);
      g.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = g;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      ctx.restore();
    };

    const drawParticles = (dt: number) => {
      particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -0.1) p.x = 1.1;
        if (p.x > 1.1) p.x = -0.1;
        if (p.y < -0.1) p.y = 1.1;
        if (p.y > 1.1) p.y = -0.1;

        const px = p.x * width;
        const py = p.y * height;
        const size = p.r * 2;

        ctx.beginPath();
        ctx.fillStyle = particleColor.replace("0.12", String(p.alpha));
        ctx.arc(px, py, size, 0, TAU);
        ctx.fill();
      });
    };

    const drawVignette = () => {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.4,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    };

    const render = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "rgba(14,16,16,1)");
      bg.addColorStop(1, "rgba(21,23,23,1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const mx = (mouseRef.current.x - 0.5) * 40;
      const my = (mouseRef.current.y - 0.5) * 30;

      ctx.save();
      ctx.translate(mx, my);

      drawGrid(dt);
      drawParticles(dt);

      ctx.restore();

      drawVignette();

      rafRef.current = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none -z-10"
      aria-hidden
    />
  );
};

export default CyberBackground;
