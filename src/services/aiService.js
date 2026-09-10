import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../config/index.js';

export class AIService {
  constructor() {
    this.geminiClient = null;
    this.openaiClient = null;
    this.initClients();
  }

  initClients() {
    if (config.ai.geminiApiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(config.ai.geminiApiKey);
      } catch (err) {
        console.warn(`[AIService] Gemini client init warning: ${err.message}`);
      }
    }

    if (config.ai.provider === 'openrouter' && (config.ai.openrouterApiKey || config.ai.openaiApiKey)) {
      try {
        this.openrouterClient = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: config.ai.openrouterApiKey || config.ai.openaiApiKey,
          defaultHeaders: {
            'HTTP-Referer': 'https://github.com/balasrirajesh/ai-chatbot',
            'X-Title': 'Hashira Resume Bot'
          }
        });
      } catch (err) {
        console.warn(`[AIService] OpenRouter client init warning: ${err.message}`);
      }
    }

    if (config.ai.openaiApiKey && config.ai.provider === 'openai') {
      try {
        this.openaiClient = new OpenAI({ apiKey: config.ai.openaiApiKey });
      } catch (err) {
        console.warn(`[AIService] OpenAI client init warning: ${err.message}`);
      }
    }
  }

  /**
   * Safe JSON parser with repair for markdown code fences
   */
  static extractJsonFromResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Empty or invalid response from AI model');
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (innerErr) {
          throw new Error(`Failed to parse AI JSON response: ${err.message}. Raw text: ${rawText.slice(0, 200)}...`);
        }
      }
      throw new Error(`Failed to parse AI response as JSON: ${err.message}`);
    }
  }

  /**
   * Call LLM and return structured JSON
   */
  async generateJSON(prompt, systemInstruction = 'You are an expert AI recruiting assistant. Return only valid, strictly formatted JSON.') {
    // Check if any keys configured before attempting
    this.initClients();
    if (!this.geminiClient && !this.openaiClient && !this.openrouterClient) {
      throw new Error('No AI API key configured in .env file.');
    }

    const maxRetries = config.ai.maxRetries;
    const timeoutMs = config.ai.timeoutMs;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`AI Request timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        const executionPromise = (async () => {
          if (config.ai.provider === 'gemini' && this.geminiClient) {
            const model = this.geminiClient.getGenerativeModel({
              model: config.ai.geminiModel,
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
              systemInstruction: systemInstruction
            });

            const response = await model.generateContent(prompt);
            const text = response.response.text();
            return AIService.extractJsonFromResponse(text);
          }

          if (config.ai.provider === 'openrouter' && this.openrouterClient) {
            const response = await this.openrouterClient.chat.completions.create({
              model: config.ai.openrouterModel,
              response_format: { type: 'json_object' },
              temperature: 0.1,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
              ]
            });

            const text = response.choices[0]?.message?.content;
            return AIService.extractJsonFromResponse(text);
          }

          if (config.ai.provider === 'openai' && this.openaiClient) {
            const response = await this.openaiClient.chat.completions.create({
              model: config.ai.openaiModel,
              response_format: { type: 'json_object' },
              temperature: 0.1,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
              ]
            });

            const text = response.choices[0]?.message?.content;
            return AIService.extractJsonFromResponse(text);
          }

          throw new Error(`Configured AI provider "${config.ai.provider}" is unavailable.`);
        })();

        return await Promise.race([executionPromise, timeoutPromise]);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }

    throw new Error(`AI Request failed after retries: ${lastError?.message}`);
  }
}

export const aiService = new AIService();
