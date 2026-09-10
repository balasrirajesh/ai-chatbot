export class ScoringEngine {
  // Configurable penalty bounds
  static CRITICAL_GAP_PENALTY_PER_GAP = 25;
  static MAX_CRITICAL_GAP_PENALTY = 75;

  /**
   * Deterministically calculate the weighted match score and assign verdict
   * @param {Array} requirementMatches 
   * @returns {Object} { overallScore: number, verdict: string, criticalGaps: string[], importantGaps: string[], preferredGaps: string[] }
   */
  static calculateScore(requirementMatches) {
    if (!Array.isArray(requirementMatches) || requirementMatches.length === 0) {
      return {
        overallScore: 0,
        verdict: 'Poor Match',
        criticalGaps: [],
        importantGaps: [],
        preferredGaps: []
      };
    }

    let weightedSum = 0;
    let totalWeight = 0;

    const criticalGaps = [];
    const importantGaps = [];
    const preferredGaps = [];

    for (const req of requirementMatches) {
      const weight = typeof req.weight === 'number' ? req.weight : 0.1;
      const matchVal = typeof req.matchValue === 'number' ? req.matchValue : 0.0;
      
      weightedSum += weight * matchVal;
      totalWeight += weight;

      if (req.matchStatus === 'CRITICAL_GAP' || (req.priority === 'CRITICAL' && matchVal < 0.5)) {
        criticalGaps.push(req.name);
      } else if (req.priority === 'HIGH' && matchVal < 0.5) {
        importantGaps.push(req.name);
      } else if (['MEDIUM', 'LOW', 'PREFERRED'].includes(req.priority) && matchVal < 0.5) {
        preferredGaps.push(req.name);
      }
    }

    // Normalized overall percentage score (0-100)
    let rawScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    
    // Configurable Critical Gap Penalty & Score Cap
    if (criticalGaps.length > 0) {
      const penalty = Math.min(
        criticalGaps.length * this.CRITICAL_GAP_PENALTY_PER_GAP,
        this.MAX_CRITICAL_GAP_PENALTY
      );
      const scoreCap = Math.max(0, 100 - penalty);
      rawScore = Math.min(rawScore, scoreCap);
    }

    const overallScore = Math.round(Math.max(0, Math.min(100, rawScore)));

    let verdict;
    if (criticalGaps.length > 0) {
      if (overallScore >= 60) verdict = 'Moderate Match';
      else if (overallScore >= 40) verdict = 'Weak Match';
      else verdict = 'Poor Match';
    } else {
      if (overallScore >= 90) verdict = 'Excellent Match';
      else if (overallScore >= 80) verdict = 'Strong Match';
      else if (overallScore >= 68) verdict = 'Good Match';
      else if (overallScore >= 50) verdict = 'Moderate Match';
      else if (overallScore >= 35) verdict = 'Weak Match';
      else verdict = 'Poor Match';
    }

    return {
      overallScore,
      verdict,
      criticalGaps,
      importantGaps,
      preferredGaps
    };
  }
}
