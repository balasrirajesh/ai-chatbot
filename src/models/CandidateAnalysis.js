import mongoose from 'mongoose';

const RequirementMatchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priority: { type: String, required: true },
  weight: { type: Number, required: true },
  evidence: { type: String, required: true },
  evidenceStrength: { 
    type: String, 
    enum: ['STRONG', 'MODERATE', 'WEAK', 'NO_EVIDENCE'],
    required: true 
  },
  matchStatus: { 
    type: String, 
    enum: ['STRONG_MATCH', 'GOOD_MATCH', 'PARTIAL_MATCH', 'WEAK_MATCH', 'MISSING', 'CRITICAL_GAP'],
    required: true 
  },
  matchValue: { type: Number, required: true } // 1.0, 0.8, 0.5, 0.25, 0.0
}, { _id: false });

const CourseRecommendationSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    required: true 
  },
  addressesRequirement: { type: String, required: true },
  requirementPriority: { type: String, required: true },
  reason: { type: String, required: true }
}, { _id: false });

const CandidateAnalysisSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true },
  candidateName: { type: String, default: 'Candidate' },
  filename: { type: String },
  rawResumeText: { type: String },
  overallScore: { type: Number, required: true }, // 0 to 100
  verdict: { 
    type: String, 
    enum: ['Excellent Match', 'Strong Match', 'Good Match', 'Moderate Match', 'Weak Match', 'Poor Match'],
    required: true 
  },
  requirements: [RequirementMatchSchema],
  strengths: [String],
  criticalGaps: [String],
  importantGaps: [String],
  preferredGaps: [String],
  courseRecommendations: [CourseRecommendationSchema],
  analysisError: { type: String, default: null }
}, { timestamps: true });

export const CandidateAnalysisModel = mongoose.model('CandidateAnalysis', CandidateAnalysisSchema);
