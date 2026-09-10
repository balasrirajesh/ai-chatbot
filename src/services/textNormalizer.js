export class TextNormalizer {
  /**
   * Normalizes document text while preserving section boundaries, bullet points, and dates
   * @param {string} text 
   * @returns {string} Cleaned and normalized text
   */
  static normalize(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      // Replace non-standard line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove invisible / zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Replace non-standard whitespace and tabs
      .replace(/[\t\f\v]/g, ' ')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      // Collapse multiple spaces
      .replace(/[ ]{2,}/g, ' ')
      // Normalize excessive empty lines while preserving paragraph spacing
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
