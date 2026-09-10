/**
 * Evidence Matcher
 * Pure, isolated service whose single responsibility is mapping:
 * JD Requirement + Extracted Resume Evidence -> Final Match Status & Score Match Value
 */
export class EvidenceMatcher {
  /**
   * Match Values:
   * Strong Match: 1.0
   * Good Match: 0.8
   * Partial Match: 0.5
   * Weak Match: 0.25
   * Missing: 0.0
   * Critical Gap: 0.0
   */
  static MATCH_VALUES = {
    STRONG_MATCH: 1.0,
    GOOD_MATCH: 0.8,
    PARTIAL_MATCH: 0.5,
    WEAK_MATCH: 0.25,
    MISSING: 0.0,
    CRITICAL_GAP: 0.0
  };

  /**
   * Determine exact match status and deterministic numerical value for a requirement
   * @param {Object} jdRequirement - { name, priority, normalizedWeight, type }
   * @param {Object} rawCandidateEvidence - { evidence, evidenceStrength, source, experienceYears }
   * @returns {Object} { name, priority, weight, evidence, evidenceStrength, matchStatus, matchValue, isCriticalGap }
   */
  static matchRequirement(jdRequirement, rawCandidateEvidence = {}) {
    const priority = jdRequirement.priority || 'MEDIUM';
    const weight = typeof jdRequirement.normalizedWeight === 'number' ? jdRequirement.normalizedWeight : 0.1;
    
    let evidence = rawCandidateEvidence.evidence || 'No evidence found in the provided resume.';
    let evidenceStrength = (rawCandidateEvidence.evidenceStrength || 'NO_EVIDENCE').toUpperCase();

    // Anti-hallucination & sanitization
    if (!evidence || /no evidence|not mentioned|no sufficient|not found/i.test(evidence)) {
      evidence = 'No evidence found in the provided resume.';
      evidenceStrength = 'NO_EVIDENCE';
    }

    // Determine match status
    let matchStatus;
    const isCritical = priority === 'CRITICAL';

    switch (evidenceStrength) {
      case 'STRONG':
        matchStatus = 'STRONG_MATCH';
        break;
      case 'MODERATE':
        matchStatus = 'PARTIAL_MATCH';
        break;
      case 'WEAK':
        matchStatus = isCritical ? 'CRITICAL_GAP' : 'WEAK_MATCH';
        break;
      case 'NO_EVIDENCE':
      default:
        matchStatus = isCritical ? 'CRITICAL_GAP' : 'MISSING';
        evidenceStrength = 'NO_EVIDENCE';
        break;
    }

    const matchValue = this.MATCH_VALUES[matchStatus] ?? 0.0;
    const isCriticalGap = matchStatus === 'CRITICAL_GAP' || (isCritical && matchValue < 0.5);

    return {
      name: jdRequirement.name,
      priority,
      weight,
      evidence,
      evidenceStrength,
      matchStatus,
      matchValue,
      isCriticalGap
    };
  }

  /**
   * Match an entire frozen JD requirement list against raw candidate evidences
   * @param {Array} frozenRequirements 
   * @param {Array} candidateEvidences 
   * @returns {Array} Structured requirement matches
   */
  static matchAll(frozenRequirements, candidateEvidences = []) {
    return frozenRequirements.map(jdReq => {
      const matchFound = candidateEvidences.find(ce => ce.name && (
        ce.name.toLowerCase() === jdReq.name.toLowerCase() ||
        ce.name.toLowerCase().includes(jdReq.name.toLowerCase()) ||
        jdReq.name.toLowerCase().includes(ce.name.toLowerCase())
      ));

      return this.matchRequirement(jdReq, matchFound || {});
    });
  }
}
