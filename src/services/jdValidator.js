/**
 * Helper to escape regex special characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * JD Validator & Normalizer
 * Enforces strict consistency rules between raw Job Description semantics
 * and AI-extracted requirement priorities, applying dynamic relative multipliers.
 */
export class JDValidator {
  /**
   * Relative Priority Multipliers:
   * CRITICAL  -> 5.0
   * HIGH      -> 3.0
   * MEDIUM    -> 1.5
   * PREFERRED -> 0.5
   * LOW       -> 0.5
   */
  static PRIORITY_MULTIPLIERS = {
    CRITICAL: 5.0,
    HIGH: 3.0,
    MEDIUM: 1.5,
    PREFERRED: 0.5,
    LOW: 0.5
  };

  /**
   * Validate and enforce correct prioritization and relative weight normalization
   * @param {string} rawJdText 
   * @param {object} parsedJdProfile 
   * @returns {object} Validated and normalized JD Profile
   */
  static validateAndNormalize(rawJdText, parsedJdProfile) {
    if (!parsedJdProfile || typeof parsedJdProfile !== 'object') {
      throw new Error('Invalid JD Profile structure returned from AI');
    }

    const textLower = (rawJdText || '').toLowerCase();
    const requirements = Array.isArray(parsedJdProfile.requirements) ? parsedJdProfile.requirements : [];

    if (requirements.length === 0) {
      throw new Error('JD Profile contains no extracted requirements.');
    }

    // Detect primary/critical linguistic markers in the raw JD
    const primaryTechs = [];
    const lowerTitle = (parsedJdProfile.jobTitle || '').toLowerCase();

    // Check title cues: e.g. "Java Developer" -> Java, "Python Engineer" -> Python
    const commonTechs = ['java', 'python', 'javascript', 'typescript', 'c#', 'c++', 'golang', 'go', 'ruby', 'php', 'rust', 'react', 'angular', 'vue', 'node.js', 'spring boot', 'django', 'fastapi', '.net'];
    
    for (const tech of commonTechs) {
      const escapedTech = escapeRegExp(tech);
      const titleRegex = new RegExp(`(^|\\W)${escapedTech}(\\W|$)`, 'i');
      if (titleRegex.test(lowerTitle)) {
        primaryTechs.push(tech);
      }

      const primaryPhraseRegex = new RegExp(`(primary|core|main)\\s+(development|programming|backend|frontend)?\\s*(language|framework|technology|tool)?\\s*(is|:|-)?\\s*${escapedTech}`, 'i');
      const reversePrimaryRegex = new RegExp(`${escapedTech}\\s+(is the|as the)?\\s*(primary|core|main)`, 'i');
      
      if (primaryPhraseRegex.test(textLower) || reversePrimaryRegex.test(textLower)) {
        if (!primaryTechs.includes(tech)) primaryTechs.push(tech);
      }
    }

    // Process each requirement, sanitize priority, and cross-check with raw text
    const sanitizedRequirements = requirements.map((req, index) => {
      let name = (req.name || `Requirement ${index + 1}`).trim();
      let priority = (req.priority || 'MEDIUM').toUpperCase();
      let type = (req.type || 'skill').toLowerCase();
      let reason = req.reason || '';
      const nameLower = name.toLowerCase();

      // Normalize priority string to standard enum
      if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'PREFERRED'].includes(priority)) {
        if (priority.includes('CRIT') || priority.includes('MANDAT') || priority.includes('MUST')) {
          priority = 'CRITICAL';
        } else if (priority.includes('HIGH') || priority.includes('REQ') || priority.includes('ESSENT')) {
          priority = 'HIGH';
        } else if (priority.includes('PREF') || priority.includes('NICE') || priority.includes('PLUS') || priority.includes('BONUS')) {
          priority = 'PREFERRED';
        } else if (priority.includes('LOW')) {
          priority = 'LOW';
        } else {
          priority = 'MEDIUM';
        }
      }

      // Rule: Primary technology MUST be CRITICAL
      const isPrimary = primaryTechs.some(pt => nameLower === pt || nameLower.includes(pt));
      if (isPrimary) {
        priority = 'CRITICAL';
        reason = reason || 'Identified as core/primary technology for the role.';
      }

      // Rule: Stated preferred/plus skills MUST NOT be CRITICAL or HIGH
      const escapedName = escapeRegExp(nameLower);
      const plusRegex = new RegExp(`(^|\\W)${escapedName}(\\W)[^.\\n]*(preferred|plus|nice to have|bonus|beneficial|optional)`, 'i');
      const prefixPlusRegex = new RegExp(`(preferred|plus|nice to have|bonus|good to have|familiarity with|exposure to)[^.\\n]*${escapedName}`, 'i');
      
      if (!isPrimary && (plusRegex.test(textLower) || prefixPlusRegex.test(textLower))) {
        if (priority === 'CRITICAL' || priority === 'HIGH') {
          priority = 'PREFERRED';
          reason = `${name} is explicitly stated as preferred/bonus in the JD text.`;
        }
      }

      return {
        name,
        type,
        priority,
        isPrimaryTech: isPrimary,
        reason
      };
    });

    // Make sure at least one requirement is CRITICAL or HIGH
    const hasCritical = sanitizedRequirements.some(r => r.priority === 'CRITICAL');
    if (!hasCritical && sanitizedRequirements.length > 0) {
      sanitizedRequirements[0].priority = 'CRITICAL';
    }

    // Dynamic Multiplier-based Weight Normalization:
    // weight_i = multiplier_i / sum(all_multipliers)
    const totalMultiplier = sanitizedRequirements.reduce(
      (sum, req) => sum + (this.PRIORITY_MULTIPLIERS[req.priority] || 1.5),
      0
    );

    const weightedRequirements = sanitizedRequirements.map(req => {
      const mult = this.PRIORITY_MULTIPLIERS[req.priority] || 1.5;
      return {
        ...req,
        multiplier: mult,
        normalizedWeight: Number((mult / totalMultiplier).toFixed(4))
      };
    });

    return {
      jobTitle: parsedJdProfile.jobTitle || 'Job Role',
      primaryRole: parsedJdProfile.primaryRole || parsedJdProfile.jobTitle || 'Developer',
      summary: parsedJdProfile.summary || '',
      primaryTechnologies: primaryTechs.length > 0 ? primaryTechs : (parsedJdProfile.primaryTechnologies || []),
      experienceYearsRequired: Number(parsedJdProfile.experienceYearsRequired || 0),
      requirements: weightedRequirements,
      frozenAt: new Date()
    };
  }
}
