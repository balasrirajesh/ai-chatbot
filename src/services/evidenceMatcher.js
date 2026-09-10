import { EmbeddingService } from './embeddingService.js';

/**
 * Evidence Matcher
 * Isolated service mapping:
 * JD Requirement + Extracted Resume Evidence + Semantic Similarity -> Final Match Status & Score Match Value
 */
export class EvidenceMatcher {
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
   * @param {Object} jdRequirement - { name, priority, normalizedWeight, type, category }
   * @param {Object} rawCandidateEvidence - { evidence, evidenceStrength, source, experienceYears }
   * @returns {Object} { name, priority, weight, evidence, evidenceStrength, matchStatus, matchValue, isCriticalGap }
   */
  static matchRequirement(jdRequirement, rawCandidateEvidence = {}) {
    if (typeof jdRequirement.normalizedWeight !== 'number' || isNaN(jdRequirement.normalizedWeight)) {
      throw new Error(`Invalid or missing weight for JD requirement: "${jdRequirement.name}"`);
    }

    const priority = jdRequirement.priority || 'MEDIUM';
    const weight = jdRequirement.normalizedWeight;
    
    let evidence = rawCandidateEvidence.evidence || 'No evidence found in the provided resume.';
    let evidenceStrength = (rawCandidateEvidence.evidenceStrength || 'NO_EVIDENCE').toUpperCase();

    // Anti-hallucination check
    if (!evidence || /no evidence|not mentioned|no sufficient|not found/i.test(evidence)) {
      evidence = 'No evidence found in the provided resume.';
      evidenceStrength = 'NO_EVIDENCE';
    }

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
      category: jdRequirement.category || 'TECHNICAL',
      priority,
      weight,
      evidence,
      evidenceStrength,
      matchStatus,
      matchValue,
      isCriticalGap,
      source: rawCandidateEvidence.source || null
    };
  }

  /**
   * Match all frozen JD requirements with semantic fallback for partial/unmatched skills
   * @param {Array} frozenRequirements 
   * @param {Array} candidateEvidences 
   * @returns {Promise<Array>} Structured requirement matches
   */
  static async matchAll(frozenRequirements, candidateEvidences = []) {
    const results = [];

    for (const jdReq of frozenRequirements) {
      let matchFound = candidateEvidences.find(ce => ce.name && (
        ce.name.toLowerCase() === jdReq.name.toLowerCase() ||
        ce.name.toLowerCase().includes(jdReq.name.toLowerCase()) ||
        jdReq.name.toLowerCase().includes(ce.name.toLowerCase())
      ));

      // Semantic matching integration if exact token match was missing but candidate has related experiences
      if (!matchFound || matchFound.evidenceStrength === 'NO_EVIDENCE') {
        for (const ce of candidateEvidences) {
          if (ce.name && ce.evidenceStrength !== 'NO_EVIDENCE') {
            const similarity = await EmbeddingService.computeSimilarity(jdReq.name, ce.name);
            if (similarity >= 0.8) {
              matchFound = {
                ...ce,
                evidence: `[Semantically Matched from ${ce.name}] ${ce.evidence}`,
                evidenceStrength: ce.evidenceStrength === 'STRONG' ? 'MODERATE' : 'WEAK'
              };
              break;
            }
          }
        }
      }

      results.push(this.matchRequirement(jdReq, matchFound || {}));
    }

    return results;
  }
}
