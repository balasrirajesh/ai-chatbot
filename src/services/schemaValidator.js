export class SchemaValidator {
  static VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'PREFERRED', 'LOW'];
  static VALID_CATEGORIES = ['TECHNICAL', 'EXPERIENCE', 'EDUCATION', 'CERTIFICATION', 'DOMAIN', 'SOFT_SKILL', 'RESPONSIBILITY', 'OTHER'];
  static VALID_EVIDENCE_STRENGTHS = ['STRONG', 'MODERATE', 'WEAK', 'NO_EVIDENCE'];
  static VALID_MATCH_STATUSES = ['STRONG_MATCH', 'GOOD_MATCH', 'PARTIAL_MATCH', 'WEAK_MATCH', 'MISSING', 'CRITICAL_GAP'];

  /**
   * Validate and sanitize AI raw output for JD profile
   */
  static sanitizeJdProfile(rawJson) {
    if (!rawJson || typeof rawJson !== 'object') {
      throw new Error('AI JD response is not a valid JSON object.');
    }

    const jobTitle = typeof rawJson.jobTitle === 'string' && rawJson.jobTitle.trim() ? rawJson.jobTitle.trim() : 'Software Role';
    const primaryRole = typeof rawJson.primaryRole === 'string' && rawJson.primaryRole.trim() ? rawJson.primaryRole.trim() : jobTitle;
    const summary = typeof rawJson.summary === 'string' ? rawJson.summary : '';
    const experienceYearsRequired = typeof rawJson.experienceYearsRequired === 'number' ? rawJson.experienceYearsRequired : 0;
    const primaryTechnologies = Array.isArray(rawJson.primaryTechnologies) ? rawJson.primaryTechnologies.filter(t => typeof t === 'string') : [];

    const rawReqs = Array.isArray(rawJson.requirements) ? rawJson.requirements : [];
    const requirements = rawReqs.map((req, i) => {
      const name = typeof req.name === 'string' && req.name.trim() ? req.name.trim() : `Requirement ${i + 1}`;
      let priority = typeof req.priority === 'string' ? req.priority.toUpperCase().trim() : 'MEDIUM';
      
      if (!this.VALID_PRIORITIES.includes(priority)) {
        if (/crit|mandat|must/i.test(priority)) priority = 'CRITICAL';
        else if (/high|essent|req/i.test(priority)) priority = 'HIGH';
        else if (/pref|nice|plus|bonus/i.test(priority)) priority = 'PREFERRED';
        else if (/low/i.test(priority)) priority = 'LOW';
        else priority = 'MEDIUM';
      }

      let category = typeof req.category === 'string' ? req.category.toUpperCase().trim() : 'TECHNICAL';
      if (!this.VALID_CATEGORIES.includes(category)) {
        if (/exp/i.test(category)) category = 'EXPERIENCE';
        else if (/edu|degree/i.test(category)) category = 'EDUCATION';
        else if (/cert/i.test(category)) category = 'CERTIFICATION';
        else if (/soft|comm/i.test(category)) category = 'SOFT_SKILL';
        else category = 'TECHNICAL';
      }

      return {
        name,
        category,
        priority,
        reason: typeof req.reason === 'string' ? req.reason : ''
      };
    });

    return {
      jobTitle,
      primaryRole,
      summary,
      primaryTechnologies,
      experienceYearsRequired,
      requirements
    };
  }

  /**
   * Validate and sanitize AI raw output for resume evidence
   */
  static sanitizeResumeEvidence(rawJson, candidateName = 'Candidate') {
    if (!rawJson || typeof rawJson !== 'object') {
      return {
        candidateName,
        requirements: [],
        strengths: [],
        gaps: []
      };
    }

    const rawReqs = Array.isArray(rawJson.requirements) ? rawJson.requirements : [];
    const requirements = rawReqs.map(req => {
      const name = typeof req.name === 'string' ? req.name.trim() : '';
      let evidence = typeof req.evidence === 'string' && req.evidence.trim() ? req.evidence.trim() : 'No evidence found in the provided resume.';
      let evidenceStrength = typeof req.evidenceStrength === 'string' ? req.evidenceStrength.toUpperCase().trim() : 'NO_EVIDENCE';

      if (!this.VALID_EVIDENCE_STRENGTHS.includes(evidenceStrength)) {
        if (/strong|deep|extens/i.test(evidenceStrength)) evidenceStrength = 'STRONG';
        else if (/mod|med|some|interm/i.test(evidenceStrength)) evidenceStrength = 'MODERATE';
        else if (/weak|basic|course|tut/i.test(evidenceStrength)) evidenceStrength = 'WEAK';
        else evidenceStrength = 'NO_EVIDENCE';
      }

      let source = null;
      if (req.source && typeof req.source === 'object') {
        source = {
          section: typeof req.source.section === 'string' ? req.source.section : 'Resume',
          text: typeof req.source.text === 'string' ? req.source.text : evidence
        };
      }

      return {
        name,
        evidence,
        evidenceStrength,
        source
      };
    });

    return {
      candidateName: typeof rawJson.candidateName === 'string' && rawJson.candidateName.trim() ? rawJson.candidateName.trim() : candidateName,
      requirements,
      strengths: Array.isArray(rawJson.strengths) ? rawJson.strengths.filter(s => typeof s === 'string') : [],
      gaps: Array.isArray(rawJson.gaps) ? rawJson.gaps : []
    };
  }
}
