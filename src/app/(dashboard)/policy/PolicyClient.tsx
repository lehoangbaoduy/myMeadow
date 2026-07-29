"use client";

import { useState } from "react";
import { HOUSE_POLICY_SETTING_KEY } from "@/lib/house-policy";

interface Props {
  isAdmin: boolean;
  initialPolicy: string;
}

export default function PolicyClient({ isAdmin, initialPolicy }: Props) {
  const [policy, setPolicy] = useState(initialPolicy);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialPolicy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEdit = () => {
    setDraft(policy);
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: HOUSE_POLICY_SETTING_KEY, value: draft }),
    });
    setSaving(false);
    if (res.ok) {
      setPolicy(draft);
      setEditing(false);
    } else {
      setError("Failed to save. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">House Policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">House rules and expectations for everyone</p>
        </div>
        {isAdmin && (
          <button
            onClick={openEdit}
            className="text-sm px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md font-medium transition-colors flex-shrink-0"
          >
            Edit Policy
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {policy}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Edit House Policy</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={20}
              className="w-full flex-1 px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-meadowOrange resize-none"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving || !draft.trim()}
                className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
