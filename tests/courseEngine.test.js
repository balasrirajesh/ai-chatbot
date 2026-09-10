import test from 'node:test';
import assert from 'node:assert/strict';
import { CourseEngine } from '../src/services/courseEngine.js';

test('CourseEngine guarantees Spring Boot gap is recommended before Python gap in Java JD', async () => {
  const jdProfile = {
    jobTitle: 'Java Backend Developer'
  };

  // Candidate with missing Spring Boot (CRITICAL), missing AWS (PREFERRED), missing Python (PREFERRED)
  const candidateMatches = [
    { name: 'Java', priority: 'CRITICAL', weight: 0.35, matchValue: 1.0 },
    { name: 'Spring Boot', priority: 'CRITICAL', weight: 0.35, matchValue: 0.0 }, // GAP
    { name: 'SQL', priority: 'HIGH', weight: 0.15, matchValue: 1.0 },
    { name: 'AWS', priority: 'PREFERRED', weight: 0.08, matchValue: 0.0 }, // GAP
    { name: 'Python', priority: 'PREFERRED', weight: 0.07, matchValue: 0.0 } // GAP
  ];

  const recs = await CourseEngine.generateRecommendations(candidateMatches, jdProfile);

  assert.ok(recs.length >= 2, 'Should generate recommendations for the gaps');

  // The 1st recommendation MUST be Spring Boot
  assert.equal(recs[0].addressesRequirement, 'Spring Boot');
  assert.equal(recs[0].priority, 'HIGH');

  // Verify Python is ranked lower than Spring Boot
  const pythonIdx = recs.findIndex(r => r.addressesRequirement.toLowerCase().includes('python'));
  const springIdx = recs.findIndex(r => r.addressesRequirement.toLowerCase().includes('spring'));

  assert.ok(springIdx < pythonIdx, 'Spring Boot MUST be recommended before Python');
});
