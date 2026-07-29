"use client";

import { useRef } from "react";
import type { RoomsAdminData } from "@/lib/rooms-admin-data";
import { useRoomsAdmin } from "@/hooks/useRoomsAdmin";

const inputClass =
  "w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange";
const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

export default function RoomsAdminClient({ rooms: initialRooms, tenants: initialTenants }: RoomsAdminData) {
  const {
    rooms,
    showAddModal, setShowAddModal, addForm, setAddForm, adding, addError,
    editingRoom, setEditingRoom, editForm, setEditForm, saving, saveError,
    deletingId,
    assigningRoomId, setAssigningRoomId, assignTenantId, setAssignTenantId, assigning,
    uploadingRoomId, deletingImageId,
    availableTenants,
    handleAddRoom, openEdit, handleSaveEdit, handleDeleteRoom,
    openAssign, handleAssign, handleUnassign,
    handleUploadImage, handleDeleteImage,
  } = useRoomsAdmin({ rooms: initialRooms, tenants: initialTenants });

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Room Layout</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Room numbers, who's assigned, and photos</p>
        </div>
        <button
          onClick={() => { setAddForm({ roomNumber: "", notes: "" }); setShowAddModal(true); }}
          className="text-sm px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md font-medium transition-colors"
        >
          + Add Room
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {rooms.map((room) => (
          <div key={room.id} className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Room {room.roomNumber}</h2>
                {room.notes && <p className="text-xs text-gray-400 mt-0.5">{room.notes}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(room)} className="text-xs px-2.5 py-1 bg-meadowMuted dark:bg-darkBorder text-gray-700 dark:text-gray-300 rounded-md font-medium">
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteRoom(room)}
                  disabled={deletingId === room.id}
                  className="text-xs px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md font-medium disabled:opacity-50"
                >
                  {deletingId === room.id ? "…" : "Delete"}
                </button>
              </div>
            </div>

            {/* Assigned residents */}
            <div className="flex flex-wrap items-center gap-1.5">
              {room.assignedTenants.length === 0 && <span className="text-xs text-gray-400">No one assigned</span>}
              {room.assignedTenants.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-medium">
                  {t.name}
                  <button onClick={() => handleUnassign(room, t.id)} className="text-purple-400 hover:text-purple-700 dark:hover:text-purple-200 font-bold" title="Unassign">
                    &times;
                  </button>
                </span>
              ))}
              <button
                onClick={() => openAssign(room)}
                className="text-xs px-2.5 py-1 bg-meadowMuted dark:bg-darkBorder text-gray-600 dark:text-gray-300 rounded-full font-medium"
              >
                + Assign
              </button>
            </div>

            {/* Images */}
            <div className="flex flex-wrap gap-2">
              {room.images.map((img) => (
                <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-meadowBorder dark:border-darkBorder group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/rooms/${room.id}/images/${img.id}/file`} alt={`Room ${room.roomNumber}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDeleteImage(room, img.id)}
                    disabled={deletingImageId === img.id}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                    title="Remove photo"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRefs.current[room.id]?.click()}
                disabled={uploadingRoomId === room.id}
                className="w-20 h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-meadowBorder dark:border-darkBorder text-gray-400 text-xs font-medium hover:border-meadowOrange hover:text-meadowOrange transition-colors disabled:opacity-50"
              >
                {uploadingRoomId === room.id ? "…" : "+ Photo"}
              </button>
              <input
                ref={(el) => { fileInputRefs.current[room.id] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadImage(room, file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder">
            No rooms yet. Add one to get started.
          </div>
        )}
      </div>

      {/* ─── Add Room Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Room</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Room Number</label>
                <input type="text" value={addForm.roomNumber} onChange={(e) => setAddForm((p) => ({ ...p, roomNumber: e.target.value }))} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea rows={2} value={addForm.notes} onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputClass} resize-none`} />
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <div className="flex gap-3">
                <button onClick={handleAddRoom} disabled={adding || !addForm.roomNumber}
                  className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                  {adding ? "Adding…" : "Add Room"}
                </button>
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Room Modal ─── */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Edit Room</h2>
              <button onClick={() => setEditingRoom(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Room Number</label>
                <input type="text" value={editForm.roomNumber} onChange={(e) => setEditForm((p) => ({ ...p, roomNumber: e.target.value }))} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputClass} resize-none`} />
              </div>
              {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
              <div className="flex gap-3">
                <button onClick={handleSaveEdit} disabled={saving || !editForm.roomNumber}
                  className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditingRoom(null)}
                  className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Modal ─── */}
      {assigningRoomId != null && (() => {
        const room = rooms.find((r) => r.id === assigningRoomId);
        if (!room) return null;
        const choices = availableTenants(room);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Assign to Room {room.roomNumber}</h2>
                <button onClick={() => setAssigningRoomId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
              </div>
              {choices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No other residents available to assign.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Resident</label>
                    <select value={assignTenantId} onChange={(e) => setAssignTenantId(e.target.value)} className={inputClass}>
                      <option value="">Select a resident…</option>
                      {choices.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}{t.isPlaceholder ? " (placeholder)" : ""}{t.roomNumber ? ` — currently Room ${t.roomNumber}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleAssign} disabled={assigning || !assignTenantId}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                      {assigning ? "Assigning…" : "Assign"}
                    </button>
                    <button onClick={() => setAssigningRoomId(null)}
                      className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
