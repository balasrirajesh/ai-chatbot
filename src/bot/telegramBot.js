import { Telegraf } from 'telegraf';
import path from 'path';
import { config } from '../config/index.js';
import { TelegramFileService } from '../services/telegramFileService.js';
import { SessionService } from '../services/sessionService.js';
import { JDAnalyzer } from '../services/jdAnalyzer.js';
import { QueueService } from '../services/queueService.js';
import { RankingEngine } from '../services/rankingEngine.js';
import { FollowupService } from '../services/followupService.js';
import { InputValidator } from '../services/inputValidator.js';
import { ErrorRecoveryService } from '../services/errorRecoveryService.js';
import { Keyboards } from './keyboards.js';
import { Formatters } from './formatters.js';

// In-memory batch upload queues per session: sessionId -> { timer, files: [] }
const uploadQueues = new Map();

export function createTelegramBot() {
  if (!config.telegram.botToken) {
    console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not provided. Telegram bot will not start in polling mode.');
    return null;
  }

  const bot = new Telegraf(config.telegram.botToken);

  const updateStatus = async (ctx, messageId, text) => {
    try {
      if (messageId) {
        await ctx.telegram.editMessageText(ctx.chat.id, messageId, null, text, { parse_mode: 'HTML' });
        return messageId;
      } else {
        const msg = await ctx.reply(text, { parse_mode: 'HTML' });
        return msg.message_id;
      }
    } catch (err) {
      return messageId;
    }
  };

  const replySafe = async (ctx, text, extra = {}) => {
    const chunks = Formatters.splitMessage(text);
    for (let i = 0; i < chunks.length; i++) {
      const opts = (i === chunks.length - 1) ? extra : {};
      try {
        await ctx.reply(chunks[i], { parse_mode: 'HTML', ...opts });
      } catch (err) {
        // Fallback to plain text if Telegram fails HTML parsing
        const stripped = chunks[i].replace(/<[^>]+>/g, '');
        await ctx.reply(stripped, { ...opts });
      }
    }
  };

  const handleGlobalError = async (ctx, err, customContext = 'Operation') => {
    console.error(`[TelegramBot Error in ${customContext}]:`, err);
    const classified = ErrorRecoveryService.classifyError(err);
    await replySafe(ctx, `❌ *${customContext} Error:*\n${classified.message}`);
  };

  // 1. /start command
  bot.start(async (ctx) => {
    try {
      const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
      await SessionService.updateSession(session.sessionId, { state: 'WAITING_FOR_JD' });

      const welcomeText = `🤖 *Welcome to ResumeMatch AI!*\n\n` +
        `I am your AI recruitment assistant. I match candidate resumes against your Job Descriptions with:\n` +
        `• *Context-aware JD prioritization* (Primary tech vs preferred skills)\n` +
        `• *Evidence-based anti-hallucination analysis*\n` +
        `• *Deterministic weighted scoring*\n` +
        `• *Prioritized course recommendations*\n` +
        `• *Fair multi-candidate ranking*\n\n` +
        `👉 To start, send me a *Job Description* (paste text or upload PDF/DOCX/TXT)!`;

      return replySafe(ctx, welcomeText, Keyboards.mainMenu());
    } catch (err) {
      return handleGlobalError(ctx, err, 'Start');
    }
  });

  // 2. /help command
  bot.help(async (ctx) => {
    const helpText = `ℹ️ *How to use ResumeMatch AI*\n\n` +
      `1️⃣ *Provide a Job Description:*\n` +
      `   • Paste JD text directly, or\n` +
      `   • Upload a PDF or DOCX file\n\n` +
      `2️⃣ *Upload Resumes:*\n` +
      `   • Send one or multiple candidate resumes\n\n` +
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
    try {
      await SessionService.resetSession(ctx.chat.id, ctx.from.id);
      const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
      await SessionService.updateSession(session.sessionId, { state: 'WAITING_FOR_JD' });
      return replySafe(ctx, `🔄 *New session started!*\n\nPlease send or upload your new *Job Description*.`, Keyboards.mainMenu());
    } catch (err) {
      return handleGlobalError(ctx, err, 'New Session');
    }
  });

  bot.hears(['🔄 New Analysis', '🔄 Start Over'], async (ctx) => {
    try {
      await SessionService.resetSession(ctx.chat.id, ctx.from.id);
      const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
      await SessionService.updateSession(session.sessionId, { state: 'WAITING_FOR_JD' });
      return replySafe(ctx, `🔄 *New session started!*\n\nPlease send or upload your new *Job Description*.`, Keyboards.mainMenu());
    } catch (err) {
      return handleGlobalError(ctx, err, 'New Session');
    }
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

  // Process a collected batch of candidate resumes with p-limit concurrency
  const processBatchResumes = async (ctx, sessionId, session) => {
    const queueData = uploadQueues.get(sessionId);
    if (!queueData || queueData.files.length === 0) return;

    const candidateInputs = [...queueData.files];
    uploadQueues.delete(sessionId);

    let statusMsgId = await updateStatus(ctx, null, `📄 <b>Processing batch of ${candidateInputs.length} resume(s)...</b>`);

    try {
      await SessionService.updateSession(sessionId, { state: 'ANALYZING_RESUMES' });

      const analyzedCandidates = await QueueService.processMultipleResumes(
        candidateInputs,
        session.jobDescription,
        async (done, total, name) => {
          await updateStatus(ctx, statusMsgId, `🔍 <b>Analyzing Resume ${done} of ${total}</b> — ${Formatters.escapeHtml(name)}...`);
        }
      );

      for (const cand of analyzedCandidates) {
        await SessionService.saveCandidateAnalysis({
          sessionId,
          ...cand
        });
      }

      await SessionService.updateSession(sessionId, { state: 'RESULT_READY' });
      const rankingData = RankingEngine.rankCandidates(analyzedCandidates, session.jobDescription);

      if (analyzedCandidates.length === 1) {
        // Single resume: deliver full professional report with action buttons
        const cand = analyzedCandidates[0];
        await replySafe(ctx, Formatters.formatCandidateReport(cand), Keyboards.candidateActions(cand.candidateId));
      } else {
        // Multi-resume batch: send each candidate's full report SEQUENTIALLY
        console.log(`[Batch] Delivering ${analyzedCandidates.length} individual reports...`);

        for (let i = 0; i < analyzedCandidates.length; i++) {
          const cand = analyzedCandidates[i];
          console.log(`[Batch] Sending report ${i + 1}/${analyzedCandidates.length}: ${cand.candidateName}`);

          try {
            const header = Formatters.formatBatchCandidateHeader(i, analyzedCandidates.length);
            const candidateReport = Formatters.formatCandidateReport(cand, i);
            await replySafe(ctx, header + '\n' + candidateReport, Keyboards.batchCandidateActions(cand.candidateId));
            console.log(`[Batch] ✅ Report ${i + 1} sent`);
          } catch (reportErr) {
            console.error(`[Batch] ❌ Report ${i + 1} failed:`, reportErr.message);
            try {
              await ctx.reply(`📄 Resume ${i + 1}: ${cand.candidateName}\n🎯 ATS Score: ${cand.overallScore}% — ${cand.verdict}\n⚠️ Detailed report had a formatting issue.`);
            } catch (_) { /* ignore fallback errors */ }
          }

          if (i < analyzedCandidates.length - 1) {
            await new Promise(r => setTimeout(r, 800));
          }
        }

        // Send the final comparative ranking leaderboard
        console.log(`[Batch] Sending final ranking...`);
        await new Promise(r => setTimeout(r, 500));
        try {
          const rankingReport = Formatters.formatFinalRanking(analyzedCandidates, rankingData);
          await replySafe(ctx, rankingReport, Keyboards.batchActions(analyzedCandidates));
          console.log(`[Batch] ✅ Ranking sent`);
        } catch (rankErr) {
          console.error(`[Batch] ❌ Ranking failed:`, rankErr.message);
          await ctx.reply(`🏆 Ranking could not be formatted. Use /rankings to view.`).catch(() => {});
        }
      }
    } catch (err) {
      await handleGlobalError(ctx, err, 'Resume Processing');
    }
  };

  // 6. Handle Document uploads (PDF/DOCX/TXT)
  bot.on('document', async (ctx) => {
    const doc = ctx.message.document;
    const filename = doc.file_name || 'document';
    const fileSizeMb = (doc.file_size || 0) / (1024 * 1024);

    const fileValidation = InputValidator.validateDocumentFile(filename, fileSizeMb, config.processing.maxFileSizeMb);
    if (!fileValidation.isValid) {
      return replySafe(ctx, `❌ *Upload Error:* ${fileValidation.error}`);
    }

    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
    const ext = (path.extname(filename) || '').toLowerCase();
    const detectedSourceType = ext === '.pdf' ? 'PDF' : (ext === '.docx' || ext === '.doc' ? 'DOCX' : 'TEXT');

    try {
      const { extractedText } = await TelegramFileService.downloadAndExtract(ctx, doc);

      // State check: Is user providing a Job Description?
      if (!session.jobDescription || session.state === 'WAITING_FOR_JD' || session.state === 'IDLE') {
        const statusMsgId = await updateStatus(ctx, null, `🧠 *Understanding Job Description & prioritizing requirements...*`);
        
        await SessionService.clearSessionCandidates(session.sessionId);
        await SessionService.updateSession(session.sessionId, { state: 'ANALYZING_JD' });
        const jdProfile = await JDAnalyzer.analyzeJobDescription(extractedText, detectedSourceType, filename);
        
        await SessionService.updateSession(session.sessionId, {
          state: 'JD_READY',
          jobDescription: jdProfile
        });

        await updateStatus(ctx, statusMsgId, `✅ *Job Description Processed & Frozen!*`);
        return replySafe(ctx, Formatters.formatJdSummary(jdProfile), Keyboards.jdReadyMenu());
      } else {
        // User is uploading Resume(s)
        const candidateName = filename.replace(/\.(pdf|docx|doc|txt)$/i, '').replace(/[_-]/g, ' ');

        if (!uploadQueues.has(session.sessionId)) {
          uploadQueues.set(session.sessionId, { timer: null, files: [] });
        }

        const queueData = uploadQueues.get(session.sessionId);
        queueData.files.push({
          resumeText: extractedText,
          filename,
          candidateName,
          candidateId: `cand_${Date.now()}_${queueData.files.length + 1}`
        });

        // Reset debounce timer to collect concurrent multi-file uploads into one batch
        if (queueData.timer) clearTimeout(queueData.timer);
        
        // 2.5s debounce ensures all files in a multi-file drag-and-drop are completely received before starting analysis
        queueData.timer = setTimeout(() => {
          processBatchResumes(ctx, session.sessionId, session);
        }, 2500);
      }
    } catch (err) {
      return handleGlobalError(ctx, err, 'Document Upload');
    }
  });

  // 7. Handle Text messages (Explicit State-Driven Routing)
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    if (text === '📝 Paste Job Description' || text === '📄 Upload JD File') {
      const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
      await SessionService.updateSession(session.sessionId, { state: 'WAITING_FOR_JD' });
      return replySafe(ctx, `📝 Please send your Job Description now (paste the text or upload a PDF/DOCX file).`);
    }

    if (text === '👤 Upload Resume(s)' || text === '➕ Add More Resumes') {
      const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
      await SessionService.updateSession(session.sessionId, { state: 'WAITING_FOR_RESUMES' });
      return replySafe(ctx, `📄 Please upload one or more candidate resume files (PDF or DOCX).`);
    }

    const session = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);

    try {
      // Explicit state machine routing:
      // If session is waiting for JD or idle, treat text as Job Description
      if (!session.jobDescription || session.state === 'WAITING_FOR_JD' || session.state === 'IDLE') {
        const statusMsgId = await updateStatus(ctx, null, `🧠 *Analyzing Job Description text & building priorities...*`);
        
        await SessionService.clearSessionCandidates(session.sessionId);
        await SessionService.updateSession(session.sessionId, { state: 'ANALYZING_JD' });
        const jdProfile = await JDAnalyzer.analyzeJobDescription(text, 'TEXT');
        
        await SessionService.updateSession(session.sessionId, {
          state: 'JD_READY',
          jobDescription: jdProfile
        });

        await updateStatus(ctx, statusMsgId, `✅ *Job Description Received & Frozen!*`);
        return replySafe(ctx, Formatters.formatJdSummary(jdProfile), Keyboards.jdReadyMenu());
      } else {
        // Session already has JD and is in JD_READY, RESULT_READY, or FOLLOW_UP state -> route to FollowupService
        await SessionService.updateSession(session.sessionId, { state: 'FOLLOW_UP' });
        const statusMsgId = await updateStatus(ctx, null, `🤔 *Thinking...*`);
        const answer = await FollowupService.answerFollowup(session.sessionId, text);
        
        if (statusMsgId) {
          await ctx.telegram.deleteMessage(ctx.chat.id, statusMsgId).catch(() => {});
        }
        return replySafe(ctx, answer, Keyboards.jdReadyMenu());
      }
    } catch (err) {
      return handleGlobalError(ctx, err, 'Text Message');
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
        const newSession = await SessionService.getOrCreateSession(ctx.chat.id, ctx.from.id);
        await SessionService.updateSession(newSession.sessionId, { state: 'WAITING_FOR_JD' });
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
