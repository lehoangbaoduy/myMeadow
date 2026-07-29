"use client";

import { useResidentsAdmin } from "@/hooks/useResidentsAdmin";
import { emptyAddForm, formatDate, type TenantRow } from "@/lib/residents-admin";
import MobileCard from "./MobileCard";
import MobileBottomSheet from "./MobileBottomSheet";

interface Props {
  tenants: TenantRow[];
  pendingMap: Record<number, number>;
}

const inputClass =
  "w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange";
const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

export default function MobileResidentsClient({ tenants: initialTenants, pendingMap: initialPendingMap }: Props) {
  const {
    tenants, pendingMap,
    editingTenant, setEditingTenant, editForm, setEditForm, saving, saveError, togglingId,
    viewRequestsTenant, setViewRequestsTenant, tenantRequests, loadingRequests, resolvingId,
    showAddModal, setShowAddModal, addForm, setAddForm, adding, addError, setAddError,
    deletingId,
    deactivatingTenant, setDeactivatingTenant, deactivationDate, setDeactivationDate, handleConfirmDeactivate,
    assigningTenant, setAssigningTenant, assignPlaceholderId, setAssignPlaceholderId, assigning, assignError,
    openEdit, updateForm, handleSaveEdit, handleToggleStatus,
    handleAddPlaceholder, handleDeletePlaceholder,
    openAssign, handleAssign, openViewRequests, handleResolve,
  } = useResidentsAdmin({ tenants: initialTenants, pendingMap: initialPendingMap });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Residents</h1>
        <button
          onClick={() => { setAddForm(emptyAddForm); setAddError(null); setShowAddModal(true); }}
          className="text-xs px-3.5 py-2 bg-meadowOrange text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
        >
          + Add
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {tenants.map((tenant) => (
          <MobileCard key={tenant.id} className={!tenant.isActive ? "opacity-60" : ""}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{tenant.name}</span>
                  {tenant.isPlaceholder && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      Placeholder
                    </span>
                  )}
                  {(pendingMap[tenant.id] ?? 0) > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full">
                      {pendingMap[tenant.id]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    tenant.gender === "MALE"
                      ? "bg-sky text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "bg-yellow text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  }`}>
                    {tenant.gender === "MALE" ? "Male" : "Female"}
                  </span>
                  {tenant.roomNumber && <span className="text-[11px] text-gray-400">Room {tenant.roomNumber}</span>}
                  <span className="text-[11px] text-gray-400">{formatDate(tenant.dob)}</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                tenant.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              }`}>
                {tenant.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-2">
              <button
                onClick={() => openViewRequests(tenant)}
                className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg font-medium"
              >
                Requests
              </button>
              <button
                onClick={() => openEdit(tenant)}
                className="text-xs px-3 py-1.5 bg-meadowMuted dark:bg-darkBorder text-gray-700 dark:text-gray-300 rounded-lg font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleStatus(tenant)}
                disabled={togglingId === tenant.id}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${
                  tenant.isActive
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                }`}
              >
                {togglingId === tenant.id ? "…" : tenant.isActive ? "Deactivate" : "Activate"}
              </button>
              {tenant.isPlaceholder && (
                <button
                  onClick={() => handleDeletePlaceholder(tenant)}
                  disabled={deletingId === tenant.id}
                  className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium disabled:opacity-50"
                >
                  {deletingId === tenant.id ? "…" : "Delete"}
                </button>
              )}
              {!tenant.isPlaceholder && !tenant.roomNumber && (
                <button
                  onClick={() => openAssign(tenant)}
                  className="text-xs px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg font-medium"
                >
                  Assign Room
                </button>
              )}
            </div>
          </MobileCard>
        ))}
        {tenants.length === 0 && (
          <p className="text-center py-12 text-gray-400 text-sm">No residents yet.</p>
        )}
      </div>

      {/* ─── Edit Sheet ─── */}
      <MobileBottomSheet open={!!editingTenant} onClose={() => setEditingTenant(null)} title="Edit Resident">
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
            <label className={labelClass}>Phone</label>
            <input type="tel" value={editForm.phone} onChange={updateForm("phone")} placeholder="+1 555 000 0000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={editForm.email} onChange={updateForm("email")} placeholder="tenant@example.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea rows={3} value={editForm.notes} onChange={updateForm("notes")} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Monthly Rent ($)</label>
            <input type="number" min={0} step={0.01} value={editForm.rentAmount} onChange={updateForm("rentAmount")} placeholder="Leave blank to disable rent reminders" className={inputClass} />
          </div>
          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
          <div className="flex gap-3">
            <button onClick={handleSaveEdit} disabled={saving}
              className="flex-1 py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditingTenant(null)}
              className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* ─── Add Placeholder Sheet ─── */}
      <MobileBottomSheet open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Placeholder Resident">
        <p className="text-xs text-gray-400 mb-4">
          Reserves a room slot with no login. Once a new resident registers, use “Assign Room” on their card to fill this slot.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input type="text" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select value={addForm.gender} onChange={(e) => setAddForm((p) => ({ ...p, gender: e.target.value }))} className={inputClass}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Room Number</label>
            <input type="text" value={addForm.roomNumber} onChange={(e) => setAddForm((p) => ({ ...p, roomNumber: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Monthly Rent ($)</label>
            <input type="number" min={0} step={0.01} value={addForm.rentAmount} onChange={(e) => setAddForm((p) => ({ ...p, rentAmount: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea rows={3} value={addForm.notes} onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputClass} resize-none`} />
          </div>
          {addError && <p className="text-red-500 text-sm">{addError}</p>}
          <div className="flex gap-3">
            <button onClick={handleAddPlaceholder} disabled={adding || !addForm.name}
              className="flex-1 py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {adding ? "Adding…" : "Add Placeholder"}
            </button>
            <button onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* ─── Deactivate Sheet ─── */}
      <MobileBottomSheet
        open={!!deactivatingTenant}
        onClose={() => setDeactivatingTenant(null)}
        title={deactivatingTenant ? `Deactivate — ${deactivatingTenant.name}` : "Deactivate"}
      >
        <p className="text-xs text-gray-400 mb-4">
          Sets the date this resident moved out / stopped being active. Past bills up to and including this date will still count their share.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Deactivation date</label>
            <input type="date" value={deactivationDate} onChange={(e) => setDeactivationDate(e.target.value)} required className={inputClass} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleConfirmDeactivate} disabled={togglingId === deactivatingTenant?.id || !deactivationDate}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {togglingId === deactivatingTenant?.id ? "Deactivating…" : "Deactivate"}
            </button>
            <button onClick={() => setDeactivatingTenant(null)}
              className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* ─── Assign Room Sheet ─── */}
      <MobileBottomSheet
        open={!!assigningTenant}
        onClose={() => setAssigningTenant(null)}
        title={assigningTenant ? `Assign Room — ${assigningTenant.name}` : "Assign Room"}
      >
        {(() => {
          const placeholders = tenants.filter((t) => t.isPlaceholder);
          if (placeholders.length === 0) {
            return <p className="text-sm text-gray-500 dark:text-gray-400">No placeholder rooms available. Add one first.</p>;
          }
          return (
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Placeholder room</label>
                <select value={assignPlaceholderId} onChange={(e) => setAssignPlaceholderId(e.target.value)} className={inputClass}>
                  <option value="">Select a placeholder…</option>
                  {placeholders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.roomNumber ? ` — Room ${p.roomNumber}` : ""}{p.rentAmount != null ? ` — $${p.rentAmount}/mo` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {assignError && <p className="text-red-500 text-sm">{assignError}</p>}
              <div className="flex gap-3">
                <button onClick={handleAssign} disabled={assigning || !assignPlaceholderId}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {assigning ? "Assigning…" : "Assign"}
                </button>
                <button onClick={() => setAssigningTenant(null)}
                  className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}
      </MobileBottomSheet>

      {/* ─── View Requests Sheet ─── */}
      <MobileBottomSheet
        open={!!viewRequestsTenant}
        onClose={() => setViewRequestsTenant(null)}
        title={viewRequestsTenant ? `Requests — ${viewRequestsTenant.name}` : "Requests"}
      >
        {loadingRequests ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : tenantRequests.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No open requests 🎉</div>
        ) : (
          <div className="flex flex-col gap-3">
            {tenantRequests.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-meadowLight dark:bg-darkSurface">
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
                      className="text-xs px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg font-medium disabled:opacity-50"
                    >
                      {resolvingId === r.id ? "…" : "Resolve"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileBottomSheet>
    </div>
  );
}
