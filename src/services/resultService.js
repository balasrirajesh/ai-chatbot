import { GapEngine } from './gapEngine.js';

export class ResultService {
  /**
   * Aggregate complete candidate evaluation into structured result package
   * @param {Object} jdProfile 
   * @param {Object} candidateAnalysis 
   * @returns {Object} Canonical structured candidate result
   */
  static aggregateCandidateResult(jdProfile, candidateAnalysis) {
    const gaps = GapEngine.categorizeGaps(candidateAnalysis.requirements || []);

    return {
      candidateId: candidateAnalysis.candidateId,
      candidateName: candidateAnalysis.candidateName,
      filename: candidateAnalysis.filename,
      overallScore: candidateAnalysis.overallScore,
      verdict: candidateAnalysis.verdict,
      criticalGapsCount: gaps.criticalGaps.length,
      subscores: {
        skillsMatch: Math.round(candidateAnalysis.overallScore),
        experienceMatch: candidateAnalysis.requirements.some(r => r.category === 'EXPERIENCE' && r.matchValue >= 0.8) ? 90 : 60,
        atsFormatting: 90
      },
      requirements: candidateAnalysis.requirements,
      strengths: candidateAnalysis.strengths || [],
      gaps: {
        critical: gaps.criticalGaps.map(g => g.name),
        important: gaps.importantGaps.map(g => g.name),
        medium: gaps.mediumGaps.map(g => g.name),
        preferred: gaps.preferredGaps.map(g => g.name)
      },
      courseRecommendations: candidateAnalysis.courseRecommendations || [],
      analyzedAt: new Date().toISOString()
    };
  }
}
