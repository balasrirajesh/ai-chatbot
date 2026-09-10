import path from 'path';

export class InputValidator {
  /**
   * Validate raw Job Description text
   */
  static validateJdText(text) {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Job Description cannot be empty.' };
    }

    const trimmed = text.trim();
    if (trimmed.length < 30) {
      return { 
        isValid: false, 
        error: 'Job Description is too short (minimum 30 characters). Please provide more details about the role and requirements.' 
      };
    }

    if (trimmed.length > 50000) {
      return {
        isValid: false,
        error: 'Job Description exceeds maximum supported size (50,000 characters). Please provide a concise summary.'
      };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Validate extracted Resume text
   */
  static validateResumeText(text, filename = '') {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: `Resume "${filename}" contains no extractable text.` };
    }

    const trimmed = text.trim();
    if (trimmed.length < 30) {
      return { 
        isValid: false, 
        error: `Resume "${filename}" appears empty or contains insufficient text to evaluate.` 
      };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Validate document file upload metadata (Supports PDF, DOCX, and TXT only)
   */
  static validateDocumentFile(filename, fileSizeMb, maxAllowedMb = 10) {
    const ext = (path.extname(filename || '') || '').toLowerCase();
    const supportedExts = ['.pdf', '.docx', '.txt'];

    if (!supportedExts.includes(ext)) {
      return {
        isValid: false,
        error: `Unsupported file type (${ext || 'unknown'}). Please upload a PDF or DOCX file.`
      };
    }

    if (fileSizeMb > maxAllowedMb) {
      return {
        isValid: false,
        error: `File exceeds maximum allowed size of ${maxAllowedMb}MB.`
      };
    }

    return { isValid: true, extension: ext };
  }
}
