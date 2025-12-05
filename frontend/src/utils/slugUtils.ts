/**
 * Generates a URL-friendly slug from a space name
 * Examples:
 * - "TrustQuests" -> "trustquests"
 * - "My Awesome Space" -> "my-awesome-space"
 * - "Space123!" -> "space123"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with a single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Checks if a slug is valid (non-empty and URL-safe)
 */
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && /^[a-z0-9-]+$/.test(slug);
}

/**
 * Ensures a slug is unique by appending a number if needed
 */
export function ensureUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}






