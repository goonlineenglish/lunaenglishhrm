/**
 * Render a template string by replacing {{placeholder}} tokens with values.
 * Unknown placeholders are replaced with empty string.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
