import test from 'node:test';
import assert from 'node:assert/strict';
import { JDAnalyzer } from '../src/services/jdAnalyzer.js';
import { QueueService } from '../src/services/queueService.js';
import { RankingEngine } from '../src/services/rankingEngine.js';
import { sampleJDs } from './fixtures/sample_jds.js';
import { sampleResumes } from './fixtures/sample_resumes.js';

test('End-to-End Recruitment Matching Pipeline & Mandatory Rules Verification', async () => {
  // 1. Analyze & Freeze JD Profile
  const frozenJd = await JDAnalyzer.analyzeJobDescription(sampleJDs.javaBackend, 'TEXT');
  assert.ok(frozenJd.jobTitle.includes('Java'));

  // 2. Prepare multiple candidates
  const candidateInputs = [
    {
      candidateId: 'cand_A',
      candidateName: 'Candidate A (Alex - Ideal Java Backend)',
      resumeText: sampleResumes.candidateA,
      filename: 'Alex_Rivera_Resume.pdf'
    },
    {
      candidateId: 'cand_B',
      candidateName: 'Candidate B (Brian - Python Cloud Eng, Missing Java Core)',
      resumeText: sampleResumes.candidateB,
      filename: 'Brian_Zhao_Resume.pdf'
    },
    {
      candidateId: 'cand_C',
      candidateName: 'Candidate C (Chris - Java Dev, Missing Spring Boot)',
      resumeText: sampleResumes.candidateC,
      filename: 'Chris_Evans_Resume.docx'
    },
    {
      candidateId: 'cand_D',
      candidateName: 'Candidate D (Diana - Course-Only Python)',
      resumeText: sampleResumes.candidateD,
      filename: 'Diana_Prince_Resume.pdf'
    }
  ];

  // 3. Process candidates concurrently through QueueService
  const results = await QueueService.processMultipleResumes(candidateInputs, frozenJd);

  assert.equal(results.length, 4, 'All 4 candidates must be processed');

  const candA = results.find(r => r.candidateId === 'cand_A');
  const candB = results.find(r => r.candidateId === 'cand_B');
  const candC = results.find(r => r.candidateId === 'cand_C');
  const candD = results.find(r => r.candidateId === 'cand_D');

  // --- Verification 1: Candidate A (Ideal Match)
  assert.ok(candA.overallScore >= 80, `Candidate A should have high match score (got ${candA.overallScore})`);
  assert.equal(candA.criticalGaps.length, 0, 'Candidate A should have no critical gaps');

  // --- Verification 2: Candidate B (Wrong core stack despite high keyword volume)
  assert.ok(candB.overallScore < candA.overallScore, 'Candidate B must score lower than Candidate A');

  // --- Verification 3: Course-Only / Weak Evidence Rule (Candidate D)
  const dPython = candD.requirements.find(r => r.name.toLowerCase().includes('python'));
  if (dPython) {
    assert.ok(
      ['WEAK', 'NO_EVIDENCE'].includes(dPython.evidenceStrength),
      `Course-only experience must be rated WEAK or NO_EVIDENCE, got ${dPython.evidenceStrength}`
    );
  }

  // --- Verification 4: Mandatory Java vs Python Course Recommendation Test (Candidate C)
  // Candidate C misses Spring Boot (Critical) and Python (Preferred).
  // Course recommendations MUST recommend Spring Boot first!
  assert.ok(candC.courseRecommendations.length > 0, 'Candidate C should have learning recommendations');
  const firstRec = candC.courseRecommendations[0];
  assert.ok(
    firstRec.addressesRequirement.toLowerCase().includes('spring'),
    `First recommendation for Candidate C must be Spring Boot (Critical), got: ${firstRec.addressesRequirement}`
  );

  // --- Verification 5: Ranking Engine Multi-Candidate Evaluation
  const ranking = RankingEngine.rankCandidates(results, frozenJd);
  assert.equal(ranking.rankings[0].candidateId, 'cand_A', 'Candidate A must be ranked #1 overall');
  assert.ok(ranking.topCandidateExplanation.includes('Candidate A'));
});
