"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  PersonalInventoryItem,
  PersonalInventoryItemInput,
  PersonalInventoryList,
  SharedPersonalInventoryList,
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

type Selection = { type: "own" | "shared"; id: number } | null;

export function usePersonalInventory() {
  const [ownLists, setOwnLists] = useState<PersonalInventoryList[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedPersonalInventoryList[]>([]);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PersonalInventoryItemInput>(EMPTY_FORM);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [showListForm, setShowListForm] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [sharingListId, setSharingListId] = useState<number | null>(null);

  const fetchAll = async () => {
    const [listBody, roommateBody] = await Promise.all([
      fetch("/api/inventory-personal").then((r) => r.json()),
      fetch("/api/inventory-personal/roommates").then((r) => r.json()),
    ]);
    setOwnLists(listBody.ownLists);
    setSharedLists(listBody.sharedLists);
    setRoommates(roommateBody);
    return listBody;
  };

  useEffect(() => {
    fetchAll()
      .then((listBody) => {
        if (listBody.ownLists.length > 0) {
          setSelection({ type: "own", id: listBody.ownLists[0].id });
        } else if (listBody.sharedLists.length > 0) {
          setSelection({ type: "shared", id: listBody.sharedLists[0].id });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedOwnList = useMemo(
    () => (selection?.type === "own" ? ownLists.find((l) => l.id === selection.id) ?? null : null),
    [selection, ownLists]
  );
  const selectedSharedList = useMemo(
    () => (selection?.type === "shared" ? sharedLists.find((l) => l.id === selection.id) ?? null : null),
    [selection, sharedLists]
  );

  const selectList = (type: "own" | "shared", id: number) => setSelection({ type, id });

  const createList = async () => {
    if (!newListName.trim()) {
      setError("List name is required");
      return;
    }
    setError(null);
    setSavingList(true);
    const res = await fetch("/api/inventory-personal/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    });
    setSavingList(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Failed to create list");
      return;
    }
    const created: PersonalInventoryList = await res.json();
    setOwnLists((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setSelection({ type: "own", id: created.id });
    setNewListName("");
    setShowListForm(false);
  };

  const renameList = async (id: number, name: string) => {
    const res = await fetch(`/api/inventory-personal/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated: { id: number; name: string } = await res.json();
      setOwnLists((prev) =>
        prev.map((l) => (l.id === id ? { ...l, name: updated.name } : l)).sort((a, b) => a.name.localeCompare(b.name))
      );
    }
  };

  const deleteList = async (id: number) => {
    const res = await fetch(`/api/inventory-personal/lists/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOwnLists((prev) => prev.filter((l) => l.id !== id));
      setSelection((prev) => (prev?.type === "own" && prev.id === id ? null : prev));
    }
  };

  const shareList = async (id: number, tenantIds: number[]) => {
    setSharingListId(id);
    const res = await fetch(`/api/inventory-personal/lists/${id}/share`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantIds }),
    });
    setSharingListId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Failed to update sharing");
      return;
    }
    const sharedWith: { tenantId: number; name: string }[] = await res.json();
    setOwnLists((prev) => prev.map((l) => (l.id === id ? { ...l, sharedWith } : l)));
  };

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
    if (!selectedOwnList) {
      setError("Select a list first");
      return;
    }
    setError(null);
    const isEdit = editingId !== null;
    setSavingId(isEdit ? editingId : "new");

    const res = await fetch(isEdit ? `/api/inventory-personal/${editingId}` : "/api/inventory-personal", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? buildPayload() : { ...buildPayload(), listId: selectedOwnList.id }),
    });

    setSavingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Failed to save item");
      return;
    }

    const saved: PersonalInventoryItem = await res.json();
    setOwnLists((prev) =>
      prev.map((l) => {
        if (l.id !== selectedOwnList.id) return l;
        const items = isEdit
          ? l.items.map((i) => (i.id === saved.id ? saved : i))
          : [...l.items, saved].sort((a, b) => a.name.localeCompare(b.name));
        return { ...l, items };
      })
    );
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!selectedOwnList) return;
    setSavingId(id);
    const res = await fetch(`/api/inventory-personal/${id}`, { method: "DELETE" });
    setSavingId(null);
    if (res.ok) {
      setOwnLists((prev) =>
        prev.map((l) => (l.id === selectedOwnList.id ? { ...l, items: l.items.filter((i) => i.id !== id) } : l))
      );
    }
  };

  return {
    ownLists,
    sharedLists,
    selection,
    selectedOwnList,
    selectedSharedList,
    roommates,
    loading,
    error,
    showForm,
    editingId,
    form,
    setForm,
    savingId,
    showListForm,
    setShowListForm,
    newListName,
    setNewListName,
    savingList,
    sharingListId,
    selectList,
    createList,
    renameList,
    deleteList,
    shareList,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    handleDelete,
  };
}
