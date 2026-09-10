export class RankingEngine {
  /**
   * Sort candidates fairly using the frozen JD profile standards and generate comparative insights
   * @param {Array} candidateAnalyses 
   * @param {Object} jdProfile 
   */
  static rankCandidates(candidateAnalyses, jdProfile) {
    if (!Array.isArray(candidateAnalyses) || candidateAnalyses.length === 0) {
      return {
        rankings: [],
        topCandidateExplanation: 'No candidates available to rank.'
      };
    }

    // Sort criteria:
    // 1. Critical Gaps count ascending (0 critical gaps beats 1 critical gap, regardless of raw peripheral skills)
    // 2. Overall weighted score descending
    // 3. Important Gaps count ascending
    const sorted = [...candidateAnalyses].sort((a, b) => {
      const aCritGaps = (a.criticalGaps || []).length;
      const bCritGaps = (b.criticalGaps || []).length;
      if (aCritGaps !== bCritGaps) {
        return aCritGaps - bCritGaps;
      }

      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }

      const aImpGaps = (a.importantGaps || []).length;
      const bImpGaps = (b.importantGaps || []).length;
      return aImpGaps - bImpGaps;
    });

    const rankedList = sorted.map((cand, idx) => ({
      rank: idx + 1,
      candidateId: cand.candidateId,
      candidateName: cand.candidateName || `Candidate ${idx + 1}`,
      overallScore: cand.overallScore,
      verdict: cand.verdict,
      criticalGapsCount: (cand.criticalGaps || []).length,
      strengthsCount: (cand.strengths || []).length,
      candidateAnalysis: cand
    }));

    // Generate comparative rationale for why #1 is #1
    const top = rankedList[0];
    let topCandidateExplanation = '';

    if (top) {
      const strengthsList = (top.candidateAnalysis.strengths || []).slice(0, 3).map(s => `✅ ${s}`).join('\n');
      const critGapsList = (top.candidateAnalysis.criticalGaps || []).length === 0
        ? '✅ Meets all critical requirements'
        : `⚠️ Has critical gaps: ${top.candidateAnalysis.criticalGaps.join(', ')}`;

      topCandidateExplanation = `**${top.candidateName}** ranks #1 (${top.overallScore}%) because:\n` +
        `${critGapsList}\n` +
        (strengthsList ? `${strengthsList}\n` : '') +
        `🎯 Highest alignment with ${jdProfile?.jobTitle || 'the role'}'s core competencies.`;
    }

    return {
      rankings: rankedList,
      topCandidateExplanation
    };
  }
}
