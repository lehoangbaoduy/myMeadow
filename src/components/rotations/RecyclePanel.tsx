"use client";

import { useEffect, useState } from "react";
import type { RecycleShiftRow } from "@/lib/rotation-admin-data";

type PreviewOccurrence = { date: string; before: boolean; after: boolean };
type Preview = { occurrences: PreviewOccurrence[] };

type Props = {
  recentShifts: RecycleShiftRow[];
  busy: boolean;
  onSubmit: (effectiveDate: string, hasRecycle: boolean, reason: string) => Promise<{ ok: boolean; error?: string }>;
};

function nextThursdayIso(): string {
  const d = new Date();
  const daysUntilThursday = (4 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function binsLabel(hasRecycle: boolean): string {
  return hasRecycle ? "Both bins" : "Garbage only";
}

export default function RecyclePanel({ recentShifts, busy, onSubmit }: Props) {
  const [effectiveDate, setEffectiveDate] = useState(nextThursdayIso());
  const [hasRecycle, setHasRecycle] = useState(true);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveDate) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/trash-schedule/recycle-shift/preview?effectiveDate=${effectiveDate}&hasRecycle=${hasRecycle}`,
          { signal: controller.signal }
        );
        const body = await res.json();
        if (!res.ok) {
          setPreview(null);
          setPreviewError(body.error ?? "Could not load preview");
          return;
        }
        setPreviewError(null);
        setPreview(body);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setPreview(null);
        setPreviewError("Could not load preview");
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [effectiveDate, hasRecycle]);

  const handleSubmit = async () => {
    setFormError(null);
    const result = await onSubmit(effectiveDate, hasRecycle, reason);
    if (result.ok) {
      setReason("");
    } else {
      setFormError(result.error ?? "Failed to record recycle shift");
    }
  };

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Move the recycle schedule</h3>
      <p className="text-xs text-gray-400 mb-4">
        Sets whether recycling (both bins) happens on this Thursday — the biweekly pattern keeps alternating from there until changed again. Already-completed pickups are never changed.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-2">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Effective Thursday</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">This week is</label>
          <div className="flex rounded-lg border border-meadowBorder dark:border-darkBorder overflow-hidden">
            <button
              type="button"
              onClick={() => setHasRecycle(true)}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${
                hasRecycle
                  ? "bg-meadowOrange text-white"
                  : "bg-white dark:bg-darkSurface text-gray-600 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkBorder"
              }`}
            >
              Both bins
            </button>
            <button
              type="button"
              onClick={() => setHasRecycle(false)}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${
                !hasRecycle
                  ? "bg-meadowOrange text-white"
                  : "bg-white dark:bg-darkSurface text-gray-600 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkBorder"
              }`}
            >
              Garbage only
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. city changed pickup week"
            className="w-full px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Apply
        </button>
      </div>
      {formError && <p className="text-xs text-red-500 mb-2">{formError}</p>}

      {previewError && <p className="text-xs text-red-500 mb-2">{previewError}</p>}

      {preview && preview.occurrences.length > 0 && (
        <div className="mt-3 mb-2 p-3 rounded-lg bg-meadowLight dark:bg-darkSurface border border-meadowBorder dark:border-darkBorder">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left font-semibold uppercase tracking-wide pb-1.5">Thursday</th>
                <th className="text-left font-semibold uppercase tracking-wide pb-1.5">Currently</th>
                <th className="text-left font-semibold uppercase tracking-wide pb-1.5">After this change</th>
              </tr>
            </thead>
            <tbody>
              {preview.occurrences.map((o) => (
                <tr key={o.date} className="text-gray-600 dark:text-gray-300">
                  <td className="py-1 pr-2">{o.date}</td>
                  <td className="py-1 pr-2">{binsLabel(o.before)}</td>
                  <td className={`py-1 ${o.before !== o.after ? "font-semibold text-meadowOrange" : ""}`}>{binsLabel(o.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recentShifts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-meadowBorder dark:border-darkBorder">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent recycle changes</h4>
          <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {recentShifts.map((s) => (
              <li key={s.id} className="text-xs text-gray-600 dark:text-gray-300 px-3 py-2 rounded-lg bg-meadowLight dark:bg-darkSurface">
                <span className="font-semibold">{s.effectiveDate}</span>{" "}
                onward: <span className="font-semibold">{binsLabel(s.hasRecycle)}</span>
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
