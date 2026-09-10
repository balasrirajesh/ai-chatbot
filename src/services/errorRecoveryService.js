export class ErrorRecoveryService {
  static ERROR_TYPES = {
    AI_TIMEOUT: 'AI_TIMEOUT',
    AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
    DOCUMENT_PARSE_ERROR: 'DOCUMENT_PARSE_ERROR',
    UNSUPPORTED_FILE: 'UNSUPPORTED_FILE',
    TELEGRAM_ERROR: 'TELEGRAM_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  /**
   * Classify error and generate a user-friendly recovery message
   * @param {Error} error 
   * @returns {{ errorType: string, message: string, retryable: boolean }}
   */
  static classifyError(error) {
    const msg = error?.message || 'Unknown error occurred';

    if (/timed out/i.test(msg)) {
      return {
        errorType: this.ERROR_TYPES.AI_TIMEOUT,
        message: 'The AI request timed out. Please retry in a few seconds.',
        retryable: true
      };
    }

    if (/parse|extract|corrupt|unreadable/i.test(msg)) {
      return {
        errorType: this.ERROR_TYPES.DOCUMENT_PARSE_ERROR,
        message: 'Could not extract text from document. Please ensure the PDF/DOCX is not corrupted.',
        retryable: false
      };
    }

    if (/unsupported file/i.test(msg)) {
      return {
        errorType: this.ERROR_TYPES.UNSUPPORTED_FILE,
        message: 'Unsupported document format. Please upload PDF or DOCX.',
        retryable: false
      };
    }

    if (/telegram|400|403|429/i.test(msg)) {
      return {
        errorType: this.ERROR_TYPES.TELEGRAM_ERROR,
        message: 'Telegram communication issue. Retrying...',
        retryable: true
      };
    }

    return {
      errorType: this.ERROR_TYPES.UNKNOWN_ERROR,
      message: msg,
      retryable: false
    };
  }
}
