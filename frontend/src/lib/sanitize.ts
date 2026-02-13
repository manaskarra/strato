/**
 * HTML Sanitization Utilities
 *
 * Safely sanitizes HTML content to prevent XSS attacks
 */

/**
 * Sanitize HTML by removing dangerous tags and attributes
 * Uses allowlist approach - only permits safe tags/attributes
 */
export function sanitizeHTML(html: string): string {
  // Allowlisted safe tags
  const allowedTags = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'span'];

  // Allowlisted safe attributes with their allowed values
  const allowedAttributes: Record<string, string[]> = {
    'class': [], // Any class is OK for styling
  };

  // Remove all script tags and their content
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:text\/html/gi, ''); // Remove data URLs

  // Only allow permitted tags
  const tagRegex = /<\/?(\w+)[^>]*>/g;
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      // Keep only safe attributes
      return match.replace(/\s+(\w+)\s*=\s*["']([^"']*)["']/g, (attrMatch, attrName, attrValue) => {
        if (attrName.toLowerCase() in allowedAttributes) {
          // Escape attribute value
          const escapedValue = attrValue
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
          return ` ${attrName}="${escapedValue}"`;
        }
        return '';
      });
    }
    return ''; // Strip disallowed tags
  });

  return sanitized;
}

/**
 * Convert markdown-style formatting to safe HTML
 * Alternative to dangerouslySetInnerHTML
 */
export function markdownToSafeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Escape HTML first to prevent injection
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Now safely convert markdown patterns
  escaped = escaped
    // Bold text: **text** -> <strong>text</strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic text: *text* -> <em>text</em>
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Bullet points: - text -> <li>text</li>
    .replace(/^- (.+)$/gm, '<li>$1</li>');

  // Wrap lists
  escaped = escaped.replace(/(<li>.*<\/li>)/s, (match) => {
    return `<ul class="list-disc pl-4 space-y-1">${match}</ul>`;
  });

  // Wrap paragraphs (split on double newlines)
  const paragraphs = escaped.split('\n\n').map(para => {
    if (para.includes('<li>') || para.includes('<ul>')) {
      return para;
    }
    if (para.trim()) {
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }
    return '';
  }).filter(Boolean);

  return paragraphs.join('');
}

/**
 * Sanitize text content (no HTML allowed)
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
