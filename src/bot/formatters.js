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
   * Generate a score bar visualization
   */
  static scoreBar(score) {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get verdict emoji based on verdict text
   */
  static verdictEmoji(verdict) {
    if (/excellent/i.test(verdict)) return '🟢';
    if (/strong/i.test(verdict)) return '🟢';
    if (/good/i.test(verdict)) return '🔵';
    if (/moderate/i.test(verdict)) return '🟡';
    if (/weak/i.test(verdict)) return '🟠';
    return '🔴';
  }

  /**
   * ═══════════════════════════════════════════════════════
   * PROFESSIONAL CANDIDATE REPORT — Full 7-Section Layout
   * ═══════════════════════════════════════════════════════
   *
   * Section 1: ATS Score
   * Section 2: Why That Score
   * Section 3: Alignments (Matched Requirements)
   * Section 4: Best Matches (Top Strengths)
   * Section 5: Missing Skills & Gaps
   * Section 6: Why These Gaps Exist
   * Section 7: Learning Roadmap & Recommended Channels
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

    const emoji = this.verdictEmoji(verdict);
    const bar = this.scoreBar(overallScore);

    // ─── SECTION 1: ATS SCORE ─────────────────────────
    let report = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📄 <b>RESUME ANALYSIS</b>\n`;
    report += `👤 <b>${candidateLabel}</b>\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `📊 <b>ATS COMPATIBILITY SCORE</b>\n`;
    report += `┌──────────────────────────────┐\n`;
    report += `│  🎯  <b>${overallScore}%</b>  ${bar}  │\n`;
    report += `│  ${emoji}  <b>${this.escapeHtml(verdict)}</b>\n`;
    report += `└──────────────────────────────┘\n\n`;

    // ─── SECTION 2: WHY THAT SCORE ────────────────────
    report += `📋 <b>WHY THIS SCORE?</b>\n`;
    report += `─────────────────────────\n`;

    const techScore = subscores?.technicalMatch ?? overallScore;
    const expScore = subscores?.experienceMatch ?? overallScore;
    const critScore = subscores?.criticalRequirementsMatch ?? 100;

    report += `  ⚙️ <b>Technical Skills Match:</b> ${techScore}%\n`;
    report += `  📅 <b>Experience Match:</b> ${expScore}%\n`;
    report += `  🔴 <b>Critical Requirements Met:</b> ${critScore}%\n\n`;

    // Count matches by status
    const strongMatches = (requirements || []).filter(r => r.matchStatus === 'STRONG_MATCH').length;
    const partialMatches = (requirements || []).filter(r => ['PARTIAL_MATCH', 'GOOD_MATCH'].includes(r.matchStatus)).length;
    const missingCount = (requirements || []).filter(r => ['MISSING', 'CRITICAL_GAP', 'WEAK_MATCH'].includes(r.matchStatus)).length;
    const totalReqs = (requirements || []).length;

    report += `  📈 <b>Breakdown:</b> ${strongMatches} strong, ${partialMatches} partial, ${missingCount} missing out of ${totalReqs} requirements\n`;

    // Score explanation
    if ((criticalGaps || []).length > 0) {
      report += `  ⚠️ <i>Score is capped due to ${criticalGaps.length} critical gap(s) — core skills needed for this role are missing.</i>\n`;
    } else if (overallScore >= 80) {
      report += `  ✅ <i>Strong alignment with the role's core competencies. No critical gaps detected.</i>\n`;
    } else {
      report += `  💡 <i>Decent match but several important or preferred skills are missing or weakly evidenced.</i>\n`;
    }
    report += `\n`;

    // ─── SECTION 3: ALIGNMENTS ────────────────────────
    report += `✅ <b>ALIGNMENTS — What Matches the JD</b>\n`;
    report += `─────────────────────────\n`;

    const aligned = (requirements || []).filter(r => r.matchValue >= 0.5);
    if (aligned.length > 0) {
      for (const req of aligned) {
        let icon = '✅';
        if (req.matchStatus === 'PARTIAL_MATCH' || req.matchStatus === 'GOOD_MATCH') icon = '🔵';

        const priorityTag = req.priority === 'CRITICAL' ? '🔴' : req.priority === 'HIGH' ? '🟠' : '🟡';
        report += `  ${icon} <b>${this.escapeHtml(req.name)}</b> ${priorityTag}${req.priority}\n`;
        report += `     ↳ <i>${this.escapeHtml(req.evidence)}</i>\n`;
      }
    } else {
      report += `  ⚠️ <i>No strong alignments detected with JD requirements.</i>\n`;
    }
    report += `\n`;

    // ─── SECTION 4: BEST MATCHES (TOP STRENGTHS) ──────
    report += `💪 <b>BEST MATCHES — Top Strengths</b>\n`;
    report += `─────────────────────────\n`;

    if (strengths && strengths.length > 0) {
      for (const s of strengths) {
        report += `  ⭐ ${this.escapeHtml(s)}\n`;
      }
    } else {
      report += `  • Baseline qualifications met\n`;
    }
    report += `\n`;

    // ─── SECTION 5: MISSING SKILLS & GAPS ─────────────
    report += `❌ <b>MISSING SKILLS &amp; GAPS</b>\n`;
    report += `─────────────────────────\n`;

    const hasCritGaps = criticalGaps && criticalGaps.length > 0;
    const hasImpGaps = importantGaps && importantGaps.length > 0;
    const hasMedGaps = mediumGaps && mediumGaps.length > 0;
    const hasPrefGaps = preferredGaps && preferredGaps.length > 0;
    const hasAnyGaps = hasCritGaps || hasImpGaps || hasMedGaps || hasPrefGaps;

    if (hasAnyGaps) {
      if (hasCritGaps) {
        report += `  🔴 <b>Critical (Must-Have):</b>\n`;
        for (const g of criticalGaps) {
          report += `     ✖ ${this.escapeHtml(g)}\n`;
        }
      }
      if (hasImpGaps) {
        report += `  🟠 <b>Important:</b>\n`;
        for (const g of importantGaps) {
          report += `     ✖ ${this.escapeHtml(g)}\n`;
        }
      }
      if (hasMedGaps) {
        report += `  🟡 <b>Medium Priority:</b>\n`;
        for (const g of mediumGaps) {
          report += `     ✖ ${this.escapeHtml(g)}\n`;
        }
      }
      if (hasPrefGaps) {
        report += `  ⚪ <b>Nice-to-Have:</b>\n`;
        for (const g of preferredGaps) {
          report += `     ✖ ${this.escapeHtml(g)}\n`;
        }
      }
    } else {
      report += `  ✅ <b>No significant gaps detected!</b> Candidate meets all key requirements.\n`;
    }
    report += `\n`;

    // ─── SECTION 6: WHY THESE GAPS EXIST ──────────────
    report += `❓ <b>WHY THESE GAPS?</b>\n`;
    report += `─────────────────────────\n`;

    const gapRequirements = (requirements || []).filter(r =>
      r.matchValue < 0.5 && (r.matchStatus === 'CRITICAL_GAP' || r.matchStatus === 'MISSING' || r.matchStatus === 'WEAK_MATCH')
    );

    if (gapRequirements.length > 0) {
      for (const req of gapRequirements) {
        const priorityTag = req.priority === 'CRITICAL' ? '🔴' : req.priority === 'HIGH' ? '🟠' : '🟡';
        const reasonText = req.evidenceStrength === 'NO_EVIDENCE'
          ? 'No mention of this skill found anywhere in the resume.'
          : req.evidenceStrength === 'WEAK'
            ? 'Only course/tutorial completion found — no professional or project-level application.'
            : 'Insufficient evidence of hands-on, production-level experience.';

        report += `  ${priorityTag} <b>${this.escapeHtml(req.name)}</b>\n`;
        report += `     📎 <b>Evidence:</b> <i>${this.escapeHtml(req.evidence)}</i>\n`;
        report += `     💡 <b>Reason:</b> ${reasonText}\n\n`;
      }
    } else {
      report += `  ✅ No critical gaps to explain — all requirements are sufficiently matched.\n`;
    }

    // ─── SECTION 7: LEARNING ROADMAP & CHANNELS ───────
    report += `🎓 <b>LEARNING ROADMAP — How to Become Eligible</b>\n`;
    report += `─────────────────────────\n`;

    if (courseRecommendations && courseRecommendations.length > 0) {
      for (let i = 0; i < courseRecommendations.length; i++) {
        const rec = courseRecommendations[i];
        const priorityIcon = rec.priority === 'HIGH' || rec.priority === 'CRITICAL' ? '🔴' : rec.priority === 'MEDIUM' ? '🟠' : '🟡';

        report += `  ${i + 1}. ${priorityIcon} <b>${this.escapeHtml(rec.topic)}</b>\n`;
        report += `     📌 <b>Addresses:</b> ${this.escapeHtml(rec.addressesRequirement)} (${this.escapeHtml(rec.requirementPriority)} JD Requirement)\n`;
        report += `     💡 <b>Why Needed:</b> ${this.escapeHtml(rec.reason)}\n`;

        if (rec.recommendedChannels && rec.recommendedChannels.length > 0) {
          report += `     📺 <b>Recommended Channels:</b> ${this.escapeHtml(rec.recommendedChannels.join(' • '))}\n`;
        }

        if (rec.searchUrl) {
          report += `     🔗 <a href="${this.escapeHtml(rec.searchUrl)}">Search Tutorials on YouTube</a>\n`;
        }
        report += `\n`;
      }
    } else {
      report += `  ✅ Fully qualified — no additional learning paths required for this role.\n\n`;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return report;
  }

  /**
   * Format course recommendations list (used by callback button)
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
        ? `\n   📺 <b>Recommended Channels / Resources:</b> ${this.escapeHtml(r.recommendedChannels.join(' • '))}`
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
   * Format the batch progress header sent before each sequential candidate report
   */
  static formatBatchCandidateHeader(currentIndex, totalCount) {
    return `📊 <b>BATCH ANALYSIS — Resume ${currentIndex + 1} of ${totalCount}</b>\n`;
  }

  /**
   * Format the final comparative ranking leaderboard (sent after all individual reports)
   */
  static formatFinalRanking(analyzedCandidates, rankingData) {
    if (!rankingData || !rankingData.rankings || rankingData.rankings.length === 0) {
      return `🏆 <b>No ranking data available.</b>`;
    }

    const medalIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    let report = `\n════════════════════════════════\n`;
    report += `🏆 <b>FINAL COMPARATIVE RANKING</b>\n`;
    report += `════════════════════════════════\n\n`;

    for (const r of rankingData.rankings) {
      const i = r.rank - 1;
      const icon = medalIcons[i] || `${r.rank}️⃣`;
      const bar = this.scoreBar(r.overallScore);
      const critNote = r.criticalGapsCount > 0
        ? ` ⚠️ <i>${r.criticalGapsCount} critical gap(s)</i>`
        : ` ✅ <i>No critical gaps</i>`;

      report += `${icon} <b>${this.escapeHtml(r.candidateName)}</b>\n`;
      report += `   🎯 <b>${r.overallScore}%</b>  ${bar}\n`;
      report += `   🏷️ ${this.escapeHtml(r.verdict)}${critNote}\n\n`;
    }

    report += `────────────────────────────────\n`;
    report += `📊 <b>Top Candidate Rationale:</b>\n`;
    report += `${this.escapeHtml(rankingData.topCandidateExplanation || 'Based on core priority matches and zero critical gaps.')}\n`;
    report += `════════════════════════════════`;

    return report;
  }

  /**
   * Format rankings (used by /rankings command and callback)
   */
  static formatRankings(rankingData) {
    return this.formatFinalRanking([], rankingData);
  }

  /**
   * @deprecated — kept for backward compatibility but no longer used for batch output
   */
  static formatConsolidatedBatchReport(analyzedCandidates, rankingData) {
    if (!analyzedCandidates || analyzedCandidates.length === 0) {
      return `⚠️ No candidates analyzed.`;
    }

    // For backward compat, build a simple consolidated view
    const sections = analyzedCandidates.map((cand, idx) => {
      return this.formatCandidateReport(cand, idx);
    });

    let result = `📊 <b>BATCH ANALYSIS RESULTS (${analyzedCandidates.length} Candidates)</b>\n\n`;
    result += sections.join('\n\n');
    result += '\n\n' + this.formatFinalRanking(analyzedCandidates, rankingData);
    return result;
  }
}
