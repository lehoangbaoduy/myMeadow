"use client";

import { useState } from "react";
import type { AssignableTenant, RoomRow, RoomsAdminData } from "@/lib/rooms-admin-data";

export function useRoomsAdmin({ rooms: initialRooms, tenants: initialTenants }: RoomsAdminData) {
  const [rooms, setRooms] = useState(initialRooms);
  const [tenants, setTenants] = useState(initialTenants);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ roomNumber: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingRoom, setEditingRoom] = useState<RoomRow | null>(null);
  const [editForm, setEditForm] = useState({ roomNumber: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [assigningRoomId, setAssigningRoomId] = useState<number | null>(null);
  const [assignTenantId, setAssignTenantId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [uploadingRoomId, setUploadingRoomId] = useState<number | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const availableTenants = (room: RoomRow): AssignableTenant[] =>
    tenants.filter((t) => t.roomNumber !== room.roomNumber);

  const handleAddRoom = async () => {
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber: addForm.roomNumber, notes: addForm.notes || null }),
    });
    setAdding(false);
    if (res.ok) {
      const created = await res.json();
      setRooms((prev) => [...prev, { ...created, images: [], assignedTenants: [] }].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)));
      setShowAddModal(false);
      setAddForm({ roomNumber: "", notes: "" });
    } else {
      const d = await res.json();
      setAddError(d.error ?? "Failed to add room");
    }
  };

  const openEdit = (room: RoomRow) => {
    setEditingRoom(room);
    setEditForm({ roomNumber: room.roomNumber, notes: room.notes ?? "" });
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingRoom) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/rooms/${editingRoom.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber: editForm.roomNumber, notes: editForm.notes || null }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      const prevRoomNumber = editingRoom.roomNumber;
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      if (prevRoomNumber !== updated.roomNumber) {
        setTenants((prev) => prev.map((t) => (t.roomNumber === prevRoomNumber ? { ...t, roomNumber: updated.roomNumber } : t)));
      }
      setEditingRoom(null);
    } else {
      const d = await res.json();
      setSaveError(d.error ?? "Failed to save");
    }
  };

  const handleDeleteRoom = async (room: RoomRow) => {
    if (!window.confirm(`Delete room "${room.roomNumber}"? Its photos will be removed too. This cannot be undone.`)) return;
    setDeletingId(room.id);
    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
    } else {
      const message = await res.json().then((d) => d.error, () => null);
      window.alert(message ?? `Failed to delete (${res.status})`);
    }
  };

  const openAssign = (room: RoomRow) => {
    setAssigningRoomId(room.id);
    setAssignTenantId("");
  };

  const handleAssign = async () => {
    if (assigningRoomId == null || !assignTenantId) return;
    const room = rooms.find((r) => r.id === assigningRoomId);
    if (!room) return;
    setAssigning(true);
    const res = await fetch(`/api/tenants/${assignTenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber: room.roomNumber }),
    });
    setAssigning(false);
    if (res.ok) {
      const tenantId = Number(assignTenantId);
      const tenant = tenants.find((t) => t.id === tenantId);
      if (tenant) {
        setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, roomNumber: room.roomNumber } : t)));
        setRooms((prev) =>
          prev.map((r) => ({
            ...r,
            assignedTenants:
              r.id === room.id
                ? [...r.assignedTenants, { id: tenant.id, name: tenant.name }]
                : r.assignedTenants.filter((a) => a.id !== tenant.id),
          }))
        );
      }
      setAssigningRoomId(null);
    }
  };

  const handleUnassign = async (room: RoomRow, tenantId: number) => {
    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber: null }),
    });
    if (res.ok) {
      setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, roomNumber: null } : t)));
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, assignedTenants: r.assignedTenants.filter((a) => a.id !== tenantId) } : r))
      );
    }
  };

  const handleUploadImage = async (room: RoomRow, file: File) => {
    setUploadingRoomId(room.id);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/rooms/${room.id}/images`, { method: "POST", body: fd });
    setUploadingRoomId(null);
    if (res.ok) {
      const image = await res.json();
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, images: [...r.images, image] } : r)));
    } else {
      const message = await res.json().then((d) => d.error, () => null);
      window.alert(message ?? "Failed to upload image");
    }
  };

  const handleDeleteImage = async (room: RoomRow, imageId: number) => {
    setDeletingImageId(imageId);
    const res = await fetch(`/api/rooms/${room.id}/images/${imageId}`, { method: "DELETE" });
    setDeletingImageId(null);
    if (res.ok) {
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, images: r.images.filter((i) => i.id !== imageId) } : r)));
    }
  };

  return {
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
  };
}
