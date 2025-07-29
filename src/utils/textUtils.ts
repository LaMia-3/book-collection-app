/**
 * Utility functions for text processing
 */

/**
 * Cleans HTML tags from a string while preserving basic formatting
 * @param html HTML string to clean
 * @returns Cleaned text with preserved formatting
 */
export const cleanHtml = (html: string): string => {
  if (!html) return '';
  
  // Replace common HTML tags with appropriate text formatting
  const withoutTags = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '');
    
  // Decode HTML entities
  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…');
    
  // Clean up excessive whitespace
  return decoded
    .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
    .replace(/\s+/g, ' ')        // Replace multiple spaces with a single space
    .replace(/ \n/g, '\n')       // Remove spaces before newlines
    .replace(/\n /g, '\n')       // Remove spaces after newlines
    .trim();
};
