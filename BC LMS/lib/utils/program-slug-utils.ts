// Program slug utility — URL-safe slug generator for program names
// Extracted from program-actions.ts (cannot export sync functions from 'use server' files)

/** Auto-generate a URL-safe slug from a program name */
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
