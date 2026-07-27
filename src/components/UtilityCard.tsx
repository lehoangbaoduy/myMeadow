import Image from "next/image";

const TYPE_STYLES: Record<string, { card: string; label: string; dot: string }> = {
  electric: {
    card: "bg-amber-50 dark:bg-darkCard border-amber-400 dark:border-darkBorder",
    label: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  gas: {
    card: "bg-red-50 dark:bg-darkCard border-red-400 dark:border-darkBorder",
    label: "text-red-500 dark:text-red-400",
    dot: "bg-red-400",
  },
  water: {
    card: "bg-cyan-50 dark:bg-darkCard border-cyan-400 dark:border-darkBorder",
    label: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-400",
  },
  wifi: {
    card: "bg-violet-50 dark:bg-darkCard border-violet-400 dark:border-darkBorder",
    label: "text-violet-500 dark:text-violet-400",
    dot: "bg-violet-400",
  },
};

const UtilityCard = ({ type }: { type: string }) => {
  const styles = TYPE_STYLES[type] ?? TYPE_STYLES.electric;
  return (
    <div className={`rounded-2xl p-4 flex-1 min-w-[130px] border-2 ${styles.card}`}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white dark:bg-darkSurface px-2 py-1 rounded-full text-green-600 dark:text-green-400">
          2025/26
        </span>
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className="text-2xl font-semibold my-4 text-gray-800 dark:text-gray-100">1,234</h1>
      <h2 className={`capitalize text-sm font-semibold ${styles.label}`}>{type}</h2>
    </div>
  );
};

export default UtilityCard;