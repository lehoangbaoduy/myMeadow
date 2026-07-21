"use client";
import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { getThursdayOfWeek, getThursdaysInMonth } from "@/lib/trash-schedule";
import { getSundayOfWeek } from "@/lib/dishes-schedule";
import {
  getTrashAssignment,
  getBathroomAssignment,
  getDishesAssignment,
  getThursdayOfSameWeek,
  isSameDay,
} from "@/lib/rotation-assignments";
import { useReminderControls } from "@/hooks/useReminderControls";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface Birthday {
  name: string;
  month: number; // 1-12
  day: number;   // 1-31
}

interface Props {
  isAdmin?: boolean;
  birthdays?: Birthday[];
  trashTenants?: string[];
  bathroomTenants?: string[];
  dishesTenants?: string[];
}

const EventCalendar = ({ isAdmin = false, birthdays = [], trashTenants = [], bathroomTenants = [], dishesTenants = [] }: Props) => {
  const today = new Date();
  const [selected, setSelected] = useState<Value>(today);
  const [activeStart, setActiveStart] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const {
    reminding,
    remindMsg,
    autoTrash,
    autoBathroom,
    autoDishes,
    autoRent,
    togglingAuto,
    rentDueDay,
    setRentDueDay,
    rentLeadDays,
    setRentLeadDays,
    savingRentSetting,
    handleToggleAuto,
    handleSaveRentSetting,
    handleRemind,
  } = useReminderControls(isAdmin);

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

  // Sunday click → show dishes detail for that week
  const selectedSunday = selectedDate.getDay() === 0 ? selectedDate : null;

  const focusedThursday = getThursdayOfWeek(selectedDate);

  const clickedTrash = selectedThursday ? getTrashAssignment(selectedThursday, trashTenants) : null;
  const clickedBathroomThursday = selectedThursday
    ? getBathroomAssignment(selectedThursday, bathroomTenants)
    : null;
  const clickedBathroomSaturday = selectedSaturday
    ? getBathroomAssignment(getThursdayOfSameWeek(selectedSaturday), bathroomTenants)
    : null;
  const clickedDishes = selectedSunday
    ? getDishesAssignment(selectedSunday, dishesTenants)
    : null;

  // Birthdays on the selected day
  const clickedBirthdays = birthdays.filter(
    (b) => b.month === selectedDate.getMonth() + 1 && b.day === selectedDate.getDate()
  );

  // Current week's assignments (for admin remind buttons tooltip)
  const currentThursday = getThursdayOfWeek(today);
  const currentTrashTenant = getTrashAssignment(currentThursday, trashTenants).tenant;
  const currentBathroomTenant = getBathroomAssignment(currentThursday, bathroomTenants);
  const currentSunday = getSundayOfWeek(today);
  const currentDishesTenant = getDishesAssignment(currentSunday, dishesTenants);

  return (
    <div className="bg-white dark:bg-darkCard p-5 rounded-2xl border border-gray-300 dark:border-darkBorder shadow-[var(--shadow-card)]">

      {/* Admin reminder cards */}
      {isAdmin && (
        <div className="mb-4 flex flex-col gap-2">

          {/* Trash card */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/40">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">🗑️ Trash</span>
              <span className="text-[10px] text-orange-500/80 dark:text-orange-500/60 truncate">This week: {currentTrashTenant}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggleAuto("trash")}
                disabled={togglingAuto !== null}
                title={autoTrash ? "Auto reminder on — click to disable" : "Auto reminder off — click to enable"}
                className="flex items-center gap-1.5 text-[10px] text-orange-600 dark:text-orange-400 disabled:opacity-50"
              >
                <span className={`w-7 h-4 rounded-full transition-colors relative ${autoTrash ? "bg-meadowOrange" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${autoTrash ? "left-3.5" : "left-0.5"}`} />
                </span>
                <span className="hidden sm:inline">Auto</span>
              </button>
              <button
                onClick={() => handleRemind("trash")}
                disabled={reminding !== null}
                className="text-[11px] font-medium px-2.5 py-1 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {reminding === "trash" ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>

          {/* Bathroom card */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">✨ Bathroom</span>
              <span className="text-[10px] text-blue-500/80 dark:text-blue-500/60 truncate">This week: {currentBathroomTenant}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggleAuto("bathroom")}
                disabled={togglingAuto !== null}
                title={autoBathroom ? "Auto reminder on — click to disable" : "Auto reminder off — click to enable"}
                className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 disabled:opacity-50"
              >
                <span className={`w-7 h-4 rounded-full transition-colors relative ${autoBathroom ? "bg-blue-400" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${autoBathroom ? "left-3.5" : "left-0.5"}`} />
                </span>
                <span className="hidden sm:inline">Auto</span>
              </button>
              <button
                onClick={() => handleRemind("bathroom")}
                disabled={reminding !== null}
                className="text-[11px] font-medium px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {reminding === "bathroom" ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>

          {/* Dishes card */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/40">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">🍽️ Dishes</span>
              <span className="text-[10px] text-teal-500/80 dark:text-teal-500/60 truncate">This week: {currentDishesTenant}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggleAuto("dishes")}
                disabled={togglingAuto !== null}
                title={autoDishes ? "Auto reminder on — click to disable" : "Auto reminder off — click to enable"}
                className="flex items-center gap-1.5 text-[10px] text-teal-600 dark:text-teal-400 disabled:opacity-50"
              >
                <span className={`w-7 h-4 rounded-full transition-colors relative ${autoDishes ? "bg-teal-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${autoDishes ? "left-3.5" : "left-0.5"}`} />
                </span>
                <span className="hidden sm:inline">Auto</span>
              </button>
              <button
                onClick={() => handleRemind("dishes")}
                disabled={reminding !== null}
                className="text-[11px] font-medium px-2.5 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {reminding === "dishes" ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>

          {/* Rent card */}
          <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">🏠 Rent</span>
                <span className="text-[10px] text-purple-500/80 dark:text-purple-500/60 truncate">Sent to every resident with rent set</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleAuto("rent")}
                  disabled={togglingAuto !== null}
                  title={autoRent ? "Auto reminder on — click to disable" : "Auto reminder off — click to enable"}
                  className="flex items-center gap-1.5 text-[10px] text-purple-600 dark:text-purple-400 disabled:opacity-50"
                >
                  <span className={`w-7 h-4 rounded-full transition-colors relative ${autoRent ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${autoRent ? "left-3.5" : "left-0.5"}`} />
                  </span>
                  <span className="hidden sm:inline">Auto</span>
                </button>
                <button
                  onClick={() => handleRemind("rent")}
                  disabled={reminding !== null}
                  className="text-[11px] font-medium px-2.5 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {reminding === "rent" ? "Sending…" : "Send now"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-purple-600 dark:text-purple-400">
              <label className="flex items-center gap-1">
                Due day
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={rentDueDay}
                  disabled={savingRentSetting}
                  onChange={(e) => setRentDueDay(e.target.value)}
                  onBlur={(e) => handleSaveRentSetting("rentDueDay", e.target.value)}
                  className="w-12 px-1 py-0.5 text-center rounded border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300"
                />
              </label>
              <label className="flex items-center gap-1">
                Remind days before
                <input
                  type="number"
                  min={0}
                  max={27}
                  value={rentLeadDays}
                  disabled={savingRentSetting}
                  onChange={(e) => setRentLeadDays(e.target.value)}
                  onBlur={(e) => handleSaveRentSetting("rentReminderLeadDays", e.target.value)}
                  className="w-12 px-1 py-0.5 text-center rounded border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300"
                />
              </label>
            </div>
          </div>

          {remindMsg && (
            <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">{remindMsg}</p>
          )}
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
            const { tenant } = getTrashAssignment(date, trashTenants);
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

          // Sunday → dishes assignment
          if (date.getDay() === 0) {
            const dishes = getDishesAssignment(date, dishesTenants);
            return (
              <div className="flex flex-col items-center leading-none gap-0.5">
                <span className="text-[10px] leading-none text-teal-500 dark:text-teal-300 truncate max-w-[46px] font-semibold">
                  🍽️ {dishes}
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
            const { hasRecycle } = getTrashAssignment(date, trashTenants);
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

      {/* Detail panel — Sunday click shows dishes for that week */}
      {clickedDishes && selectedSunday && (
        <div className="mt-4 p-4 rounded-md border-l-4 border-teal-400 bg-teal-50 dark:bg-teal-950/30">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm mb-1">
            Sun, {selectedSunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400 text-xs">🍽️ Dish duty:</span>
            <span className="font-medium text-teal-600 dark:text-teal-400">{clickedDishes}</span>
          </div>
        </div>
      )}

      {!clickedTrash && !clickedBathroomSaturday && !clickedDishes && clickedBirthdays.length === 0 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Click a Thursday (trash), Saturday (bathroom), Sunday (dishes), or birthday 🎂 to see details
        </p>
      )}
    </div>
  );
};

export default EventCalendar;
