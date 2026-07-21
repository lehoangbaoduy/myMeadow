"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** Native-feeling slide-up sheet — the mobile-mode replacement for centered desktop modals. */
export default function MobileBottomSheet({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-darkCard rounded-t-3xl border-t border-meadowBorder dark:border-darkBorder shadow-[var(--shadow-modal)] max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] animate-[mm-sheet-up_0.25s_ease-out]">
        <div className="sticky top-0 bg-white dark:bg-darkCard flex items-center justify-center px-5 pt-4 pb-3 border-b border-meadowBorder dark:border-darkBorder relative">
          <span className="w-10 h-1 rounded-full bg-meadowBorder dark:bg-darkBorder absolute left-1/2 -translate-x-1/2 top-2" />
          {title && <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1.5">{title}</h2>}
          <button
            onClick={onClose}
            className="absolute right-4 top-3 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-meadowMuted dark:hover:bg-darkBorder transition-colors text-xl font-bold"
          >
            &times;
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
