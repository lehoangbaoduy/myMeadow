"use client";

import { useEffect, useState } from "react";
import { CATEGORY_ORDER, type InventoryItem, type RunOutEntry } from "@/lib/inventory";

export function useKitchenInventory() {
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

  return {
    items,
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
  };
}
