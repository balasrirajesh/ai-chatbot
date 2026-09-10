export class ScoringEngine {
  static CRITICAL_GAP_PENALTY_PER_GAP = 25;
  static MAX_CRITICAL_GAP_PENALTY = 75;

  /**
   * Deterministically calculate the weighted match score and assign verdict
   * @param {Array} requirementMatches - Matches adhering to canonical requirement schema
   * @returns {Object} Calculated overallScore, subscores by category, verdict, and gap lists
   */
  static calculateScore(requirementMatches) {
    if (!Array.isArray(requirementMatches) || requirementMatches.length === 0) {
      return {
        overallScore: 0,
        verdict: 'Poor Match',
        subscores: {
          technicalMatch: 0,
          experienceMatch: 0,
          criticalRequirementsMatch: 0
        },
        criticalGaps: [],
        importantGaps: [],
        preferredGaps: []
      };
    }

    let weightedSum = 0;
    let totalWeight = 0;

    // Category-specific accumulators for genuine independent subscores
    const categorySums = {};
    const categoryWeights = {};

    let criticalSum = 0;
    let criticalWeight = 0;

    const criticalGaps = [];
    const importantGaps = [];
    const preferredGaps = [];

    for (const req of requirementMatches) {
      const weight = typeof req.normalizedWeight === 'number' 
        ? req.normalizedWeight 
        : (typeof req.weight === 'number' ? req.weight : 0);

      if (weight <= 0) {
        throw new Error(`Invalid or zero weight found for requirement "${req.name}" in scoring engine.`);
      }

      const matchVal = typeof req.matchValue === 'number' ? req.matchValue : 0.0;
      const category = req.category || 'TECHNICAL';
      
      weightedSum += weight * matchVal;
      totalWeight += weight;

      // Category breakdown
      categorySums[category] = (categorySums[category] || 0) + (weight * matchVal);
      categoryWeights[category] = (categoryWeights[category] || 0) + weight;

      // Critical tier breakdown
      if (req.priority === 'CRITICAL') {
        criticalSum += weight * matchVal;
        criticalWeight += weight;
      }

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
    
    // Critical Gap Penalty & Score Cap
    if (criticalGaps.length > 0) {
      const penalty = Math.min(
        criticalGaps.length * this.CRITICAL_GAP_PENALTY_PER_GAP,
        this.MAX_CRITICAL_GAP_PENALTY
      );
      const scoreCap = Math.max(0, 100 - penalty);
      rawScore = Math.min(rawScore, scoreCap);
    }

    const overallScore = Math.round(Math.max(0, Math.min(100, rawScore)));

    // Calculate genuine subscores
    const technicalMatch = categoryWeights['TECHNICAL'] 
      ? Math.round((categorySums['TECHNICAL'] / categoryWeights['TECHNICAL']) * 100) 
      : overallScore;

    const experienceMatch = categoryWeights['EXPERIENCE']
      ? Math.round((categorySums['EXPERIENCE'] / categoryWeights['EXPERIENCE']) * 100)
      : overallScore;

    const criticalRequirementsMatch = criticalWeight > 0
      ? Math.round((criticalSum / criticalWeight) * 100)
      : 100;

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
      subscores: {
        technicalMatch,
        experienceMatch,
        criticalRequirementsMatch
      },
      criticalGaps,
      importantGaps,
      preferredGaps
    };
  }
}
