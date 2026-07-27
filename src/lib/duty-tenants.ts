import { getEffectiveRosterLabels, type RosterLabelEntry } from "@/lib/rotation-core";

/**
 * Single source of truth for who's in each rotation (trash/bathroom/dishes),
 * resolved from RotationUnit/RotationTeamMember rather than the old per-tenant
 * duty flags. Trash and dishes intentionally read the SAME roster
 * (rotationType TRASH_DISHES) — that shared query is what keeps the two
 * chores in sync (feature #3): advancing one roster advances both.
 *
 * Placeholder residents (reserved room slots, no real login) never appear
 * here — RotationUnit membership is admin-managed and placeholders are
 * excluded from rotations entirely.
 */

export type { RosterLabelEntry };

export function getTrashDutyRoster(): Promise<RosterLabelEntry[]> {
  return getEffectiveRosterLabels("TRASH_DISHES");
}

export function getDishesDutyRoster(): Promise<RosterLabelEntry[]> {
  return getEffectiveRosterLabels("TRASH_DISHES");
}

export function getBathroomDutyRoster(): Promise<RosterLabelEntry[]> {
  return getEffectiveRosterLabels("BATHROOM");
}
