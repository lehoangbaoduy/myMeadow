"use client";

import { useState } from "react";
import type { ShiftRow } from "@/lib/rotation-admin-data";

type Props = {
  recentShifts: ShiftRow[];
  busy: boolean;
  onSubmit: (effectiveDate: string, offsetPositions: number, reason: string) => Promise<{ ok: boolean; error?: string }>;
};

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function ShiftPanel({ recentShifts, busy, onSubmit }: Props) {
  const [effectiveDate, setEffectiveDate] = useState(tomorrowIso());
  const [offset, setOffset] = useState(1);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    const result = await onSubmit(effectiveDate, offset, reason);
    if (result.ok) {
      setReason("");
    } else {
      setFormError(result.error ?? "Failed to record shift");
    }
  };

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Shift the rotation</h3>
      <p className="text-xs text-gray-400 mb-4">
        Advances everyone from the effective date forward. Already-completed turns are never changed.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-2">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Effective date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Positions</label>
          <input
            type="number"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. covering for vacation"
            className="w-full px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
        </div>
        <button
          type="button"
          disabled={busy || offset === 0}
          onClick={handleSubmit}
          className="px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Record shift
        </button>
      </div>
      {formError && <p className="text-xs text-red-500 mb-2">{formError}</p>}

      {recentShifts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-meadowBorder dark:border-darkBorder">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent shifts</h4>
          <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {recentShifts.map((s) => (
              <li key={s.id} className="text-xs text-gray-600 dark:text-gray-300 px-3 py-2 rounded-lg bg-meadowLight dark:bg-darkSurface">
                <span className="font-semibold">{s.effectiveDate}</span>{" "}
                <span className="text-gray-400">({s.offsetPositions > 0 ? "+" : ""}{s.offsetPositions})</span>{" "}
                {s.previousUnitLabel} → <span className="font-semibold">{s.newUnitLabel}</span>
                {s.reason && <span className="text-gray-400"> — {s.reason}</span>}
                <span className="text-gray-400"> · by {s.actorName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
