"use client";

import { useEffect, useRef, useState } from "react";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  icon: string | null;
  level: number;
  isCustom: boolean;
}

interface RunOutEntry {
  id: number;
  itemName: string;
  reportedAt: string;
}

function LevelBar({ level, onChange }: { level: number; onChange: (v: number) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const pct = Math.round(level * 100);
  const fillColor = level > 0.5 ? "#22c55e" : level > 0.2 ? "#fb923c" : "#ef4444";

  const computeLevel = (clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 100) / 100);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    computeLevel(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) computeLevel(e.clientX);
  };

  return (
    <div
      ref={barRef}
      className="relative w-full h-5 bg-gray-200 dark:bg-darkBorder rounded-full cursor-ew-resize select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <div
        className="h-full rounded-full transition-all duration-75"
        style={{ width: `${pct}%`, backgroundColor: fillColor }}
      />
      {/* Label */}
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold pointer-events-none"
        style={{ color: pct > 20 ? "white" : "#374151", textShadow: pct > 20 ? "0 0 3px rgba(0,0,0,0.35)" : "none" }}
      >
        {pct}%
      </span>
    </div>
  );
}

const CATEGORY_ORDER = ["Cooking", "Household", "Cleaning", "Laundry", "Custom"];

export default function KitchenInventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runOutList, setRunOutList] = useState<RunOutEntry[]>([]);
  const [showRunOut, setShowRunOut] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [buzzingId, setBuzzingId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const fetchRunOut = async () => {
    const res = await fetch("/api/inventory/runout");
    const data = await res.json();
    setRunOutList(data);
  };

  const handleLevelChange = async (item: InventoryItem, newLevel: number) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, level: newLevel } : i)));
    setSavingId(item.id);
    await fetch(`/api/inventory/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: newLevel }),
    });
    setSavingId(null);
  };

  const handleBuzz = async (item: InventoryItem) => {
    setBuzzingId(item.id);
    // Auto-set level to 0
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, level: 0 } : i)));
    await fetch(`/api/inventory/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: 0 }),
    });
    await fetch("/api/inventory/runout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemName: item.name }),
    });
    setBuzzingId(null);
  };

  const handleAddItem = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const newItem = await res.json();
      setItems((prev) => [...prev, newItem]);
      setNewName("");
      setShowAddItem(false);
    }
  };

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    await fetch("/api/inventory/runout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRunOutList((prev) => prev.filter((r) => r.id !== id));
    setResolvingId(null);
  };

  const grouped = CATEGORY_ORDER.reduce<Record<string, InventoryItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  const categoryIcons: Record<string, string> = {
    Cooking: "🍳",
    Household: "🏠",
    Cleaning: "✨",
    Laundry: "🫧",
    Custom: "📦",
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading inventory…</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kitchen & Household Inventory</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchRunOut(); setShowRunOut(true); }}
            className="px-4 py-2 text-sm font-medium border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md hover:bg-meadowMuted dark:hover:bg-darkCard transition-colors"
          >
            📋 Run-out List
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="px-4 py-2 text-sm font-medium bg-meadowOrange hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" />Well stocked (&gt;50%)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" />Running low (20–50%)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Almost out (&lt;20%)</span>
      </div>

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const catItems = grouped[cat] ?? [];
        if (catItems.length === 0) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>{categoryIcons[cat]}</span> {cat}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon ?? "📦"}</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</span>
                    </div>
                    {savingId === item.id && (
                      <span className="text-xs text-gray-400">saving…</span>
                    )}
                  </div>
                  <LevelBar
                    level={item.level}
                    onChange={(v) => handleLevelChange(item, v)}
                  />
                  <button
                    onClick={() => handleBuzz(item)}
                    disabled={buzzingId === item.id}
                    className="mt-3 w-full py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md transition-colors disabled:opacity-50"
                  >
                    {buzzingId === item.id ? "Buzzing…" : "📢 Buzz!"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Custom Item</h2>
              <button onClick={() => setShowAddItem(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Item name (e.g. Vinegar)"
              className="w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange mb-4"
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            />
            <div className="flex gap-3">
              <button onClick={handleAddItem}
                className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors">
                Add
              </button>
              <button onClick={() => setShowAddItem(false)}
                className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run-out List Modal */}
      {showRunOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Run-out List
                {runOutList.length > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-full">
                    {runOutList.length} item{runOutList.length > 1 ? "s" : ""}
                  </span>
                )}
              </h2>
              <button onClick={() => setShowRunOut(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            {runOutList.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">Everything is stocked! 🎉</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-meadowMuted dark:bg-darkSurface text-gray-600 dark:text-gray-400 text-left">
                    <th className="px-3 py-2 font-semibold rounded-l-md">Item</th>
                    <th className="px-3 py-2 font-semibold">Reported</th>
                    <th className="px-3 py-2 font-semibold rounded-r-md">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {runOutList.map((r) => (
                    <tr key={r.id} className="border-t border-meadowBorder dark:border-darkBorder">
                      <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-100">{r.itemName}</td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(r.reportedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleResolve(r.id)}
                          disabled={resolvingId === r.id}
                          className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-400 rounded-md font-medium transition-colors disabled:opacity-50"
                        >
                          {resolvingId === r.id ? "…" : "Resolve"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setShowRunOut(false)}
              className="mt-5 w-full py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
