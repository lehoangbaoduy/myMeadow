import { prisma } from "@/lib/prisma";
import { isPlaceholderClerkId, PLACEHOLDER_CLERK_PREFIX } from "@/lib/tenant-placeholder";

const ResidentCount = async () => {
  const tenantRows = await prisma.tenant.findMany({
    // Active residents plus reserved placeholder rooms both count toward the roster.
    where: { OR: [{ isActive: true }, { user: { clerkId: { startsWith: PLACEHOLDER_CLERK_PREFIX } } }] },
    select: { name: true, gender: true, user: { select: { clerkId: true } } },
    orderBy: { name: "asc" },
  });
  const tenants = tenantRows.map(({ user, ...t }) => ({ ...t, isPlaceholder: isPlaceholderClerkId(user.clerkId) }));

  const males = tenants.filter((t) => t.gender === "MALE");
  const females = tenants.filter((t) => t.gender === "FEMALE");
  const total = tenants.length;

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl p-5 border border-gray-300 dark:border-darkBorder shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Residents</h2>
        <span className="text-xs text-gray-500">Total: {total}</span>
      </div>
      <div className="flex gap-6">
        {/* Male */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-meadowOrange" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Male ({males.length})
            </span>
          </div>
          <ul className="flex flex-col gap-0.5">
            {males.map((t) => (
              <li key={t.name} className="text-xs text-gray-500 dark:text-gray-400 pl-5">
                {t.name}
                {t.isPlaceholder && <span className="italic text-gray-400 dark:text-gray-500"> (placeholder)</span>}
              </li>
            ))}
          </ul>
        </div>
        {/* Female */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-yellow" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Female ({females.length})
            </span>
          </div>
          <ul className="flex flex-col gap-0.5">
            {females.map((t) => (
              <li key={t.name} className="text-xs text-gray-500 dark:text-gray-400 pl-5">
                {t.name}
                {t.isPlaceholder && <span className="italic text-gray-400 dark:text-gray-500"> (placeholder)</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResidentCount;
