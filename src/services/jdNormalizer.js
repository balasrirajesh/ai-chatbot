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

    const requirements = (validatedProfile.requirements || []).map((req, index) => {
      const priority = req.priority || 'MEDIUM';
      const multiplier = req.multiplier || JDValidator.PRIORITY_MULTIPLIERS[priority] || 1.5;
      const weight = typeof req.normalizedWeight === 'number' ? req.normalizedWeight : 0.1;

      return {
        id: `req_${index + 1}`,
        name: req.name,
        category: req.category || 'TECHNICAL',
        priority,
        multiplier,
        weight,
        reason: req.reason || '',
        isPrimaryTech: req.isPrimaryTech || false
      };
    });

    return {
      jobTitle: validatedProfile.jobTitle || 'Software Role',
      primaryRole: validatedProfile.primaryRole || validatedProfile.jobTitle || 'Developer',
      summary: validatedProfile.summary || '',
      primaryTechnologies: validatedProfile.primaryTechnologies || [],
      experienceYearsRequired: Number(validatedProfile.experienceYearsRequired || 0),
      requirements,
      createdAt: new Date().toISOString(),
      frozen: true,
      frozenAt: new Date()
    };
  }
}
