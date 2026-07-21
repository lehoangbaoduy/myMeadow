import TenantProfileForm from "@/components/TenantProfileForm";
import ProfileRequestButtons from "@/components/ProfileRequestButtons";
import MobileCard from "./MobileCard";

interface PendingRequest {
  id: number;
  requestType: string;
  description: string;
  status: string;
  createdAt: string;
}

interface TenantData {
  id: number;
  name: string;
  nickname: string | null;
  dob: string;
  gender: string;
  roomNumber: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  avatarUrl: string | null;
}

interface Props {
  tenant: TenantData;
  pendingRequests: PendingRequest[];
}

export default function MobileProfileClient({ tenant, pendingRequests }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <MobileCard className="flex flex-col items-center text-center gap-3">
        <div className="w-20 h-20 rounded-full bg-meadowMuted dark:bg-darkBorder flex items-center justify-center text-2xl font-bold text-meadowOrange overflow-hidden flex-shrink-0">
          {tenant.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            (tenant.nickname ?? tenant.name).charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">{tenant.nickname ?? tenant.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1.5">
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
        <ProfileRequestButtons tenantName={tenant.name} pendingRequests={pendingRequests} />
      </MobileCard>

      <MobileCard>
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Profile Information
        </h2>
        <TenantProfileForm
          tenantId={tenant.id}
          isAdmin={false}
          canEdit={true}
          avatarUrl={tenant.avatarUrl}
          initial={{
            name: tenant.name,
            nickname: tenant.nickname ?? "",
            dob: tenant.dob,
            gender: tenant.gender,
            roomNumber: tenant.roomNumber ?? "",
            phone: tenant.phone ?? "",
            email: tenant.email ?? "",
            notes: tenant.notes ?? "",
          }}
        />
      </MobileCard>
    </div>
  );
}
