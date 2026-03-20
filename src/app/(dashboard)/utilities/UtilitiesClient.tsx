"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BillRow {
  id: number; month: number; year: number;
  electric: number; electricUsage: number | null; electricPrice: number | null;
  gas: number; gasUsage: number | null; gasPrice: number | null;
  water: number; waterUsage: number | null; waterPrice: number | null;
  wifi: number; wifiPrice: number | null;
}
interface DocRow {
  id: number; month: number; year: number; utilityType: string;
  fileName: string; filePath: string;
  billStartDate: string | null; billEndDate: string | null;
}
interface OcrResult {
  billingMonth: number | null; billingYear: number | null;
  billingPeriodStart: string | null; billingPeriodEnd: string | null;
  totalAmount: number | null; usage: number | null; pricePerUnit: number | null;
}
interface ReviewForm {
  month: number; year: number;
  billStart: string; billEnd: string;
  amount: string; usage: string; price: string;
}
interface Props {
  isAdmin: boolean;
  bills: BillRow[];
  documents: DocRow[];
  tenantName: string | null;
  currentMonth: number;
  currentYear: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const UTIL_COLORS = { electric: "#F59E0B", gas: "#EF4444", water: "#06B6D4", wifi: "#8B5CF6" };
const UTIL_LABELS = { electric: "Electric", gas: "Gas", water: "Water", wifi: "WiFi" };
const TODAY_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: TODAY_YEAR - 2024 + 1 }, (_, i) => 2024 + i);

function getYearRange(year: number) {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year }));
}

function fmtLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${String(year).slice(2)}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Bill split shares
const SHARE_MAP: Record<string, number> = {
  "Cường": 1, "Bảo": 1, "Nhi": 0.5, "Khoa": 1, "Thảo": 1, "Ngân": 0, "Dương": 2,
};
const TOTAL_SHARES = Object.values(SHARE_MAP).reduce((a, b) => a + b, 0);

function getShareForName(name: string | null): number {
  if (!name) return 1;
  for (const [key, val] of Object.entries(SHARE_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 1;
}

// ─── 3-dot menu ───────────────────────────────────────────────────────────────
function ThreeDotMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md hover:bg-meadowMuted dark:hover:bg-darkBorder transition-colors" title="Options">
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white dark:bg-darkCard border border-meadowBorder dark:border-darkBorder rounded-xl shadow-xl w-36">
          <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkSurface rounded-xl"
            onClick={() => { setOpen(false); onEdit(); }}>✏️ Edit</button>
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-darkBorder transition-colors text-lg font-bold">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 focus:border-meadowOrange transition-all";
const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";
const selectClass = "px-2 py-1.5 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 cursor-pointer";

type UtilType = "electric" | "gas" | "water" | "wifi";

export default function UtilitiesClient({ isAdmin, bills, documents, tenantName, currentMonth, currentYear }: Props) {
  const [utilType, setUtilType] = useState<UtilType>("electric");
  const [allBills, setAllBills] = useState(bills);
  const [allDocs, setAllDocs] = useState(documents);

  // Chart year filter (Billing History + Usage History)
  const [chartYear, setChartYear] = useState(currentYear);

  // Bill split + document viewer month/year selector
  const [splitMonth, setSplitMonth] = useState(currentMonth);
  const [splitYear, setSplitYear] = useState(currentYear);

  // Edit modals
  const [editBillingModal, setEditBillingModal] = useState(false);
  const [editUsageModal, setEditUsageModal] = useState(false);
  const [editForm, setEditForm] = useState({ amount: "", usage: "", price: "" });
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);

  // Upload modal
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedDocMonth, setSelectedDocMonth] = useState(currentMonth);
  const [selectedDocYear, setSelectedDocYear] = useState(currentYear);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // OCR + Review modal
  const [ocrLoading, setOcrLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    month: currentMonth, year: currentYear,
    billStart: "", billEnd: "",
    amount: "", usage: "", price: "",
  });

  // Memos
  const billMap = useMemo(() => {
    const m = new Map<string, BillRow>();
    allBills.forEach((b) => m.set(`${b.month}-${b.year}`, b));
    return m;
  }, [allBills]);

  const latestBill = allBills.length > 0 ? allBills[allBills.length - 1] : null;

  // Chart range: Jan–Dec of selected chart year
  const chartRange = useMemo(() => getYearRange(chartYear), [chartYear]);

  // Bill selected for split/document view
  const splitBill = billMap.get(`${splitMonth}-${splitYear}`) ?? null;
  const splitBillAmount = splitBill ? ((splitBill[utilType as keyof BillRow] as number) ?? 0) : 0;
  const myShare = getShareForName(tenantName);
  const myBill = TOTAL_SHARES > 0 ? (splitBillAmount * myShare) / TOTAL_SHARES : 0;

  // Document for selected split month/year/utilType
  const splitDoc = allDocs.find(
    (d) => d.utilityType === utilType && d.month === splitMonth && d.year === splitYear
  ) ?? null;

  // Chart data — full year, 0 for missing months
  const billingData = chartRange.map(({ month, year }) => {
    const bill = billMap.get(`${month}-${year}`);
    return { name: MONTHS[month - 1], Amount: bill ? Number(bill[utilType as keyof BillRow] ?? 0) : 0 };
  });

  const usageData = chartRange.map(({ month, year }) => {
    const bill = billMap.get(`${month}-${year}`);
    const usageKey = `${utilType}Usage` as keyof BillRow;
    return { name: MONTHS[month - 1], Usage: bill ? Number((bill[usageKey] as number | null) ?? 0) : 0 };
  });

  const hasChartBills = allBills.some((b) => b.year === chartYear);

  const refreshBills = async () => {
    const res = await fetch("/api/utilities");
    if (res.ok) setAllBills(await res.json());
  };

  const refreshDocs = async () => {
    const res = await fetch("/api/utilities/documents");
    if (res.ok) setAllDocs(await res.json());
  };

  const openEditBilling = () => {
    if (!latestBill) return;
    setEditForm({ amount: String((latestBill[utilType as keyof BillRow] as number) ?? 0), usage: "", price: "" });
    setSavingError(null);
    setEditBillingModal(true);
  };

  const openEditUsage = () => {
    if (!latestBill) return;
    const usageKey = `${utilType}Usage` as keyof BillRow;
    const priceKey = `${utilType}Price` as keyof BillRow;
    setEditForm({
      amount: "",
      usage: String((latestBill[usageKey] as number | null) ?? ""),
      price: String((latestBill[priceKey] as number | null) ?? ""),
    });
    setSavingError(null);
    setEditUsageModal(true);
  };

  const handleSaveBilling = async () => {
    if (!latestBill) return;
    setSaving(true); setSavingError(null);
    const res = await fetch(`/api/utilities/${latestBill.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [utilType]: Number(editForm.amount) }),
    });
    setSaving(false);
    if (res.ok) { setEditBillingModal(false); await refreshBills(); }
    else { const d = await res.json(); setSavingError(d.error ?? "Failed"); }
  };

  const handleSaveUsage = async () => {
    if (!latestBill) return;
    setSaving(true); setSavingError(null);
    const body: Record<string, number | null> = {};
    if (utilType !== "wifi") body[`${utilType}Usage`] = editForm.usage ? Number(editForm.usage) : null;
    body[`${utilType}Price`] = editForm.price ? Number(editForm.price) : null;
    const res = await fetch(`/api/utilities/${latestBill.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { setEditUsageModal(false); await refreshBills(); }
    else { const d = await res.json(); setSavingError(d.error ?? "Failed"); }
  };

  // ─── Upload & OCR ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true); setUploadError(null);

    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("month", String(selectedDocMonth));
    fd.append("year", String(selectedDocYear));
    fd.append("utilityType", utilType);
    const uploadRes = await fetch("/api/utilities/documents", { method: "POST", body: fd });
    if (!uploadRes.ok) {
      const d = await uploadRes.json();
      setUploadError(d.error ?? "Upload failed");
      setUploading(false);
      return;
    }
    const uploadedDoc = await uploadRes.json();
    setPendingDocId(uploadedDoc.id);
    await refreshDocs();

    setOcrLoading(true);
    const ocrFd = new FormData();
    ocrFd.append("file", uploadFile);
    ocrFd.append("utilityType", utilType);
    const ocrRes = await fetch("/api/utilities/ocr", { method: "POST", body: ocrFd });
    const ocrData: OcrResult | { error: string } = await ocrRes.json();
    setOcrLoading(false);
    setUploading(false);

    if ("error" in ocrData) {
      setReviewForm({ month: selectedDocMonth, year: selectedDocYear, billStart: "", billEnd: "", amount: "", usage: "", price: "" });
    } else {
      setReviewForm({
        month: ocrData.billingMonth ?? selectedDocMonth,
        year: ocrData.billingYear ?? selectedDocYear,
        billStart: ocrData.billingPeriodStart ?? "",
        billEnd: ocrData.billingPeriodEnd ?? "",
        amount: ocrData.totalAmount != null ? String(ocrData.totalAmount) : "",
        usage: ocrData.usage != null ? String(ocrData.usage) : "",
        price: ocrData.pricePerUnit != null ? String(ocrData.pricePerUnit) : "",
      });
    }

    setUploadModal(false);
    setUploadFile(null);
    setReviewError(null);
    setReviewModal(true);
  };

  const handleConfirmReview = async () => {
    setReviewSaving(true); setReviewError(null);

    const billBody: Record<string, unknown> = {
      month: reviewForm.month, year: reviewForm.year,
      [utilType]: reviewForm.amount ? Number(reviewForm.amount) : 0,
    };
    if (utilType !== "wifi" && reviewForm.usage) billBody[`${utilType}Usage`] = Number(reviewForm.usage);
    if (reviewForm.price) billBody[`${utilType}Price`] = Number(reviewForm.price);

    const billRes = await fetch("/api/utilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billBody),
    });
    if (!billRes.ok) {
      const d = await billRes.json();
      setReviewError(d.error ?? "Failed to save bill");
      setReviewSaving(false);
      return;
    }

    if (pendingDocId) {
      await fetch(`/api/utilities/documents/${pendingDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billStartDate: reviewForm.billStart || null, billEndDate: reviewForm.billEnd || null }),
      });
    }

    // After saving, jump the split view to the newly saved month/year
    setSplitMonth(reviewForm.month);
    setSplitYear(reviewForm.year);

    await refreshBills();
    await refreshDocs();
    setReviewSaving(false);
    setReviewModal(false);
    setPendingDocId(null);
  };

  const color = UTIL_COLORS[utilType];
  const UTIL_UNITS: Record<UtilType, string> = { electric: "kWh", gas: "m³", water: "m³", wifi: "month" };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Utilities</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track and manage your utility bills</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-meadowLight dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder">
            {(["electric","gas","water","wifi"] as UtilType[]).map((t) => (
              <button key={t} onClick={() => setUtilType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  utilType === t
                    ? "bg-white dark:bg-darkSurface shadow-sm text-gray-900 dark:text-gray-100 border border-meadowBorder dark:border-darkBorder"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}>
                {t === "electric" ? "⚡" : t === "gas" ? "🔥" : t === "water" ? "💧" : "📡"} {UTIL_LABELS[t]}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button
              onClick={() => { setUploadModal(true); setSelectedDocMonth(currentMonth); setSelectedDocYear(currentYear); setUploadError(null); setUploadFile(null); }}
              className="px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white text-sm rounded-lg font-semibold transition-colors shadow-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Upload &amp; Scan
            </button>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Billing History */}
        <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 shadow-[var(--shadow-card)]">
          <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{UTIL_LABELS[utilType]} — Billing History</h2>
              <p className="text-xs text-gray-400 mt-0.5">Jan – Dec {chartYear} · in $</p>
            </div>
            <div className="flex items-center gap-1.5">
              <select value={chartYear} onChange={(e) => setChartYear(Number(e.target.value))} className={selectClass}>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {isAdmin && <ThreeDotMenu onEdit={openEditBilling} />}
            </div>
          </div>
          {!hasChartBills ? (
            <div className="flex flex-col items-center justify-center h-[260px] gap-2 text-gray-400 dark:text-gray-600">
              <svg className="w-9 h-9 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2V7a2 2 0 012-2h4M15 17h4a2 2 0 002-2V7a2 2 0 00-2-2h-4M9 5V3m6 2V3"/></svg>
              <p className="text-sm font-medium">No billing data for {chartYear}</p>
              <p className="text-xs">Upload a bill to populate this chart.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={billingData} barSize={14} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", borderColor: "#dde3eb", fontSize: "12px" }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Amount"]} />
                <Bar dataKey="Amount" fill={color} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Usage History */}
        <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 shadow-[var(--shadow-card)]">
          <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{UTIL_LABELS[utilType]} — Usage History</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {utilType === "wifi" ? "Not applicable" : `Jan – Dec ${chartYear} · in ${UTIL_UNITS[utilType]}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <select value={chartYear} onChange={(e) => setChartYear(Number(e.target.value))} className={selectClass}>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {isAdmin && utilType !== "wifi" && <ThreeDotMenu onEdit={openEditUsage} />}
            </div>
          </div>
          {utilType === "wifi" ? (
            <div className="flex flex-col items-center justify-center h-[260px] gap-3 text-gray-400 dark:text-gray-600">
              <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12v.01M15.536 8.464a5 5 0 010 7.072M8.464 8.464a5 5 0 000 7.072" />
              </svg>
              <p className="text-sm font-medium">No usage data for WiFi</p>
              <p className="text-xs text-center max-w-[200px] leading-relaxed">WiFi is billed at a flat monthly rate — no usage units to track.</p>
            </div>
          ) : !hasChartBills ? (
            <div className="flex flex-col items-center justify-center h-[260px] gap-2 text-gray-400 dark:text-gray-600">
              <svg className="w-9 h-9 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2V7a2 2 0 012-2h4M15 17h4a2 2 0 002-2V7a2 2 0 00-2-2h-4M9 5V3m6 2V3"/></svg>
              <p className="text-sm font-medium">No usage data for {chartYear}</p>
              <p className="text-xs">Upload a bill to populate this chart.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={usageData} barSize={14} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", borderColor: "#dde3eb", fontSize: "12px" }} formatter={(v: number) => [`${v} ${UTIL_UNITS[utilType]}`, "Usage"]} />
                <Bar dataKey="Usage" fill={color} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Period selector for Bill Split + Documents */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Viewing period:</span>
        <select value={splitMonth} onChange={(e) => setSplitMonth(Number(e.target.value))} className={selectClass}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={splitYear} onChange={(e) => setSplitYear(Number(e.target.value))} className={selectClass}>
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Bill Split & PDF */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bill Split */}
        <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Bill Split — {UTIL_LABELS[utilType]}
          </h2>
          {splitBill ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {fmtLabel(splitBill.month, splitBill.year)} · Total:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">${splitBillAmount.toFixed(2)}</span>
              {" "}· {TOTAL_SHARES} shares total
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              No bill for {MONTHS[splitMonth - 1]} {splitYear} · Upload a bill to see splits
            </p>
          )}
          {splitDoc?.billStartDate && splitDoc?.billEndDate ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Period:{" "}
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {fmtDate(splitDoc.billStartDate)} – {fmtDate(splitDoc.billEndDate)}
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Period: not specified</p>
          )}
          {tenantName && splitBill && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-meadowMuted to-orange-100/50 dark:from-darkBorder dark:to-darkBorder/50 border border-orange-200/50 dark:border-darkBorder">
              <p className="text-xs text-gray-600 dark:text-gray-400">Your share ({myShare} share{myShare !== 1 ? "s" : ""})</p>
              <p className="text-2xl font-bold text-meadowOrange mt-0.5">${myBill.toFixed(2)}</p>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2.5 font-semibold">Tenant</th>
                <th className="pb-2.5 font-semibold text-center">Shares</th>
                <th className="pb-2.5 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SHARE_MAP).map(([name, shares]) => {
                const amt = splitBill && TOTAL_SHARES > 0 ? (splitBillAmount * shares) / TOTAL_SHARES : null;
                const isMe = tenantName && name.toLowerCase() === tenantName.toLowerCase();
                return (
                  <tr key={name} className={`border-t border-meadowBorder/50 dark:border-darkBorder/50 ${isMe ? "bg-meadowMuted/50 dark:bg-darkBorder/30 rounded-lg" : ""}`}>
                    <td className={`py-2.5 ${isMe ? "font-semibold text-meadowOrange" : "text-gray-700 dark:text-gray-300"}`}>
                      {name} {isMe ? "(you)" : ""}
                    </td>
                    <td className="py-2.5 text-center text-gray-500 dark:text-gray-400 font-medium">{shares}</td>
                    <td className={`py-2.5 text-right font-medium ${shares === 0 || amt == null ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {shares === 0 || amt == null ? "—" : `$${amt.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-5 flex flex-col shadow-[var(--shadow-card)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Bill Document — {UTIL_LABELS[utilType]}
            </h2>
            {splitDoc && (
              <a
                href={`/api/utilities/documents/${splitDoc.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-meadowOrange hover:underline font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in new tab
              </a>
            )}
          </div>
          {splitDoc ? (
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-xs text-gray-400">{splitDoc.fileName}</p>
              <object
                data={`/api/utilities/documents/${splitDoc.id}/file`}
                type="application/pdf"
                className="w-full flex-1 min-h-[400px] rounded-xl border border-meadowBorder dark:border-darkBorder"
              >
                <div className="flex flex-col items-center justify-center h-[400px] gap-3 text-gray-400 dark:text-gray-600">
                  <p className="text-sm">PDF preview unavailable in this browser.</p>
                  <a
                    href={`/api/utilities/documents/${splitDoc.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-meadowOrange text-white text-sm rounded-lg font-medium hover:bg-orange-600 transition-colors"
                  >
                    Download PDF
                  </a>
                </div>
              </object>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2 min-h-[200px]">
              <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No document for {MONTHS[splitMonth - 1]} {splitYear}</p>
              {isAdmin && <p className="text-xs">Upload one using &quot;Upload &amp; Scan&quot; above.</p>}
            </div>
          )}
        </div>
      </div>

      {/* ─── Edit Billing Modal ─── */}
      {editBillingModal && (
        <Modal title={`Edit ${UTIL_LABELS[utilType]} Bill — ${latestBill ? fmtLabel(latestBill.month, latestBill.year) : ""}`}
          onClose={() => setEditBillingModal(false)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>Total Bill Amount ($)</label>
              <input type="number" min={0} step={0.01} value={editForm.amount}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} className={inputClass} />
            </div>
            {savingError && <p className="text-red-500 text-sm">{savingError}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={handleSaveBilling} disabled={saving}
                className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditBillingModal(false)}
                className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Edit Usage Modal ─── */}
      {editUsageModal && (
        <Modal title={`Edit ${UTIL_LABELS[utilType]} Usage — ${latestBill ? fmtLabel(latestBill.month, latestBill.year) : ""}`}
          onClose={() => setEditUsageModal(false)}>
          <div className="flex flex-col gap-3">
            {utilType !== "wifi" && (
              <div>
                <label className={labelClass}>Usage ({utilType === "electric" ? "kWh" : "m³"})</label>
                <input type="number" min={0} step={0.01} value={editForm.usage}
                  onChange={(e) => setEditForm((p) => ({ ...p, usage: e.target.value }))} className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}>
                Price per {utilType === "wifi" ? "month ($)" : utilType === "electric" ? "kWh ($)" : "m³ ($)"}
              </label>
              <input type="number" min={0} step={0.001} value={editForm.price}
                onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} className={inputClass} />
            </div>
            {savingError && <p className="text-red-500 text-sm">{savingError}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={handleSaveUsage} disabled={saving}
                className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditUsageModal(false)}
                className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Upload PDF Modal ─── */}
      {uploadModal && (
        <Modal title={`Upload ${UTIL_LABELS[utilType]} Bill PDF`} onClose={() => setUploadModal(false)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Month</label>
                <select value={selectedDocMonth} onChange={(e) => setSelectedDocMonth(Number(e.target.value))} className={inputClass}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <select value={selectedDocYear} onChange={(e) => setSelectedDocYear(Number(e.target.value))} className={inputClass}>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>PDF File</label>
              <input type="file" accept="application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-meadowMuted file:text-gray-700 hover:file:bg-orange-200 cursor-pointer" />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                After upload, AI will scan the bill and extract billing data for your review.
              </p>
            </div>
            {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={handleUpload} disabled={uploading || ocrLoading || !uploadFile}
                className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Uploading…</>
                ) : ocrLoading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Scanning…</>
                ) : "Upload & Scan"}
              </button>
              <button onClick={() => setUploadModal(false)}
                className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Review Extracted Data Modal ─── */}
      {reviewModal && (
        <Modal title="Review Extracted Bill Data" onClose={() => setReviewModal(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 leading-relaxed">
              AI extracted the following data from your bill. Please review and correct any fields before saving.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Billing Month</label>
                <select value={reviewForm.month} onChange={(e) => setReviewForm((p) => ({ ...p, month: Number(e.target.value) }))} className={inputClass}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Billing Year</label>
                <select value={reviewForm.year} onChange={(e) => setReviewForm((p) => ({ ...p, year: Number(e.target.value) }))} className={inputClass}>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Period Start</label>
                <input type="date" value={reviewForm.billStart} onChange={(e) => setReviewForm((p) => ({ ...p, billStart: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Period End</label>
                <input type="date" value={reviewForm.billEnd} onChange={(e) => setReviewForm((p) => ({ ...p, billEnd: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Total Amount ($)</label>
              <input type="number" min={0} step={0.01} value={reviewForm.amount}
                onChange={(e) => setReviewForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" className={inputClass} />
            </div>
            {utilType !== "wifi" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Usage ({UTIL_UNITS[utilType]})</label>
                  <input type="number" min={0} step={0.01} value={reviewForm.usage}
                    onChange={(e) => setReviewForm((p) => ({ ...p, usage: e.target.value }))} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Price / {UTIL_UNITS[utilType]} ($)</label>
                  <input type="number" min={0} step={0.0001} value={reviewForm.price}
                    onChange={(e) => setReviewForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.0000" className={inputClass} />
                </div>
              </div>
            )}
            {utilType === "wifi" && (
              <div>
                <label className={labelClass}>Monthly Rate ($)</label>
                <input type="number" min={0} step={0.01} value={reviewForm.price}
                  onChange={(e) => setReviewForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" className={inputClass} />
              </div>
            )}
            {reviewError && <p className="text-red-500 text-sm">{reviewError}</p>}
            <div className="flex gap-3 mt-1">
              <button onClick={handleConfirmReview} disabled={reviewSaving || !reviewForm.amount}
                className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {reviewSaving ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Saving…</>
                ) : "Confirm & Save"}
              </button>
              <button onClick={() => { setSplitMonth(selectedDocMonth); setSplitYear(selectedDocYear); setReviewModal(false); }}
                className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Skip
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
