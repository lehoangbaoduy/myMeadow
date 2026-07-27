"use client";

import { useState } from "react";
import type { OccurrenceRow } from "@/lib/rotation-admin-data";
import type { ChoreTableKey } from "@/hooks/useRotationAdmin";

type Props = {
  title: string;
  table: ChoreTableKey;
  hint: string;
  recent: OccurrenceRow[];
  busy: boolean;
  onSubmit: (
    table: ChoreTableKey,
    date: string,
    status: "COMPLETED" | "MISSED",
    notes: string
  ) => Promise<{ ok: boolean; error?: string }>;
};

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export default function OccurrencePanel({ title, table, hint, recent, busy, onSubmit }: Props) {
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<"COMPLETED" | "MISSED">("COMPLETED");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    const result = await onSubmit(table, date, status, notes);
    if (result.ok) {
      setNotes("");
    } else {
      setFormError(result.error ?? "Failed to record");
    }
  };

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">{hint}</p>

      <div className="flex flex-wrap items-end gap-3 mb-2">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "COMPLETED" | "MISSED")}
            className="px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          >
            <option value="COMPLETED">Completed</option>
            <option value="MISSED">Missed</option>
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>
      {formError && <p className="text-xs text-red-500 mb-2">{formError}</p>}

      {recent.length > 0 && (
        <div className="mt-4 pt-4 border-t border-meadowBorder dark:border-darkBorder">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent history</h4>
          <ul className="flex flex-col gap-1.5">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    r.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {r.status}
                </span>
                <span className="font-medium">{r.date}</span>
                {r.notes && <span className="text-gray-400">— {r.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
