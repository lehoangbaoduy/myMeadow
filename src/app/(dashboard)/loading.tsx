export default function DashboardLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      {/* Top cards row */}
      <div className="flex gap-4 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 min-w-[130px] h-28 rounded-2xl bg-gray-200 dark:bg-darkSurface" />
        ))}
      </div>

      {/* Charts row */}
      <div className="flex gap-4 flex-col lg:flex-row">
        <div className="w-full lg:w-1/3 h-[280px] rounded-xl bg-gray-200 dark:bg-darkSurface" />
        <div className="w-full lg:w-2/3 h-[280px] rounded-xl bg-gray-200 dark:bg-darkSurface" />
      </div>

      {/* Wide chart */}
      <div className="w-full h-[200px] rounded-xl bg-gray-200 dark:bg-darkSurface" />
    </div>
  );
}
