interface Props {
  className?: string;
  children: React.ReactNode;
}

/** Shared rounded-card primitive for mobile screens — reuses the same tokens as the desktop card style. */
export default function MobileCard({ className = "", children }: Props) {
  return (
    <div
      className={`bg-white dark:bg-darkCard rounded-2xl border border-meadowBorder dark:border-darkBorder shadow-[var(--shadow-card)] p-4 ${className}`}
    >
      {children}
    </div>
  );
}
