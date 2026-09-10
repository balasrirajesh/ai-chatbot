function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ExperienceMatcher {
  /**
   * Evaluate candidate years of experience against a JD experience requirement,
   * distinguishing total professional experience from technology-specific experience.
   * 
   * @param {Object} jdReq - { name, priority, normalizedWeight, category }
   * @param {string} resumeText 
   * @param {number} candidateExperienceYears 
   * @returns {Object} Evidence with calculated years and contextual source
   */
  static evaluateExperience(jdReq, resumeText, candidateExperienceYears = null) {
    const textLower = resumeText.toLowerCase();

    // 1. Extract required years from JD requirement (e.g., "3+ years Java", "5 years experience")
    const reqMatch = jdReq.name.match(/(\d+)\+?\s*years?/i);
    const requiredYears = reqMatch ? parseInt(reqMatch[1], 10) : 2;

    // 2. Identify if the requirement targets a specific technology (e.g. "Java", "Python", "React")
    const techTokens = ['java', 'python', 'javascript', 'typescript', 'c#', 'c++', 'golang', 'go', 'ruby', 'php', 'rust', 'react', 'angular', 'vue', 'node.js', 'spring boot', 'django', 'aws', 'sql'];
    const targetTech = techTokens.find(tech => {
      const escapedTech = escapeRegExp(tech);
      return new RegExp(`(^|\\W)${escapedTech}(\\W|$)`, 'i').test(jdReq.name);
    });

    let detectedYears = 0;
    let isTechSpecific = false;

    if (targetTech) {
      // Technology-specific experience search (e.g., "4 years of Java", "Java developer for 3 years")
      const escapedTech = escapeRegExp(targetTech);
      const techRegex = new RegExp(`(\\d+)\\+?\\s*years?[^.\\n]*\\b${escapedTech}\\b|\\b${escapedTech}\\b[^.\\n]*(\\d+)\\+?\\s*years?`, 'i');
      const techMatch = textLower.match(techRegex);
      if (techMatch) {
        detectedYears = parseInt(techMatch[1] || techMatch[2], 10);
        isTechSpecific = true;
      }
    }

    // 3. Fallback to general professional experience if not tech-specific or not explicitly matched
    if (detectedYears === 0) {
      if (candidateExperienceYears !== null && candidateExperienceYears !== undefined && candidateExperienceYears > 0) {
        detectedYears = candidateExperienceYears;
      } else {
        const candMatch = textLower.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:professional|backend|software|development|engineering|experience)/i);
        detectedYears = candMatch ? parseInt(candMatch[1], 10) : 0;
      }
    }

    // 4. Date ranges fallback (e.g. 2021-2026 -> 5 years)
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

    // 5. Determine evidence strength based on ratio
    let evidenceStrength = 'NO_EVIDENCE';
    let evidence = '';

    const label = isTechSpecific ? `specific ${targetTech}` : 'professional';

    if (detectedYears >= requiredYears && detectedYears > 0) {
      evidenceStrength = 'STRONG';
      evidence = `Candidate has ~${detectedYears} years of ${label} experience, meeting the required ${requiredYears}+ years.`;
    } else if (detectedYears > 0) {
      const ratio = detectedYears / requiredYears;
      if (ratio >= 0.5) {
        evidenceStrength = 'MODERATE';
        evidence = `Candidate has ~${detectedYears} years of ${label} experience (less than required ${requiredYears}+ years).`;
      } else {
        evidenceStrength = 'WEAK';
        evidence = `Candidate has limited (~${detectedYears} year) ${label} experience for a ${requiredYears}+ year role.`;
      }
    } else {
      evidenceStrength = 'NO_EVIDENCE';
      evidence = `No explicit years of ${label} experience identified in the provided resume.`;
    }

    return {
      name: jdReq.name,
      evidence,
      evidenceStrength,
      experienceYears: detectedYears,
      requiredYears,
      isTechSpecific
    };
  }
}
