/**
 * Constructs a full display name from first and last name.
 */
export function getFullName(
  user: { firstName?: string; lastName?: string } | null | undefined
): string {
  if (!user) return "User";
  const first = user.firstName ?? "";
  const last = user.lastName ?? "";
  return `${first} ${last}`.trim() || "User";
}

/**
 * Derives initials from first and last name.
 * Returns first letter of firstName + first letter of lastName.
 * Falls back to first two letters of firstName if no lastName.
 */
export function getInitials(
  user: { firstName?: string; lastName?: string } | null | undefined
): string {
  if (!user?.firstName) return "?";
  if (user.lastName) {
    return (user.firstName[0] + user.lastName[0]).toUpperCase();
  }
  return user.firstName.slice(0, 2).toUpperCase();
}
