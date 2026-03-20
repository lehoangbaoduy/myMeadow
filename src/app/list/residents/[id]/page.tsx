import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import TenantProfileForm from "@/components/TenantProfileForm";

export default async function TenantProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const tenant = await prisma.tenant.findUnique({
    where: { id: Number(params.id) },
  });
  if (!tenant) notFound();

  const isAdmin = currentUser.role === "ADMIN";
  const isOwn = currentUser.tenantId === tenant.id;
  const canEdit = isAdmin || isOwn;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/list/residents"
          className="text-sm text-gray-400 hover:text-meadowOrange"
        >
          ← Residents
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{tenant.name}</span>
      </div>

      <div className="bg-white dark:bg-darkCard rounded-xl border border-meadowBorder dark:border-darkBorder p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-meadowMuted dark:bg-darkBorder flex items-center justify-center text-2xl font-bold text-meadowOrange overflow-hidden">
            {tenant.avatarData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/tenants/${tenant.id}/avatar`} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              tenant.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {tenant.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  tenant.gender === "MALE"
                    ? "bg-sky text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-yellow text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                }`}
              >
                {tenant.gender === "MALE" ? "Male" : "Female"}
              </span>
              {tenant.roomNumber && (
                <span className="text-xs text-gray-400">Room {tenant.roomNumber}</span>
              )}
            </div>
          </div>
        </div>

        <TenantProfileForm
          tenantId={tenant.id}
          isAdmin={isAdmin}
          canEdit={canEdit}
          avatarUrl={tenant.avatarData ? `/api/tenants/${tenant.id}/avatar` : null}
          initial={{
            name: tenant.name,
            nickname: tenant.nickname ?? "",
            dob: tenant.dob
              ? new Date(tenant.dob).toISOString().split("T")[0]
              : "",
            gender: tenant.gender,
            roomNumber: tenant.roomNumber ?? "",
            phone: tenant.phone ?? "",
            email: tenant.email ?? "",
            notes: tenant.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
