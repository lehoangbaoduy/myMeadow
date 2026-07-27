"use client";

import { useState } from "react";
import type { RotationAdminData } from "@/lib/rotation-admin-data";
import { useRotationAdmin, type RotationTypeKey } from "@/hooks/useRotationAdmin";
import RosterPanel from "./RosterPanel";
import ShiftPanel from "./ShiftPanel";
import OccurrencePanel from "./OccurrencePanel";

type Props = {
  initialData: RotationAdminData;
};

const TABS: { key: RotationTypeKey; label: string }[] = [
  { key: "TRASH_DISHES", label: "Trash & Dishes" },
  { key: "BATHROOM", label: "Bathroom" },
];

export default function RotationAdminClient({ initialData }: Props) {
  const [tab, setTab] = useState<RotationTypeKey>("TRASH_DISHES");
  const {
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
  } = useRotationAdmin(initialData);

  const current = data[tab];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rotation Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Build the roster, form teams, shift turns, and record completed or missed chores.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-meadowOrange text-white shadow-sm"
                : "bg-white dark:bg-darkCard text-gray-600 dark:text-gray-300 border border-meadowBorder dark:border-darkBorder hover:bg-meadowMuted dark:hover:bg-darkBorder"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RosterPanel
          type={tab}
          roster={current.roster}
          eligibleTenants={eligibleTenantsFor(tab)}
          busy={busy}
          onMove={(unitId, direction) => moveUnit(tab, unitId, direction)}
          onRemove={(unitId) => removeUnit(tab, unitId)}
          onAddTenant={(tenantId) => addTenant(tab, tenantId)}
          onCreateTeam={(name, tenantIds) => createTeam(tab, name, tenantIds)}
          onDisbandTeam={(teamId) => disbandTeam(tab, teamId)}
        />

        <div className="flex flex-col gap-6">
          <ShiftPanel
            recentShifts={current.recentShifts}
            busy={busy}
            onSubmit={(effectiveDate, offset, reason) => recordShift(tab, effectiveDate, offset, reason)}
          />

          {tab === "TRASH_DISHES" ? (
            <>
              <OccurrencePanel
                title="Trash pickup"
                table="TRASH"
                hint="Date must be a Thursday."
                recent={data.recentTrash}
                busy={busy}
                onSubmit={completeOccurrence}
              />
              <OccurrencePanel
                title="Dishes"
                table="DISHES"
                hint="Date must be a Friday."
                recent={data.recentDishes}
                busy={busy}
                onSubmit={completeOccurrence}
              />
            </>
          ) : (
            <OccurrencePanel
              title="Bathroom cleaning"
              table="BATHROOM"
              hint="Date must be the 1st or 15th of the month."
              recent={data.recentBathroom}
              busy={busy}
              onSubmit={completeOccurrence}
            />
          )}
        </div>
      </div>
    </div>
  );
}
