"use client";

import { useEffect, useState } from "react";

export type ReminderType = "trash" | "bathroom" | "dishes" | "rent";

const AUTO_SETTING_KEY: Record<ReminderType, string> = {
  trash: "autoTrashReminder",
  bathroom: "autoBathroomReminder",
  dishes: "autoDishesReminder",
  rent: "autoRentReminder",
};

/**
 * Admin reminder-card state (auto-toggle settings, rent due-day config, "send now")
 * shared by the desktop `EventCalendar` and its mobile counterpart — one fetch/save
 * path so both surfaces stay in sync with `/api/settings` and `/api/remind`.
 */
export function useReminderControls(isAdmin: boolean) {
  const [reminding, setReminding] = useState<ReminderType | null>(null);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);
  const [autoTrash, setAutoTrash] = useState(true);
  const [autoBathroom, setAutoBathroom] = useState(true);
  const [autoDishes, setAutoDishes] = useState(true);
  const [autoRent, setAutoRent] = useState(true);
  const [togglingAuto, setTogglingAuto] = useState<ReminderType | null>(null);
  const [rentDueDay, setRentDueDay] = useState("1");
  const [rentLeadDays, setRentLeadDays] = useState("3");
  const [savingRentSetting, setSavingRentSetting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.autoTrashReminder !== undefined) setAutoTrash(data.autoTrashReminder === "true");
        if (data.autoBathroomReminder !== undefined) setAutoBathroom(data.autoBathroomReminder === "true");
        if (data.autoDishesReminder !== undefined) setAutoDishes(data.autoDishesReminder === "true");
        if (data.autoRentReminder !== undefined) setAutoRent(data.autoRentReminder === "true");
        if (data.rentDueDay !== undefined) setRentDueDay(data.rentDueDay);
        if (data.rentReminderLeadDays !== undefined) setRentLeadDays(data.rentReminderLeadDays);
      })
      .catch(() => null);
  }, [isAdmin]);

  const handleToggleAuto = async (type: ReminderType) => {
    const key = AUTO_SETTING_KEY[type];
    const current = type === "trash" ? autoTrash : type === "bathroom" ? autoBathroom : type === "dishes" ? autoDishes : autoRent;
    const newValue = !current;
    setTogglingAuto(type);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: String(newValue) }),
    }).catch(() => null);
    if (type === "trash") setAutoTrash(newValue);
    else if (type === "bathroom") setAutoBathroom(newValue);
    else if (type === "dishes") setAutoDishes(newValue);
    else setAutoRent(newValue);
    setTogglingAuto(null);
  };

  const handleSaveRentSetting = async (key: "rentDueDay" | "rentReminderLeadDays", value: string) => {
    if (!/^\d+$/.test(value)) return;
    setSavingRentSetting(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).catch(() => null);
    setSavingRentSetting(false);
  };

  const handleRemind = async (type: ReminderType) => {
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
        const notifiedText = Array.isArray(data.notified)
          ? data.notified.length > 0 ? data.notified.join(", ") : "nobody (no one due yet)"
          : data.notified;
        setRemindMsg(`✓ Notified ${notifiedText}!`);
      } else {
        setRemindMsg(`Error: ${data.error}`);
      }
    } catch {
      setRemindMsg("Failed to send reminder");
    }
    setReminding(null);
    setTimeout(() => setRemindMsg(null), 4000);
  };

  return {
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
  };
}
