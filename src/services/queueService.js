import pLimit from 'p-limit';
import { config } from '../config/index.js';
import { ResumeAnalyzer } from './resumeAnalyzer.js';
import { ScoringEngine } from './scoringEngine.js';
import { CourseEngine } from './courseEngine.js';
import { ResultService } from './resultService.js';

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
          // 1. Evidence Extraction, Semantic Matching & Anti-hallucination analysis
          const rawAnalysis = await ResumeAnalyzer.analyzeResumeAgainstJd(
            input.resumeText,
            frozenJdProfile,
            candidateName,
            input.filename
          );

          // 2. Deterministic Scoring
          const scoreResult = ScoringEngine.calculateScore(rawAnalysis.requirements);

          // 3. Deterministic Priority-aligned Course Recommendations (using GapEngine)
          const recommendations = await CourseEngine.generateRecommendations(
            rawAnalysis.requirements,
            frozenJdProfile
          );

          // 4. Authoritative Result Aggregator
          const candidateData = {
            candidateId,
            candidateName: rawAnalysis.candidateName || candidateName,
            filename: input.filename,
            requirements: rawAnalysis.requirements,
            strengths: rawAnalysis.strengths
          };

          const finalResult = ResultService.aggregateCandidateResult(
            frozenJdProfile,
            candidateData,
            scoreResult,
            recommendations
          );

          completedCount++;

          return {
            ...finalResult,
            analysisError: null
          };
        } catch (err) {
          console.error(`[QueueService] Error processing candidate ${candidateName}:`, err);
          completedCount++;

          // Isolated error result
          return {
            candidateId,
            candidateName,
            filename: input.filename,
            overallScore: 0,
            verdict: 'Poor Match',
            subscores: { technicalMatch: 0, experienceMatch: 0, criticalRequirementsMatch: 0 },
            requirements: [],
            strengths: [],
            criticalGaps: ['Analysis Error'],
            importantGaps: [],
            mediumGaps: [],
            preferredGaps: [],
            gaps: { critical: ['Analysis Error'], important: [], medium: [], preferred: [] },
            courseRecommendations: [],
            analysisError: err.message || 'Failed to analyze candidate resume'
          };
        }
      });
    });

    return await Promise.all(tasks);
  }
}
