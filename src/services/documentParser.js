import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class DocumentParser {
  /**
   * Cleans and normalizes extracted text
   */
  static cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Parse PDF buffer or file path
   */
  static async parsePDF(input) {
    let buffer;
    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else if (typeof input === 'string') {
      buffer = await fs.readFile(input);
    } else {
      throw new Error('Invalid input for PDF parsing: expected Buffer or filepath string');
    }

    const data = await pdfParse(buffer);
    const cleaned = this.cleanText(data.text);
    if (!cleaned || cleaned.length < 20) {
      throw new Error('PDF document contained insufficient or unextractable text.');
    }
    return cleaned;
  }

  /**
   * Parse DOCX buffer or file path
   */
  static async parseDOCX(input) {
    let buffer;
    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else if (typeof input === 'string') {
      buffer = await fs.readFile(input);
    } else {
      throw new Error('Invalid input for DOCX parsing: expected Buffer or filepath string');
    }

    const result = await mammoth.extractRawText({ buffer });
    const cleaned = this.cleanText(result.value);
    if (!cleaned || cleaned.length < 20) {
      throw new Error('DOCX document contained insufficient or unextractable text.');
    }
    return cleaned;
  }

  /**
   * Generic extractor based on file extension / mime type
   */
  static async parseDocument(filePath, originalFilename = '') {
    const ext = (path.extname(originalFilename || filePath) || '').toLowerCase();
    
    if (ext === '.pdf') {
      return await this.parsePDF(filePath);
    } else if (ext === '.docx' || ext === '.doc') {
      return await this.parseDOCX(filePath);
    } else if (ext === '.txt') {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.cleanText(content);
    } else {
      throw new Error(`Unsupported document format: ${ext || 'unknown'}. Please upload PDF or DOCX.`);
    }
  }

  /**
   * Safely delete temporary file
   */
  static async cleanupFile(filePath) {
    try {
      if (filePath) {
        await fs.unlink(filePath);
      }
    } catch (err) {
      // Ignore cleanup errors (e.g. file already gone)
    }
  }
}
