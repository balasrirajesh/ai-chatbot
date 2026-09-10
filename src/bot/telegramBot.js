import { Telegraf } from 'telegraf';
import { config } from '../config/index.js';
import { TelegramFileService } from '../services/telegramFileService.js';
import { SessionService } from '../services/sessionService.js';
import { JDAnalyzer } from '../services/jdAnalyzer.js';
import { QueueService } from '../services/queueService.js';
import { RankingEngine } from '../services/rankingEngine.js';
import { FollowupService } from '../services/followupService.js';
import { InputValidator } from '../services/inputValidator.js';
import { Keyboards } from './keyboards.js';
import { Formatters } from './formatters.js';

export function createTelegramBot() {
  if (!config.telegram.botToken) {
    console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not provided. Telegram bot will not start in polling mode.');
    return null;
  }

  const bot = new Telegraf(config.telegram.botToken);

  const updateStatus = async (ctx, messageId, text) => {
    try {
      if (messageId) {
        await ctx.telegram.editMessageText(ctx.chat.id, messageId, null, text, { parse_mode: 'Markdown' });
        return messageId;
      } else {
        const msg = await ctx.reply(text, { parse_mode: 'Markdown' });
        return msg.message_id;
      }
    } catch (err) {
      return messageId;
    }
  };

  // Helper to send potentially long markdown messages in chunks
  const replySafe = async (ctx, text, extra = {}) => {
    const chunks = Formatters.splitMessage(text);
    for (let i = 0; i < chunks.length; i++) {
      const opts = (i === chunks.length - 1) ? extra : {};
      await ctx.reply(chunks[i], { parse_mode: 'Markdown', ...opts });
    }
  };

  // 1. /start command
  bot.start(async (ctx) => {
    await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    const welcomeText = `🤖 *Welcome to ResumeMatch AI!*\n\n` +
      `I am your AI recruitment assistant. I match candidate resumes against your Job Descriptions with:\n` +
      `• *Context-aware JD prioritization* (Primary tech vs preferred skills)\n` +
      `• *Evidence-based anti-hallucination analysis*\n` +
      `• *Deterministic weighted scoring*\n` +
      `• *Prioritized course recommendations*\n` +
      `• *Fair multi-candidate ranking*\n\n` +
      `👉 To start, send me a *Job Description* (paste text or upload PDF/DOCX)!`;

    return replySafe(ctx, welcomeText, Keyboards.mainMenu());
  });

  // 2. /help command
  bot.help(async (ctx) => {
    const helpText = `ℹ️ *How to use ResumeMatch AI*\n\n` +
      `1️⃣ *Provide a Job Description:*\n` +
      `   • Paste JD text directly, or\n` +
      `   • Upload a PDF/DOCX file\n\n` +
      `2️⃣ *Upload Resumes:*\n` +
      `   • Send one or multiple candidate resumes (PDF or DOCX)\n\n` +
      `3️⃣ *Get Results & Ask Questions:*\n` +
      `   • Receive match scores, strengths, gaps & courses\n` +
      `   • View comparative rankings\n` +
      `   • Ask questions like: _"Why did candidate 1 rank higher?"_\n\n` +
      `Commands:\n` +
      `/start - Start or restart bot\n` +
      `/new - Start a fresh JD session\n` +
      `/rankings - View current candidate rankings\n` +
      `/jd - View current frozen JD profile`;

    return replySafe(ctx, helpText, Keyboards.mainMenu());
  });

  // 3. /new or 'New Analysis'
  bot.command('new', async (ctx) => {
    await SessionService.resetSession(ctx.chat.id, ctx.from.id);
    return replySafe(ctx, `🔄 *New session started!*\n\nPlease send or upload your new *Job Description*.`, Keyboards.mainMenu());
  });

  bot.hears(['🔄 New Analysis', '🔄 Start Over'], async (ctx) => {
    await SessionService.resetSession(ctx.chat.id, ctx.from.id);
    return replySafe(ctx, `🔄 *New session started!*\n\nPlease send or upload your new *Job Description*.`, Keyboards.mainMenu());
  });

  // 4. View JD Profile
  bot.hears(['📋 View Current JD Profile'], async (ctx) => {
    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    if (!session.jobDescription) {
      return replySafe(ctx, `⚠️ No active Job Description found. Please send a JD first.`, Keyboards.mainMenu());
    }
    return replySafe(ctx, Formatters.formatJdSummary(session.jobDescription), Keyboards.jdReadyMenu());
  });

  bot.command('jd', async (ctx) => {
    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    if (!session.jobDescription) {
      return replySafe(ctx, `⚠️ No active Job Description found. Please send a JD first.`, Keyboards.mainMenu());
    }
    return replySafe(ctx, Formatters.formatJdSummary(session.jobDescription), Keyboards.jdReadyMenu());
  });

  // 5. View Rankings
  bot.hears(['🏆 Candidate Rankings'], async (ctx) => {
    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    const candidates = await SessionService.getSessionCandidates(session.sessionId);
    const rankingData = RankingEngine.rankCandidates(candidates, session.jobDescription);
    return replySafe(ctx, Formatters.formatRankings(rankingData), Keyboards.rankingActions(candidates));
  });

  bot.command('rankings', async (ctx) => {
    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    const candidates = await SessionService.getSessionCandidates(session.sessionId);
    const rankingData = RankingEngine.rankCandidates(candidates, session.jobDescription);
    return replySafe(ctx, Formatters.formatRankings(rankingData), Keyboards.rankingActions(candidates));
  });

  // 6. Handle Document uploads (PDF/DOCX) via TelegramFileService
  bot.on('document', async (ctx) => {
    const doc = ctx.message.document;
    const filename = doc.file_name || 'document';
    const fileSizeMb = (doc.file_size || 0) / (1024 * 1024);

    const fileValidation = InputValidator.validateDocumentFile(filename, fileSizeMb, config.processing.maxFileSizeMb);
    if (!fileValidation.isValid) {
      return replySafe(ctx, `❌ *Upload Error:* ${fileValidation.error}`);
    }

    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    let statusMsgId = null;

    try {
      statusMsgId = await updateStatus(ctx, null, `📄 *Downloading & reading ${filename}...*`);

      const { extractedText } = await TelegramFileService.downloadAndExtract(ctx, doc);

      if (!session.jobDescription || session.status === 'IDLE') {
        await updateStatus(ctx, statusMsgId, `🧠 *Understanding Job Description & prioritizing requirements...*`);
        const jdProfile = await JDAnalyzer.analyzeJobDescription(extractedText, 'PDF', filename);
        
        await SessionService.updateSession(session.sessionId, {
          status: 'JD_READY',
          jobDescription: jdProfile
        });

        await updateStatus(ctx, statusMsgId, `✅ *JD Processed & Frozen!*`);
        return replySafe(ctx, Formatters.formatJdSummary(jdProfile), Keyboards.jdReadyMenu());
      } else {
        const candidateName = filename.replace(/\.(pdf|docx|doc|txt)$/i, '').replace(/[_-]/g, ' ');
        await updateStatus(ctx, statusMsgId, `🔍 *Analyzing ${candidateName} against JD...*`);

        const candidateInput = [{
          resumeText: extractedText,
          filename,
          candidateName,
          candidateId: `cand_${Date.now()}`
        }];

        const [analyzed] = await QueueService.processMultipleResumes(
          candidateInput,
          session.jobDescription,
          async (done, total, name) => {
            await updateStatus(ctx, statusMsgId, `🔍 *Scoring ${name} & identifying gaps...*`);
          }
        );

        await SessionService.saveCandidateAnalysis({
          sessionId: session.sessionId,
          ...analyzed
        });

        await updateStatus(ctx, statusMsgId, `✅ *Analysis Complete for ${candidateName}!*`);
        return replySafe(ctx, Formatters.formatCandidateReport(analyzed), Keyboards.candidateActions(analyzed.candidateId));
      }
    } catch (err) {
      console.error('[TelegramBot] Document processing error:', err);
      if (statusMsgId) {
        await updateStatus(ctx, statusMsgId, `❌ *Error:* ${err.message}`);
      } else {
        await replySafe(ctx, `❌ *Error:* ${err.message}`);
      }
    }
  });

  // 7. Handle Text messages (JD paste or interactive follow-up Q&A)
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    if (text === '📝 Paste Job Description' || text === '📄 Upload JD File') {
      return replySafe(ctx, `📝 Please send your Job Description now (paste the text or upload a PDF/DOCX file).`);
    }

    if (text === '👤 Upload Resume(s)' || text === '➕ Add More Resumes') {
      return replySafe(ctx, `📄 Please upload one or more candidate resume files (PDF or DOCX).`);
    }

    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    let statusMsgId = null;

    try {
      // If no JD exists yet or text contains a full JD paste
      if (!session.jobDescription || session.status === 'IDLE' || text.length > 250) {
        statusMsgId = await updateStatus(ctx, null, `🧠 *Analyzing Job Description text & building priorities...*`);
        
        const jdProfile = await JDAnalyzer.analyzeJobDescription(text, 'TEXT');
        await SessionService.updateSession(session.sessionId, {
          status: 'JD_READY',
          jobDescription: jdProfile
        });

        await updateStatus(ctx, statusMsgId, `✅ *Job Description Received & Frozen!*`);
        return replySafe(ctx, Formatters.formatJdSummary(jdProfile), Keyboards.jdReadyMenu());
      } else {
        // Handle Follow-up recruiter questions against existing session analysis
        statusMsgId = await updateStatus(ctx, null, `🤔 *Thinking...*`);
        const answer = await FollowupService.answerFollowup(session.sessionId, text);
        if (statusMsgId) {
          await ctx.telegram.deleteMessage(ctx.chat.id, statusMsgId).catch(() => {});
        }
        return replySafe(ctx, answer, Keyboards.jdReadyMenu());
      }
    } catch (err) {
      console.error('[TelegramBot] Text processing error:', err);
      if (statusMsgId) {
        await updateStatus(ctx, statusMsgId, `❌ *Error:* ${err.message}`);
      } else {
        await replySafe(ctx, `❌ *Error:* ${err.message}`);
      }
    }
  });

  // 8. Handle Callback Queries (Buttons)
  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);

    try {
      if (data.startsWith('cand_courses_')) {
        const candidateId = data.replace('cand_courses_', '');
        const candidates = await SessionService.getSessionCandidates(session.sessionId);
        const candidate = candidates.find(c => c.candidateId === candidateId);
        
        if (!candidate) {
          await ctx.answerCbQuery('Candidate not found');
          return;
        }

        await ctx.answerCbQuery();
        return replySafe(ctx, Formatters.formatCourseRecommendations(candidate.candidateName, candidate.courseRecommendations));
      }

      if (data.startsWith('cand_details_')) {
        const candidateId = data.replace('cand_details_', '');
        const candidates = await SessionService.getSessionCandidates(session.sessionId);
        const candidate = candidates.find(c => c.candidateId === candidateId);

        if (!candidate) {
          await ctx.answerCbQuery('Candidate not found');
          return;
        }

        await ctx.answerCbQuery();
        return replySafe(ctx, Formatters.formatCandidateReport(candidate), Keyboards.candidateActions(candidate.candidateId));
      }

      if (data === 'show_rankings') {
        const candidates = await SessionService.getSessionCandidates(session.sessionId);
        const rankingData = RankingEngine.rankCandidates(candidates, session.jobDescription);
        await ctx.answerCbQuery();
        return replySafe(ctx, Formatters.formatRankings(rankingData), Keyboards.rankingActions(candidates));
      }

      if (data === 'new_session') {
        await SessionService.resetSession(ctx.chat.id, ctx.from.id);
        await ctx.answerCbQuery('Session reset');
        return replySafe(ctx, `🔄 *New session started!*\n\nPlease send or upload your new *Job Description*.`, Keyboards.mainMenu());
      }

      await ctx.answerCbQuery();
    } catch (err) {
      console.error('[TelegramBot] Callback error:', err);
      await ctx.answerCbQuery('Action failed');
    }
  });

  return bot;
}
