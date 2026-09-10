import test from 'node:test';
import assert from 'node:assert/strict';
import { ScoringEngine } from '../src/services/scoringEngine.js';

test('ScoringEngine calculates deterministic score and handles critical gaps', () => {
  // Candidate missing a critical requirement
  const matchesWithCriticalGap = [
    { name: 'Java', priority: 'CRITICAL', weight: 0.4, matchValue: 1.0, matchStatus: 'STRONG_MATCH' },
    { name: 'Spring Boot', priority: 'CRITICAL', weight: 0.4, matchValue: 0.0, matchStatus: 'CRITICAL_GAP' },
    { name: 'SQL', priority: 'HIGH', weight: 0.2, matchValue: 1.0, matchStatus: 'STRONG_MATCH' }
  ];

  const result = ScoringEngine.calculateScore(matchesWithCriticalGap);

  assert.ok(result.criticalGaps.includes('Spring Boot'), 'Must detect Spring Boot as critical gap');
  assert.ok(result.overallScore <= 75, 'Score must be penalized/capped due to critical gap');
  assert.equal(result.verdict, 'Moderate Match');

  // Candidate with all requirements matched
  const allMatched = [
    { name: 'Java', priority: 'CRITICAL', weight: 0.4, matchValue: 1.0, matchStatus: 'STRONG_MATCH' },
    { name: 'Spring Boot', priority: 'CRITICAL', weight: 0.4, matchValue: 1.0, matchStatus: 'STRONG_MATCH' },
    { name: 'SQL', priority: 'HIGH', weight: 0.2, matchValue: 1.0, matchStatus: 'STRONG_MATCH' }
  ];

  const perfectResult = ScoringEngine.calculateScore(allMatched);
  assert.equal(perfectResult.overallScore, 100);
  assert.equal(perfectResult.verdict, 'Excellent Match');
});
