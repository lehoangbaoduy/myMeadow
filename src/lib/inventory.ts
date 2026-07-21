export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  icon: string | null;
  level: number;
  isCustom: boolean;
}

export interface RunOutEntry {
  id: number;
  itemName: string;
  reportedAt: string;
}

export const CATEGORY_ORDER = ["Cooking", "Household", "Cleaning", "Laundry", "Custom"];

export const CATEGORY_ICONS: Record<string, string> = {
  Cooking: "🍳",
  Household: "🏠",
  Cleaning: "🛁",
  Laundry: "🫧",
  Custom: "📦",
};
