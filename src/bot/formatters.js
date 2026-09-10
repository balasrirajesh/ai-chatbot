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
   * Generate a score bar visualization
   */
  static scoreBar(score) {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
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
   * ═══════════════════════════════════════════════════════════
   * COMPACT PROFESSIONAL CANDIDATE REPORT — Single Message
   * ═══════════════════════════════════════════════════════════
   *
   * Designed to fit within one Telegram message (~3800 chars).
   * Sections:
   *   1. ATS Score + Breakdown (unified)
   *   2. Strengths
   *   3. Missing Skills + Why
   *   4. Learning Roadmap with Channels
   */
  static formatCandidateReport(analysis, index = null) {
    const {
      candidateName, overallScore, verdict, requirements,
      strengths, criticalGaps, importantGaps, preferredGaps, mediumGaps,
      subscores, courseRecommendations
    } = analysis;

    const candidateLabel = index !== null
      ? `Resume ${index + 1}: ${this.escapeHtml(candidateName)}`
      : this.escapeHtml(candidateName);

    const bar = this.scoreBar(overallScore);
    const techScore = subscores?.technicalMatch ?? overallScore;
    const expScore = subscores?.experienceMatch ?? overallScore;
    const critScore = subscores?.criticalRequirementsMatch ?? 100;

    // ─── ATS SCORE & BREAKDOWN (unified) ──────────────
    let report = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📄 <b>${candidateLabel}</b>\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `🎯 <b>ATS SCORE: ${overallScore}%</b>  ${bar}\n`;
    report += `🏷️ <b>Verdict:</b> ${this.escapeHtml(verdict)}\n`;
    report += `⚙️ Technical: ${techScore}% │ 📅 Experience: ${expScore}% │ 🔴 Critical: ${critScore}%\n`;

    // Brief score explanation
    if ((criticalGaps || []).length > 0) {
      report += `⚠️ <i>Score capped — ${criticalGaps.length} critical skill(s) missing</i>\n`;
    }
    report += `\n`;

    // ─── STRENGTHS ────────────────────────────────────
    report += `💪 <b>STRENGTHS</b>\n`;
    if (strengths && strengths.length > 0) {
      for (const s of strengths.slice(0, 5)) {
        report += `  ⭐ ${this.escapeHtml(s)}\n`;
      }
    } else {
      report += `  • Baseline qualifications met\n`;
    }
    report += `\n`;

    // ─── MISSING SKILLS + WHY ─────────────────────────
    const hasCritGaps = criticalGaps && criticalGaps.length > 0;
    const hasImpGaps = importantGaps && importantGaps.length > 0;
    const hasMedGaps = mediumGaps && mediumGaps.length > 0;
    const hasPrefGaps = preferredGaps && preferredGaps.length > 0;
    const hasAnyGaps = hasCritGaps || hasImpGaps || hasMedGaps || hasPrefGaps;

    report += `❌ <b>MISSING SKILLS &amp; GAPS</b>\n`;
    if (hasAnyGaps) {
      // Get gap requirements for "why" explanations inline
      const gapReqMap = new Map();
      for (const req of (requirements || [])) {
        if (req.matchValue < 0.5) {
          gapReqMap.set(req.name, req);
        }
      }

      const formatGapLine = (gapName) => {
        const req = gapReqMap.get(gapName);
        if (req) {
          const why = req.evidenceStrength === 'NO_EVIDENCE'
            ? 'Not found in resume'
            : req.evidenceStrength === 'WEAK'
              ? 'Course/tutorial only — no hands-on experience'
              : 'Insufficient production-level evidence';
          return `  ✖ <b>${this.escapeHtml(gapName)}</b> — <i>${why}</i>`;
        }
        return `  ✖ <b>${this.escapeHtml(gapName)}</b>`;
      };

      if (hasCritGaps) {
        report += `  🔴 <b>Critical (Must-Have):</b>\n`;
        for (const g of criticalGaps) report += `${formatGapLine(g)}\n`;
      }
      if (hasImpGaps) {
        report += `  🟠 <b>Important:</b>\n`;
        for (const g of importantGaps) report += `${formatGapLine(g)}\n`;
      }
      if (hasMedGaps) {
        report += `  🟡 <b>Medium:</b>\n`;
        for (const g of mediumGaps) report += `${formatGapLine(g)}\n`;
      }
      if (hasPrefGaps) {
        report += `  ⚪ <b>Nice-to-Have:</b>\n`;
        for (const g of preferredGaps) report += `${formatGapLine(g)}\n`;
      }
    } else {
      report += `  ✅ No significant gaps — meets all key requirements!\n`;
    }
    report += `\n`;

    // ─── LEARNING ROADMAP & CHANNELS ──────────────────
    report += `🎓 <b>LEARNING ROADMAP</b>\n`;
    if (courseRecommendations && courseRecommendations.length > 0) {
      for (let i = 0; i < courseRecommendations.length; i++) {
        const rec = courseRecommendations[i];
        const pIcon = (rec.priority === 'HIGH' || rec.priority === 'CRITICAL') ? '🔴' : rec.priority === 'MEDIUM' ? '🟠' : '🟡';

        report += `  ${i + 1}. ${pIcon} <b>${this.escapeHtml(rec.topic)}</b>\n`;
        report += `     ↳ <i>${this.escapeHtml(rec.reason)}</i>\n`;

        if (rec.recommendedChannels && rec.recommendedChannels.length > 0) {
          report += `     📺 ${this.escapeHtml(rec.recommendedChannels.join(' • '))}\n`;
        }
        if (rec.searchUrl) {
          report += `     🔗 <a href="${this.escapeHtml(rec.searchUrl)}">YouTube Tutorials</a>\n`;
        }
      }
    } else {
      report += `  ✅ Fully qualified — no additional learning needed.\n`;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return report;
  }

  /**
   * Format course recommendations list (used by callback button)
   */
  static formatCourseRecommendations(candidateName, recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return `🎓 <b>Learning Recommendations for ${this.escapeHtml(candidateName)}</b>\n\n✅ No critical learning paths required.`;
    }

    const recsList = recommendations.map((r, idx) => {
      let icon = '🟡';
      if (r.priority === 'CRITICAL' || r.priority === 'HIGH') icon = '🔴';
      else if (r.priority === 'MEDIUM') icon = '🟠';

      const channelsText = (r.recommendedChannels && r.recommendedChannels.length > 0)
        ? `\n   📺 ${this.escapeHtml(r.recommendedChannels.join(' • '))}`
        : '';

      const searchLink = r.searchUrl
        ? `\n   🔗 <a href="${this.escapeHtml(r.searchUrl)}">YouTube Tutorials</a>`
        : '';

      return `${idx + 1}. ${icon} <b>${this.escapeHtml(r.topic)}</b>\n` +
        `   <b>Addresses:</b> ${this.escapeHtml(r.addressesRequirement)} (${this.escapeHtml(r.requirementPriority)})\n` +
        `   <b>Why:</b> ${this.escapeHtml(r.reason)}` +
        channelsText +
        searchLink;
    }).join('\n\n');

    return `🎓 <b>Learning Roadmap for ${this.escapeHtml(candidateName)}</b>\n\n${recsList}`;
  }

  /**
   * Format the batch progress header
   */
  static formatBatchCandidateHeader(currentIndex, totalCount) {
    return `📊 <b>BATCH ANALYSIS — Resume ${currentIndex + 1} of ${totalCount}</b>`;
  }

  /**
   * Format the final comparative ranking leaderboard
   */
  static formatFinalRanking(analyzedCandidates, rankingData) {
    if (!rankingData || !rankingData.rankings || rankingData.rankings.length === 0) {
      return `🏆 <b>No ranking data available.</b>`;
    }

    const medalIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    let report = `════════════════════════════\n`;
    report += `🏆 <b>FINAL RANKING</b>\n`;
    report += `════════════════════════════\n\n`;

    for (const r of rankingData.rankings) {
      const i = r.rank - 1;
      const icon = medalIcons[i] || `${r.rank}.`;
      const bar = this.scoreBar(r.overallScore);
      const critNote = r.criticalGapsCount > 0
        ? ` ⚠️ ${r.criticalGapsCount} critical gap(s)`
        : '';

      report += `${icon} <b>${this.escapeHtml(r.candidateName)}</b> — <b>${r.overallScore}%</b>  ${bar}\n`;
      report += `   ${this.escapeHtml(r.verdict)}${critNote}\n\n`;
    }

    report += `────────────────────────────\n`;
    report += `📊 <b>Why #1?</b> ${this.escapeHtml(rankingData.topCandidateExplanation || 'Best core match with zero critical gaps.')}\n`;
    report += `════════════════════════════`;

    return report;
  }

  /**
   * Format rankings (used by /rankings command and callback)
   */
  static formatRankings(rankingData) {
    return this.formatFinalRanking([], rankingData);
  }

  /**
   * @deprecated — kept for backward compatibility
   */
  static formatConsolidatedBatchReport(analyzedCandidates, rankingData) {
    if (!analyzedCandidates || analyzedCandidates.length === 0) {
      return `⚠️ No candidates analyzed.`;
    }
    const sections = analyzedCandidates.map((cand, idx) => this.formatCandidateReport(cand, idx));
    let result = sections.join('\n\n');
    result += '\n\n' + this.formatFinalRanking(analyzedCandidates, rankingData);
    return result;
  }
}
