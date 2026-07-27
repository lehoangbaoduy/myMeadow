"use client";

import { useState } from "react";

const REQUEST_TYPES = [
  "Room Fix",
  "Appliance Issue",
  "Plumbing Issue",
  "Electrical Issue",
  "Pest Control",
  "Noise Complaint",
  "Cleaning Request",
  "Internet / WiFi Issue",
  "Parking Issue",
  "Other",
];

interface Props {
  tenantName: string;
}

export default function MaintenanceRequestButton({ tenantName }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: tenantName, requestType: REQUEST_TYPES[0], description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/maintenance-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setForm({ name: tenantName, requestType: REQUEST_TYPES[0], description: "" });
      setTimeout(() => { setOpen(false); setSuccess(false); }, 2000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to submit request");
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange";
  const labelClass = "block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSuccess(false); setError(null); }}
        className="px-5 py-2 bg-meadowOrange hover:bg-orange-600 text-white text-sm rounded-md font-medium transition-colors"
      >
        + Submit a Request
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Submit a Request</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-medium">Request submitted successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Your Name</label>
                  <input type="text" value={form.name} onChange={update("name")} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Request Type</label>
                  <select value={form.requestType} onChange={update("requestType")} className={inputClass}>
                    {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={4} value={form.description} onChange={update("description")} required
                    placeholder="Please describe the issue in detail..."
                    className={`${inputClass} resize-none`} />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3 mt-1">
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                    {submitting ? "Submitting…" : "Submit Request"}
                  </button>
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
