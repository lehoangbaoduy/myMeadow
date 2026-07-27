"use client";

import { useState } from "react";
import { usePersonalInventory } from "@/hooks/usePersonalInventory";
import { isLowStock, isExpiringSoon, isExpired } from "@/lib/personal-inventory";
import type { PersonalInventoryItem } from "@/lib/personal-inventory";

export default function PersonalInventoryClient() {
  const {
    items,
    sharedWithMe,
    roommates,
    loading,
    error,
    showForm,
    editingId,
    form,
    setForm,
    savingId,
    sharingId,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    handleDelete,
    handleShareChange,
  } = usePersonalInventory();

  const [sharingItem, setSharingItem] = useState<PersonalInventoryItem | null>(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState<number[]>([]);

  const openShare = (item: PersonalInventoryItem) => {
    setSharingItem(item);
    setSelectedTenantIds(item.sharedWith.map((s) => s.tenantId));
  };

  const saveShare = async () => {
    if (!sharingItem) return;
    await handleShareChange(sharingItem.id, selectedTenantIds);
    setSharingItem(null);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading your inventory…</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">My Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Only you can edit these — share individual items to let others view them.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 text-sm font-medium bg-meadowOrange hover:bg-orange-600 text-white rounded-md transition-colors"
        >
          + Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-12 text-gray-400 text-sm">No items yet. Add your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</span>
                {item.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-meadowMuted dark:bg-darkSurface text-gray-500 dark:text-gray-400">
                    {item.category}
                  </span>
                )}
              </div>

              {item.quantity !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Qty: <span className="font-semibold text-gray-700 dark:text-gray-200">{item.quantity}</span>
                  {item.unit && ` ${item.unit}`}
                </p>
              )}

              {item.description && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {isLowStock(item) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
                    Low stock
                  </span>
                )}
                {isExpired(item) ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                    Expired
                  </span>
                ) : (
                  isExpiringSoon(item) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">
                      Expires soon
                    </span>
                  )
                )}
              </div>

              {item.sharedWith.length > 0 && (
                <p className="text-[10px] text-gray-400 mb-3">
                  Shared with {item.sharedWith.map((s) => s.name).join(", ")}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => openShare(item)}
                  className="flex-1 py-1.5 text-xs font-medium border border-meadowBorder dark:border-darkBorder text-gray-600 dark:text-gray-300 rounded-md hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors"
                >
                  Share
                </button>
                <button
                  onClick={() => openEditForm(item)}
                  className="flex-1 py-1.5 text-xs font-medium border border-meadowBorder dark:border-darkBorder text-gray-600 dark:text-gray-300 rounded-md hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={savingId === item.id}
                  className="flex-1 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md transition-colors disabled:opacity-50"
                >
                  {savingId === item.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sharedWithMe.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Shared with you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sharedWithMe.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</span>
                  {item.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-meadowMuted dark:bg-darkSurface text-gray-500 dark:text-gray-400">
                      {item.category}
                    </span>
                  )}
                </div>
                {item.quantity !== null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Qty: <span className="font-semibold text-gray-700 dark:text-gray-200">{item.quantity}</span>
                    {item.unit && ` ${item.unit}`}
                  </p>
                )}
                {item.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.description}</p>}
                <p className="text-[10px] text-gray-400">Shared by {item.ownerName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {sharingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Share &quot;{sharingItem.name}&quot;</h2>
              <button onClick={() => setSharingItem(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            {roommates.length === 0 ? (
              <p className="text-sm text-gray-400">No other residents to share with.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {roommates.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedTenantIds.includes(r.id)}
                      onChange={(e) =>
                        setSelectedTenantIds((prev) =>
                          e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)
                        )
                      }
                      className="rounded border-meadowBorder dark:border-darkBorder text-meadowOrange focus:ring-meadowOrange"
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button
                onClick={saveShare}
                disabled={sharingId !== null}
                className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {sharingId !== null ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setSharingItem(null)}
                className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {editingId !== null ? "Edit Item" : "Add Item"}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.quantity ?? ""}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="Quantity"
                  className="w-1/2 px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
                />
                <input
                  type="text"
                  value={form.unit ?? ""}
                  onChange={(e) => setForm({ ...form, unit: e.target.value || null })}
                  placeholder="Unit (e.g. bottles)"
                  className="w-1/2 px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
                />
              </div>
              <input
                type="text"
                value={form.category ?? ""}
                onChange={(e) => setForm({ ...form, category: e.target.value || null })}
                placeholder="Category (optional)"
                className="w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
              />
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value || null })}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange resize-none"
              />
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Expires</label>
                  <input
                    type="date"
                    value={form.expirationDate ?? ""}
                    onChange={(e) => setForm({ ...form, expirationDate: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Low stock at</label>
                  <input
                    type="number"
                    value={form.lowStockThreshold ?? ""}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={savingId !== null}
                className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {savingId !== null ? "Saving…" : editingId !== null ? "Save" : "Add"}
              </button>
              <button
                onClick={closeForm}
                className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
