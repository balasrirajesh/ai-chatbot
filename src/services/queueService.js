import pLimit from 'p-limit';
import { config } from '../config/index.js';
import { ResumeAnalyzer } from './resumeAnalyzer.js';
import { ScoringEngine } from './scoringEngine.js';
import { CourseEngine } from './courseEngine.js';

export class QueueService {
  /**
   * Process multiple candidate resumes concurrently with controlled batch limits and isolated error boundaries
   * @param {Array<{ resumeText: string, filename: string, candidateName: string, candidateId: string }>} candidateInputs 
   * @param {Object} frozenJdProfile 
   * @param {Function} onProgressCallback - Callback reporting (processedCount, totalCount, currentCandidateName)
   */
  static async processMultipleResumes(candidateInputs, frozenJdProfile, onProgressCallback = null) {
    const limit = pLimit(config.processing.maxConcurrentAnalyses);
    const total = candidateInputs.length;
    let completedCount = 0;

    const tasks = candidateInputs.map((input, index) => {
      return limit(async () => {
        const candidateId = input.candidateId || `cand_${Date.now()}_${index + 1}`;
        const candidateName = input.candidateName || `Candidate ${index + 1}`;

        if (onProgressCallback) {
          try {
            await onProgressCallback(completedCount + 1, total, candidateName);
          } catch (e) {
            // Ignore callback notification errors
          }
        }

        try {
          // 1. Evidence Extraction & Anti-hallucination analysis
          const rawAnalysis = await ResumeAnalyzer.analyzeResumeAgainstJd(
            input.resumeText,
            frozenJdProfile,
            candidateName,
            input.filename
          );

          // 2. Deterministic Scoring
          const scoreResult = ScoringEngine.calculateScore(rawAnalysis.requirements);

          // 3. Deterministic Priority-aligned Course Recommendations
          const recommendations = await CourseEngine.generateRecommendations(
            rawAnalysis.requirements,
            frozenJdProfile
          );

          completedCount++;

          return {
            candidateId,
            candidateName: rawAnalysis.candidateName || candidateName,
            filename: input.filename,
            rawResumeText: input.resumeText,
            overallScore: scoreResult.overallScore,
            verdict: scoreResult.verdict,
            requirements: rawAnalysis.requirements,
            strengths: rawAnalysis.strengths,
            criticalGaps: scoreResult.criticalGaps,
            importantGaps: scoreResult.importantGaps,
            preferredGaps: scoreResult.preferredGaps,
            courseRecommendations: recommendations,
            analysisError: null
          };
        } catch (err) {
          console.error(`[QueueService] Error processing candidate ${candidateName}:`, err);
          completedCount++;

          // Isolated error result - one failure does not break the entire batch!
          return {
            candidateId,
            candidateName,
            filename: input.filename,
            rawResumeText: input.resumeText,
            overallScore: 0,
            verdict: 'Poor Match',
            requirements: [],
            strengths: [],
            criticalGaps: ['Analysis Error'],
            importantGaps: [],
            preferredGaps: [],
            courseRecommendations: [],
            analysisError: err.message || 'Failed to analyze candidate resume'
          };
        }
      });
    });

    return await Promise.all(tasks);
  }
}
