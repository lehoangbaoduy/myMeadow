"use client";

import { useMemo, useState } from "react";
import {
  BillChartSection,
  UsageChartSection,
  PriceChartSection,
  CUR_MONTH,
  CUR_YEAR,
  fmtLabel,
  type UtilityBillRow,
} from "@/components/DashboardContent";
interface Props {
  isAdmin: boolean;
  bills: UtilityBillRow[];
}

const CARD_STYLES: Record<string, { bg: string; icon: string }> = {
  electric: { bg: "bg-amber-400 dark:bg-amber-500", icon: "⚡" },
  gas: { bg: "bg-red-500 dark:bg-red-600", icon: "🔥" },
  water: { bg: "bg-cyan-500 dark:bg-cyan-600", icon: "💧" },
  wifi: { bg: "bg-violet-500 dark:bg-violet-600", icon: "📡" },
};

function MobileUtilityStrip({ latest }: { latest: UtilityBillRow | null }) {
  const cards = [
    { type: "electric", label: "Electric", value: latest?.electric ?? null },
    { type: "gas", label: "Gas", value: latest?.gas ?? null },
    { type: "water", label: "Water", value: latest?.water ?? null },
    { type: "wifi", label: "WiFi", value: latest?.wifi ?? null },
  ];
  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4">
      {cards.map((c) => {
        const s = CARD_STYLES[c.type];
        return (
          <div key={c.type} className={`flex-shrink-0 w-32 snap-start rounded-2xl p-4 ${s.bg}`}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xl">{s.icon}</span>
              <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-black/15 text-white/90">
                {latest ? fmtLabel(latest.month, latest.year) : "—"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{c.value != null ? `$${c.value.toFixed(0)}` : "—"}</h1>
            <h2 className="text-xs font-semibold mt-1 text-white/70">{c.label}</h2>
          </div>
        );
      })}
    </div>
  );
}

const SEGMENTS = [
  { key: "total", label: "Total" },
  { key: "usage", label: "Usage" },
  { key: "costs", label: "Costs" },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

export default function MobileDashboardContent({ isAdmin, bills }: Props) {
  const [currentBills, setCurrentBills] = useState(bills);
  const [segment, setSegment] = useState<SegmentKey>("total");

  const curMonthBill = useMemo(
    () => currentBills.find((b) => b.month === CUR_MONTH && b.year === CUR_YEAR) ?? null,
    [currentBills]
  );

  const refresh = async () => {
    const res = await fetch("/api/utilities");
    if (res.ok) setCurrentBills(await res.json());
  };

  return (
    <div className="flex flex-col gap-4">
      <MobileUtilityStrip latest={curMonthBill} />

      <div className="flex gap-1.5 p-1 rounded-xl bg-white dark:bg-darkCard border border-meadowBorder dark:border-darkBorder">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              segment === s.key
                ? "bg-meadowOrange text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="h-[400px]">
        {segment === "total" && <BillChartSection isAdmin={isAdmin} bills={currentBills} onUpdated={refresh} />}
        {segment === "usage" && <UsageChartSection isAdmin={isAdmin} bills={currentBills} onUpdated={refresh} />}
        {segment === "costs" && <PriceChartSection isAdmin={isAdmin} bills={currentBills} onUpdated={refresh} />}
      </div>
    </div>
  );
}
