"use client";

import { useEffect, useState } from "react";
import type {
  PersonalInventoryItem,
  PersonalInventoryItemInput,
  SharedPersonalInventoryItem,
} from "@/lib/personal-inventory";

const EMPTY_FORM: PersonalInventoryItemInput = {
  name: "",
  quantity: null,
  unit: null,
  category: null,
  description: null,
  expirationDate: null,
  lowStockThreshold: null,
};

interface Roommate {
  id: number;
  name: string;
}

export function usePersonalInventory() {
  const [items, setItems] = useState<PersonalInventoryItem[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedPersonalInventoryItem[]>([]);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PersonalInventoryItemInput>(EMPTY_FORM);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [sharingId, setSharingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory-personal").then((r) => r.json()),
      fetch("/api/inventory-personal/roommates").then((r) => r.json()),
    ])
      .then(([listBody, roommateBody]) => {
        setItems(listBody.own);
        setSharedWithMe(listBody.sharedWithMe);
        setRoommates(roommateBody);
      })
      .finally(() => setLoading(false));
  }, []);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (item: PersonalInventoryItem) => {
    setForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      description: item.description,
      expirationDate: item.expirationDate ? item.expirationDate.slice(0, 10) : null,
      lowStockThreshold: item.lowStockThreshold,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setError(null);
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    quantity: form.quantity,
    unit: form.unit?.trim() || null,
    category: form.category?.trim() || null,
    description: form.description?.trim() || null,
    expirationDate: form.expirationDate ? new Date(form.expirationDate).toISOString() : null,
    lowStockThreshold: form.lowStockThreshold,
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    const isEdit = editingId !== null;
    setSavingId(isEdit ? editingId : "new");

    const res = await fetch(isEdit ? `/api/inventory-personal/${editingId}` : "/api/inventory-personal", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });

    setSavingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Failed to save item");
      return;
    }

    const saved: PersonalInventoryItem = await res.json();
    setItems((prev) => {
      // PATCH's response doesn't recompute sharedWith, so carry the
      // existing value forward on edit instead of dropping it to [].
      if (isEdit) return prev.map((i) => (i.id === saved.id ? { ...saved, sharedWith: i.sharedWith } : i));
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    setSavingId(id);
    const res = await fetch(`/api/inventory-personal/${id}`, { method: "DELETE" });
    setSavingId(null);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleShareChange = async (id: number, tenantIds: number[]) => {
    setSharingId(id);
    const res = await fetch(`/api/inventory-personal/${id}/share`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantIds }),
    });
    setSharingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Failed to update sharing");
      return;
    }
    const sharedWith: { tenantId: number; name: string }[] = await res.json();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, sharedWith } : i)));
  };

  return {
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
  };
}
