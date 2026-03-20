"use client";
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  getWeekIndex,
  getThursdayOfWeek,
  getThursdaysInMonth,
} from "@/lib/trash-schedule";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

function getTrashAssignment(thursday: Date, maleTenants: string[]) {
  const weekIdx = getWeekIndex(thursday);
  const tenant = maleTenants.length > 0
    ? maleTenants[((weekIdx % maleTenants.length) + maleTenants.length) % maleTenants.length]
    : "—";
  const hasRecycle = weekIdx % 2 === 0;
  return { tenant, hasRecycle };
}

function getBathroomAssignment(thursday: Date, bathroomTenants: string[]) {
  const weekIdx = getWeekIndex(thursday);
  return bathroomTenants.length > 0
    ? bathroomTenants[((Math.floor(weekIdx / 2) % bathroomTenants.length) + bathroomTenants.length) % bathroomTenants.length]
    : "—";
}

/** Returns the Thursday of the same ISO week as the given date (looking backward). */
function getThursdayOfSameWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = (day - 4 + 7) % 7; // days since last Thursday
  d.setDate(d.getDate() - diff);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Birthday {
  name: string;
  month: number; // 1-12
  day: number;   // 1-31
}

interface Props {
  isAdmin?: boolean;
  birthdays?: Birthday[];
  maleTenants?: string[];
  bathroomTenants?: string[];
}

const EventCalendar = ({ isAdmin = false, birthdays = [], maleTenants = [], bathroomTenants = [] }: Props) => {
  const today = new Date();
  const [selected, setSelected] = useState<Value>(today);
  const [activeStart, setActiveStart] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [reminding, setReminding] = useState<"trash" | "bathroom" | null>(null);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);
  const [autoTrash, setAutoTrash] = useState(true);
  const [autoBathroom, setAutoBathroom] = useState(true);
  const [togglingAuto, setTogglingAuto] = useState<"trash" | "bathroom" | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.autoTrashReminder !== undefined) setAutoTrash(data.autoTrashReminder === "true");
        if (data.autoBathroomReminder !== undefined) setAutoBathroom(data.autoBathroomReminder === "true");
      })
      .catch(() => null);
  }, [isAdmin]);

  const handleToggleAuto = async (type: "trash" | "bathroom") => {
    const key = type === "trash" ? "autoTrashReminder" : "autoBathroomReminder";
    const newValue = type === "trash" ? !autoTrash : !autoBathroom;
    setTogglingAuto(type);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: String(newValue) }),
    }).catch(() => null);
    if (type === "trash") setAutoTrash(newValue);
    else setAutoBathroom(newValue);
    setTogglingAuto(null);
  };

  const year = activeStart.getFullYear();
  const month = activeStart.getMonth();
  const thursdaysThisMonth = getThursdaysInMonth(year, month);

  const selectedDate = selected instanceof Date ? selected : today;

  // Thursday click → show trash detail
  const selectedThursday =
    selectedDate.getDay() === 4
      ? thursdaysThisMonth.find((t) => isSameDay(t, selectedDate)) ?? null
      : null;

  // Saturday click → show bathroom detail for that week
  const selectedSaturday = selectedDate.getDay() === 6 ? selectedDate : null;

  const focusedThursday = getThursdayOfWeek(selectedDate);

  const clickedTrash = selectedThursday ? getTrashAssignment(selectedThursday, maleTenants) : null;
  const clickedBathroomThursday = selectedThursday
    ? getBathroomAssignment(selectedThursday, bathroomTenants)
    : null;
  const clickedBathroomSaturday = selectedSaturday
    ? getBathroomAssignment(getThursdayOfSameWeek(selectedSaturday), bathroomTenants)
    : null;

  // Birthdays on the selected day
  const clickedBirthdays = birthdays.filter(
    (b) => b.month === selectedDate.getMonth() + 1 && b.day === selectedDate.getDate()
  );

  // Current week's assignments (for admin remind buttons tooltip)
  const currentThursday = getThursdayOfWeek(today);
  const currentTrashTenant = getTrashAssignment(currentThursday, maleTenants).tenant;
  const currentBathroomTenant = getBathroomAssignment(currentThursday, bathroomTenants);

  const handleRemind = async (type: "trash" | "bathroom") => {
    setReminding(type);
    setRemindMsg(null);
    try {
      const res = await fetch("/api/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        setRemindMsg(`✓ Notified ${data.notified}!`);
      } else {
        setRemindMsg(`Error: ${data.error}`);
      }
    } catch {
      setRemindMsg("Failed to send reminder");
    }
    setReminding(null);
    setTimeout(() => setRemindMsg(null), 4000);
  };

  return (
    <div className="bg-white dark:bg-darkCard p-5 rounded-2xl border border-gray-300 dark:border-darkBorder shadow-[var(--shadow-card)]">

      {/* Admin reminder buttons */}
      {isAdmin && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleRemind("trash")}
              disabled={reminding !== null}
              className="flex-1 py-1.5 px-3 text-xs font-medium bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded-md transition-colors disabled:opacity-50"
              title={`Notify ${currentTrashTenant} about trash duty this week`}
            >
              {reminding === "trash" ? "Sending…" : "🗑️ Remind Trash"}
            </button>
            <button
              onClick={() => handleRemind("bathroom")}
              disabled={reminding !== null}
              className="flex-1 py-1.5 px-3 text-xs font-medium bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-md transition-colors disabled:opacity-50"
              title={`Notify ${currentBathroomTenant} about bathroom cleaning duty`}
            >
              {reminding === "bathroom" ? "Sending…" : "✨ Remind Bathroom"}
            </button>
          </div>
          {remindMsg && (
            <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">{remindMsg}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleToggleAuto("trash")}
              disabled={togglingAuto !== null}
              className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              <span className={`w-7 h-4 rounded-full transition-colors relative ${autoTrash ? "bg-meadowOrange" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${autoTrash ? "left-3.5" : "left-0.5"}`} />
              </span>
              Auto trash
            </button>
            <button
              onClick={() => handleToggleAuto("bathroom")}
              disabled={togglingAuto !== null}
              className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              <span className={`w-7 h-4 rounded-full transition-colors relative ${autoBathroom ? "bg-blue-400" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${autoBathroom ? "left-3.5" : "left-0.5"}`} />
              </span>
              Auto bathroom
            </button>
          </div>
        </div>
      )}

      <Calendar
        onChange={setSelected}
        value={selected}
        onActiveStartDateChange={({ activeStartDate }) =>
          activeStartDate && setActiveStart(activeStartDate)
        }
        tileContent={({ date, view }) => {
          if (view !== "month") return null;

          const dayBirthdays = birthdays.filter(
            (b) => b.month === date.getMonth() + 1 && b.day === date.getDate()
          );
          const hasBirthday = dayBirthdays.length > 0;

          // Thursday → trash assignment
          if (date.getDay() === 4) {
            const { tenant } = getTrashAssignment(date, maleTenants);
            return (
              <div className="flex flex-col items-center leading-none gap-0.5">
                <span className="text-[10px] leading-none text-orange-500 dark:text-orange-400 truncate max-w-[46px] font-semibold">
                  🗑️ {tenant}
                </span>
                {hasBirthday && <span className="text-[9px] leading-none">🎂</span>}
              </div>
            );
          }

          // Saturday → bathroom assignment
          if (date.getDay() === 6) {
            const thursday = getThursdayOfSameWeek(date);
            const bathroom = getBathroomAssignment(thursday, bathroomTenants);
            return (
              <div className="flex flex-col items-center leading-none gap-0.5">
                <span className="text-[10px] leading-none text-blue-400 dark:text-blue-300 truncate max-w-[46px] font-semibold">
                  ✨ {bathroom}
                </span>
                {hasBirthday && <span className="text-[9px] leading-none">🎂</span>}
              </div>
            );
          }

          // Birthday on other days
          if (hasBirthday) {
            return (
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] leading-none">🎂</span>
              </div>
            );
          }

          return null;
        }}
        tileClassName={({ date, view }) => {
          if (view !== "month") return null;
          const classes: string[] = [];

          if (date.getDay() === 4) {
            const { hasRecycle } = getTrashAssignment(date, maleTenants);
            const isActive = isSameDay(date, focusedThursday);
            classes.push(hasRecycle ? "thursday-recycle" : "thursday-garbage");
            if (isActive) classes.push("thursday-active");
          }

          const isBirthday = birthdays.some(
            (b) => b.month === date.getMonth() + 1 && b.day === date.getDate()
          );
          if (isBirthday) classes.push("birthday-tile");

          return classes.length > 0 ? classes.join(" ") : null;
        }}
      />

      {/* Birthday detail panel */}
      {clickedBirthdays.length > 0 && (
        <div className="mt-4 p-4 rounded-md border-l-4 border-pink-400 bg-pink-50 dark:bg-pink-950/30">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm mb-2">
            🎂 {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — Birthday!
          </h2>
          <div className="flex flex-col gap-1">
            {clickedBirthdays.map((b) => (
              <div key={b.name} className="text-sm font-medium text-pink-600 dark:text-pink-400">
                🎉 Happy Birthday, {b.name}!
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail panel — Thursday click shows trash + bathroom for that week */}
      {clickedTrash && selectedThursday && (
        <div
          className={`mt-4 p-4 rounded-md border-l-4 ${
            clickedTrash.hasRecycle
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-orange-400 bg-orange-50 dark:bg-orange-950/30"
          }`}
        >
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm mb-2">
            Thu, {selectedThursday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs w-20 pt-0.5">🗑️ Trash:</span>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{clickedTrash.tenant}</span>
                {clickedTrash.hasRecycle ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 w-fit">
                    🗑️ Garbage + ♻️ Recycle
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 w-fit">
                    🗑️ Garbage only
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs w-20">✨ Bathroom:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{clickedBathroomThursday}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel — Saturday click shows bathroom for that week */}
      {clickedBathroomSaturday && selectedSaturday && !clickedTrash && (
        <div className="mt-4 p-4 rounded-md border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950/30">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm mb-1">
            Sat, {selectedSaturday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400 text-xs">✨ Bathroom duty:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{clickedBathroomSaturday}</span>
          </div>
        </div>
      )}

      {!clickedTrash && !clickedBathroomSaturday && clickedBirthdays.length === 0 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Click a Thursday (trash), Saturday (bathroom), or birthday 🎂 to see details
        </p>
      )}
    </div>
  );
};

export default EventCalendar;
