export class GapEngine {
  /**
   * Group candidate requirement matches into prioritized gaps
   * @param {Array} requirementMatches 
   * @returns {Object} Categorized gaps
   */
  static categorizeGaps(requirementMatches = []) {
    const criticalGaps = [];
    const importantGaps = [];
    const mediumGaps = [];
    const preferredGaps = [];

    for (const req of requirementMatches) {
      const matchVal = typeof req.matchValue === 'number' ? req.matchValue : 0.0;
      const isGap = matchVal < 0.8; // anything below Good/Strong match is a gap

      if (isGap) {
        const gapItem = {
          name: req.name,
          category: req.category || 'TECHNICAL',
          priority: req.priority,
          evidence: req.evidence,
          evidenceStrength: req.evidenceStrength,
          matchStatus: req.matchStatus
        };

        if (req.priority === 'CRITICAL' || req.matchStatus === 'CRITICAL_GAP') {
          criticalGaps.push(gapItem);
        } else if (req.priority === 'HIGH') {
          importantGaps.push(gapItem);
        } else if (req.priority === 'MEDIUM') {
          mediumGaps.push(gapItem);
        } else {
          preferredGaps.push(gapItem);
        }
      }
    }

    return {
      criticalGaps,
      importantGaps,
      mediumGaps,
      preferredGaps,
      totalGapsCount: criticalGaps.length + importantGaps.length + mediumGaps.length + preferredGaps.length
    };
  }
}
