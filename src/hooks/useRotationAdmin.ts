"use client";

import { useState } from "react";
import type { RotationAdminData, RosterUnitRow, ShiftRow, OccurrenceRow } from "@/lib/rotation-admin-data";

export type RotationTypeKey = "TRASH_DISHES" | "BATHROOM";
export type ChoreTableKey = "TRASH" | "DISHES" | "BATHROOM";

type MutationResult<T> = { ok: true; data: T } | { ok: false; error: string };

const OCCURRENCE_LIST_KEY: Record<ChoreTableKey, "recentTrash" | "recentDishes" | "recentBathroom"> = {
  TRASH: "recentTrash",
  DISHES: "recentDishes",
  BATHROOM: "recentBathroom",
};

export function useRotationAdmin(initialData: RotationAdminData) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runMutation<T>(fn: () => Promise<Response>): Promise<MutationResult<T>> {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (body as { error?: string }).error ?? "Request failed";
        setError(message);
        return { ok: false, error: message };
      }
      return { ok: true, data: body as T };
    } catch {
      setError("Network error");
      return { ok: false, error: "Network error" };
    } finally {
      setBusy(false);
    }
  }

  function eligibleTenantsFor(type: RotationTypeKey) {
    const rosteredIds = new Set(data[type].roster.flatMap((u) => u.members.map((m) => m.tenantId)));
    return data.allActiveTenants.filter((t) => !rosteredIds.has(t.id));
  }

  function setRoster(type: RotationTypeKey, roster: RosterUnitRow[]) {
    setData((prev) => ({ ...prev, [type]: { ...prev[type], roster } }));
  }

  async function putRoster(type: RotationTypeKey, units: Array<{ unitId: number } | { tenantId: number }>) {
    const result = await runMutation<RosterUnitRow[]>(() =>
      fetch(`/api/rotations/${type}/roster`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units }),
      })
    );
    if (result.ok) setRoster(type, result.data);
    return result;
  }

  function moveUnit(type: RotationTypeKey, unitId: number, direction: "up" | "down") {
    const roster = data[type].roster;
    const index = roster.findIndex((u) => u.id === unitId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= roster.length) return Promise.resolve({ ok: true as const, data: roster });

    const reordered = [...roster];
    const tmp = reordered[index];
    reordered[index] = reordered[swapWith];
    reordered[swapWith] = tmp;

    return putRoster(type, reordered.map((u) => ({ unitId: u.id })));
  }

  function addTenant(type: RotationTypeKey, tenantId: number) {
    const units = [...data[type].roster.map((u) => ({ unitId: u.id })), { tenantId }];
    return putRoster(type, units);
  }

  function removeUnit(type: RotationTypeKey, unitId: number) {
    const units = data[type].roster.filter((u) => u.id !== unitId).map((u) => ({ unitId: u.id }));
    return putRoster(type, units);
  }

  async function createTeam(type: RotationTypeKey, name: string, tenantIds: number[]) {
    const result = await runMutation<{ teamId: number }>(() =>
      fetch(`/api/rotations/${type}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, tenantIds }),
      })
    );
    if (result.ok) {
      const rosterRes = await fetch(`/api/rotations/${type}/roster`);
      if (rosterRes.ok) setRoster(type, await rosterRes.json());
    }
    return result;
  }

  async function disbandTeam(type: RotationTypeKey, teamId: number) {
    const result = await runMutation<{ success: boolean }>(() =>
      fetch(`/api/rotations/${type}/teams`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      })
    );
    if (result.ok) {
      setRoster(
        type,
        data[type].roster.filter((u) => u.teamId !== teamId)
      );
    }
    return result;
  }

  async function recordShift(type: RotationTypeKey, effectiveDate: string, offsetPositions: number, reason: string) {
    const result = await runMutation<ShiftRow>(() =>
      fetch(`/api/rotations/${type}/shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ effectiveDate, offsetPositions, reason: reason || undefined }),
      })
    );
    if (result.ok) {
      setData((prev) => ({
        ...prev,
        [type]: { ...prev[type], recentShifts: [result.data, ...prev[type].recentShifts].slice(0, 10) },
      }));
    }
    return result;
  }

  async function completeOccurrence(table: ChoreTableKey, dateStr: string, status: "COMPLETED" | "MISSED", notes: string) {
    const result = await runMutation<{ id: number; date: string; status: string; notes: string | null; completedAt: string | null }>(
      () =>
        fetch(`/api/rotations/${table}/occurrences/${dateStr}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes: notes || undefined }),
        })
    );
    if (result.ok) {
      const row: OccurrenceRow = {
        id: result.data.id,
        date: result.data.date.split("T")[0],
        status: result.data.status,
        notes: result.data.notes,
        completedAt: result.data.completedAt,
      };
      const key = OCCURRENCE_LIST_KEY[table];
      setData((prev) => ({
        ...prev,
        [key]: [row, ...prev[key].filter((r) => r.date !== row.date)].slice(0, 5),
      }));
    }
    return result;
  }

  return {
    data,
    busy,
    error,
    eligibleTenantsFor,
    moveUnit,
    addTenant,
    removeUnit,
    createTeam,
    disbandTeam,
    recordShift,
    completeOccurrence,
  };
}
