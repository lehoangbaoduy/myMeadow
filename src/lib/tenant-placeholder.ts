export const PLACEHOLDER_CLERK_PREFIX = "manual_";

export function isPlaceholderClerkId(clerkId: string): boolean {
  return clerkId.startsWith(PLACEHOLDER_CLERK_PREFIX);
}

export function makePlaceholderClerkId(): string {
  return `${PLACEHOLDER_CLERK_PREFIX}${Date.now()}`;
}
