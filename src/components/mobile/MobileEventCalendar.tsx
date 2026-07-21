"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { getThursdaysInMonth } from "@/lib/trash-schedule";
import {
  getTrashAssignment,
  getBathroomAssignment,
  getDishesAssignment,
  getThursdayOfSameWeek,
  isSameDay,
} from "@/lib/rotation-assignments";
import { useReminderControls, type ReminderType } from "@/hooks/useReminderControls";
import MobileCard from "./MobileCard";
import MobileBottomSheet from "./MobileBottomSheet";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface Birthday {
  name: string;
  month: number;
  day: number;
}

interface Props {
  isAdmin?: boolean;
  birthdays?: Birthday[];
  trashTenants?: string[];
  bathroomTenants?: string[];
  dishesTenants?: string[];
}

const REMINDER_CARDS: { type: ReminderType; label: string; emoji: string; accent: string }[] = [
  { type: "trash", label: "Trash", emoji: "🗑️", accent: "text-orange-600 dark:text-orange-400" },
  { type: "bathroom", label: "Bathroom", emoji: "✨", accent: "text-blue-600 dark:text-blue-400" },
  { type: "dishes", label: "Dishes", emoji: "🍽️", accent: "text-teal-600 dark:text-teal-400" },
  { type: "rent", label: "Rent", emoji: "🏠", accent: "text-purple-600 dark:text-purple-400" },
];

export default function MobileEventCalendar({
  isAdmin = false,
  birthdays = [],
  trashTenants = [],
  bathroomTenants = [],
  dishesTenants = [],
}: Props) {
  const today = new Date();
  const [selected, setSelected] = useState<Value>(today);
  const [activeStart, setActiveStart] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [detailOpen, setDetailOpen] = useState(false);

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

  const autoByType: Record<ReminderType, boolean> = {
    trash: autoTrash,
    bathroom: autoBathroom,
    dishes: autoDishes,
    rent: autoRent,
  };

  const year = activeStart.getFullYear();
  const month = activeStart.getMonth();
  const thursdaysThisMonth = getThursdaysInMonth(year, month);

  const selectedDate = selected instanceof Date ? selected : today;

  const selectedThursday =
    selectedDate.getDay() === 4 ? thursdaysThisMonth.find((t) => isSameDay(t, selectedDate)) ?? null : null;
  const selectedSaturday = selectedDate.getDay() === 6 ? selectedDate : null;
  const selectedSunday = selectedDate.getDay() === 0 ? selectedDate : null;

  const clickedTrash = selectedThursday ? getTrashAssignment(selectedThursday, trashTenants) : null;
  const clickedBathroomThursday = selectedThursday ? getBathroomAssignment(selectedThursday, bathroomTenants) : null;
  const clickedBathroomSaturday = selectedSaturday
    ? getBathroomAssignment(getThursdayOfSameWeek(selectedSaturday), bathroomTenants)
    : null;
  const clickedDishes = selectedSunday ? getDishesAssignment(selectedSunday, dishesTenants) : null;

  const clickedBirthdays = birthdays.filter(
    (b) => b.month === selectedDate.getMonth() + 1 && b.day === selectedDate.getDate()
  );

  const hasDetail = clickedTrash || clickedBathroomSaturday || clickedDishes || clickedBirthdays.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="flex flex-col gap-2">
          {REMINDER_CARDS.map((card) => (
            <MobileCard key={card.type} className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-semibold ${card.accent}`}>{card.emoji} {card.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleAuto(card.type)}
                  disabled={togglingAuto !== null}
                  title={autoByType[card.type] ? "Auto reminder on" : "Auto reminder off"}
                  className="flex items-center gap-1.5 text-[10px] disabled:opacity-50"
                >
                  <span className={`w-7 h-4 rounded-full transition-colors relative ${autoByType[card.type] ? "bg-meadowOrange" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${autoByType[card.type] ? "left-3.5" : "left-0.5"}`} />
                  </span>
                </button>
                <button
                  onClick={() => handleRemind(card.type)}
                  disabled={reminding !== null}
                  className="text-[11px] font-medium px-3 py-1.5 bg-meadowOrange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {reminding === card.type ? "Sending…" : "Send now"}
                </button>
              </div>
            </MobileCard>
          ))}

          <MobileCard className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
            <label className="flex items-center gap-1.5">
              Rent due day
              <input
                type="number" min={1} max={28} value={rentDueDay} disabled={savingRentSetting}
                onChange={(e) => setRentDueDay(e.target.value)}
                onBlur={(e) => handleSaveRentSetting("rentDueDay", e.target.value)}
                className="w-12 px-1 py-0.5 text-center rounded border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Remind days before
              <input
                type="number" min={0} max={27} value={rentLeadDays} disabled={savingRentSetting}
                onChange={(e) => setRentLeadDays(e.target.value)}
                onBlur={(e) => handleSaveRentSetting("rentReminderLeadDays", e.target.value)}
                className="w-12 px-1 py-0.5 text-center rounded border border-meadowBorder dark:border-darkBorder bg-white dark:bg-darkSurface text-gray-700 dark:text-gray-300"
              />
            </label>
          </MobileCard>

          {remindMsg && (
            <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">{remindMsg}</p>
          )}
        </div>
      )}

      <MobileCard className="mm-mobile-calendar">
        <Calendar
          onChange={(value) => {
            setSelected(value as Value);
            setDetailOpen(true);
          }}
          value={selected}
          onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setActiveStart(activeStartDate)}
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const hasBirthday = birthdays.some((b) => b.month === date.getMonth() + 1 && b.day === date.getDate());
            return hasBirthday ? <span className="text-[9px] leading-none">🎂</span> : null;
          }}
          tileClassName={({ date, view }) => {
            if (view !== "month") return null;
            const classes: string[] = [];
            if (date.getDay() === 4) {
              const { hasRecycle } = getTrashAssignment(date, trashTenants);
              classes.push(hasRecycle ? "thursday-recycle" : "thursday-garbage");
            }
            if (date.getDay() === 6) classes.push("bathroom-tile");
            if (date.getDay() === 0) classes.push("dishes-tile");
            if (birthdays.some((b) => b.month === date.getMonth() + 1 && b.day === date.getDate())) {
              classes.push("birthday-tile");
            }
            return classes.length > 0 ? classes.join(" ") : null;
          }}
        />
      </MobileCard>

      <MobileBottomSheet open={detailOpen && !!hasDetail} onClose={() => setDetailOpen(false)} title={selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}>
        <div className="flex flex-col gap-3">
          {clickedBirthdays.map((b) => (
            <div key={b.name} className="text-sm font-medium text-pink-600 dark:text-pink-400">
              🎉 Happy Birthday, {b.name}!
            </div>
          ))}
          {clickedTrash && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs w-20 pt-0.5">🗑️ Trash:</span>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{clickedTrash.tenant}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit ${
                  clickedTrash.hasRecycle
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                }`}>
                  {clickedTrash.hasRecycle ? "🗑️ Garbage + ♻️ Recycle" : "🗑️ Garbage only"}
                </span>
              </div>
            </div>
          )}
          {clickedTrash && clickedBathroomThursday && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs w-20">✨ Bathroom:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{clickedBathroomThursday}</span>
            </div>
          )}
          {clickedBathroomSaturday && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs w-20">✨ Bathroom:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{clickedBathroomSaturday}</span>
            </div>
          )}
          {clickedDishes && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs w-20">🍽️ Dishes:</span>
              <span className="font-medium text-teal-600 dark:text-teal-400">{clickedDishes}</span>
            </div>
          )}
        </div>
      </MobileBottomSheet>
    </div>
  );
}
