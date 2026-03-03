// HTML sanitizer — strips XSS vectors from rich-text content before rendering.
// Uses isomorphic-dompurify so it works in both Node.js (SSR) and browser.

import DOMPurify from 'isomorphic-dompurify';

/** Allowed HTML tags for lesson content (Tiptap output) */
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'span', 'div',
];

/** Allowed attributes (no event handlers) */
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'];

/**
 * Sanitize an HTML string, removing any scripts / event handlers.
 * Safe to pass the result to dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force links to open in new tab safely
    ADD_ATTR: ['target'],
  });
}
