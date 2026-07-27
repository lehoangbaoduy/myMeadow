"use client";

import { useState } from "react";

const REQUEST_TYPES = [
  "Room Fix", "Appliance Issue", "Plumbing Issue", "Electrical Issue",
  "Pest Control", "Noise Complaint", "Cleaning Request",
  "Internet / WiFi Issue", "Parking Issue", "Other",
];

interface PendingRequest {
  id: number;
  requestType: string;
  description: string;
  status: string;
  createdAt: string;
}

interface Props {
  tenantName: string;
  pendingRequests: PendingRequest[];
}

const inputClass =
  "w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange";
const labelClass = "block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1";

export default function ProfileRequestButtons({ tenantName, pendingRequests: initialRequests }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>(initialRequests);
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
      setTimeout(() => { setAddOpen(false); setSuccess(false); }, 2000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to submit request");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => { setViewOpen(true); }}
          className="relative px-4 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-meadowMuted dark:hover:bg-darkCard transition-colors font-medium"
        >
          View Requests
          {requests.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setAddOpen(true); setSuccess(false); setError(null); }}
          className="px-4 py-2 bg-meadowOrange hover:bg-orange-600 text-white text-sm rounded-md font-medium transition-colors"
        >
          + Add Request
        </button>
      </div>

      {/* Add Request Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add a Request</h2>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-medium">Request submitted!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Request Type</label>
                  <select value={form.requestType} onChange={update("requestType")} className={inputClass}>
                    {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={4} value={form.description} onChange={update("description")} required
                    placeholder="Describe the issue in detail..."
                    className={`${inputClass} resize-none`} />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3 mt-1">
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                    {submitting ? "Submitting…" : "Submit Request"}
                  </button>
                  <button type="button" onClick={() => setAddOpen(false)}
                    className="flex-1 py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Requests Modal */}
      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Pending Requests
                {requests.length > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-full font-semibold">
                    {requests.length} open
                  </span>
                )}
              </h2>
              <button onClick={() => setViewOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
            </div>
            {requests.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">No pending requests 🎉</p>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.map((r) => (
                  <div key={r.id} className="p-4 rounded-lg border border-meadowBorder dark:border-darkBorder bg-meadowLight dark:bg-darkSurface">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-meadowOrange">{r.requestType}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{r.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(r.createdAt)}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 font-medium flex-shrink-0">
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setViewOpen(false)}
              className="mt-5 w-full py-2 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
