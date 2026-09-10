export class ExperienceMatcher {
  /**
   * Evaluate candidate years of experience against a JD experience requirement
   * @param {Object} jdReq - { name, priority, normalizedWeight }
   * @param {string} resumeText 
   * @param {number} candidateExperienceYears 
   * @returns {Object} Evidence with calculated years and contextual source
   */
  static evaluateExperience(jdReq, resumeText, candidateExperienceYears = null) {
    const textLower = resumeText.toLowerCase();

    // 1. Extract required years from JD requirement (e.g., "3+ years", "5 years")
    const reqMatch = jdReq.name.match(/(\d+)\+?\s*years?/i);
    const requiredYears = reqMatch ? parseInt(reqMatch[1], 10) : 2;

    // 2. Extract detected candidate years if not pre-calculated
    let detectedYears = candidateExperienceYears;
    if (detectedYears === null || detectedYears === undefined) {
      const candMatch = textLower.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:professional|backend|software|development|engineering|experience)/i);
      detectedYears = candMatch ? parseInt(candMatch[1], 10) : 0;
    }

    // 3. Fallback: Search for date ranges in resume (e.g. 2021-2026 -> 5 years)
    if (detectedYears === 0) {
      const yearMatches = [...textLower.matchAll(/\b(20\d{2})\s*[-–—to]+\s*(20\d{2}|present|current)\b/g)];
      let totalCalculatedYears = 0;
      const currentYear = new Date().getFullYear();

      for (const m of yearMatches) {
        const start = parseInt(m[1], 10);
        const end = /present|current/i.test(m[2]) ? currentYear : parseInt(m[2], 10);
        if (end >= start && start >= 2000) {
          totalCalculatedYears += Math.max(1, end - start);
        }
      }

      if (totalCalculatedYears > 0) {
        detectedYears = Math.min(totalCalculatedYears, 20);
      }
    }

    // 4. Determine evidence strength based on ratio
    let evidenceStrength = 'NO_EVIDENCE';
    let evidence = '';

    if (detectedYears >= requiredYears && detectedYears > 0) {
      evidenceStrength = 'STRONG';
      evidence = `Candidate has ~${detectedYears} years of experience, exceeding the required ${requiredYears}+ years.`;
    } else if (detectedYears > 0) {
      const ratio = detectedYears / requiredYears;
      if (ratio >= 0.5) {
        evidenceStrength = 'MODERATE';
        evidence = `Candidate has ~${detectedYears} years of experience (less than required ${requiredYears}+ years).`;
      } else {
        evidenceStrength = 'WEAK';
        evidence = `Candidate has limited (~${detectedYears} year) experience for a ${requiredYears}+ year role.`;
      }
    } else {
      evidenceStrength = 'NO_EVIDENCE';
      evidence = 'No explicit years of professional experience identified in the provided resume.';
    }

    return {
      name: jdReq.name,
      evidence,
      evidenceStrength,
      experienceYears: detectedYears,
      requiredYears
    };
  }
}
