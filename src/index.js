import { config } from './config/index.js';
import { connectDB } from './db/connection.js';
import { createApp } from './app.js';
import { createTelegramBot } from './bot/telegramBot.js';

async function bootstrap() {
  console.log('🚀 [Hashira] Starting Resume-JD Matching Bot Service...');

  // 1. Connect to MongoDB (with graceful fallback)
  await connectDB();

  // 2. Initialize Telegram Bot
  const bot = createTelegramBot();

  // 3. Initialize Express App
  const app = createApp(bot);

  // 4. Start HTTP Server
  const server = app.listen(config.port, () => {
    console.log(`📡 [Server] HTTP API listening on port ${config.port} (Health check: http://localhost:${config.port}/health)`);
  });

  // 5. Start Telegram Bot Polling or Webhook
  if (bot) {
    if (config.telegram.botMode === 'polling') {
      bot.launch(() => {
        console.log('🤖 [TelegramBot] Bot running in POLLING mode...');
      }).catch(err => {
        console.error('[TelegramBot] Launch error:', err.message);
      });
    } else if (config.telegram.botMode === 'webhook' && config.telegram.webhookUrl) {
      await bot.telegram.setWebhook(config.telegram.webhookUrl);
      console.log(`🤖 [TelegramBot] Webhook configured at ${config.telegram.webhookUrl}`);
    }
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 [Server] Gracefully shutting down...');
    if (bot) bot.stop('SIGINT');
    server.close(() => {
      console.log('👋 [Server] Closed HTTP server.');
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('❌ [Fatal Error during bootstrap]:', err);
  process.exit(1);
});
