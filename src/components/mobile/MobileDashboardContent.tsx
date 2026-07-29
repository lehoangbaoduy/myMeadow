"use client";

import Link from "next/link";
import { CUR_MONTH, CUR_YEAR, fmtLabel, type UtilityBillRow } from "@/components/DashboardContent";
import { getThursdayOfWeek } from "@/lib/trash-schedule";
import { getTrashAssignment, getBathroomAssignment, nextBathroomOccurrenceDate } from "@/lib/rotation-assignments";
import type { RotationScheduleSource } from "@/lib/duty-tenants";
import MobileCard from "./MobileCard";

interface RunOutItem {
  id: number;
  itemName: string;
}

interface Props {
  bills: UtilityBillRow[];
  trashTenants: RotationScheduleSource;
  bathroomTenants: RotationScheduleSource;
  runOutItems: RunOutItem[];
}

const UTIL_ROWS: { key: keyof UtilityBillRow; label: string; icon: string }[] = [
  { key: "electric", label: "Electric", icon: "⚡" },
  { key: "gas", label: "Gas", icon: "🔥" },
  { key: "water", label: "Water", icon: "💧" },
  { key: "wifi", label: "WiFi", icon: "📡" },
];

export default function MobileDashboardContent({ bills, trashTenants, bathroomTenants, runOutItems }: Props) {
  const curMonthBill = bills.find((b) => b.month === CUR_MONTH && b.year === CUR_YEAR) ?? null;

  const today = new Date();
  const thisThursday = getThursdayOfWeek(today);
  const trashAssignment = getTrashAssignment(thisThursday, trashTenants);
  const nextBathroomDate = nextBathroomOccurrenceDate(today);
  const bathroomAssignee = getBathroomAssignment(nextBathroomDate, bathroomTenants);
  const thursdayLabel = thisThursday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const bathroomDateLabel = nextBathroomDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      {/* Card 1 — Utilities bill for the month */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Utilities</h2>
          <span className="text-[11px] text-gray-400">{curMonthBill ? fmtLabel(curMonthBill.month, curMonthBill.year) : fmtLabel(CUR_MONTH, CUR_YEAR)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {UTIL_ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-meadowLight dark:bg-darkSurface">
              <span className="text-lg">{row.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {curMonthBill ? `$${(curMonthBill[row.key] as number).toFixed(0)}` : "—"}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{row.label}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/utilities" className="mt-3 inline-block text-xs text-meadowOrange font-medium">
          View Utilities →
        </Link>
      </MobileCard>

      {/* Card 2 — Kitchen inventory: what's running low */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🍳 Kitchen Inventory</h2>
          {runOutItems.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-full font-semibold">
              {runOutItems.length} low
            </span>
          )}
        </div>
        {runOutItems.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Everything is stocked! 🎉</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {runOutItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {item.itemName}
              </div>
            ))}
          </div>
        )}
        <Link href="/kitchen-inventory" className="mt-3 inline-block text-xs text-meadowOrange font-medium">
          View Inventory →
        </Link>
      </MobileCard>

      {/* Card 3 — Trash schedule, this week */}
      <MobileCard>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🚮 Trash — This Week</h2>
          <span className="text-[11px] text-gray-400">{thursdayLabel}</span>
        </div>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{trashAssignment.tenant}</p>
        <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit ${
          trashAssignment.hasRecycle
            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
            : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
        }`}>
          {trashAssignment.hasRecycle ? "🚮 Garbage + ♻️ Recycle" : "🚮 Garbage only"}
        </span>
      </MobileCard>

      {/* Card 4 — Bathroom schedule, next turn */}
      <MobileCard>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🛁 Bathroom — Next Turn</h2>
          <span className="text-[11px] text-gray-400">{bathroomDateLabel}</span>
        </div>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{bathroomAssignee}</p>
      </MobileCard>
    </div>
  );
}
