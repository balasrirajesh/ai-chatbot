
import { aiService } from './aiService.js';

export class CourseEngine {
  /**
   * Deterministically order course recommendations strictly aligned with JD priorities,
   * then optionally enrich with AI explanations.
   * 
   * @param {Array} requirementMatches - Requirements from the candidate analysis
   * @param {Object} jdProfile - Frozen JD profile
   * @returns {Promise<Array>} List of prioritized course recommendations
   */
  static async generateRecommendations(requirementMatches, jdProfile) {
    if (!Array.isArray(requirementMatches)) return [];

    // Filter gaps (where candidate matchValue is less than 0.8 / not strong)
    const gapRequirements = requirementMatches.filter(req => req.matchValue < 0.8);

    if (gapRequirements.length === 0) {
      return [];
    }

    // Deterministic priority mapping:
    // Gap on CRITICAL req -> Course Priority = HIGH (or CRITICAL)
    // Gap on HIGH req -> Course Priority = MEDIUM / HIGH
    // Gap on MEDIUM req -> Course Priority = MEDIUM
    // Gap on LOW/PREFERRED req -> Course Priority = LOW
    const priorityOrder = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
      PREFERRED: 5
    };

    // Sort gaps deterministically by priority: Critical gaps ALWAYS first
    const sortedGaps = [...gapRequirements].sort((a, b) => {
      const pA = priorityOrder[a.priority] || 99;
      const pB = priorityOrder[b.priority] || 99;
      if (pA !== pB) return pA - pB;
      return (b.weight || 0) - (a.weight || 0); // secondary sort by weight
    });

    // Create deterministic structured course blueprints
    const courseBlueprints = sortedGaps.map(gap => {
      let recPriority;
      if (gap.priority === 'CRITICAL') recPriority = 'HIGH';
      else if (gap.priority === 'HIGH') recPriority = 'MEDIUM';
      else recPriority = 'LOW';

      return {
        topic: `${gap.name} Comprehensive Training`,
        priority: recPriority,
        addressesRequirement: gap.name,
        requirementPriority: gap.priority,
        reason: `${gap.name} is a ${gap.priority.toLowerCase()} requirement for this role and sufficient evidence was not found in the candidate's resume.`
      };
    });

    // Attempt AI enrichment for realistic course names and tailored rationale while keeping deterministic order
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
        // Overlay AI details onto deterministic priority structure
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
      // Fallback cleanly to deterministic blueprints if AI call fails
    }

    return courseBlueprints;
  }
}
