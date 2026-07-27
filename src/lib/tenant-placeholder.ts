export const PLACEHOLDER_CLERK_PREFIX = "manual_";

export function isPlaceholderClerkId(clerkId: string): boolean {
  return clerkId.startsWith(PLACEHOLDER_CLERK_PREFIX);
}

/** Bare Date.now() can collide when two placeholders are created in the same millisecond (e.g. rapid double-submit); the random suffix makes clerkId collisions practically impossible without needing a DB round-trip to check. */
export function makePlaceholderClerkId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${PLACEHOLDER_CLERK_PREFIX}${Date.now()}_${random}`;
}
