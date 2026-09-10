import test from 'node:test';
import assert from 'node:assert/strict';
import { RankingEngine } from '../src/services/rankingEngine.js';

test('RankingEngine ranks candidate with 0 critical gaps over candidate with peripheral skills', () => {
  const jdProfile = { jobTitle: 'Java Backend Developer' };

  const candidates = [
    {
      candidateId: 'cand_1',
      candidateName: 'Candidate A (Core Fit)',
      overallScore: 88,
      verdict: 'Strong Match',
      criticalGaps: [],
      strengths: ['Java', 'Spring Boot', 'SQL']
    },
    {
      candidateId: 'cand_2',
      candidateName: 'Candidate B (Peripheral Skills, Missing Core)',
      overallScore: 70,
      verdict: 'Moderate Match',
      criticalGaps: ['Spring Boot'],
      strengths: ['Python', 'AWS', 'Docker']
    }
  ];

  const ranking = RankingEngine.rankCandidates(candidates, jdProfile);

  assert.equal(ranking.rankings[0].candidateId, 'cand_1', 'Candidate A with 0 critical gaps must rank #1');
  assert.ok(ranking.topCandidateExplanation.includes('Candidate A'), 'Explanation must highlight Candidate A');
});
