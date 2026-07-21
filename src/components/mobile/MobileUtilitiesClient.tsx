"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useUtilitiesData } from "@/hooks/useUtilitiesData";
import {
  MONTHS, UTIL_LABELS, UTIL_UNITS, YEAR_OPTIONS, fmtLabel, fmtDate,
  type UtilitiesProps, type UtilType,
} from "@/lib/utilities";
import MobileCard from "./MobileCard";
import MobileBottomSheet from "./MobileBottomSheet";

const inputClass = "w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 transition-all";
const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";
const selectClass = "px-2.5 py-2 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300 text-xs font-medium";

export default function MobileUtilitiesClient(props: UtilitiesProps) {
  const { isAdmin, currentMonth, currentYear } = props;
  const {
    utilType, setUtilType,
    allTenants,
    shareDraft, setShareDraft,
    savingShareId,
    chartYear, setChartYear,
    splitMonth, setSplitMonth,
    splitYear, setSplitYear,
    editBillingModal, setEditBillingModal,
    editUsageModal, setEditUsageModal,
    editForm, setEditForm,
    saving, savingError,
    uploadModal, setUploadModal,
    uploadFile, setUploadFile,
    selectedDocMonth, setSelectedDocMonth,
    selectedDocYear, setSelectedDocYear,
    uploading, uploadError, setUploadError,
    ocrLoading,
    reviewModal, setReviewModal,
    reviewError, reviewSaving,
    reviewForm, setReviewForm,
    latestBill,
    splitBill, splitBillAmount, totalShares, myShare, myBill,
    splitDoc,
    billingData, usageData, hasChartBills,
    handleShareSave,
    openEditBilling, openEditUsage,
    handleSaveBilling, handleSaveUsage,
    handleUpload, handleConfirmReview,
    color,
  } = useUtilitiesData(props);
  const { tenantId } = props;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Utilities</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track and manage your utility bills</p>
      </div>

      <div className="flex items-center gap-1 p-1 bg-meadowLight dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder overflow-x-auto">
        {(["electric", "gas", "water", "wifi"] as UtilType[]).map((t) => (
          <button key={t} onClick={() => setUtilType(t)}
            className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              utilType === t
                ? "bg-white dark:bg-darkSurface shadow-sm text-gray-900 dark:text-gray-100 border border-meadowBorder dark:border-darkBorder"
                : "text-gray-500 dark:text-gray-400"
            }`}>
            {t === "electric" ? "⚡" : t === "gas" ? "🔥" : t === "water" ? "💧" : "📡"} {UTIL_LABELS[t]}
          </button>
        ))}
      </div>

      {isAdmin && (
        <button
          onClick={() => { setUploadModal(true); setSelectedDocMonth(currentMonth); setSelectedDocYear(currentYear); setUploadError(null); setUploadFile(null); }}
          className="px-4 py-2.5 bg-meadowOrange text-white text-sm rounded-xl font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Upload &amp; Scan
        </button>
      )}

      {/* Billing History */}
      <MobileCard>
        <div className="flex justify-between items-start mb-3 gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{UTIL_LABELS[utilType]} — Billing</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Jan – Dec {chartYear} · in $</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <select value={chartYear} onChange={(e) => setChartYear(Number(e.target.value))} className={selectClass}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isAdmin && (
              <button onClick={openEditBilling} className="p-1.5 rounded-lg bg-meadowMuted dark:bg-darkBorder text-gray-600 dark:text-gray-300" title="Edit">
                ✏️
              </button>
            )}
          </div>
        </div>
        {!hasChartBills ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-gray-400 dark:text-gray-600">
            <p className="text-sm font-medium">No billing data for {chartYear}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={billingData} barSize={10} margin={{ top: 0, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", borderColor: "#dde3eb", fontSize: "12px" }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Amount"]} />
              <Bar dataKey="Amount" fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </MobileCard>

      {/* Usage History */}
      <MobileCard>
        <div className="flex justify-between items-start mb-3 gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{UTIL_LABELS[utilType]} — Usage</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {utilType === "wifi" ? "Not applicable" : `Jan – Dec ${chartYear} · in ${UTIL_UNITS[utilType]}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <select value={chartYear} onChange={(e) => setChartYear(Number(e.target.value))} className={selectClass}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isAdmin && utilType !== "wifi" && (
              <button onClick={openEditUsage} className="p-1.5 rounded-lg bg-meadowMuted dark:bg-darkBorder text-gray-600 dark:text-gray-300" title="Edit">
                ✏️
              </button>
            )}
          </div>
        </div>
        {utilType === "wifi" ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-gray-400 dark:text-gray-600 text-center px-4">
            <p className="text-sm font-medium">No usage data for WiFi</p>
            <p className="text-xs leading-relaxed">Billed at a flat monthly rate.</p>
          </div>
        ) : !hasChartBills ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-gray-400 dark:text-gray-600">
            <p className="text-sm font-medium">No usage data for {chartYear}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={usageData} barSize={10} margin={{ top: 0, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", borderColor: "#dde3eb", fontSize: "12px" }} formatter={(v: number) => [`${v} ${UTIL_UNITS[utilType]}`, "Usage"]} />
              <Bar dataKey="Usage" fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </MobileCard>

      {/* Period selector */}
      <MobileCard className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Period:</span>
        <select value={splitMonth} onChange={(e) => setSplitMonth(Number(e.target.value))} className={selectClass}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={splitYear} onChange={(e) => setSplitYear(Number(e.target.value))} className={selectClass}>
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </MobileCard>

      {/* Bill Split */}
      <MobileCard>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Bill Split — {UTIL_LABELS[utilType]}
        </h2>
        {splitBill ? (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">
            {fmtLabel(splitBill.month, splitBill.year)} · Total:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">${splitBillAmount.toFixed(2)}</span>
            {" "}· {totalShares} shares
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">
            No bill for {MONTHS[splitMonth - 1]} {splitYear}
          </p>
        )}
        {splitDoc?.billStartDate && splitDoc?.billEndDate ? (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
            Period: {fmtDate(splitDoc.billStartDate)} – {fmtDate(splitDoc.billEndDate)}
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">Period: not specified</p>
        )}
        {tenantId != null && splitBill && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-gradient-to-r from-meadowMuted to-orange-100/50 dark:from-darkBorder dark:to-darkBorder/50 border border-orange-200/50 dark:border-darkBorder">
            <p className="text-xs text-gray-600 dark:text-gray-400">Your share ({myShare} share{myShare !== 1 ? "s" : ""})</p>
            <p className="text-2xl font-bold text-meadowOrange mt-0.5">${myBill.toFixed(2)}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {allTenants.map((t) => {
            const shares = t.utilityShare;
            const amt = splitBill && totalShares > 0 ? (splitBillAmount * shares) / totalShares : null;
            const isMe = tenantId === t.id;
            return (
              <div key={t.id} className={`flex items-center justify-between py-2 px-2.5 rounded-lg ${isMe ? "bg-meadowMuted/50 dark:bg-darkBorder/30" : ""}`}>
                <div className={`text-sm min-w-0 ${isMe ? "font-semibold text-meadowOrange" : "text-gray-700 dark:text-gray-300"}`}>
                  {t.name} {isMe ? "(you)" : ""}
                  {t.isPlaceholder && (
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      Placeholder
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {isAdmin ? (
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={savingShareId === t.id}
                      value={shareDraft[t.id] ?? String(shares)}
                      onChange={(e) => setShareDraft((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      onBlur={(e) => handleShareSave(t, e.target.value)}
                      className="w-14 px-1.5 py-1 text-center rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300 text-xs"
                    />
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{shares}</span>
                  )}
                  <span className={`text-sm font-medium w-16 text-right ${shares === 0 || amt == null ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {shares === 0 || amt == null ? "—" : `$${amt.toFixed(2)}`}
                  </span>
                </div>
              </div>
            );
          })}
          {allTenants.length === 0 && (
            <p className="py-4 text-center text-gray-400 text-xs">No residents</p>
          )}
        </div>
      </MobileCard>

      {/* Bill Document */}
      <MobileCard>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Bill Document — {UTIL_LABELS[utilType]}
        </h2>
        {splitDoc ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{splitDoc.fileName}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">PDF document</p>
            </div>
            <a
              href={`/api/utilities/documents/${splitDoc.id}/file`}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 px-3.5 py-2 bg-meadowOrange text-white text-xs rounded-lg font-medium active:scale-[0.98] transition-transform"
            >
              View PDF
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2 py-6">
            <p className="text-sm">No document for {MONTHS[splitMonth - 1]} {splitYear}</p>
            {isAdmin && <p className="text-xs">Upload one using &quot;Upload &amp; Scan&quot; above.</p>}
          </div>
        )}
      </MobileCard>

      {/* ─── Edit Billing Sheet ─── */}
      <MobileBottomSheet
        open={editBillingModal}
        onClose={() => setEditBillingModal(false)}
        title={`Edit ${UTIL_LABELS[utilType]} Bill${latestBill ? ` — ${fmtLabel(latestBill.month, latestBill.year)}` : ""}`}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClass}>Total Bill Amount ($)</label>
            <input type="number" min={0} step={0.01} value={editForm.amount}
              onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} className={inputClass} />
          </div>
          {savingError && <p className="text-red-500 text-sm">{savingError}</p>}
          <div className="flex gap-3 mt-2">
            <button onClick={handleSaveBilling} disabled={saving}
              className="flex-1 py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditBillingModal(false)}
              className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* ─── Edit Usage Sheet ─── */}
      <MobileBottomSheet
        open={editUsageModal}
        onClose={() => setEditUsageModal(false)}
        title={`Edit ${UTIL_LABELS[utilType]} Usage${latestBill ? ` — ${fmtLabel(latestBill.month, latestBill.year)}` : ""}`}
      >
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
              className="flex-1 py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditUsageModal(false)}
              className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* ─── Upload PDF Sheet ─── */}
      <MobileBottomSheet open={uploadModal} onClose={() => setUploadModal(false)} title={`Upload ${UTIL_LABELS[utilType]} Bill PDF`}>
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
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-meadowMuted file:text-gray-700" />
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              After upload, AI will scan the bill and extract billing data for your review.
            </p>
          </div>
          {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
          <div className="flex gap-3 mt-2">
            <button onClick={handleUpload} disabled={uploading || ocrLoading || !uploadFile}
              className="flex-1 py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {uploading ? "Uploading…" : ocrLoading ? "Scanning…" : "Upload & Scan"}
            </button>
            <button onClick={() => setUploadModal(false)}
              className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* ─── Review Extracted Data Sheet ─── */}
      <MobileBottomSheet open={reviewModal} onClose={() => setReviewModal(false)} title="Review Extracted Bill Data">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
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
              className="flex-1 py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {reviewSaving ? "Saving…" : "Confirm & Save"}
            </button>
            <button onClick={() => { setSplitMonth(selectedDocMonth); setSplitYear(selectedDocYear); setReviewModal(false); }}
              className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
              Skip
            </button>
          </div>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
