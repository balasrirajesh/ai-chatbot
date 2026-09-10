import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config/index.js';
import { DocumentParser } from './documentParser.js';

export class TelegramFileService {
  /**
   * Securely download a Telegram document, extract its text, and clean up temporary storage
   * @param {Object} ctx - Telegraf context
   * @param {Object} document - Telegram document metadata
   * @returns {Promise<{ extractedText: string, filename: string, fileSizeMb: number }>}
   */
  static async downloadAndExtract(ctx, document) {
    if (!document || !document.file_id) {
      throw new Error('Invalid document metadata provided.');
    }

    const filename = document.file_name || 'document';
    const fileSizeMb = (document.file_size || 0) / (1024 * 1024);

    if (fileSizeMb > config.processing.maxFileSizeMb) {
      throw new Error(`File is too large (${fileSizeMb.toFixed(1)}MB). Max allowed size is ${config.processing.maxFileSizeMb}MB.`);
    }

    // Ensure temp upload dir exists
    if (!fs.existsSync(config.processing.tempUploadDir)) {
      fs.mkdirSync(config.processing.tempUploadDir, { recursive: true });
    }

    const tempPath = path.join(config.processing.tempUploadDir, `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    
    try {
      // 1. Get file download link from Telegram
      const fileUrl = await ctx.telegram.getFileLink(document.file_id);

      // 2. Stream/download to temporary disk
      const response = await axios({
        method: 'get',
        url: fileUrl.href,
        responseType: 'arraybuffer',
        timeout: 20000
      });

      await fs.promises.writeFile(tempPath, response.data);

      // 3. Extract and normalize text
      const extractedText = await DocumentParser.parseDocument(tempPath, filename);

      return {
        extractedText,
        filename,
        fileSizeMb
      };
    } finally {
      // 4. Guaranteed cleanup
      await DocumentParser.cleanupFile(tempPath);
    }
  }
}
