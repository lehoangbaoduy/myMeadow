"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface TenantFormData {
  name: string;
  nickname: string;
  dob: string;
  gender: string;
  roomNumber: string;
  phone: string;
  email: string;
  notes: string;
}

interface Props {
  tenantId: number;
  initial: TenantFormData;
  canEdit: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
}

export default function TenantProfileForm({ tenantId, initial, canEdit, isAdmin, avatarUrl: initialAvatarUrl }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<TenantFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof TenantFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", avatarFile);
    const res = await fetch(`/api/tenants/${tenantId}/avatar`, { method: "POST", body: fd });
    setUploadingAvatar(false);
    if (res.ok) {
      setAvatarFile(null);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to upload avatar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload: Record<string, unknown> = {
      name: form.name,
      nickname: form.nickname || null,
      dob: form.dob || null,
      gender: form.gender,
      roomNumber: form.roomNumber || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
    };

    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-meadowOrange disabled:opacity-50 text-sm";
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit}>
      {/* Row 1: Name + Nickname + Room */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className={labelClass}>Name</label>
          <input type="text" value={form.name} onChange={update("name")} disabled={!canEdit} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nickname <span className="text-gray-400 normal-case">(optional)</span></label>
          <input type="text" value={form.nickname} onChange={update("nickname")} disabled={!canEdit}
            placeholder="Preferred name" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Room Number</label>
          <input type="text" value={form.roomNumber} onChange={update("roomNumber")} disabled={!canEdit} className={inputClass} />
        </div>
      </div>

      {/* Row 2: Gender + DOB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass}>Gender</label>
          <select value={form.gender} onChange={update("gender")} disabled={!canEdit} className={inputClass}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Date of Birth</label>
          <input type="date" value={form.dob} onChange={update("dob")} disabled={!canEdit} className={inputClass} />
        </div>
      </div>

      {/* Row 3: Phone + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass}>Phone <span className="text-gray-400 normal-case">(optional)</span></label>
          <input type="tel" value={form.phone} onChange={update("phone")} disabled={!canEdit}
            placeholder="+1 555 000 0000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email <span className="text-gray-400 normal-case">(optional)</span></label>
          <input type="email" value={form.email} onChange={update("email")} disabled={!canEdit}
            placeholder="you@example.com" className={inputClass} />
        </div>
      </div>

      {/* Row 4: Avatar Upload */}
      {canEdit && (
        <div className="mb-4">
          <label className={labelClass}>Profile Photo <span className="text-gray-400 normal-case">(optional)</span></label>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-meadowMuted dark:bg-darkBorder flex-shrink-0 overflow-hidden flex items-center justify-center text-meadowOrange font-bold text-lg">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
              ) : (
                form.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-sm border border-meadowBorder dark:border-darkBorder rounded-md text-gray-700 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors"
              >
                Choose Photo
              </button>
              {avatarFile && (
                <button
                  type="button"
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar}
                  className="px-3 py-2 text-sm bg-meadowOrange hover:bg-orange-600 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar ? "Uploading…" : "Upload"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row 4: Notes */}
      <div className="mb-5">
        <label className={labelClass}>Notes</label>
        <textarea rows={3} value={form.notes} onChange={update("notes")} disabled={!canEdit}
          className={`${inputClass} resize-none`} placeholder="Any personal notes..." />
      </div>

      {canEdit && (
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {success && <span className="text-green-600 text-sm">Saved ✓</span>}
          {error && <span className="text-red-500 text-sm">{error}</span>}
        </div>
      )}
    </form>
  );
}
