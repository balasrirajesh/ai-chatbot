import { SessionModel } from '../models/Session.js';
import { CandidateAnalysisModel } from '../models/CandidateAnalysis.js';
import { isDbConnected } from '../db/connection.js';

// High-speed in-memory store for immediate responsive session state + fallback if DB offline
const inMemorySessions = new Map();
const inMemoryCandidates = new Map(); // sessionId -> Map(candidateId -> CandidateAnalysis)

export class SessionService {
  /**
   * Get active session or create a new one for a Telegram chat
   */
  static async getOrCreateSession(telegramChatId, telegramUserId) {
    const sessionId = `sess_${telegramChatId}`;
    
    // Check in-memory first
    if (inMemorySessions.has(sessionId)) {
      return inMemorySessions.get(sessionId);
    }

    // Check MongoDB if connected
    if (isDbConnected()) {
      try {
        const doc = await SessionModel.findOne({ sessionId });
        if (doc) {
          const sessionObj = doc.toObject();
          inMemorySessions.set(sessionId, sessionObj);
          return sessionObj;
        }
      } catch (err) {
        console.warn(`[SessionService] DB fetch failed: ${err.message}`);
      }
    }

    // Create new session
    const newSession = {
      sessionId,
      telegramChatId,
      telegramUserId,
      status: 'IDLE',
      jobDescription: null,
      createdAt: new Date()
    };

    inMemorySessions.set(sessionId, newSession);
    inMemoryCandidates.set(sessionId, new Map());

    if (isDbConnected()) {
      try {
        await SessionModel.create(newSession);
      } catch (err) {
        console.warn(`[SessionService] DB create failed: ${err.message}`);
      }
    }

    return newSession;
  }

  /**
   * Update session state and persist
   */
  static async updateSession(sessionId, updates) {
    const current = inMemorySessions.get(sessionId) || {};
    const updated = { ...current, ...updates, updatedAt: new Date() };
    inMemorySessions.set(sessionId, updated);

    if (isDbConnected()) {
      try {
        await SessionModel.findOneAndUpdate(
          { sessionId },
          { $set: updates },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn(`[SessionService] DB update failed: ${err.message}`);
      }
    }

    return updated;
  }

  /**
   * Reset session to start fresh analysis
   */
  static async resetSession(telegramChatId, telegramUserId) {
    const sessionId = `sess_${telegramChatId}`;
    inMemorySessions.delete(sessionId);
    inMemoryCandidates.delete(sessionId);

    if (isDbConnected()) {
      try {
        await SessionModel.deleteOne({ sessionId });
        await CandidateAnalysisModel.deleteMany({ sessionId });
      } catch (err) {
        console.warn(`[SessionService] DB delete failed: ${err.message}`);
      }
    }

    return await this.getOrCreateSession(telegramChatId, telegramUserId);
  }

  /**
   * Save candidate analysis result
   */
  static async saveCandidateAnalysis(analysis) {
    const { sessionId, candidateId } = analysis;
    
    if (!inMemoryCandidates.has(sessionId)) {
      inMemoryCandidates.set(sessionId, new Map());
    }
    inMemoryCandidates.get(sessionId).set(candidateId, analysis);

    if (isDbConnected()) {
      try {
        await CandidateAnalysisModel.findOneAndUpdate(
          { sessionId, candidateId },
          { $set: analysis },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn(`[SessionService] DB candidate save failed: ${err.message}`);
      }
    }

    return analysis;
  }

  /**
   * Get all candidates analyzed for a session
   */
  static async getSessionCandidates(sessionId) {
    if (inMemoryCandidates.has(sessionId)) {
      return Array.from(inMemoryCandidates.get(sessionId).values());
    }

    if (isDbConnected()) {
      try {
        const docs = await CandidateAnalysisModel.find({ sessionId }).lean();
        const map = new Map();
        docs.forEach(d => map.set(d.candidateId, d));
        inMemoryCandidates.set(sessionId, map);
        return docs;
      } catch (err) {
        console.warn(`[SessionService] DB candidate fetch failed: ${err.message}`);
      }
    }

    return [];
  }
}
