"use client";

import { useEffect, useState } from "react";
import type { AnnouncementEffectiveStatus } from "@/lib/announcement-status";

interface Announcement {
  id: number;
  title: string;
  description: string;
  date: string;
  status: string;
  expiresAt: string | null;
  creatorName: string | null;
  clearedAt: string | null;
  effectiveStatus: AnnouncementEffectiveStatus;
}

interface Props {
  isAdmin?: boolean;
}

const BG_COLORS = [
  "bg-orange-50 dark:bg-darkSurface border border-orange-100 dark:border-darkBorder",
  "bg-violet-50 dark:bg-darkSurface border border-violet-100 dark:border-darkBorder",
  "bg-amber-50 dark:bg-darkSurface border border-amber-100 dark:border-darkBorder",
  "bg-sky-50 dark:bg-darkSurface border border-sky-100 dark:border-darkBorder",
];

const STATUS_BADGE: Record<AnnouncementEffectiveStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CLEARED: "bg-gray-100 text-gray-500 dark:bg-darkBorder dark:text-gray-400",
  EXPIRED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const FILTERS: { key: "ACTIVE" | "ALL" | AnnouncementEffectiveStatus; label: string }[] = [
  { key: "ACTIVE", label: "Active" },
  { key: "CLEARED", label: "Cleared" },
  { key: "EXPIRED", label: "Expired" },
  { key: "ARCHIVED", label: "Archived" },
  { key: "ALL", label: "All" },
];

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 focus:border-meadowOrange transition-all";
const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

const PREVIEW_COUNT = 3;

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={spinning ? "animate-spin" : ""}>
    <path d="M21 2v6h-6"/>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
    <path d="M3 22v-6h6"/>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

const Announcements = ({ isAdmin = false }: Props) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"ACTIVE" | "ALL" | AnnouncementEffectiveStatus>("ACTIVE");
  const [form, setForm] = useState({ title: "", description: "", date: "", expiresAt: "" });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch("/api/announcements");
    if (res.ok) setAnnouncements(await res.json());
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.title || !form.description || !form.date) return;
    setSaving(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        date: form.date,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      }),
    });
    if (res.ok) {
      await load();
      setForm({ title: "", description: "", date: "", expiresAt: "" });
      setShowAdd(false);
    }
    setSaving(false);
  };

  const handleClear = async (id: number) => {
    setActingId(id);
    await fetch(`/api/announcements/${id}/clear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    await load();
    setActingId(null);
  };

  const handleUnclear = async (id: number) => {
    setActingId(id);
    await fetch(`/api/announcements/${id}/clear`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
    await load();
    setActingId(null);
  };

  const handleArchive = async (id: number) => {
    setActingId(id);
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    await load();
    setActingId(null);
  };

  const handleUnarchive = async (id: number) => {
    setActingId(id);
    await fetch(`/api/announcements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    await load();
    setActingId(null);
  };

  const filtered = filter === "ALL" ? announcements : announcements.filter((a) => a.effectiveStatus === filter);
  const visible = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hasMore = filtered.length > PREVIEW_COUNT;

  return (
    <div className="bg-white dark:bg-darkCard p-5 rounded-2xl border border-gray-300 dark:border-darkBorder shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Announcements</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-meadowBorder dark:border-darkBorder text-gray-500 dark:text-gray-400 hover:text-meadowOrange hover:border-meadowOrange/40 rounded-lg font-medium transition-colors disabled:opacity-40"
            title="Refresh announcements"
          >
            <RefreshIcon spinning={refreshing} />
            Refresh
          </button>
          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs px-2.5 py-1.5 text-meadowOrange hover:text-orange-600 font-medium transition-colors"
            >
              {showAll ? "Show Less" : "View All"}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs px-2.5 py-1.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
              filter === f.key
                ? "bg-meadowOrange text-white"
                : "bg-meadowMuted dark:bg-darkSurface text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className={`flex flex-col gap-3 ${showAll ? "max-h-[420px] overflow-y-auto pr-1" : ""}`}>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nothing here.</p>
        ) : (
          visible.map((a, i) => (
            <div key={a.id} className={`${BG_COLORS[i % BG_COLORS.length]} rounded-xl p-3.5`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{a.title}</h2>
                <span className="text-[10px] text-gray-400 whitespace-nowrap bg-white/70 dark:bg-darkCard/60 rounded-md px-1.5 py-1 flex-shrink-0">
                  {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{a.description}</p>

              <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[a.effectiveStatus]}`}>
                    {a.effectiveStatus}
                  </span>
                  {a.creatorName && <span className="text-[10px] text-gray-400">by {a.creatorName}</span>}
                  {a.expiresAt && (
                    <span className="text-[10px] text-gray-400">
                      expires {new Date(a.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {a.effectiveStatus !== "CLEARED" && a.effectiveStatus !== "ARCHIVED" && (
                    <button
                      onClick={() => handleClear(a.id)}
                      disabled={actingId === a.id}
                      className="text-[11px] px-2 py-1 border border-meadowBorder dark:border-darkBorder rounded-md text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-darkCard transition-colors disabled:opacity-50"
                    >
                      Clear
                    </button>
                  )}
                  {a.effectiveStatus === "CLEARED" && (
                    <button
                      onClick={() => handleUnclear(a.id)}
                      disabled={actingId === a.id}
                      className="text-[11px] px-2 py-1 border border-meadowBorder dark:border-darkBorder rounded-md text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-darkCard transition-colors disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                  {isAdmin && a.status !== "ARCHIVED" && (
                    <button
                      onClick={() => handleArchive(a.id)}
                      disabled={actingId === a.id}
                      className="text-[11px] px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md transition-colors disabled:opacity-50"
                    >
                      Archive
                    </button>
                  )}
                  {isAdmin && a.status === "ARCHIVED" && (
                    <button
                      onClick={() => handleUnarchive(a.id)}
                      disabled={actingId === a.id}
                      className="text-[11px] px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md transition-colors disabled:opacity-50"
                    >
                      Unarchive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {!loading && hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-center text-gray-400 hover:text-meadowOrange py-1 transition-colors"
          >
            +{filtered.length - PREVIEW_COUNT} more announcement{filtered.length - PREVIEW_COUNT !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Add Announcement Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Announcement</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-darkBorder transition-colors text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className={labelClass}>Content</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className={`${inputClass} resize-none`}
                  placeholder="Announcement content…"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Expires (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-1">
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.title || !form.description || !form.date}
                  className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding…" : "Add Announcement"}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
