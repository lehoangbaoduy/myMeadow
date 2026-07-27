"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useClerk } from "@clerk/nextjs";

interface Props {
  userName: string;
  userRole: string;
  avatarUrl: string | null;
  tenantInitial: string;
  viewMode: "pc" | "mobile";
}

export default function NavbarUserMenu({ userName, userRole, avatarUrl, tenantInitial, viewMode }: Props) {
  const { signOut, openUserProfile } = useClerk();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [switchingView, setSwitchingView] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    setSigningOut(true);
    // Two rAF frames so the element mounts before the transition starts
    requestAnimationFrame(() => requestAnimationFrame(() => setOverlayVisible(true)));
    // Let the fade-in finish, then sign out (redirect acts as the "fade out")
    await new Promise((r) => setTimeout(r, 600));
    await signOut({ redirectUrl: "/sign-in" });
  };

  const handleSwitchView = async () => {
    setOpen(false);
    setSwitchingView(true);
    const nextMode = viewMode === "mobile" ? "pc" : "mobile";
    await fetch("/api/view-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode }),
    }).catch(() => null);
    window.location.reload();
  };

  return (
    <>
      {/* Full-screen sign-out overlay — portalled to body to escape backdrop-blur containing block */}
      {signingOut && typeof document !== "undefined" && createPortal(
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-darkCard transition-opacity duration-500 ${
            overlayVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="w-9 h-9 border-[3px] border-meadowBorder dark:border-darkBorder border-t-meadowOrange rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400 dark:text-gray-500 tracking-wide">Signing out…</p>
        </div>,
        document.body
      )}

      <div className="relative" ref={menuRef}>
        {/* Avatar button */}
        <button
          onClick={() => setOpen((p) => !p)}
          className="w-8 h-8 rounded-full ring-2 ring-meadowOrange/20 bg-meadowMuted dark:bg-darkBorder flex items-center justify-center text-sm font-bold text-meadowOrange overflow-hidden focus:outline-none focus:ring-meadowOrange/50"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            tenantInitial
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-darkCard border border-meadowBorder dark:border-darkBorder rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-meadowBorder dark:border-darkBorder">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{userName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{userRole === "ADMIN" ? "Administrator" : "Tenant"}</p>
            </div>
            <button
              onClick={() => { setOpen(false); openUserProfile(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors"
            >
              Manage Account
            </button>
            <button
              onClick={handleSwitchView}
              disabled={switchingView}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-meadowMuted dark:hover:bg-darkSurface transition-colors disabled:opacity-50"
            >
              {switchingView
                ? "Switching…"
                : viewMode === "mobile" ? "🖥️ Switch to PC view" : "📱 Switch to Mobile view"}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  );
}
