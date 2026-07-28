import { getRotationScheduleSource, type RosterLabelEntry, type RotationScheduleSource } from "@/lib/rotation-core";

/**
 * Single source of truth for who's in each rotation (trash/bathroom/dishes),
 * resolved from RotationUnit/RotationTeamMember rather than the old per-tenant
 * duty flags. Trash and dishes intentionally read the SAME roster
 * (rotationType TRASH_DISHES) — that shared query is what keeps the two
 * chores in sync (feature #3): advancing one roster advances both.
 *
 * Returns the roster plus every recorded shift delta (not a pre-rotated
 * snapshot) so calendar UI can resolve each date's assignment independently
 * via rotation-assignments.ts, correctly reflecting shifts whose
 * effectiveDate falls anywhere in the visible month — not just "today".
 *
 * Placeholder residents (reserved room slots, no real login) never appear
 * here — RotationUnit membership is admin-managed and placeholders are
 * excluded from rotations entirely.
 */

export type { RosterLabelEntry, RotationScheduleSource };

export function getTrashDutyRoster(): Promise<RotationScheduleSource> {
  return getRotationScheduleSource("TRASH_DISHES");
}

export function getDishesDutyRoster(): Promise<RotationScheduleSource> {
  return getRotationScheduleSource("TRASH_DISHES");
}

export function getBathroomDutyRoster(): Promise<RotationScheduleSource> {
  return getRotationScheduleSource("BATHROOM");
}
