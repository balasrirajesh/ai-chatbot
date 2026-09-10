import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { TextNormalizer } from './textNormalizer.js';

export class DocumentParser {
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
    const cleaned = TextNormalizer.normalize(data.text);
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
    const cleaned = TextNormalizer.normalize(result.value);
    if (!cleaned || cleaned.length < 20) {
      throw new Error('DOCX document contained insufficient or unextractable text.');
    }
    return cleaned;
  }

  /**
   * Generic extractor based on file extension (Supports PDF, DOCX, and TXT only)
   */
  static async parseDocument(filePath, originalFilename = '') {
    const ext = (path.extname(originalFilename || filePath) || '').toLowerCase();
    
    if (ext === '.pdf') {
      return await this.parsePDF(filePath);
    } else if (ext === '.docx') {
      return await this.parseDOCX(filePath);
    } else if (ext === '.txt') {
      const content = await fs.readFile(filePath, 'utf-8');
      return TextNormalizer.normalize(content);
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
      // Ignore cleanup errors
    }
  }
}
