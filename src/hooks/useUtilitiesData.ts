"use client";

import { useMemo, useState } from "react";
import {
  MONTHS, UTIL_COLORS, getYearRange,
  type BillRow, type OcrResult, type ReviewForm, type UtilitiesProps, type UtilType,
} from "@/lib/utilities";
import { isActiveForPeriod } from "@/lib/resident-activity";

export function useUtilitiesData({ isAdmin, bills, documents, tenantId, tenants, currentMonth, currentYear }: UtilitiesProps) {
  const [utilType, setUtilType] = useState<UtilType>("electric");
  const [allBills, setAllBills] = useState(bills);
  const [allDocs, setAllDocs] = useState(documents);
  const [allTenants, setAllTenants] = useState(tenants);
  const [shareDraft, setShareDraft] = useState<Record<number, string>>({});
  const [savingShareId, setSavingShareId] = useState<number | null>(null);

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

  // Only residents active at some point during the viewed period (plus
  // placeholders, which always reserve a share) count toward that period's
  // split — a resident who moved out before this period, or hasn't moved in
  // yet, shouldn't shoulder or dilute a bill they weren't around for.
  const periodTenants = useMemo(() => {
    const periodStart = new Date(splitYear, splitMonth - 1, 1);
    return allTenants.filter((t) => t.isPlaceholder || isActiveForPeriod(t, periodStart));
  }, [allTenants, splitYear, splitMonth]);

  // Bill selected for split/document view
  const splitBill = billMap.get(`${splitMonth}-${splitYear}`) ?? null;
  const splitBillAmount = splitBill ? ((splitBill[utilType as keyof BillRow] as number) ?? 0) : 0;
  const totalShares = periodTenants.reduce((sum, t) => sum + t.utilityShare, 0);
  const myPeriodTenant = periodTenants.find((t) => t.id === tenantId);
  const myShare = myPeriodTenant?.utilityShare ?? null;
  const myBill = myShare != null && totalShares > 0 ? (splitBillAmount * myShare) / totalShares : null;

  const handleShareSave = async (tenant: { id: number }, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) return;
    setSavingShareId(tenant.id);
    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utilityShare: value }),
    });
    if (res.ok) {
      setAllTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, utilityShare: value } : t)));
    }
    setSavingShareId(null);
  };

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

  return {
    isAdmin, tenantId,
    utilType, setUtilType,
    allTenants: periodTenants,
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
  };
}
