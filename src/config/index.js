import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    botMode: process.env.BOT_MODE || 'polling', // 'polling' or 'webhook'
    webhookUrl: process.env.WEBHOOK_URL || '',
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hashira_resume_bot',
  },

  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(), // 'gemini' | 'openai' | 'openrouter'
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || 'gpt-4o-mini',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterModel: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2', 10),
  },

  processing: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    maxConcurrentAnalyses: parseInt(process.env.MAX_CONCURRENT_ANALYSES || '3', 10),
    tempUploadDir: './temp_uploads',
  },
};
