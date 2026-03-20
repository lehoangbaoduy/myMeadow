"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    gender: "MALE",
    dob: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      setForm((prev) => ({
        ...prev,
        email: user.emailAddresses?.[0]?.emailAddress ?? "",
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || prev.name,
      }));
    }
  }, [isLoaded, user]);

  const update = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      router.replace("/");
    } else {
      const d = await res.json();
      setError(d.error ?? "Registration failed");
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-meadowLight dark:bg-darkBg">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-meadowOrange text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-meadowLight dark:bg-darkBg px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-meadowOrange">MyMeadow</h1>
          <p className="text-gray-500 mt-1 text-sm">Complete your profile to get started</p>
        </div>

        <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
            Create Your Account
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                required
                placeholder="Your full name"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                placeholder="your@email.com"
                className={`${inputClass} bg-gray-50 dark:bg-darkSurface/60`}
                readOnly={!!user?.emailAddresses?.[0]?.emailAddress}
              />
              {user?.emailAddresses?.[0]?.emailAddress && (
                <p className="text-xs text-gray-400 mt-0.5">Pre-filled from your Google account</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                placeholder="+1 (555) 000-0000"
                className={inputClass}
              />
            </div>

            {/* Gender + DOB row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gender <span className="text-red-500">*</span></label>
                <select value={form.gender} onChange={update("gender")} required className={inputClass}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={update("dob")}
                  className={inputClass}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating account…" : "Complete Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
