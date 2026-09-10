import { Markup } from 'telegraf';

export const Keyboards = {
  /**
   * Main menu keyboard for idle or welcome state
   */
  mainMenu() {
    return Markup.keyboard([
      ['📝 Paste Job Description', '📄 Upload JD File'],
      ['🔄 New Analysis', 'ℹ️ Help']
    ]).resize();
  },

  /**
   * Keyboard shown once a JD is active and ready for resumes
   */
  jdReadyMenu() {
    return Markup.keyboard([
      ['👤 Upload Resume(s)', '📋 View Current JD Profile'],
      ['🏆 Candidate Rankings', '🔄 Start Over']
    ]).resize();
  },

  /**
   * Inline buttons for candidate report actions
   */
  candidateActions(candidateId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔍 Full Breakdown', `cand_details_${candidateId}`),
        Markup.button.callback('🎓 Recommendations', `cand_courses_${candidateId}`)
      ],
      [
        Markup.button.callback('🏆 View Rankings', 'show_rankings')
      ]
    ]);
  },

  /**
   * Inline buttons for overall ranking view
   */
  rankingActions(candidates = []) {
    const buttons = candidates.map(c => [
      Markup.button.callback(`👤 ${c.candidateName} (${c.overallScore}%)`, `cand_details_${c.candidateId}`)
    ]);

    buttons.push([
      Markup.button.callback('➕ Add More Resumes', 'add_resumes'),
      Markup.button.callback('🔄 New JD', 'new_session')
    ]);

    return Markup.inlineKeyboard(buttons);
  }
};
