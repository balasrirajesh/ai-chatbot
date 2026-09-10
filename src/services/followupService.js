import { aiService } from './aiService.js';
import { SessionService } from './sessionService.js';
import { RankingEngine } from './rankingEngine.js';

export class FollowupService {
  /**
   * Grounded Question & Answer handler for candidate analysis follow-ups
   * @param {string} sessionId 
   * @param {string} userQuestion 
   * @returns {Promise<string>} Grounded answer
   */
  static async answerFollowup(sessionId, userQuestion) {
    const session = await SessionService.getOrCreateSession(sessionId.replace('sess_', ''), 0);
    const candidates = await SessionService.getSessionCandidates(sessionId);

    if (!session || !session.jobDescription) {
      return '⚠️ No active Job Description or candidate analysis found for this session.';
    }

    if (candidates.length === 0) {
      return '⚠️ No candidate resumes have been analyzed yet in this session.';
    }

    const rankingData = RankingEngine.rankCandidates(candidates, session.jobDescription);

    const context = {
      jobTitle: session.jobDescription.jobTitle,
      primaryTechnologies: session.jobDescription.primaryTechnologies,
      requirements: session.jobDescription.requirements.map(r => ({ name: r.name, priority: r.priority, weight: r.normalizedWeight })),
      rankings: rankingData.rankings.map(r => ({
        rank: r.rank,
        name: r.candidateName,
        score: r.overallScore,
        verdict: r.verdict,
        criticalGaps: r.candidateAnalysis.criticalGaps,
        importantGaps: r.candidateAnalysis.importantGaps,
        strengths: r.candidateAnalysis.strengths
      }))
    };

    const systemInstruction = `You are a helpful and precise technical recruiting assistant.
Answer the recruiter's question using ONLY the provided structured analysis context.
Do NOT invent new qualifications, skills, or assume information outside of the provided context.
Keep the answer concise, professional, and directly relevant.`;

    const prompt = `SESSION CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION:
"${userQuestion}"

Provide a concise, grounded explanation:`;

    try {
      const response = await aiService.generateJSON(
        `${prompt}\n\nReturn JSON: { "answer": "your markdown formatted answer" }`,
        systemInstruction
      );
      return response.answer || 'I could not generate an explanation for that question.';
    } catch (err) {
      // Rule-based deterministic response for common comparison queries
      if (/why.*rank|better|compare/i.test(userQuestion)) {
        return `📊 **Ranking Summary:**\n\n${rankingData.topCandidateExplanation}`;
      }
      return `💡 **Session Information:**\n• Role: ${session.jobDescription.jobTitle}\n• Total Candidates: ${candidates.length}\n• Top Candidate: ${rankingData.rankings[0]?.candidateName} (${rankingData.rankings[0]?.overallScore}%)`;
    }
  }
}
