export interface TenantRow {
  id: number;
  name: string;
  nickname: string | null;
  dob: Date | null;
  gender: string;
  roomNumber: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  deactivatedAt: Date | null;
  rentAmount: number | null;
  createdAt: Date;
  isPlaceholder: boolean;
}

export interface MaintenanceReq {
  id: number;
  requestType: string;
  description: string;
  status: string;
  createdAt: string;
  tenant?: { name: string };
}

export interface EditForm {
  name: string;
  nickname: string;
  dob: string;
  gender: string;
  roomNumber: string;
  phone: string;
  email: string;
  notes: string;
  rentAmount: string;
}

export interface AddPlaceholderForm {
  name: string;
  gender: string;
  roomNumber: string;
  rentAmount: string;
  notes: string;
}

export const emptyAddForm: AddPlaceholderForm = {
  name: "",
  gender: "MALE",
  roomNumber: "",
  rentAmount: "",
  notes: "",
};

export function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
