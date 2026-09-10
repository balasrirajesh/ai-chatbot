export class Formatters {
  /**
   * Escape HTML special characters for safe rendering in Telegram HTML mode
   */
  static escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
      ? jd.primaryTechnologies.map(t => `• ${this.escapeHtml(t)}`).join('\n')
      : '• General Backend / Fullstack';

    const critCount = (jd.requirements || []).filter(r => r.priority === 'CRITICAL').length;
    const highCount = (jd.requirements || []).filter(r => r.priority === 'HIGH').length;
    const prefCount = (jd.requirements || []).filter(r => ['PREFERRED', 'LOW', 'MEDIUM'].includes(r.priority)).length;

    return `✅ <b>Job Description Analyzed &amp; Frozen</b>\n\n` +
      `💼 <b>Role:</b> ${this.escapeHtml(jd.jobTitle || 'Role')}\n` +
      `📌 <b>Primary Tech Stack:</b>\n${primaryTechList}\n\n` +
      `🔴 <b>Critical Requirements:</b> ${critCount}\n` +
      `🟠 <b>Important Requirements:</b> ${highCount}\n` +
      `🟡 <b>Preferred Requirements:</b> ${prefCount}\n\n` +
      `🚀 <b>Next Step:</b> Upload one or more resumes (PDF, DOCX, or TXT) to begin candidate matching!`;
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
      if (!list || list.length === 0) return '  <i>None</i>';
      return list.map(r => {
        let icon = '✅';
        if (r.matchStatus === 'CRITICAL_GAP') icon = '🔴';
        else if (r.matchStatus === 'MISSING') icon = '❌';
        else if (r.matchStatus === 'PARTIAL_MATCH' || r.matchStatus === 'WEAK_MATCH') icon = '⚠️';

        const categoryTag = r.category ? ` [${this.escapeHtml(r.category)}]` : '';
        const nameEscaped = this.escapeHtml(r.name);
        const strengthEscaped = this.escapeHtml(r.evidenceStrength);
        const evidenceEscaped = this.escapeHtml(r.evidence);

        return `  ${icon} <b>${nameEscaped}</b>${categoryTag} (${strengthEscaped})\n  ↳ <i>${evidenceEscaped}</i>`;
      }).join('\n\n');
    };

    const strengthsText = (strengths || []).length > 0
      ? strengths.map(s => `• ${this.escapeHtml(s)}`).join('\n')
      : '• Baseline qualifications met';

    let gapsText = '';
    if (criticalGaps && criticalGaps.length > 0) {
      gapsText += `🔴 <b>Critical:</b> ${this.escapeHtml(criticalGaps.join(', '))}\n`;
    }
    if (importantGaps && importantGaps.length > 0) {
      gapsText += `🟠 <b>Important:</b> ${this.escapeHtml(importantGaps.join(', '))}\n`;
    }
    if (preferredGaps && preferredGaps.length > 0) {
      gapsText += `🟡 <b>Preferred:</b> ${this.escapeHtml(preferredGaps.join(', '))}\n`;
    }
    if (!gapsText) gapsText = '✅ No major gaps detected!';

    return `👤 <b>${this.escapeHtml(candidateName)}</b>\n\n` +
      `🎯 <b>Overall ATS Match:</b> ${overallScore}%\n` +
      `🏷️ <b>Verdict:</b> ${this.escapeHtml(verdict)}\n\n` +
      `🔴 <b>CORE REQUIREMENTS</b>\n${formatReqList(critReqs)}\n\n` +
      `🟠 <b>IMPORTANT REQUIREMENTS</b>\n${formatReqList(highReqs)}\n\n` +
      `🟡 <b>PREFERRED / SECONDARY</b>\n${formatReqList(prefReqs)}\n\n` +
      `💪 <b>STRENGTHS</b>\n${strengthsText}\n\n` +
      `⚠️ <b>GAPS DETECTED</b>\n${gapsText}`;
  }

  /**
   * Format course recommendations list
   */
  static formatCourseRecommendations(candidateName, recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return `🎓 <b>Learning Recommendations for ${this.escapeHtml(candidateName)}</b>\n\n✅ Candidate meets all requirements strongly! No critical learning paths required.`;
    }

    const recsList = recommendations.map((r, idx) => {
      let icon = '🟡';
      if (r.priority === 'CRITICAL' || r.priority === 'HIGH') icon = '🔴';
      else if (r.priority === 'MEDIUM') icon = '🟠';

      const channelsText = (r.recommendedChannels && r.recommendedChannels.length > 0)
        ? `\n   📺 <b>Recommended Channels / Resources:</b> ${this.escapeHtml(r.recommendedChannels.join(', '))}`
        : '';

      const searchLink = r.searchUrl
        ? `\n   🔗 <a href="${this.escapeHtml(r.searchUrl)}">Search Tutorials on YouTube</a>`
        : '';

      return `${idx + 1}. ${icon} <b>${this.escapeHtml(r.topic)}</b>\n` +
        `   <b>Priority:</b> ${this.escapeHtml(r.priority)}\n` +
        `   <b>Gap Addressed:</b> ${this.escapeHtml(r.addressesRequirement)} (${this.escapeHtml(r.requirementPriority)} JD Requirement)\n` +
        `   <b>Why Needed for Eligibility:</b> ${this.escapeHtml(r.reason)}` +
        channelsText +
        searchLink;
    }).join('\n\n');

    return `🎓 <b>Learning Roadmap &amp; Channels for ${this.escapeHtml(candidateName)}</b>\n\n${recsList}`;
  }

  /**
   * Format consolidated batch analysis results into a single clean overview report
   */
  static formatConsolidatedBatchReport(analyzedCandidates, rankingData) {
    if (!analyzedCandidates || analyzedCandidates.length === 0) {
      return `⚠️ No candidates analyzed.`;
    }

    const sections = analyzedCandidates.map((cand, idx) => {
      const { candidateName, overallScore, verdict, strengths, criticalGaps, importantGaps, preferredGaps, courseRecommendations } = cand;

      const strengthsText = (strengths && strengths.length > 0)
        ? strengths.slice(0, 3).map(s => `  • ${this.escapeHtml(s)}`).join('\n')
        : '  • Baseline requirements met';

      let gapsSummary = [];
      if (criticalGaps && criticalGaps.length > 0) {
        gapsSummary.push(`🔴 <b>Critical Missing:</b> ${this.escapeHtml(criticalGaps.join(', '))}`);
      }
      if (importantGaps && importantGaps.length > 0) {
        gapsSummary.push(`🟠 <b>Important Missing:</b> ${this.escapeHtml(importantGaps.join(', '))}`);
      }
      if (preferredGaps && preferredGaps.length > 0) {
        gapsSummary.push(`🟡 <b>Preferred Missing:</b> ${this.escapeHtml(preferredGaps.join(', '))}`);
      }
      const gapsText = gapsSummary.length > 0 ? gapsSummary.map(g => `  ${g}`).join('\n') : '  ✅ Meets all requirements!';

      let recsText = '';
      if (courseRecommendations && courseRecommendations.length > 0) {
        const topRecs = courseRecommendations.slice(0, 2).map((r, rIdx) => {
          const channels = (r.recommendedChannels && r.recommendedChannels.length > 0)
            ? `\n     📺 <i>Channels:</i> ${this.escapeHtml(r.recommendedChannels.slice(0, 2).join(', '))}`
            : '';
          const searchLink = r.searchUrl
            ? ` — <a href="${this.escapeHtml(r.searchUrl)}">YouTube Tutorials</a>`
            : '';
          return `  ${rIdx + 1}. <b>${this.escapeHtml(r.topic)}</b> (${this.escapeHtml(r.priority)} Priority)${searchLink}\n     ↳ <i>Why:</i> ${this.escapeHtml(r.reason)}${channels}`;
        }).join('\n\n');
        recsText = `\n\n🎓 <b>Recommended Learning &amp; Channels to Qualify:</b>\n${topRecs}`;
      } else {
        recsText = `\n\n🎓 <b>Recommended Learning:</b>\n  ✅ Fully qualified for role requirements.`;
      }

      return `👤 <b>Candidate ${idx + 1}: ${this.escapeHtml(candidateName)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 <b>ATS Match:</b> ${overallScore}%  |  <b>Verdict:</b> ${this.escapeHtml(verdict)}\n\n` +
        `💪 <b>Key Strengths:</b>\n${strengthsText}\n\n` +
        `⚠️ <b>Gaps &amp; Lacking Skills:</b>\n${gapsText}` +
        recsText;
    });

    let header = `📊 <b>BATCH ANALYSIS RESULTS (${analyzedCandidates.length} Candidates)</b>\n\n`;
    let body = sections.join('\n\n────────────────────\n\n');

    let rankingSection = '';
    if (rankingData && rankingData.rankings && rankingData.rankings.length > 0) {
      const medalIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const rankingLines = rankingData.rankings.map((r, i) => {
        const icon = medalIcons[i] || `${i + 1}️⃣`;
        const critNote = r.criticalGapsCount > 0 ? ` (⚠️ ${r.criticalGapsCount} critical gap)` : '';
        return `${icon} <b>${this.escapeHtml(r.candidateName)}</b> — <b>${r.overallScore}%</b> [${this.escapeHtml(r.verdict)}]${critNote}`;
      }).join('\n');

      rankingSection = `\n\n════════════════════\n` +
        `🏆 <b>COMPARATIVE RANKING</b>\n\n` +
        `${rankingLines}\n\n` +
        `📊 <b>Top Candidate Rationale:</b>\n${this.escapeHtml(rankingData.topCandidateExplanation || 'Based on core priority matches and zero critical gaps.')}`;
    }

    return header + body + rankingSection;
  }
}
