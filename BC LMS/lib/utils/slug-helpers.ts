// Slug helpers — URL-safe slug generation for programs and other entities
// This is a plain utility (not 'use server') so it can be used in client components

/**
 * Auto-generate a URL-safe slug from a display name.
 * Strips Vietnamese diacritics, lowercases, replaces spaces with hyphens.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
