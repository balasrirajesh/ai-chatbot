export class Formatters {
  /**
   * Escape special characters for Telegram MarkdownV2 or legacy formatting
   */
  static escapeMarkdown(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  /**
   * Split long messages into safe chunks within Telegram's 4096 character limit
   */
  static splitMessage(text, maxLength = 3800) {
    if (!text || text.length <= maxLength) return [text];

    const chunks = [];
    let current = '';

    const lines = text.split('\n');
    for (const line of lines) {
      if ((current + '\n' + line).length > maxLength) {
        if (current) chunks.push(current);
        current = line;
      } else {
        current = current ? current + '\n' + line : line;
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  /**
   * Format JD Profile confirmation message
   */
  static formatJdSummary(jd) {
    const primaryTechList = (jd.primaryTechnologies || []).length > 0
      ? jd.primaryTechnologies.map(t => `• ${t}`).join('\n')
      : '• General Backend / Fullstack';

    const critCount = (jd.requirements || []).filter(r => r.priority === 'CRITICAL').length;
    const highCount = (jd.requirements || []).filter(r => r.priority === 'HIGH').length;
    const prefCount = (jd.requirements || []).filter(r => ['PREFERRED', 'LOW', 'MEDIUM'].includes(r.priority)).length;

    return `✅ *Job Description Analyzed & Frozen*\n\n` +
      `💼 *Role:* ${jd.jobTitle || 'Role'}\n` +
      `📌 *Primary Tech Stack:*\n${primaryTechList}\n\n` +
      `🔴 *Critical Requirements:* ${critCount}\n` +
      `🟠 *Important Requirements:* ${highCount}\n` +
      `🟡 *Preferred Requirements:* ${prefCount}\n\n` +
      `🚀 *Next Step:* Upload one or more resumes (PDF or DOCX) to begin candidate matching!`;
  }

  /**
   * Format individual Candidate summary report with source citations
   */
  static formatCandidateReport(analysis) {
    const { candidateName, overallScore, verdict, requirements, strengths, criticalGaps, importantGaps, preferredGaps } = analysis;

    const critReqs = (requirements || []).filter(r => r.priority === 'CRITICAL');
    const highReqs = (requirements || []).filter(r => r.priority === 'HIGH');
    const prefReqs = (requirements || []).filter(r => ['PREFERRED', 'LOW', 'MEDIUM'].includes(r.priority));

    const formatReqList = (list) => {
      if (list.length === 0) return '  _None_';
      return list.map(r => {
        let icon = '✅';
        if (r.matchStatus === 'CRITICAL_GAP') icon = '🔴';
        else if (r.matchStatus === 'MISSING') icon = '❌';
        else if (r.matchStatus === 'PARTIAL_MATCH' || r.matchStatus === 'WEAK_MATCH') icon = '⚠️';

        const categoryTag = r.category ? ` [${r.category}]` : '';
        return `  ${icon} *${r.name}*${categoryTag} (${r.evidenceStrength})\n  ↳ _${r.evidence}_`;
      }).join('\n\n');
    };

    const strengthsText = (strengths || []).length > 0
      ? strengths.map(s => `• ${s}`).join('\n')
      : '• Baseline qualifications met';

    let gapsText = '';
    if (criticalGaps.length > 0) {
      gapsText += `🔴 *Critical:* ${criticalGaps.join(', ')}\n`;
    }
    if (importantGaps.length > 0) {
      gapsText += `🟠 *Important:* ${importantGaps.join(', ')}\n`;
    }
    if (preferredGaps.length > 0) {
      gapsText += `🟡 *Preferred:* ${preferredGaps.join(', ')}\n`;
    }
    if (!gapsText) gapsText = '✅ No major gaps detected!';

    return `👤 *${candidateName}*\n\n` +
      `🎯 *Overall Match:* ${overallScore}%\n` +
      `🏷️ *Verdict:* ${verdict}\n\n` +
      `🔴 *CORE REQUIREMENTS*\n${formatReqList(critReqs)}\n\n` +
      `🟠 *IMPORTANT REQUIREMENTS*\n${formatReqList(highReqs)}\n\n` +
      `🟡 *PREFERRED / SECONDARY*\n${formatReqList(prefReqs)}\n\n` +
      `💪 *STRENGTHS*\n${strengthsText}\n\n` +
      `⚠️ *GAPS*\n${gapsText}`;
  }

  /**
   * Format course recommendations list
   */
  static formatCourseRecommendations(candidateName, recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return `🎓 *Learning Recommendations for ${candidateName}*\n\n✅ Candidate meets all requirements strongly! No critical learning paths required.`;
    }

    const recsList = recommendations.map((r, idx) => {
      let icon = '🟡';
      if (r.priority === 'CRITICAL' || r.priority === 'HIGH') icon = '🔴';
      else if (r.priority === 'MEDIUM') icon = '🟠';

      return `${idx + 1}. ${icon} *${r.topic}*\n` +
        `   *Priority:* ${r.priority}\n` +
        `   *Addresses:* ${r.addressesRequirement} (${r.requirementPriority} JD Requirement)\n` +
        `   *Reason:* ${r.reason}`;
    }).join('\n\n');

    return `🎓 *Learning Recommendations for ${candidateName}*\n\n${recsList}`;
  }

  /**
   * Format candidate rankings overview
   */
  static formatRankings(rankingData) {
    const { rankings, topCandidateExplanation } = rankingData;

    if (!rankings || rankings.length === 0) {
      return `🏆 *CANDIDATE RANKING*\n\nNo candidates analyzed yet. Please upload candidate resumes!`;
    }

    const medalIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const rankingLines = rankings.map((r, i) => {
      const icon = medalIcons[i] || `${i + 1}️⃣`;
      const critGapNote = r.criticalGapsCount > 0 ? ` (⚠️ ${r.criticalGapsCount} critical gap)` : '';
      return `${icon} *${r.candidateName}* — *${r.overallScore}%* [${r.verdict}]${critGapNote}`;
    }).join('\n');

    return `🏆 *CANDIDATE RANKING*\n\n` +
      `${rankingLines}\n\n` +
      `📊 *Top Candidate Rationale:*\n${topCandidateExplanation}`;
  }
}
