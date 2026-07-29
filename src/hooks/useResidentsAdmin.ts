"use client";

import { useState } from "react";
import {
  emptyAddForm,
  type AddPlaceholderForm,
  type EditForm,
  type MaintenanceReq,
  type TenantRow,
} from "@/lib/residents-admin";

interface Props {
  tenants: TenantRow[];
  pendingMap: Record<number, number>;
}

export function useResidentsAdmin({ tenants: initialTenants, pendingMap: initialPendingMap }: Props) {
  const [tenants, setTenants] = useState(initialTenants);
  const [pendingMap] = useState(initialPendingMap);
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", nickname: "", dob: "", gender: "MALE", roomNumber: "", phone: "", email: "", notes: "", rentAmount: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // View requests state
  const [viewRequestsTenant, setViewRequestsTenant] = useState<TenantRow | null>(null);
  const [tenantRequests, setTenantRequests] = useState<MaintenanceReq[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Add placeholder state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddPlaceholderForm>(emptyAddForm);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete placeholder state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Deactivate state
  const [deactivatingTenant, setDeactivatingTenant] = useState<TenantRow | null>(null);
  const [deactivationDate, setDeactivationDate] = useState<string>("");

  // Assign-to-placeholder state
  const [assigningTenant, setAssigningTenant] = useState<TenantRow | null>(null);
  const [assignPlaceholderId, setAssignPlaceholderId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const openEdit = (t: TenantRow) => {
    setEditingTenant(t);
    setEditForm({
      name: t.name,
      nickname: t.nickname ?? "",
      dob: t.dob ? new Date(t.dob).toISOString().split("T")[0] : "",
      gender: t.gender,
      roomNumber: t.roomNumber ?? "",
      phone: t.phone ?? "",
      email: t.email ?? "",
      notes: t.notes ?? "",
      rentAmount: t.rentAmount != null ? String(t.rentAmount) : "",
    });
    setSaveError(null);
  };

  const updateForm = (field: keyof EditForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setEditForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSaveEdit = async () => {
    if (!editingTenant) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/tenants/${editingTenant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        nickname: editForm.nickname || null,
        dob: editForm.dob || null,
        gender: editForm.gender,
        roomNumber: editForm.roomNumber || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        notes: editForm.notes || null,
        rentAmount: editForm.rentAmount === "" ? null : Number(editForm.rentAmount),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      setEditingTenant(null);
    } else {
      const d = await res.json();
      setSaveError(d.error ?? "Failed to save");
    }
  };

  const handleToggleStatus = async (t: TenantRow) => {
    if (t.isActive) {
      setDeactivatingTenant(t);
      setDeactivationDate(new Date().toISOString().split("T")[0]);
      return;
    }
    setTogglingId(t.id);
    const res = await fetch(`/api/tenants/${t.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    setTogglingId(null);
    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) => prev.map((row) => (row.id === updated.id ? { ...row, isActive: updated.isActive, deactivatedAt: updated.deactivatedAt } : row)));
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingTenant || !deactivationDate) return;
    setTogglingId(deactivatingTenant.id);
    const res = await fetch(`/api/tenants/${deactivatingTenant.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false, deactivatedAt: deactivationDate }),
    });
    setTogglingId(null);
    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) => prev.map((row) => (row.id === updated.id ? { ...row, isActive: updated.isActive, deactivatedAt: updated.deactivatedAt } : row)));
      setDeactivatingTenant(null);
    }
  };

  const handleAddPlaceholder = async () => {
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addForm.name,
        gender: addForm.gender,
        roomNumber: addForm.roomNumber || null,
        notes: addForm.notes || null,
        rentAmount: addForm.rentAmount === "" ? null : Number(addForm.rentAmount),
      }),
    });
    setAdding(false);
    if (res.ok) {
      const created = await res.json();
      setTenants((prev) => [...prev, { ...created, isPlaceholder: true }].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddModal(false);
      setAddForm(emptyAddForm);
    } else {
      const d = await res.json();
      setAddError(d.error ?? "Failed to add placeholder");
    }
  };

  const handleDeletePlaceholder = async (t: TenantRow) => {
    if (!window.confirm(`Delete placeholder "${t.name}"? This cannot be undone.`)) return;
    setDeletingId(t.id);
    const res = await fetch(`/api/tenants/${t.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setTenants((prev) => prev.filter((row) => row.id !== t.id));
    } else {
      const message = await res.json().then((d) => d.error, () => null);
      window.alert(message ?? `Failed to delete (${res.status})`);
    }
  };

  const openAssign = (t: TenantRow) => {
    setAssigningTenant(t);
    setAssignPlaceholderId("");
    setAssignError(null);
  };

  const handleAssign = async () => {
    if (!assigningTenant || !assignPlaceholderId) return;
    setAssigning(true);
    setAssignError(null);
    const res = await fetch(`/api/tenants/${assigningTenant.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeholderTenantId: Number(assignPlaceholderId) }),
    });
    setAssigning(false);
    if (res.ok) {
      const merged = await res.json();
      setTenants((prev) =>
        prev
          .filter((row) => row.id !== Number(assignPlaceholderId))
          .map((row) => (row.id === merged.id ? { ...row, ...merged } : row))
      );
      setAssigningTenant(null);
    } else {
      const d = await res.json();
      setAssignError(d.error ?? "Failed to assign");
    }
  };

  const openViewRequests = async (t: TenantRow) => {
    setViewRequestsTenant(t);
    setLoadingRequests(true);
    const res = await fetch(`/api/maintenance-requests?tenantId=${t.id}`);
    setLoadingRequests(false);
    if (res.ok) {
      const data = await res.json();
      setTenantRequests(data.filter((r: MaintenanceReq) => r.status !== "RESOLVED"));
    }
  };

  const handleResolve = async (requestId: number) => {
    setResolvingId(requestId);
    const res = await fetch(`/api/maintenance-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    setResolvingId(null);
    if (res.ok) {
      setTenantRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  return {
    tenants,
    pendingMap,
    editingTenant,
    setEditingTenant,
    editForm,
    setEditForm,
    saving,
    saveError,
    togglingId,
    viewRequestsTenant,
    setViewRequestsTenant,
    tenantRequests,
    loadingRequests,
    resolvingId,
    showAddModal,
    setShowAddModal,
    addForm,
    setAddForm,
    adding,
    addError,
    setAddError,
    deletingId,
    deactivatingTenant,
    setDeactivatingTenant,
    deactivationDate,
    setDeactivationDate,
    handleConfirmDeactivate,
    assigningTenant,
    setAssigningTenant,
    assignPlaceholderId,
    setAssignPlaceholderId,
    assigning,
    assignError,
    openEdit,
    updateForm,
    handleSaveEdit,
    handleToggleStatus,
    handleAddPlaceholder,
    handleDeletePlaceholder,
    openAssign,
    handleAssign,
    openViewRequests,
    handleResolve,
  };
}
