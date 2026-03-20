import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MaintenanceRequest } from "@prisma/client";
import { redirect } from "next/navigation";
import TenantProfileForm from "@/components/TenantProfileForm";
import ProfileRequestButtons from "@/components/ProfileRequestButtons";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  if (!currentUser.tenantId) redirect("/sign-in");

  const tenant = await prisma.tenant.findUnique({
    where: { id: currentUser.tenantId },
  });
  if (!tenant) redirect("/sign-in");

  const pendingRequests = await prisma.maintenanceRequest.findMany({
    where: { tenantId: tenant.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      {/* Header with avatar, name, and action buttons */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-meadowMuted dark:bg-darkBorder flex items-center justify-center text-xl font-bold text-meadowOrange overflow-hidden flex-shrink-0">
            {tenant.avatarData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/tenants/${tenant.id}/avatar`} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              (tenant.nickname ?? tenant.name).charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{tenant.nickname ?? tenant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                tenant.gender === "MALE"
                  ? "bg-sky text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-yellow text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              }`}>
                {tenant.gender === "MALE" ? "Male" : "Female"}
              </span>
              {tenant.roomNumber && (
                <span className="text-xs text-gray-400">Room {tenant.roomNumber}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <ProfileRequestButtons
          tenantName={tenant.name}
          pendingRequests={pendingRequests.map((r: MaintenanceRequest) => ({
            id: r.id,
            requestType: r.requestType,
            description: r.description,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>

      {/* Horizontal profile form card */}
      <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-5">
          Profile Information
        </h2>
        <TenantProfileForm
          tenantId={tenant.id}
          isAdmin={false}
          canEdit={true}
          avatarUrl={tenant.avatarData ? `/api/tenants/${tenant.id}/avatar` : null}
          initial={{
            name: tenant.name,
            nickname: tenant.nickname ?? "",
            dob: tenant.dob ? new Date(tenant.dob).toISOString().split("T")[0] : "",
            gender: tenant.gender,
            roomNumber: tenant.roomNumber ?? "",
            notes: tenant.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
