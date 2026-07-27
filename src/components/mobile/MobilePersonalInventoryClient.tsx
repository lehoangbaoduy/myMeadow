"use client";

import { usePersonalInventory } from "@/hooks/usePersonalInventory";
import { isLowStock, isExpiringSoon, isExpired } from "@/lib/personal-inventory";
import MobileCard from "./MobileCard";
import MobileBottomSheet from "./MobileBottomSheet";

export default function MobilePersonalInventoryClient() {
  const {
    items,
    loading,
    error,
    showForm,
    editingId,
    form,
    setForm,
    savingId,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    handleDelete,
  } = usePersonalInventory();

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading your inventory…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">My Inventory</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Only you can see and edit these.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-3 py-2 text-xs font-medium bg-meadowOrange hover:bg-orange-600 text-white rounded-xl transition-colors active:scale-[0.98]"
        >
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-10 text-gray-400 text-sm">No items yet. Add your first one above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <MobileCard key={item.id}>
              <div className="flex items-start justify-between mb-1">
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
              {item.description && <p className="text-xs text-gray-400 mb-2">{item.description}</p>}
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
              <div className="flex gap-2">
                <button
                  onClick={() => openEditForm(item)}
                  className="flex-1 py-1.5 text-xs font-medium border border-meadowBorder dark:border-darkBorder text-gray-600 dark:text-gray-300 rounded-md active:scale-[0.98] transition-transform"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={savingId === item.id}
                  className="flex-1 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md disabled:opacity-50"
                >
                  {savingId === item.id ? "…" : "Delete"}
                </button>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      <MobileBottomSheet open={showForm} onClose={closeForm} title={editingId !== null ? "Edit Item" : "Add Item"}>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={form.quantity ?? ""}
              onChange={(e) => setForm({ ...form, quantity: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="Quantity"
              className="w-1/2 px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
            />
            <input
              type="text"
              value={form.unit ?? ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value || null })}
              placeholder="Unit"
              className="w-1/2 px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
            />
          </div>
          <input
            type="text"
            value={form.category ?? ""}
            onChange={(e) => setForm({ ...form, category: e.target.value || null })}
            placeholder="Category (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
          />
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value || null })}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange resize-none"
          />
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Expires</label>
              <input
                type="date"
                value={form.expirationDate ?? ""}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value || null })}
                className="w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Low stock at</label>
              <input
                type="number"
                value={form.lowStockThreshold ?? ""}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={savingId !== null}
            className="w-full py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {savingId !== null ? "Saving…" : editingId !== null ? "Save" : "Add"}
          </button>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
