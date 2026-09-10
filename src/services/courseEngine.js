import { aiService } from './aiService.js';
import { GapEngine } from './gapEngine.js';

export class CourseEngine {
  /**
   * Deterministically order course recommendations strictly aligned with JD priorities,
   * sourcing gaps directly from the authoritative GapEngine.
   * 
   * @param {Array} requirementMatches - Requirements from the candidate analysis
   * @param {Object} jdProfile - Frozen JD profile
   * @returns {Promise<Array>} List of prioritized course recommendations
   */
  static async generateRecommendations(requirementMatches, jdProfile) {
    if (!Array.isArray(requirementMatches)) return [];

    // Authoritative gap extraction via GapEngine
    const { criticalGaps, importantGaps, mediumGaps, preferredGaps } = GapEngine.categorizeGaps(requirementMatches);

    // Deterministic priority ordering:
    // 1. Critical gaps (HIGH course priority)
    // 2. Important gaps (MEDIUM course priority)
    // 3. Medium gaps (MEDIUM/LOW course priority)
    // 4. Preferred gaps (LOW course priority)
    const sortedGaps = [
      ...criticalGaps.map(g => ({ ...g, coursePriority: 'HIGH' })),
      ...importantGaps.map(g => ({ ...g, coursePriority: 'MEDIUM' })),
      ...mediumGaps.map(g => ({ ...g, coursePriority: 'MEDIUM' })),
      ...preferredGaps.map(g => ({ ...g, coursePriority: 'LOW' }))
    ];

    if (sortedGaps.length === 0) {
      return [];
    }

    // Create deterministic structured course blueprints
    const courseBlueprints = sortedGaps.map(gap => ({
      topic: `${gap.name} Comprehensive Training`,
      priority: gap.coursePriority,
      addressesRequirement: gap.name,
      requirementPriority: gap.priority,
      reason: `${gap.name} is a ${gap.priority.toLowerCase()} requirement for this role and sufficient evidence was not found in the candidate's resume.`
    }));

    // AI enrichment for realistic course names and tailored rationale while keeping deterministic order
    try {
      const prompt = `Here are identified skill gaps for a candidate for the role "${jdProfile?.jobTitle || 'Developer'}":
${JSON.stringify(courseBlueprints.map(c => ({ requirement: c.addressesRequirement, jdPriority: c.requirementPriority, recommendationPriority: c.priority })), null, 2)}

Enrich each course with a realistic learning topic title and concise reason.
CRITICAL RULE: Keep the exact same items in the exact same priority order!

Output schema:
{
  "recommendations": [
    {
      "topic": "string",
      "priority": "string",
      "addressesRequirement": "string",
      "requirementPriority": "string",
      "reason": "string"
    }
  ]
}`;

      const aiResponse = await aiService.generateJSON(prompt, 'You are a technical career advisor. Output only valid JSON.');
      if (aiResponse && Array.isArray(aiResponse.recommendations) && aiResponse.recommendations.length > 0) {
        return courseBlueprints.map((blueprint, i) => {
          const aiItem = aiResponse.recommendations.find(r => r.addressesRequirement?.toLowerCase() === blueprint.addressesRequirement.toLowerCase()) || aiResponse.recommendations[i];
          return {
            topic: aiItem?.topic || blueprint.topic,
            priority: blueprint.priority, // enforce deterministic priority
            addressesRequirement: blueprint.addressesRequirement,
            requirementPriority: blueprint.requirementPriority,
            reason: aiItem?.reason || blueprint.reason
          };
        });
      }
    } catch (err) {
      // Fallback cleanly to deterministic blueprints
    }

    return courseBlueprints;
  }
}
