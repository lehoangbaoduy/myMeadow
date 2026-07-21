"use client";

import { useRef } from "react";

interface Props {
  level: number;
  onChange: (v: number) => void;
  size?: "sm" | "lg";
}

export default function LevelBar({ level, onChange, size = "sm" }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const pct = Math.round(level * 100);
  const fillColor = level > 0.5 ? "#22c55e" : level > 0.2 ? "#fb923c" : "#ef4444";

  const computeLevel = (clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 100) / 100);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    computeLevel(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) computeLevel(e.clientX);
  };

  return (
    <div
      ref={barRef}
      className={`relative w-full ${size === "lg" ? "h-8" : "h-5"} bg-gray-200 dark:bg-darkBorder rounded-full cursor-ew-resize select-none`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <div
        className="h-full rounded-full transition-all duration-75"
        style={{ width: `${pct}%`, backgroundColor: fillColor }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center ${size === "lg" ? "text-xs" : "text-[10px]"} font-bold pointer-events-none`}
        style={{ color: pct > 20 ? "white" : "#374151", textShadow: pct > 20 ? "0 0 3px rgba(0,0,0,0.35)" : "none" }}
      >
        {pct}%
      </span>
    </div>
  );
}
