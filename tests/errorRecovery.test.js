import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorRecoveryService } from '../src/services/errorRecoveryService.js';

test('ErrorRecoveryService classifies timeout and parse errors correctly', () => {
  const timeoutErr = new Error('AI Request timed out after 30000ms');
  const classified1 = ErrorRecoveryService.classifyError(timeoutErr);
  assert.equal(classified1.errorType, 'AI_TIMEOUT');
  assert.equal(classified1.retryable, true);

  const parseErr = new Error('PDF document contained insufficient or unextractable text.');
  const classified2 = ErrorRecoveryService.classifyError(parseErr);
  assert.equal(classified2.errorType, 'DOCUMENT_PARSE_ERROR');
  assert.equal(classified2.retryable, false);
});
