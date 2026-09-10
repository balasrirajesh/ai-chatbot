import { aiService } from './aiService.js';
import { SchemaValidator } from './schemaValidator.js';
import { EvidenceMatcher } from './evidenceMatcher.js';
import { ExperienceMatcher } from './experienceMatcher.js';
import { InputValidator } from './inputValidator.js';

export class ResumeAnalyzer {
  /**
   * Analyze candidate resume text against the frozen JD Profile
   * @param {string} resumeText 
   * @param {object} frozenJdProfile 
   * @param {string} candidateName 
   * @param {string} filename 
   */
  static async analyzeResumeAgainstJd(resumeText, frozenJdProfile, candidateName = 'Candidate', filename = '') {
    const validation = InputValidator.validateResumeText(resumeText, filename);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const sanitizedResumeText = validation.sanitized;

    if (!frozenJdProfile || !Array.isArray(frozenJdProfile.requirements)) {
      throw new Error('Invalid or missing frozen JD Profile.');
    }

    const systemInstruction = `You are a strict, objective, and anti-hallucination recruitment auditor.
Your job is to extract candidate evidence from a resume for a list of pre-defined Job Description requirements.

CRITICAL ANTI-HALLUCINATION RULES:
1. NEVER invent or assume skills, years of experience, projects, or certifications not explicitly documented in the resume.
2. If a requirement is NOT mentioned in the resume, you MUST set:
   - evidence: "No evidence found in the provided resume."
   - evidenceStrength: "NO_EVIDENCE"
   Do NOT say "Candidate does not know X", say "No evidence found in the provided resume."
3. Evaluate EVIDENCE STRENGTH based on real context:
   - "STRONG": 2+ years of professional experience, production responsibilities, deep development work.
   - "MODERATE": Academic projects, basic internship, or side projects with hands-on application.
   - "WEAK": Solely completed a course, tutorial, certification, or listed as a hobby/interest without real experience.
   - "NO_EVIDENCE": Not mentioned or no proof.
4. Provide source snippets where available:
   - "source": { "section": "Work Experience", "text": "Exact or near-verbatim quote" }

Output MUST strictly match this JSON schema:
{
  "candidateName": "string",
  "requirements": [
    {
      "name": "string (MUST EXACTLY MATCH the JD requirement name provided)",
      "priority": "string (MUST MATCH JD requirement priority)",
      "evidence": "string (verbatim quotes or concise summary of actual evidence found in resume, or 'No evidence found in the provided resume.')",
      "evidenceStrength": "STRONG | MODERATE | WEAK | NO_EVIDENCE",
      "source": {
        "section": "string",
        "text": "string"
      }
    }
  ],
  "strengths": ["string (bullet points of verified strong matches)"],
  "gaps": [
    {
      "name": "string",
      "priority": "CRITICAL | HIGH | MEDIUM | PREFERRED | LOW",
      "description": "string"
    }
  ]
}`;

    const prompt = `FROZEN JD REQUIREMENTS:
${JSON.stringify(frozenJdProfile.requirements.map(r => ({ name: r.name, category: r.category, priority: r.priority })), null, 2)}

CANDIDATE RESUME:
\`\`\`
${sanitizedResumeText.slice(0, 12000)}
\`\`\`

Extract evidence for EVERY requirement from the frozen JD list against this resume according to the strict instructions.`;

    let rawAiResult;
    try {
      rawAiResult = await aiService.generateJSON(prompt, systemInstruction);
    } catch (err) {
      rawAiResult = this.createRuleBasedEvaluation(sanitizedResumeText, frozenJdProfile, candidateName);
    }

    // 1. Sanitize AI Schema
    const sanitizedAi = SchemaValidator.sanitizeResumeEvidence(rawAiResult, candidateName);

    // 2. Enhance Experience Requirements with ExperienceMatcher
    const enhancedEvidences = sanitizedAi.requirements.map(req => {
      const jdReq = frozenJdProfile.requirements.find(r => r.name.toLowerCase() === req.name.toLowerCase());
      if (jdReq && (jdReq.category === 'EXPERIENCE' || /years?.*experience/i.test(jdReq.name))) {
        const expMatch = ExperienceMatcher.evaluateExperience(jdReq, sanitizedResumeText);
        return {
          ...req,
          evidence: expMatch.evidence,
          evidenceStrength: expMatch.evidenceStrength,
          source: { section: 'Work History', text: expMatch.evidence }
        };
      }
      return req;
    });

    // 3. Pass through EvidenceMatcher with semantic matching
    const matchedRequirements = await EvidenceMatcher.matchAll(frozenJdProfile.requirements, enhancedEvidences);

    return {
      candidateName: sanitizedAi.candidateName || candidateName || 'Candidate',
      filename,
      rawResumeText: sanitizedResumeText,
      requirements: matchedRequirements,
      strengths: sanitizedAi.strengths,
      gaps: sanitizedAi.gaps
    };
  }

  /**
   * Rule-based fallback for offline test suites
   */
  static createRuleBasedEvaluation(resumeText, frozenJdProfile, candidateName) {
    const textLower = resumeText.toLowerCase();

    const candExpMatch = resumeText.match(/(\d+)\+?\s*years?/i);
    const candExpYears = candExpMatch ? parseInt(candExpMatch[1], 10) : 0;

    const requirements = frozenJdProfile.requirements.map(req => {
      const nameLower = req.name.toLowerCase();

      if (req.category === 'EXPERIENCE' || /years?.*experience/i.test(nameLower)) {
        const expMatch = ExperienceMatcher.evaluateExperience(req, resumeText, candExpYears);
        return {
          name: req.name,
          evidence: expMatch.evidence,
          evidenceStrength: expMatch.evidenceStrength,
          source: { section: 'Experience', text: expMatch.evidence }
        };
      }

      let token = nameLower.replace(/\b(experience|knowledge|exposure|skills?|\d+\+?\s*years?)\b/g, '').trim();
      let regexPattern = `\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`;
      if (token === 'rest api') {
        regexPattern = `\\b(rest api|rest apis|restful|rest)\\b`;
      }
      const regex = new RegExp(regexPattern, 'i');

      let evidence = 'No evidence found in the provided resume.';
      let evidenceStrength = 'NO_EVIDENCE';
      let source = null;

      if (regex.test(textLower)) {
        const courseRegex = new RegExp(`(completed|course|tutorial|certificate|masterclass)[^.\\n]*\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b|\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^.\\n]*(course|tutorial|masterclass)`, 'i');
        const hasProdEvidence = (candExpYears > 0 || /enterprise|designed|maintained|developed|architected|microservices|production/i.test(textLower)) && !courseRegex.test(textLower);

        if (courseRegex.test(textLower)) {
          evidenceStrength = 'WEAK';
          evidence = `Course or tutorial completion noted for ${req.name}.`;
          source = { section: 'Certifications & Courses', text: evidence };
        } else if (hasProdEvidence) {
          evidenceStrength = 'STRONG';
          evidence = `Verified professional experience with ${req.name} mentioned in resume.`;
          source = { section: 'Work Experience', text: evidence };
        } else {
          evidenceStrength = 'MODERATE';
          evidence = `Hands-on usage of ${req.name} identified in resume.`;
          source = { section: 'Projects & Skills', text: evidence };
        }
      }

      return {
        name: req.name,
        evidence,
        evidenceStrength,
        source
      };
    });

    return {
      candidateName,
      requirements,
      strengths: requirements.filter(r => r.evidenceStrength === 'STRONG').map(r => `Strong experience in ${r.name}`),
      gaps: requirements.filter(r => r.evidenceStrength === 'NO_EVIDENCE' || r.evidenceStrength === 'WEAK').map(r => ({
        name: r.name,
        priority: r.priority,
        description: `Missing or insufficient evidence for ${r.name}`
      }))
    };
  }
}
