import { prisma } from "@/lib/prisma";
import { isPlaceholderClerkId, PLACEHOLDER_CLERK_PREFIX } from "@/lib/tenant-placeholder";
import MobileCard from "./MobileCard";

const MobileResidentCount = async () => {
  const tenantRows = await prisma.tenant.findMany({
    where: { OR: [{ isActive: true }, { user: { clerkId: { startsWith: PLACEHOLDER_CLERK_PREFIX } } }] },
    select: { name: true, gender: true, user: { select: { clerkId: true } } },
    orderBy: { name: "asc" },
  });
  const tenants = tenantRows.map(({ user, ...t }) => ({ ...t, isPlaceholder: isPlaceholderClerkId(user.clerkId) }));

  const males = tenants.filter((t) => t.gender === "MALE");
  const females = tenants.filter((t) => t.gender === "FEMALE");

  return (
    <MobileCard>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Residents</h2>
        <span className="text-xs text-gray-500">Total: {tenants.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-meadowOrange" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Male ({males.length})</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {males.map((t) => (
              <span
                key={t.name}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-meadowMuted dark:bg-darkBorder text-gray-600 dark:text-gray-300 font-medium"
              >
                {t.name}
                {t.isPlaceholder && <span className="italic text-gray-400 dark:text-gray-500"> (placeholder)</span>}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Female ({females.length})</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {females.map((t) => (
              <span
                key={t.name}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-meadowMuted dark:bg-darkBorder text-gray-600 dark:text-gray-300 font-medium"
              >
                {t.name}
                {t.isPlaceholder && <span className="italic text-gray-400 dark:text-gray-500"> (placeholder)</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MobileCard>
  );
};

export default MobileResidentCount;
