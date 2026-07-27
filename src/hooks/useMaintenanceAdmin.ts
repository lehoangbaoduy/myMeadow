"use client";

import { useState } from "react";
import type { MaintenanceRequestRow } from "@/lib/maintenance-admin-data";

export type MaintenanceAction = "APPROVED" | "REJECTED" | "RESOLVED" | "CANCELLED";

export function useMaintenanceAdmin(initialRequests: MaintenanceRequestRow[]) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyAction = async (id: number, status: MaintenanceAction, resolutionNote?: string) => {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/maintenance-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(resolutionNote && { resolutionNote }) }),
    });
    setBusyId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Failed to update request");
      return { ok: false };
    }

    const updated = await res.json();
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: updated.status,
              resolvedAt: updated.resolvedAt,
              resolutionNote: updated.resolutionNote,
              resolvedByName: r.resolvedByName ?? "Admin",
            }
          : r
      )
    );
    return { ok: true };
  };

  return { requests, busyId, error, applyAction };
}
