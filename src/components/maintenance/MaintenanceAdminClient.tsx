"use client";

import { useState } from "react";
import type { MaintenanceRequestRow } from "@/lib/maintenance-admin-data";
import { useMaintenanceAdmin, type MaintenanceAction } from "@/hooks/useMaintenanceAdmin";

type Props = { initialRequests: MaintenanceRequestRow[] };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-500 dark:bg-darkBorder dark:text-gray-400",
};

const FILTERS = ["NEEDS ACTION", "RESOLVED", "REJECTED", "CANCELLED", "ALL"] as const;

function RequestCard({
  req,
  busy,
  onAction,
}: {
  req: MaintenanceRequestRow;
  busy: boolean;
  onAction: (status: MaintenanceAction, note?: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{req.name}</span>
          <span className="text-xs text-gray-400 ml-2">({req.tenantName})</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[req.status]}`}>{req.status}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{req.requestType}</p>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{req.description}</p>
      <p className="text-[10px] text-gray-400 mb-2">
        Submitted {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>

      {req.resolvedAt && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-meadowMuted dark:bg-darkSurface rounded-lg px-3 py-2 mb-2">
          {req.status === "RESOLVED" ? "Resolved" : req.status === "REJECTED" ? "Rejected" : "Cancelled"} by{" "}
          <span className="font-medium">{req.resolvedByName}</span> on{" "}
          {new Date(req.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {req.resolutionNote && <p className="mt-1 italic">&ldquo;{req.resolutionNote}&rdquo;</p>}
        </div>
      )}

      {(req.status === "PENDING" || req.status === "APPROVED") && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Resolution note (optional)"
            className="w-full px-3 py-1.5 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
          <div className="flex flex-wrap gap-1.5">
            {req.status === "PENDING" && (
              <button
                disabled={busy}
                onClick={() => onAction("APPROVED")}
                className="text-xs px-3 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-400 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                Approve
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => onAction("RESOLVED", note || undefined)}
              className="text-xs px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              Resolve
            </button>
            {req.status === "PENDING" && (
              <button
                disabled={busy}
                onClick={() => onAction("REJECTED", note || undefined)}
                className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => onAction("CANCELLED", note || undefined)}
              className="text-xs px-3 py-1.5 border border-meadowBorder dark:border-darkBorder text-gray-600 dark:text-gray-300 rounded-md font-medium hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaintenanceAdminClient({ initialRequests }: Props) {
  const { requests, busyId, error, applyAction } = useMaintenanceAdmin(initialRequests);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("NEEDS ACTION");

  const filtered = requests.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "NEEDS ACTION") return r.status === "PENDING" || r.status === "APPROVED";
    return r.status === filter;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maintenance Requests</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Approve, resolve, reject, or cancel resident requests.</p>
      </div>

      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-meadowOrange text-white"
                : "bg-meadowMuted dark:bg-darkSurface text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400 text-sm">Nothing here.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              busy={busyId === req.id}
              onAction={(status, note) => applyAction(req.id, status, note)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
