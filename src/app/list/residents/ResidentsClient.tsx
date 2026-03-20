"use client";

import { useState } from "react";

interface TenantRow {
  id: number;
  name: string;
  nickname: string | null;
  dob: Date | null;
  gender: string;
  roomNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface MaintenanceReq {
  id: number;
  requestType: string;
  description: string;
  status: string;
  createdAt: string;
  tenant?: { name: string };
}

interface Props {
  tenants: TenantRow[];
  pendingMap: Record<number, number>;
}

interface EditForm {
  name: string;
  nickname: string;
  dob: string;
  gender: string;
  roomNumber: string;
  notes: string;
}

const inputClass =
  "w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange";
const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

export default function ResidentsClient({ tenants: initialTenants, pendingMap: initialPendingMap }: Props) {
  const [tenants, setTenants] = useState(initialTenants);
  const [pendingMap] = useState(initialPendingMap);
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", nickname: "", dob: "", gender: "MALE", roomNumber: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // View requests state
  const [viewRequestsTenant, setViewRequestsTenant] = useState<TenantRow | null>(null);
  const [tenantRequests, setTenantRequests] = useState<MaintenanceReq[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const openEdit = (t: TenantRow) => {
    setEditingTenant(t);
    setEditForm({
      name: t.name,
      nickname: t.nickname ?? "",
      dob: t.dob ? new Date(t.dob).toISOString().split("T")[0] : "",
      gender: t.gender,
      roomNumber: t.roomNumber ?? "",
      notes: t.notes ?? "",
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
        notes: editForm.notes || null,
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
    setTogglingId(t.id);
    const res = await fetch(`/api/tenants/${t.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    setTogglingId(null);
    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) => prev.map((row) => (row.id === updated.id ? { ...row, isActive: updated.isActive } : row)));
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

  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Residents</h1>
      </div>

      <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="bg-meadowMuted dark:bg-darkSurface text-gray-600 dark:text-gray-400 text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Nickname</th>
              <th className="px-4 py-3 font-semibold">Date of Birth</th>
              <th className="px-4 py-3 font-semibold">Gender</th>
              <th className="px-4 py-3 font-semibold">Room</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant, idx) => (
              <tr
                key={tenant.id}
                className={`border-t border-meadowBorder dark:border-darkBorder ${
                  idx % 2 === 0 ? "bg-white dark:bg-darkCard" : "bg-meadowLight dark:bg-darkSurface"
                } ${!tenant.isActive ? "opacity-60" : ""}`}
              >
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                  <div className="flex items-center gap-1.5">
                    {tenant.name}
                    {(pendingMap[tenant.id] ?? 0) > 0 && (
                      <span className="inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex-shrink-0" title={`${pendingMap[tenant.id]} pending request(s)`}>
                        !
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{tenant.nickname ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(tenant.dob)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    tenant.gender === "MALE"
                      ? "bg-sky text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "bg-yellow text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  }`}>
                    {tenant.gender === "MALE" ? "Male" : "Female"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{tenant.roomNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    tenant.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                  }`}>
                    {tenant.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openViewRequests(tenant)}
                      className="relative text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium"
                    >
                      View Requests
                      {(pendingMap[tenant.id] ?? 0) > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                          {pendingMap[tenant.id]}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(tenant)}
                      className="text-xs px-3 py-1.5 bg-meadowMuted dark:bg-darkBorder text-gray-700 dark:text-gray-300 rounded-md hover:bg-orange-200 dark:hover:bg-darkCard transition-colors font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(tenant)}
                      disabled={togglingId === tenant.id}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${
                        tenant.isActive
                          ? "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-400"
                          : "bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-400"
                      }`}
                    >
                      {togglingId === tenant.id ? "…" : tenant.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tenants.length === 0 && (
          <div className="text-center py-12 text-gray-400">No residents yet.</div>
        )}
      </div>

      {/* ─── Edit Modal ─── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Edit Resident</h2>
              <button onClick={() => setEditingTenant(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" value={editForm.name} onChange={updateForm("name")} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nickname</label>
                <input type="text" value={editForm.nickname} onChange={updateForm("nickname")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" value={editForm.dob} onChange={updateForm("dob")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select value={editForm.gender} onChange={updateForm("gender")} className={inputClass}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Room Number</label>
                <input type="text" value={editForm.roomNumber} onChange={updateForm("roomNumber")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea rows={3} value={editForm.notes} onChange={updateForm("notes")} className={`${inputClass} resize-none`} />
              </div>
              {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
              <div className="flex gap-3">
                <button onClick={handleSaveEdit} disabled={saving}
                  className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditingTenant(null)}
                  className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── View Requests Modal ─── */}
      {viewRequestsTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Requests — {viewRequestsTenant.name}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Non-resolved maintenance requests</p>
              </div>
              <button onClick={() => setViewRequestsTenant(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>

            {loadingRequests ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : tenantRequests.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No open requests 🎉</div>
            ) : (
              <div className="flex flex-col gap-3">
                {tenantRequests.map((r) => (
                  <div key={r.id} className="p-4 rounded-lg border border-meadowBorder dark:border-darkBorder bg-meadowLight dark:bg-darkSurface">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-meadowOrange">{r.requestType}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{r.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 font-medium">
                          {r.status}
                        </span>
                        <button
                          onClick={() => handleResolve(r.id)}
                          disabled={resolvingId === r.id}
                          className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-400 rounded-md font-medium transition-colors disabled:opacity-50"
                        >
                          {resolvingId === r.id ? "…" : "Resolve"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setViewRequestsTenant(null)}
              className="mt-5 w-full py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
