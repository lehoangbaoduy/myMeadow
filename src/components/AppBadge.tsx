"use client";

import { useEffect } from "react";

// The Badging API is Chromium/Android-only — no iOS Safari support even
// when installed as a PWA. Feature-detected below, so this is a silent
// no-op everywhere else.
const POLL_INTERVAL_MS = 60_000;

export default function AppBadge() {
  useEffect(() => {
    if (!("setAppBadge" in navigator) || !("clearAppBadge" in navigator)) return;

    let cancelled = false;

    const updateBadge = async () => {
      try {
        const res = await fetch("/api/notifications/pending-count");
        if (!res.ok || cancelled) return;
        const { count } = await res.json();
        if (count > 0) await navigator.setAppBadge(count);
        else await navigator.clearAppBadge();
      } catch {
        // Best-effort — badge staleness isn't worth surfacing to the user.
      }
    };

    updateBadge();
    const intervalId = setInterval(updateBadge, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") updateBadge();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
