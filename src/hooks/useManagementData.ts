"use client";

import { useState } from "react";
import { MONTHS, calcGross, type UtilityBill } from "@/lib/management-finance";

export function useManagementData() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState<UtilityBill | null>(null);
  const [yearlyBills, setYearlyBills] = useState<(UtilityBill | null)[]>([]);

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitted(false);

    const res = await fetch(`/api/utilities?month=${selectedMonth}&year=${selectedYear}`);
    const allBills: UtilityBill[] = res.ok ? await res.json() : [];
    setBill(allBills.find((b) => b.month === selectedMonth && b.year === selectedYear) ?? null);

    const yearly: (UtilityBill | null)[] = [];
    for (let m = 1; m <= 12; m++) {
      yearly.push(allBills.find((b) => b.month === m && b.year === selectedYear) ?? null);
    }
    setYearlyBills(yearly);
    setLoading(false);
    setSubmitted(true);
  };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  const { rows, gross, expenses } = calcGross(bill);
  const pieData = expenses.map((e) => ({ name: e.label, value: parseFloat(e.amount.toFixed(2)) }));
  const totalExpenses = pieData.reduce((s, d) => s + d.value, 0);

  const yearlyGross = yearlyBills.map((b, idx) => {
    const isFuture = new Date(selectedYear, idx, 1) > today;
    if (isFuture) return { month: MONTHS[idx], gross: 0, grossAbs: 0, isPositive: true, future: true };
    const g = parseFloat(calcGross(b).gross.toFixed(2));
    return { month: MONTHS[idx], gross: g, grossAbs: Math.abs(g), isPositive: g >= 0, future: false };
  });
  const totalYearlyGross = yearlyGross.reduce((s, m) => s + m.gross, 0);
  const lineData = yearlyGross.filter((m) => !m.future);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  return {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    submitted,
    loading,
    bill,
    yearlyBills,
    handleSubmit,
    years,
    rows,
    gross,
    pieData,
    totalExpenses,
    yearlyGross,
    totalYearlyGross,
    lineData,
    fmt,
  };
}
