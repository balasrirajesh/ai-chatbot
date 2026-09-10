import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceMatcher } from '../src/services/evidenceMatcher.js';

test('EvidenceMatcher maps critical missing requirement to CRITICAL_GAP and 0.0 match value', () => {
  const jdReq = {
    name: 'Java',
    priority: 'CRITICAL',
    normalizedWeight: 0.35
  };

  const evidence = {
    evidence: 'No evidence found in the provided resume.',
    evidenceStrength: 'NO_EVIDENCE'
  };

  const matched = EvidenceMatcher.matchRequirement(jdReq, evidence);

  assert.equal(matched.matchStatus, 'CRITICAL_GAP');
  assert.equal(matched.matchValue, 0.0);
  assert.equal(matched.isCriticalGap, true);
});

test('EvidenceMatcher maps course-only weak evidence on preferred skill to WEAK_MATCH and 0.25 match value', () => {
  const jdReq = {
    name: 'Python',
    priority: 'PREFERRED',
    normalizedWeight: 0.1
  };

  const evidence = {
    evidence: 'Completed Python online course.',
    evidenceStrength: 'WEAK'
  };

  const matched = EvidenceMatcher.matchRequirement(jdReq, evidence);

  assert.equal(matched.matchStatus, 'WEAK_MATCH');
  assert.equal(matched.matchValue, 0.25);
  assert.equal(matched.isCriticalGap, false);
});
