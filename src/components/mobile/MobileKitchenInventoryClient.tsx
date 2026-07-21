"use client";

import { useKitchenInventory } from "@/hooks/useKitchenInventory";
import { CATEGORY_ORDER, CATEGORY_ICONS } from "@/lib/inventory";
import LevelBar from "@/components/inventory/LevelBar";
import MobileCard from "./MobileCard";
import MobileBottomSheet from "./MobileBottomSheet";

export default function MobileKitchenInventoryClient() {
  const {
    loading,
    runOutList,
    showRunOut,
    setShowRunOut,
    showAddItem,
    setShowAddItem,
    newName,
    setNewName,
    savingId,
    buzzingId,
    resolvingId,
    fetchRunOut,
    handleLevelChange,
    handleBuzz,
    handleAddItem,
    handleResolve,
    grouped,
  } = useKitchenInventory();

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading inventory…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { fetchRunOut(); setShowRunOut(true); }}
          className="flex-1 px-4 py-2.5 text-sm font-medium border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl bg-white dark:bg-darkCard active:scale-[0.98] transition-transform"
        >
          📋 Run-out List
        </button>
        <button
          onClick={() => setShowAddItem(true)}
          className="flex-1 px-4 py-2.5 text-sm font-medium bg-meadowOrange text-white rounded-xl active:scale-[0.98] transition-transform"
        >
          + Add Item
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500 inline-block" />&gt;50%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-400 inline-block" />20–50%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" />&lt;20%</span>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const catItems = grouped[cat] ?? [];
        if (catItems.length === 0) return null;
        return (
          <div key={cat} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <span>{CATEGORY_ICONS[cat]}</span> {cat}
            </h2>
            {catItems.map((item) => (
              <MobileCard key={item.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon ?? "📦"}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</span>
                  </div>
                  {savingId === item.id && (
                    <span className="text-xs text-gray-400">saving…</span>
                  )}
                </div>
                <LevelBar size="lg" level={item.level} onChange={(v) => handleLevelChange(item, v)} />
                <button
                  onClick={() => handleBuzz(item)}
                  disabled={buzzingId === item.id}
                  className="mt-3 w-full py-2 text-xs font-medium bg-red-50 active:bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                >
                  {buzzingId === item.id ? "Buzzing…" : "📢 Buzz!"}
                </button>
              </MobileCard>
            ))}
          </div>
        );
      })}

      <MobileBottomSheet open={showAddItem} onClose={() => setShowAddItem(false)} title="Add Custom Item">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Item name (e.g. Vinegar)"
          className="w-full px-3 py-2.5 rounded-xl border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange mb-4"
          onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
        />
        <div className="flex gap-3">
          <button onClick={handleAddItem}
            className="flex-1 py-2.5 bg-meadowOrange text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-transform">
            Add
          </button>
          <button onClick={() => setShowAddItem(false)}
            className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-xl text-sm">
            Cancel
          </button>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={showRunOut}
        onClose={() => setShowRunOut(false)}
        title={`Run-out List${runOutList.length > 0 ? ` · ${runOutList.length}` : ""}`}
      >
        {runOutList.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">Everything is stocked! 🎉</p>
        ) : (
          <div className="flex flex-col gap-2">
            {runOutList.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-meadowBorder dark:border-darkBorder bg-meadowLight dark:bg-darkSurface">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{r.itemName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(r.reportedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => handleResolve(r.id)}
                  disabled={resolvingId === r.id}
                  className="text-xs px-3 py-1.5 bg-green-100 active:bg-green-200 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {resolvingId === r.id ? "…" : "Resolve"}
                </button>
              </div>
            ))}
          </div>
        )}
      </MobileBottomSheet>
    </div>
  );
}
