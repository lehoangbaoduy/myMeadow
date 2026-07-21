"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ViewMode } from "@/lib/view-mode";

interface Props {
  next: string;
}

export default function ViewChooserClient({ next }: Props) {
  const router = useRouter();
  const [choosing, setChoosing] = useState<ViewMode | null>(null);

  const choose = async (mode: ViewMode) => {
    setChoosing(mode);
    await fetch("/api/view-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }).catch(() => null);
    router.push(next);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
      <button
        onClick={() => choose("pc")}
        disabled={choosing !== null}
        className="group relative flex flex-col items-start gap-4 p-7 rounded-2xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkCard shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:border-meadowOrange/40 transition-all text-left disabled:opacity-50"
      >
        <span className="w-12 h-12 rounded-xl bg-meadowMuted dark:bg-darkBorder flex items-center justify-center text-2xl">
          🖥️
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Continue on PC</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            The familiar full dashboard — sidebar navigation, charts, and tables sized for a larger screen.
          </p>
        </div>
        <span className="mt-auto text-sm font-semibold text-meadowOrange group-hover:translate-x-0.5 transition-transform">
          {choosing === "pc" ? "Loading…" : "Choose PC →"}
        </span>
      </button>

      <button
        onClick={() => choose("mobile")}
        disabled={choosing !== null}
        className="group relative flex flex-col items-start gap-4 p-7 rounded-2xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkCard shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:border-meadowOrange/40 transition-all text-left disabled:opacity-50"
      >
        <span className="w-12 h-12 rounded-xl bg-meadowMuted dark:bg-darkBorder flex items-center justify-center text-2xl">
          📱
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Continue on Mobile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            A touch-first layout with bottom-tab navigation and stacked cards, built for one-handed use.
          </p>
        </div>
        <span className="mt-auto text-sm font-semibold text-meadowOrange group-hover:translate-x-0.5 transition-transform">
          {choosing === "mobile" ? "Loading…" : "Choose Mobile →"}
        </span>
      </button>
    </div>
  );
}
