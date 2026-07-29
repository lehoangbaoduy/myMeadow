"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useManagementData, type ManagementTenantSource } from "@/hooks/useManagementData";
import { MONTHS, PIE_COLORS, MORTGAGE_AMOUNT } from "@/lib/management-finance";
import MobileCard from "./MobileCard";

interface Props {
  tenants: ManagementTenantSource[];
}

export default function MobileManagementClient({ tenants }: Props) {
  const {
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    submitted, loading, bill, yearlyBills,
    handleSubmit, years, rows, gross, totalShares, tenantsForPeriod,
    pieData, totalExpenses, yearlyGross, totalYearlyGross, lineData, fmt,
  } = useManagementData(tenants);

  const inputClass = "px-3 py-2 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 transition-all";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Financial Management</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track income, expenses, and gross profit</p>
      </div>

      <MobileCard className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Month</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className={`${inputClass} w-full`}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className={`${inputClass} w-full`}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform">
          {loading ? "Loading…" : "Calculate"}
        </button>
      </MobileCard>

      {submitted && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {MONTHS[selectedMonth - 1]} {selectedYear} — Monthly Breakdown
            </h2>
            {!bill && (
              <div className="text-xs text-amber-700 dark:text-amber-400 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
                ⚠️ No utility bill data for this month. Utility amounts shown as $0.
              </div>
            )}

            <MobileCard>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Expense Breakdown</h3>
              <div className="relative min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius="38%" outerRadius="62%"
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                      label={({ name, cx, cy, midAngle, outerRadius }: any) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 22;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={9} fill="#6b7280" fontWeight={500}>
                            {name}
                          </text>
                        );
                      }}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{fmt(totalExpenses)}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Total</div>
                  </div>
                </div>
              </div>
            </MobileCard>

            <MobileCard className="flex flex-col gap-0.5 divide-y divide-meadowBorder dark:divide-darkBorder">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.sign === "+" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {row.sign}{fmt(row.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3">
                <span className="font-bold text-gray-900 dark:text-gray-100">Total Gross Income</span>
                <span className={`font-bold text-lg ${gross >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {fmt(gross)}
                </span>
              </div>
            </MobileCard>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedYear} — Annual Summary</h2>

            <MobileCard>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Monthly Income Trend</h3>
              <div className="flex items-center gap-4 mb-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Positive</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Negative</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                    width={38}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => {
                      if (name === "Gross") return [fmt(v > 0 ? v : -v), "Gross Income"];
                      return [fmt(v), name];
                    }}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Bar dataKey="grossAbs" radius={[5, 5, 0, 0]} barSize={16} isAnimationActive={false}>
                    {lineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPositive ? "#34d399" : "#f87171"} />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="grossAbs"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    dot={{ fill: "#F97316", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    name="Gross"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </MobileCard>

            <MobileCard className="flex flex-col gap-0.5 divide-y divide-meadowBorder dark:divide-darkBorder">
              {yearlyGross.map((row, i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${i + 1 === selectedMonth ? "bg-meadowMuted/30 dark:bg-darkBorder/20 -mx-4 px-4 rounded-lg" : ""}`}>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {row.month}
                      {i + 1 === selectedMonth && <span className="ml-1.5 text-[10px] text-meadowOrange font-semibold">selected</span>}
                    </span>
                    <span className="text-[10px] text-gray-400">{row.future ? "Future" : yearlyBills[i] ? "" : "No bill data"}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    row.future ? "text-gray-400" : row.gross >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                  }`}>
                    {row.future ? "—" : fmt(row.gross)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3">
                <span className="font-bold text-gray-900 dark:text-gray-100">Total {selectedYear}</span>
                <span className={`font-bold text-lg ${totalYearlyGross >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {fmt(totalYearlyGross)}
                </span>
              </div>
            </MobileCard>

            <p className="text-[11px] text-gray-400">
              Mortgage = ${MORTGAGE_AMOUNT.toLocaleString()}/mo · {tenantsForPeriod.length} active resident{tenantsForPeriod.length !== 1 ? "s" : ""} · {totalShares} utility share{totalShares !== 1 ? "s" : ""} total for {MONTHS[selectedMonth - 1]} {selectedYear}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
