import test from 'node:test';
import assert from 'node:assert/strict';
import { JDValidator } from '../src/services/jdValidator.js';

test('JDValidator forces primary technology to CRITICAL even if AI suggests otherwise', () => {
  const rawJd = `Java Backend Developer. Java is the primary development language. Python is a plus.`;
  const flawedAiProfile = {
    jobTitle: 'Java Backend Developer',
    requirements: [
      { name: 'Java', priority: 'MEDIUM' }, // Flawed AI priority
      { name: 'Python', priority: 'CRITICAL' } // Flawed AI priority
    ]
  };

  const normalized = JDValidator.validateAndNormalize(rawJd, flawedAiProfile);

  const javaReq = normalized.requirements.find(r => r.name === 'Java');
  const pythonReq = normalized.requirements.find(r => r.name === 'Python');

  assert.equal(javaReq.priority, 'CRITICAL', 'Validator must correct Java to CRITICAL');
  assert.equal(pythonReq.priority, 'PREFERRED', 'Validator must correct Python to PREFERRED');
  assert.ok(javaReq.normalizedWeight > pythonReq.normalizedWeight, 'Java normalized weight must exceed Python');
});
