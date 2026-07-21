"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useManagementData } from "@/hooks/useManagementData";
import { MONTHS, PIE_COLORS, MORTGAGE_AMOUNT } from "@/lib/management-finance";

export default function ManagementClient() {
  const {
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    submitted, loading, bill, yearlyBills,
    handleSubmit, years, rows, gross,
    pieData, totalExpenses, yearlyGross, totalYearlyGross, lineData, fmt,
  } = useManagementData();

  const inputClass = "px-3 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 transition-all";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track income, expenses, and gross profit</p>
      </div>

      {/* Selector */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 mb-8 inline-flex flex-wrap items-end gap-4 shadow-[var(--shadow-card)]">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Month</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className={inputClass}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className={inputClass}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-6 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm">
          {loading ? "Loading…" : "Calculate"}
        </button>
      </div>

      {submitted && (
        <>
          {/* ── Section 1 ── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              {MONTHS[selectedMonth - 1]} {selectedYear} — Monthly Breakdown
            </h2>
            {!bill && (
              <div className="text-sm text-amber-700 dark:text-amber-400 mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
                ⚠️ No utility bill data for this month. Utility amounts shown as $0.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
              {/* Breakdown table */}
              <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder overflow-hidden self-start shadow-[var(--shadow-card)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-meadowLight dark:bg-darkSurface text-gray-500 dark:text-gray-400 text-left">
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Description</th>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t border-meadowBorder dark:border-darkBorder">
                        <td className="px-5 py-2.5 text-gray-700 dark:text-gray-300">{row.label}</td>
                        <td className={`px-5 py-2.5 text-right font-semibold ${
                          row.sign === "+" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                        }`}>
                          {row.sign}{fmt(row.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-meadowOrange bg-meadowMuted/30 dark:bg-darkBorder/20">
                      <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-gray-100">Total Gross Income</td>
                      <td className={`px-5 py-3.5 text-right font-bold text-lg ${
                        gross >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                      }`}>
                        {fmt(gross)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pie chart — full height, bigger */}
              <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 flex flex-col shadow-[var(--shadow-card)]">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Expense Breakdown
                </h3>
                <div className="relative flex-1 min-h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius="38%" outerRadius="62%"
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                        label={({ name, cx, cy, midAngle, outerRadius }: any) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 30;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={10} fill="#6b7280" fontWeight={500}>
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
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                        {fmt(totalExpenses)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Total</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 2 ── */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              {selectedYear} — Annual Summary
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
              {/* Year table */}
              <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder overflow-hidden self-start shadow-[var(--shadow-card)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-meadowLight dark:bg-darkSurface text-gray-500 dark:text-gray-400 text-left">
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Month</th>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-right">Gross Income</th>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wide">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyGross.map((row, i) => (
                      <tr key={i} className={`border-t border-meadowBorder dark:border-darkBorder ${
                        i + 1 === selectedMonth ? "bg-meadowMuted/30 dark:bg-darkBorder/20" : ""
                      }`}>
                        <td className="px-5 py-2.5 font-medium text-gray-800 dark:text-gray-100">
                          {row.month}
                          {i + 1 === selectedMonth && (
                            <span className="ml-2 text-xs text-meadowOrange font-semibold">← selected</span>
                          )}
                        </td>
                        <td className={`px-5 py-2.5 text-right font-semibold ${
                          row.future ? "text-gray-400" :
                          row.gross >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                        }`}>
                          {row.future ? "—" : fmt(row.gross)}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-gray-400">
                          {row.future ? "Future" : yearlyBills[i] ? "" : "No bill data"}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-meadowOrange bg-meadowMuted/30 dark:bg-darkBorder/20">
                      <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-gray-100">Total {selectedYear}</td>
                      <td className={`px-5 py-3.5 text-right font-bold text-lg ${
                        totalYearlyGross >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                      }`}>
                        {fmt(totalYearlyGross)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 font-medium">YTD</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bar + Line chart — gross income over the year */}
              <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 flex flex-col shadow-[var(--shadow-card)]">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Monthly Income Trend
                </h3>
                {/* Legend */}
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Positive
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Negative
                  </span>
                </div>
                <div className="flex-1 min-h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                        width={46}
                      />
                      <Tooltip
                        formatter={(v: number, name: string) => {
                          if (name === "Gross") return [fmt(v > 0 ? v : -v), "Gross Income"];
                          return [fmt(v), name];
                        }}
                        contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                      />
                      {/* Bars colored green/red based on actual gross sign */}
                      <Bar dataKey="grossAbs" radius={[5, 5, 0, 0]} barSize={22} isAnimationActive={false}>
                        {lineData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isPositive ? "#34d399" : "#f87171"}
                          />
                        ))}
                      </Bar>
                      <Line
                        type="monotone"
                        dataKey="grossAbs"
                        stroke="#F97316"
                        strokeWidth={2.5}
                        dot={{ fill: "#F97316", r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        name="Gross"
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              Mortgage = ${MORTGAGE_AMOUNT.toLocaleString()}/mo · Shares (6.5 total): Dương+Ngân 2 · Cường 1 · Khoa+Thảo 2 · Bảo 1 · Nhi 0.5
            </p>
          </section>
        </>
      )}
    </div>
  );
}
