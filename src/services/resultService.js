import { GapEngine } from './gapEngine.js';

export class ResultService {
  /**
   * Aggregate complete candidate evaluation into canonical, authoritative result package
   * @param {Object} jdProfile 
   * @param {Object} rawAnalysis - { candidateId, candidateName, filename, requirements, strengths }
   * @param {Object} scoreResult - { overallScore, verdict, subscores }
   * @param {Array} courseRecommendations - Prioritized learning paths
   * @returns {Object} Authoritative single source of truth candidate result
   */
  static aggregateCandidateResult(jdProfile, rawAnalysis, scoreResult, courseRecommendations) {
    const gaps = GapEngine.categorizeGaps(rawAnalysis.requirements || []);

    return {
      candidateId: rawAnalysis.candidateId,
      candidateName: rawAnalysis.candidateName,
      filename: rawAnalysis.filename,
      overallScore: scoreResult.overallScore,
      verdict: scoreResult.verdict,
      subscores: {
        technicalMatch: scoreResult.subscores?.technicalMatch ?? scoreResult.overallScore,
        experienceMatch: scoreResult.subscores?.experienceMatch ?? scoreResult.overallScore,
        criticalRequirementsMatch: scoreResult.subscores?.criticalRequirementsMatch ?? 100
      },
      requirements: rawAnalysis.requirements,
      strengths: rawAnalysis.strengths || [],
      criticalGaps: gaps.criticalGaps.map(g => g.name),
      importantGaps: gaps.importantGaps.map(g => g.name),
      mediumGaps: gaps.mediumGaps.map(g => g.name),
      preferredGaps: gaps.preferredGaps.map(g => g.name),
      gaps: {
        critical: gaps.criticalGaps.map(g => g.name),
        important: gaps.importantGaps.map(g => g.name),
        medium: gaps.mediumGaps.map(g => g.name),
        preferred: gaps.preferredGaps.map(g => g.name)
      },
      courseRecommendations: courseRecommendations || [],
      analyzedAt: new Date().toISOString()
    };
  }
}
