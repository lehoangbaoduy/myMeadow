import { cookies } from "next/headers";

export type ViewMode = "pc" | "mobile";

export const VIEW_MODE_COOKIE = "mm_view";

export async function getViewMode(): Promise<ViewMode | null> {
  const store = await cookies();
  const value = store.get(VIEW_MODE_COOKIE)?.value;
  return value === "pc" || value === "mobile" ? value : null;
}
