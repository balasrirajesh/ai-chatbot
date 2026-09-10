import { aiService } from './aiService.js';

export class EmbeddingService {
  /**
   * Compute semantic cosine similarity between two text snippets
   * @param {string} text1 
   * @param {string} text2 
   * @returns {Promise<number>} Similarity score between 0.0 and 1.0
   */
  static async computeSimilarity(text1, text2) {
    if (!text1 || !text2) return 0.0;
    
    // Exact token match quick path
    const t1 = text1.toLowerCase().trim();
    const t2 = text2.toLowerCase().trim();
    if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) {
      return 1.0;
    }

    // Attempt AI-assisted semantic score
    try {
      const prompt = `Rate the technical semantic similarity between these two requirements/experiences on a scale of 0.0 to 1.0:
Item 1: "${text1}"
Item 2: "${text2}"

Output schema: { "similarity": 0.85 }`;

      const res = await aiService.generateJSON(prompt, 'You are an NLP similarity scorer. Output valid JSON.');
      if (typeof res?.similarity === 'number') {
        return Math.max(0.0, Math.min(1.0, res.similarity));
      }
    } catch (e) {
      // Fallback to Jaccard word-overlap similarity
      const words1 = new Set(t1.split(/\W+/).filter(w => w.length > 2));
      const words2 = new Set(t2.split(/\W+/).filter(w => w.length > 2));
      if (words1.size === 0 || words2.size === 0) return 0.0;

      let intersection = 0;
      for (const w of words1) {
        if (words2.has(w)) intersection++;
      }
      const union = new Set([...words1, ...words2]).size;
      return union > 0 ? intersection / union : 0.0;
    }

    return 0.5;
  }
}
