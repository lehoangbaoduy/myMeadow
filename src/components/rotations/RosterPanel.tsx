"use client";

import { useState } from "react";
import type { RosterUnitRow, EligibleTenant } from "@/lib/rotation-admin-data";
import type { RotationTypeKey } from "@/hooks/useRotationAdmin";

type Props = {
  type: RotationTypeKey;
  roster: RosterUnitRow[];
  eligibleTenants: EligibleTenant[];
  busy: boolean;
  onMove: (unitId: number, direction: "up" | "down") => void;
  onRemove: (unitId: number) => void;
  onAddTenant: (tenantId: number) => void;
  onCreateTeam: (name: string, tenantIds: number[]) => Promise<{ ok: boolean; error?: string }>;
  onDisbandTeam: (teamId: number) => void;
};

export default function RosterPanel({
  type,
  roster,
  eligibleTenants,
  busy,
  onMove,
  onRemove,
  onAddTenant,
  onCreateTeam,
  onDisbandTeam,
}: Props) {
  const [addTenantId, setAddTenantId] = useState("");
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<number[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);

  const handleAddTenant = () => {
    if (!addTenantId) return;
    onAddTenant(Number(addTenantId));
    setAddTenantId("");
  };

  const toggleTeamMember = (tenantId: number) => {
    setTeamMemberIds((prev) => (prev.includes(tenantId) ? prev.filter((id) => id !== tenantId) : [...prev, tenantId]));
  };

  const handleCreateTeam = async () => {
    setTeamError(null);
    const result = await onCreateTeam(teamName, teamMemberIds);
    if (result.ok) {
      setShowTeamForm(false);
      setTeamName("");
      setTeamMemberIds([]);
    } else {
      setTeamError(result.error ?? "Failed to create team");
    }
  };

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Roster order</h3>
      <p className="text-xs text-gray-400 mb-4">Position 0 goes first; the rotation cycles through in this order.</p>

      {roster.length === 0 ? (
        <p className="text-sm text-gray-400 italic mb-4">No one is on this roster yet — add a tenant below.</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-5">
          {roster.map((unit, index) => (
            <li
              key={unit.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-meadowLight dark:bg-darkSurface border border-meadowBorder dark:border-darkBorder"
            >
              <span className="text-xs font-mono text-gray-400 w-5">{index}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{unit.label}</div>
                {unit.teamId !== null && (
                  <div className="text-xs text-gray-400 truncate">{unit.members.map((m) => m.name).join(", ")}</div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => onMove(unit.id, "up")}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-darkCard disabled:opacity-30 transition-colors"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === roster.length - 1}
                  onClick={() => onMove(unit.id, "down")}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-darkCard disabled:opacity-30 transition-colors"
                  aria-label="Move down"
                >
                  ↓
                </button>
                {unit.teamId !== null ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDisbandTeam(unit.teamId!)}
                    className="ml-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-30 transition-colors"
                  >
                    Disband
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemove(unit.id)}
                    className="ml-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-30 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-meadowBorder dark:border-darkBorder">
        <select
          value={addTenantId}
          onChange={(e) => setAddTenantId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
        >
          <option value="">Add tenant…</option>
          {eligibleTenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !addTenantId}
          onClick={handleAddTenant}
          className="px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          disabled={busy || eligibleTenants.length < 2}
          onClick={() => setShowTeamForm((v) => !v)}
          className="px-4 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-meadowMuted dark:hover:bg-darkBorder transition-colors disabled:opacity-40"
        >
          {showTeamForm ? "Cancel team" : "Create team…"}
        </button>
      </div>

      {showTeamForm && (
        <div className="mt-4 p-4 rounded-xl bg-meadowLight dark:bg-darkSurface border border-meadowBorder dark:border-darkBorder">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Team name (optional)
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder={`e.g. ${type === "BATHROOM" ? "Kitchen Crew" : "Team A"}`}
            className="w-full mb-3 px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkCard text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40"
          />
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Members (pick 2 or more)
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {eligibleTenants.map((t) => {
              const selected = teamMemberIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTeamMember(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selected
                      ? "bg-meadowOrange text-white border-meadowOrange"
                      : "bg-white dark:bg-darkCard text-gray-600 dark:text-gray-300 border-meadowBorder dark:border-darkBorder hover:border-meadowOrange/60"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          {teamError && <p className="text-xs text-red-500 mb-2">{teamError}</p>}
          <button
            type="button"
            disabled={busy || teamMemberIds.length < 2}
            onClick={handleCreateTeam}
            className="px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Create team
          </button>
        </div>
      )}
    </div>
  );
}
