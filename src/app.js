import express from 'express';
import { isDbConnected } from './db/connection.js';
import { config } from './config/index.js';

export function createApp(bot = null) {
  const app = express();
  app.use(express.json());

  // Health Check Endpoint (Lightweight & non-AI)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'hashira-resume-bot',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dbConnected: isDbConnected(),
      aiProvider: config.ai.provider,
      botMode: config.telegram.botMode
    });
  });

  // Optional Webhook endpoint for Telegram in production
  if (bot && config.telegram.botMode === 'webhook') {
    app.use('/api/telegram/webhook', bot.webhookCallback('/api/telegram/webhook'));
  }

  return app;
}
