import { JDValidator } from './jdValidator.js';

export class JDNormalizer {
  /**
   * Produce the canonical, immutable frozen JD Profile
   * @param {Object} validatedProfile 
   * @returns {Object} Canonical frozen JD Profile
   */
  static normalizeAndFreeze(validatedProfile) {
    if (!validatedProfile || typeof validatedProfile !== 'object') {
      throw new Error('Cannot normalize invalid JD profile structure.');
    }

    if (!Array.isArray(validatedProfile.requirements) || validatedProfile.requirements.length === 0) {
      throw new Error('JD profile must contain a non-empty requirements array.');
    }

    const requirements = validatedProfile.requirements.map((req, index) => {
      const priority = req.priority || 'MEDIUM';
      const multiplier = req.multiplier || JDValidator.PRIORITY_MULTIPLIERS[priority];
      
      if (!multiplier || isNaN(multiplier)) {
        throw new Error(`Invalid priority multiplier for requirement "${req.name}".`);
      }

      if (typeof req.normalizedWeight !== 'number' || isNaN(req.normalizedWeight) || req.normalizedWeight <= 0) {
        throw new Error(`Requirement "${req.name}" failed weight validation: normalizedWeight is missing or non-positive.`);
      }

      return {
        id: `req_${index + 1}`,
        name: req.name,
        category: req.category || 'TECHNICAL',
        priority,
        multiplier,
        normalizedWeight: req.normalizedWeight,
        reason: req.reason || '',
        isPrimaryTech: req.isPrimaryTech || false
      };
    });

    const frozenProfile = {
      jobTitle: validatedProfile.jobTitle || 'Software Role',
      primaryRole: validatedProfile.primaryRole || validatedProfile.jobTitle || 'Developer',
      summary: validatedProfile.summary || '',
      primaryTechnologies: validatedProfile.primaryTechnologies || [],
      experienceYearsRequired: Number(validatedProfile.experienceYearsRequired || 0),
      requirements: Object.freeze(requirements.map(r => Object.freeze(r))),
      createdAt: new Date().toISOString(),
      frozen: true,
      frozenAt: new Date()
    };

    return Object.freeze(frozenProfile);
  }
}
