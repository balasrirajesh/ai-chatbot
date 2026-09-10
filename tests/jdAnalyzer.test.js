import test from 'node:test';
import assert from 'node:assert/strict';
import { JDAnalyzer } from '../src/services/jdAnalyzer.js';
import { sampleJDs } from './fixtures/sample_jds.js';

test('JDAnalyzer correctly extracts and prioritizes Java JD', async () => {
  const jdProfile = await JDAnalyzer.analyzeJobDescription(sampleJDs.javaBackend, 'TEXT');

  assert.ok(jdProfile.jobTitle.includes('Java'), 'Job title should identify Java role');
  assert.ok(Array.isArray(jdProfile.requirements), 'Requirements must be an array');

  // Check Java is CRITICAL
  const javaReq = jdProfile.requirements.find(r => r.name.toLowerCase().includes('java'));
  assert.ok(javaReq, 'Java requirement must be present');
  assert.equal(javaReq.priority, 'CRITICAL', 'Java must be classified as CRITICAL');

  // Check Spring Boot is CRITICAL
  const springReq = jdProfile.requirements.find(r => r.name.toLowerCase().includes('spring'));
  assert.ok(springReq, 'Spring Boot requirement must be present');
  assert.equal(springReq.priority, 'CRITICAL', 'Spring Boot must be classified as CRITICAL');

  // Check Python is PREFERRED/LOW
  const pythonReq = jdProfile.requirements.find(r => r.name.toLowerCase().includes('python'));
  if (pythonReq) {
    assert.ok(
      ['PREFERRED', 'LOW'].includes(pythonReq.priority),
      `Python in Java JD must be PREFERRED or LOW, but got ${pythonReq.priority}`
    );
  }
});

test('JDAnalyzer correctly adapts to Python JD (Opposite Case)', async () => {
  const jdProfile = await JDAnalyzer.analyzeJobDescription(sampleJDs.pythonBackend, 'TEXT');

  const pythonReq = jdProfile.requirements.find(r => r.name.toLowerCase().includes('python'));
  assert.ok(pythonReq, 'Python requirement must be present');
  assert.equal(pythonReq.priority, 'CRITICAL', 'Python must be classified as CRITICAL for Python role');

  const javaReq = jdProfile.requirements.find(r => r.name.toLowerCase().includes('java'));
  if (javaReq) {
    assert.ok(
      ['PREFERRED', 'LOW'].includes(javaReq.priority),
      `Java in Python JD must be PREFERRED or LOW, but got ${javaReq.priority}`
    );
  }
});
