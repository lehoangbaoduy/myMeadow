export interface PersonalInventoryItem {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  description: string | null;
  expirationDate: string | null;
  lowStockThreshold: number | null;
}

export interface PersonalInventoryList {
  id: number;
  name: string;
  items: PersonalInventoryItem[];
  sharedWith: { tenantId: number; name: string }[];
}

export interface SharedPersonalInventoryList {
  id: number;
  name: string;
  ownerTenantId: number;
  ownerName: string;
  items: PersonalInventoryItem[];
}

export type PersonalInventoryItemInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  description: string | null;
  expirationDate: string | null;
  lowStockThreshold: number | null;
};

export function isLowStock(item: { quantity: number | null; lowStockThreshold: number | null }): boolean {
  if (item.quantity === null || item.lowStockThreshold === null) return false;
  return item.quantity <= item.lowStockThreshold;
}

export function isExpiringSoon(item: { expirationDate: string | null }, withinDays = 7): boolean {
  if (!item.expirationDate) return false;
  const days = (new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days <= withinDays;
}

export function isExpired(item: { expirationDate: string | null }): boolean {
  if (!item.expirationDate) return false;
  return new Date(item.expirationDate).getTime() < Date.now();
}
