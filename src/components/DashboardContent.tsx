"use client";

import { useState, useMemo } from "react";
import { useRef, useEffect } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UtilityBillRow {
  id: number; month: number; year: number;
  electric: number; electricUsage: number | null; electricPrice: number | null;
  gas: number; gasUsage: number | null; gasPrice: number | null;
  water: number; waterUsage: number | null; waterPrice: number | null;
  wifi: number; wifiPrice: number | null;
}

interface Props {
  isAdmin: boolean;
  bills: UtilityBillRow[];
  latestBill?: UtilityBillRow | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = { Electric: "#F59E0B", Gas: "#EF4444", Water: "#06B6D4", WiFi: "#8B5CF6" };
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TODAY = new Date();
const CUR_YEAR = TODAY.getFullYear();
const CUR_MONTH = TODAY.getMonth() + 1;
const YEAR_OPTIONS = Array.from({ length: CUR_YEAR - 2024 + 1 }, (_, i) => 2024 + i);

function fmtLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]} ${String(year).slice(2)}`;
}

function getYearRange(year: number) {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year }));
}

function makePriceDot(fill: string) {
  return function PriceDot({ cx, cy, payload }: any) {
    if (cx == null || cy == null) return <g />;
    const isCurrent = payload?.month === CUR_MONTH && payload?.year === CUR_YEAR;
    return (
      <g>
        {isCurrent && (
          <circle cx={cx} cy={cy} r={8} fill={fill}>
            <animate attributeName="r" values="4;10;4" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
        <circle cx={cx} cy={cy} r={3} fill={fill} />
      </g>
    );
  };
}
const PRICE_DOTS = {
  Electric: makePriceDot("#F59E0B"),
  Gas:      makePriceDot("#EF4444"),
  Water:    makePriceDot("#06B6D4"),
  WiFi:     makePriceDot("#8B5CF6"),
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
function ThreeDotMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-md hover:bg-meadowMuted dark:hover:bg-darkBorder transition-colors" title="Options">
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white dark:bg-darkCard border border-meadowBorder dark:border-darkBorder rounded-xl shadow-xl w-36">
          <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkSurface rounded-xl transition-colors"
            onClick={() => { setOpen(false); onEdit(); }}>✏️ Edit</button>
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-darkBorder transition-colors text-lg font-bold">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 focus:border-meadowOrange transition-all";
const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";
const selectClass = "px-2 py-1 rounded-md border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-meadowOrange/40 cursor-pointer";

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600 py-10">
      <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2V7a2 2 0 012-2h4M9 17h6m0 0h4a2 2 0 002-2V7a2 2 0 00-2-2h-4M9 5V3m6 2V3" />
      </svg>
      <p className="text-sm font-medium">No bill data yet</p>
      <p className="text-xs text-center max-w-[180px] leading-relaxed">{message ?? "Upload a bill in the Utilities tab to get started."}</p>
    </div>
  );
}

// ─── BillChart (Pie) ──────────────────────────────────────────────────────────
function BillChartSection({ isAdmin, bills, onUpdated }: { isAdmin: boolean; bills: UtilityBillRow[]; onUpdated: () => void }) {
  const [pieYear, setPieYear] = useState(CUR_YEAR);
  const [pieMonth, setPieMonth] = useState(CUR_MONTH);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ electric: "", gas: "", water: "", wifi: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billMap = useMemo(() => {
    const m = new Map<string, UtilityBillRow>();
    bills.forEach((b) => m.set(`${b.month}-${b.year}`, b));
    return m;
  }, [bills]);

  const found = billMap.get(`${pieMonth}-${pieYear}`) ?? null;
  const data = found
    ? [
        { name: "Electric", value: found.electric },
        { name: "Gas", value: found.gas },
        { name: "Water", value: found.water },
        { name: "WiFi", value: found.wifi },
      ].filter((d) => d.value > 0)
    : [];
  const total = data.reduce((s, d) => s + d.value, 0);
  const monthLabel = found ? fmtLabel(found.month, found.year) : `${MONTH_NAMES[pieMonth - 1]} ${pieYear}`;

  const openEdit = () => {
    if (!found) return;
    setForm({ electric: found.electric.toString(), gas: found.gas.toString(), water: found.water.toString(), wifi: found.wifi.toString() });
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!found) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/utilities/${found.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ electric: Number(form.electric), gas: Number(form.gas), water: Number(form.water), wifi: Number(form.wifi) }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); onUpdated(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
  };

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl w-full h-full p-5 border border-gray-300 dark:border-darkBorder shadow-[var(--shadow-card)] flex flex-col">
      <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Total Bill</h1>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select value={pieMonth} onChange={(e) => setPieMonth(Number(e.target.value))} className={selectClass}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={pieYear} onChange={(e) => setPieYear(Number(e.target.value))} className={selectClass}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {isAdmin && found && <ThreeDotMenu onEdit={openEdit} />}
        </div>
      </div>
      {!found || total === 0 ? (
        <EmptyState />
      ) : (
        <div className="relative flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius="48%" outerRadius="70%"
                dataKey="value"
                strokeWidth={0}
                paddingAngle={2}
                labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                label={({ name, cx, cy, midAngle, outerRadius }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = (outerRadius as number) + 24;
                  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
                  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} textAnchor={x > (cx as number) ? "start" : "end"} dominantBaseline="central" fontSize={10} fill="#6b7280" fontWeight={500}>
                      {name}
                    </text>
                  );
                }}
              >
                {data.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v}`, undefined]} contentStyle={{ borderRadius: "12px", borderColor: "#dde3eb", fontSize: "13px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">${total.toFixed(0)}</div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">{monthLabel}</div>
          </div>
        </div>
      )}
      {editing && (
        <Modal title={`Edit Total Bill — ${monthLabel}`} onClose={() => setEditing(false)}>
          <div className="flex flex-col gap-3">
            {(["electric", "gas", "water", "wifi"] as const).map((k) => (
              <div key={k}>
                <label className={labelClass}>{k.charAt(0).toUpperCase() + k.slice(1)} ($)</label>
                <input type="number" min={0} step={0.01} value={form[k]}
                  onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} className={inputClass} />
              </div>
            ))}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Usage Chart (Bar) ────────────────────────────────────────────────────────
function UsageChartSection({ isAdmin, bills, onUpdated }: { isAdmin: boolean; bills: UtilityBillRow[]; onUpdated: () => void }) {
  const [chartYear, setChartYear] = useState(CUR_YEAR);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [form, setForm] = useState({ electricUsage: "", gasUsage: "", waterUsage: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billMap = useMemo(() => {
    const m = new Map<string, UtilityBillRow>();
    bills.forEach((b) => m.set(`${b.month}-${b.year}`, b));
    return m;
  }, [bills]);

  const yearRange = getYearRange(chartYear);
  const data = yearRange.map(({ month, year }) => {
    const b = billMap.get(`${month}-${year}`);
    return { name: MONTH_NAMES[month - 1], Electric: b?.electricUsage ?? 0, Gas: b?.gasUsage ?? 0, Water: b?.waterUsage ?? 0 };
  });

  const yearBills = bills.filter((b) => b.year === chartYear).sort((a, b) => a.month - b.month);
  const latest = yearBills[yearBills.length - 1] ?? null;
  const hasBills = yearBills.length > 0;

  const openEdit = () => {
    if (!latest) return;
    setEditId(latest.id);
    setEditLabel(fmtLabel(latest.month, latest.year));
    setForm({ electricUsage: (latest.electricUsage ?? "").toString(), gasUsage: (latest.gasUsage ?? "").toString(), waterUsage: (latest.waterUsage ?? "").toString() });
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/utilities/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        electricUsage: form.electricUsage ? Number(form.electricUsage) : null,
        gasUsage: form.gasUsage ? Number(form.gasUsage) : null,
        waterUsage: form.waterUsage ? Number(form.waterUsage) : null,
      }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); onUpdated(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
  };

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl p-5 h-full border border-gray-300 dark:border-darkBorder shadow-[var(--shadow-card)] flex flex-col">
      <div className="flex justify-between items-center mb-2 gap-2">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Utility Usage</h1>
        <div className="flex items-center gap-1.5">
          <select value={chartYear} onChange={(e) => setChartYear(Number(e.target.value))} className={selectClass}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {isAdmin && latest && <ThreeDotMenu onEdit={openEdit} />}
        </div>
      </div>
      {!hasBills ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data} barCategoryGap="32%" barGap={2} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:[&>line]:stroke-[#2a3650]" />
            <XAxis dataKey="name" axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} interval={0} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "12px", borderColor: "#dde3eb", fontSize: "12px" }} />
            <Legend align="left" verticalAlign="top" wrapperStyle={{ paddingBottom: "12px" }} iconType="circle" iconSize={8} />
            <Bar dataKey="Electric" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Water" fill="#06B6D4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {editing && (
        <Modal title={`Edit Usage — ${editLabel}`} onClose={() => setEditing(false)}>
          <div className="flex flex-col gap-3">
            <div><label className={labelClass}>Electric Usage (kWh)</label>
              <input type="number" min={0} step={0.01} value={form.electricUsage} onChange={(e) => setForm((p) => ({ ...p, electricUsage: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}>Gas Usage (m³)</label>
              <input type="number" min={0} step={0.01} value={form.gasUsage} onChange={(e) => setForm((p) => ({ ...p, gasUsage: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}>Water Usage (m³)</label>
              <input type="number" min={0} step={0.01} value={form.waterUsage} onChange={(e) => setForm((p) => ({ ...p, waterUsage: e.target.value }))} className={inputClass} /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Price Chart (Line) ───────────────────────────────────────────────────────
function PriceChartSection({ isAdmin, bills, onUpdated }: { isAdmin: boolean; bills: UtilityBillRow[]; onUpdated: () => void }) {
  const [chartYear, setChartYear] = useState(CUR_YEAR);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [form, setForm] = useState({ electricPrice: "", gasPrice: "", waterPrice: "", wifiPrice: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billMap = useMemo(() => {
    const m = new Map<string, UtilityBillRow>();
    bills.forEach((b) => m.set(`${b.month}-${b.year}`, b));
    return m;
  }, [bills]);

  const yearRange = getYearRange(chartYear);
  const data = yearRange.map(({ month, year }) => {
    const b = billMap.get(`${month}-${year}`);
    return {
      name: MONTH_NAMES[month - 1],
      month,
      year,
      Electric: b ? b.electric : null,
      Gas:      b ? b.gas      : null,
      Water:    b ? b.water    : null,
      WiFi:     b ? b.wifi     : null,
    };
  });

  const yearBills = bills.filter((b) => b.year === chartYear).sort((a, b) => a.month - b.month);
  const latest = yearBills[yearBills.length - 1] ?? null;
  const hasBills = yearBills.length > 0;

  const toggleLine = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-4 flex-wrap pb-3">
        {payload.map((entry: any) => (
          <button key={entry.dataKey} onClick={() => toggleLine(entry.dataKey)} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color, opacity: hidden.has(entry.dataKey) ? 0.25 : 1 }} />
            <span className={`text-xs font-medium ${hidden.has(entry.dataKey) ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"}`}>
              {entry.value}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const openEdit = () => {
    if (!latest) return;
    setEditId(latest.id);
    setEditLabel(fmtLabel(latest.month, latest.year));
    setForm({ electricPrice: (latest.electricPrice ?? "").toString(), gasPrice: (latest.gasPrice ?? "").toString(), waterPrice: (latest.waterPrice ?? "").toString(), wifiPrice: (latest.wifiPrice ?? "").toString() });
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/utilities/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        electricPrice: form.electricPrice ? Number(form.electricPrice) : null,
        gasPrice: form.gasPrice ? Number(form.gasPrice) : null,
        waterPrice: form.waterPrice ? Number(form.waterPrice) : null,
        wifiPrice: form.wifiPrice ? Number(form.wifiPrice) : null,
      }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); onUpdated(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
  };

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl w-full h-full p-5 border border-gray-300 dark:border-darkBorder shadow-[var(--shadow-card)] flex flex-col">
      <div className="flex justify-between items-center mb-2 gap-2">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Monthly Costs</h1>
        <div className="flex items-center gap-1.5">
          <select value={chartYear} onChange={(e) => setChartYear(Number(e.target.value))} className={selectClass}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {isAdmin && latest && <ThreeDotMenu onEdit={openEdit} />}
        </div>
      </div>
      {!hasBills ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[&>line]:stroke-[#2a3650]" />
            <XAxis dataKey="name" axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} tickMargin={8} interval={0} />
            <YAxis axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} tickMargin={10} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip contentStyle={{ borderRadius: "12px", borderColor: "#dde3eb", fontSize: "12px" }} formatter={(v: number) => [`$${v.toFixed(2)}`, undefined]} />
            <Legend content={renderLegend} />
            <Line type="monotone" dataKey="Electric" stroke="#F59E0B" strokeWidth={2} dot={PRICE_DOTS.Electric} activeDot={{ r: 5 }} hide={hidden.has("Electric")} connectNulls={false} />
            <Line type="monotone" dataKey="Gas"      stroke="#EF4444" strokeWidth={2} dot={PRICE_DOTS.Gas}      activeDot={{ r: 5 }} hide={hidden.has("Gas")}      connectNulls={false} />
            <Line type="monotone" dataKey="Water"    stroke="#06B6D4" strokeWidth={2} dot={PRICE_DOTS.Water}    activeDot={{ r: 5 }} hide={hidden.has("Water")}    connectNulls={false} />
            <Line type="monotone" dataKey="WiFi"     stroke="#8B5CF6" strokeWidth={2} dot={PRICE_DOTS.WiFi}     activeDot={{ r: 5 }} hide={hidden.has("WiFi")}     connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
      {editing && (
        <Modal title={`Edit Prices — ${editLabel}`} onClose={() => setEditing(false)}>
          <div className="flex flex-col gap-3">
            <div><label className={labelClass}>Electric Price ($/kWh)</label>
              <input type="number" min={0} step={0.001} value={form.electricPrice} onChange={(e) => setForm((p) => ({ ...p, electricPrice: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}>Gas Price ($/m³)</label>
              <input type="number" min={0} step={0.001} value={form.gasPrice} onChange={(e) => setForm((p) => ({ ...p, gasPrice: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}>Water Price ($/m³)</label>
              <input type="number" min={0} step={0.001} value={form.waterPrice} onChange={(e) => setForm((p) => ({ ...p, waterPrice: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}>WiFi Price ($/month)</label>
              <input type="number" min={0} step={0.01} value={form.wifiPrice} onChange={(e) => setForm((p) => ({ ...p, wifiPrice: e.target.value }))} className={inputClass} /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-meadowBorder dark:border-darkBorder text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── UtilityCards ─────────────────────────────────────────────────────────────
const CARD_STYLES: Record<string, { card: string; value: string; badge: string; label: string; icon: string }> = {
  electric: {
    card:  "bg-amber-400 dark:bg-amber-500 border-amber-400/60 dark:border-amber-500/60",
    value: "text-white",
    badge: "bg-black/15 text-white/90",
    label: "text-white/70",
    icon:  "⚡",
  },
  gas: {
    card:  "bg-red-500 dark:bg-red-600 border-red-500/60 dark:border-red-600/60",
    value: "text-white",
    badge: "bg-black/15 text-white/90",
    label: "text-white/70",
    icon:  "🔥",
  },
  water: {
    card:  "bg-cyan-500 dark:bg-cyan-600 border-cyan-500/60 dark:border-cyan-600/60",
    value: "text-white",
    badge: "bg-black/15 text-white/90",
    label: "text-white/70",
    icon:  "💧",
  },
  wifi: {
    card:  "bg-violet-500 dark:bg-violet-600 border-violet-500/60 dark:border-violet-600/60",
    value: "text-white",
    badge: "bg-black/15 text-white/90",
    label: "text-white/70",
    icon:  "📡",
  },
};

function UtilityCards({ latest }: { latest: UtilityBillRow | null }) {
  const cards = [
    { type: "electric", label: "Electric", value: latest?.electric ?? null },
    { type: "gas",      label: "Gas",      value: latest?.gas ?? null },
    { type: "water",    label: "Water",    value: latest?.water ?? null },
    { type: "wifi",     label: "WiFi",     value: latest?.wifi ?? null },
  ];
  return (
    <>
      {cards.map((c) => {
        const s = CARD_STYLES[c.type];
        return (
          <div key={c.type} className={`rounded-2xl p-4 flex-1 min-w-[130px] border ${s.card}`}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xl">{s.icon}</span>
              <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${s.badge}`}>
                {latest ? fmtLabel(latest.month, latest.year) : "—"}
              </span>
            </div>
            <h1 className={`text-2xl font-bold ${s.value}`}>
              {c.value != null ? `$${c.value.toFixed(0)}` : "—"}
            </h1>
            <h2 className={`text-xs font-semibold mt-1 ${s.label}`}>{c.label}</h2>
          </div>
        );
      })}
    </>
  );
}

// ─── Main Dashboard Content ───────────────────────────────────────────────────
export default function DashboardContent({ isAdmin, bills }: Props) {
  const [currentBills, setCurrentBills] = useState(bills);

  const curMonthBill = useMemo(
    () => currentBills.find((b) => b.month === CUR_MONTH && b.year === CUR_YEAR) ?? null,
    [currentBills]
  );

  const refresh = async () => {
    const res = await fetch("/api/utilities");
    if (res.ok) {
      const all: UtilityBillRow[] = await res.json();
      setCurrentBills(all);
    }
  };

  return (
    <>
      <div className="flex gap-4 justify-between flex-wrap">
        <UtilityCards latest={curMonthBill} />
      </div>
      <div className="flex gap-4 flex-col lg:flex-row">
        <div className="w-full lg:w-1/3 h-[450px]">
          <BillChartSection isAdmin={isAdmin} bills={currentBills} onUpdated={refresh} />
        </div>
        <div className="w-full lg:w-2/3 h-[450px]">
          <UsageChartSection isAdmin={isAdmin} bills={currentBills} onUpdated={refresh} />
        </div>
      </div>
      <div className="w-full h-[500px]">
        <PriceChartSection isAdmin={isAdmin} bills={currentBills} onUpdated={refresh} />
      </div>
    </>
  );
}
