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

    // Create deterministic structured course blueprints with curated learning channels/resources
    const courseBlueprints = sortedGaps.map(gap => {
      const sanitizedName = gap.name.replace(/[^\w\s+#.-]/gi, '').trim();
      const encodedQuery = encodeURIComponent(`${sanitizedName} tutorial for developers`);
      return {
        topic: `${gap.name} Mastery & Application`,
        priority: gap.coursePriority,
        addressesRequirement: gap.name,
        requirementPriority: gap.priority,
        reason: `${gap.name} is a ${gap.priority.toLowerCase()} requirement for this role and sufficient evidence was not found in the candidate's resume.`,
        resources: [
          `📺 [YouTube Search: ${sanitizedName} Full Course](https://www.youtube.com/results?search_query=${encodedQuery})`,
          `📖 Official Docs & Guides for ${sanitizedName}`
        ]
      };
    });

    // AI enrichment for realistic course names, top YouTube channels, and tailored rationale while keeping deterministic order
    try {
      const prompt = `Here are identified skill gaps for a candidate for the role "${jdProfile?.jobTitle || 'Developer'}":
${JSON.stringify(courseBlueprints.map(c => ({ requirement: c.addressesRequirement, jdPriority: c.requirementPriority, recommendationPriority: c.priority })), null, 2)}

Enrich each requirement with:
1. "topic": Realistic learning course/project title
2. "reason": Why they need this to become eligible for the JD
3. "recommendedChannels": Top 2-3 specific real YouTube channels, documentation sites, or platforms (e.g., "freeCodeCamp", "Traversy Media", "Amigoscode", "Fireship", "Official Spring Documentation", "Hussein Nasser")
4. "searchUrl": A direct YouTube search query link for this specific topic

CRITICAL RULE: Keep the exact same items in the exact same priority order!

Output schema:
{
  "recommendations": [
    {
      "topic": "string",
      "priority": "string",
      "addressesRequirement": "string",
      "requirementPriority": "string",
      "reason": "string",
      "recommendedChannels": ["string"],
      "searchUrl": "string"
    }
  ]
}`;

      const aiResponse = await aiService.generateJSON(prompt, 'You are a senior tech mentor and career advisor. Output only valid JSON.');
      if (aiResponse && Array.isArray(aiResponse.recommendations) && aiResponse.recommendations.length > 0) {
        return courseBlueprints.map((blueprint, i) => {
          const aiItem = aiResponse.recommendations.find(r => r.addressesRequirement?.toLowerCase() === blueprint.addressesRequirement.toLowerCase()) || aiResponse.recommendations[i];
          return {
            topic: aiItem?.topic || blueprint.topic,
            priority: blueprint.priority, // enforce deterministic priority
            addressesRequirement: blueprint.addressesRequirement,
            requirementPriority: blueprint.requirementPriority,
            reason: aiItem?.reason || blueprint.reason,
            recommendedChannels: Array.isArray(aiItem?.recommendedChannels) && aiItem.recommendedChannels.length > 0
              ? aiItem.recommendedChannels
              : ['freeCodeCamp', 'Traversy Media', 'Official Documentation'],
            searchUrl: aiItem?.searchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(blueprint.addressesRequirement + ' tutorial')}`
          };
        });
      }
    } catch (err) {
      // Fallback cleanly to deterministic blueprints
    }

    return courseBlueprints;
  }
}
