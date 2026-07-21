export interface BillRow {
  id: number; month: number; year: number;
  electric: number; electricUsage: number | null; electricPrice: number | null;
  gas: number; gasUsage: number | null; gasPrice: number | null;
  water: number; waterUsage: number | null; waterPrice: number | null;
  wifi: number; wifiPrice: number | null;
}
export interface DocRow {
  id: number; month: number; year: number; utilityType: string;
  fileName: string; filePath: string;
  billStartDate: string | null; billEndDate: string | null;
}
export interface OcrResult {
  billingMonth: number | null; billingYear: number | null;
  billingPeriodStart: string | null; billingPeriodEnd: string | null;
  totalAmount: number | null; usage: number | null; pricePerUnit: number | null;
}
export interface ReviewForm {
  month: number; year: number;
  billStart: string; billEnd: string;
  amount: string; usage: string; price: string;
}
export interface TenantShareRow {
  id: number;
  name: string;
  utilityShare: number;
  isPlaceholder: boolean;
}
export interface UtilitiesProps {
  isAdmin: boolean;
  bills: BillRow[];
  documents: DocRow[];
  tenantName: string | null;
  tenantId: number | null;
  tenants: TenantShareRow[];
  currentMonth: number;
  currentYear: number;
}

export type UtilType = "electric" | "gas" | "water" | "wifi";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const UTIL_COLORS: Record<UtilType, string> = { electric: "#F59E0B", gas: "#EF4444", water: "#06B6D4", wifi: "#8B5CF6" };
export const UTIL_LABELS: Record<UtilType, string> = { electric: "Electric", gas: "Gas", water: "Water", wifi: "WiFi" };
export const UTIL_UNITS: Record<UtilType, string> = { electric: "kWh", gas: "m³", water: "m³", wifi: "month" };
export const TODAY_YEAR = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: TODAY_YEAR - 2024 + 1 }, (_, i) => 2024 + i);

export function getYearRange(year: number) {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year }));
}

export function fmtLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${String(year).slice(2)}`;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
