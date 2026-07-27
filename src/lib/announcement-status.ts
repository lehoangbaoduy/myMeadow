export type AnnouncementEffectiveStatus = "ARCHIVED" | "EXPIRED" | "CLEARED" | "ACTIVE";

export interface AnnouncementStatusInputs {
  status: string;
  expiresAt: Date | string | null;
  clearedAt: Date | string | null;
}

/** Priority order: ARCHIVED > EXPIRED > CLEARED > ACTIVE. See silly-seeking-glacier.md decisions. */
export function effectiveAnnouncementStatus(
  a: AnnouncementStatusInputs,
  now: Date = new Date()
): AnnouncementEffectiveStatus {
  if (a.status === "ARCHIVED") return "ARCHIVED";
  if (a.expiresAt && new Date(a.expiresAt).getTime() < now.getTime()) return "EXPIRED";
  if (a.clearedAt) return "CLEARED";
  return "ACTIVE";
}
