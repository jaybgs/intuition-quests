/**
 * Truncates username to maximum 7 characters for display
 * @param username - The username to truncate
 * @param maxLength - Maximum length (default: 7)
 * @returns Truncated username
 */
export function truncateUsername(username: string | null | undefined, maxLength: number = 7): string {
  if (!username) return '';
  return username.length > maxLength ? username.slice(0, maxLength) : username;
}



