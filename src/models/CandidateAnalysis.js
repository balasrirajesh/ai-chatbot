import mongoose from 'mongoose';

const RequirementMatchSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  category: { type: String, default: 'TECHNICAL' },
  priority: { type: String, required: true },
  multiplier: { type: Number },
  normalizedWeight: { type: Number, required: true },
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
  matchValue: { type: Number, required: true },
  isCriticalGap: { type: Boolean, default: false },
  source: {
    section: { type: String },
    text: { type: String }
  }
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
  overallScore: { type: Number, required: true },
  verdict: { 
    type: String, 
    enum: ['Excellent Match', 'Strong Match', 'Good Match', 'Moderate Match', 'Weak Match', 'Poor Match'],
    required: true 
  },
  subscores: {
    technicalMatch: { type: Number, default: 0 },
    experienceMatch: { type: Number, default: 0 },
    criticalRequirementsMatch: { type: Number, default: 0 }
  },
  requirements: [RequirementMatchSchema],
  strengths: [String],
  gaps: {
    critical: [String],
    important: [String],
    medium: [String],
    preferred: [String]
  },
  courseRecommendations: [CourseRecommendationSchema],
  analysisError: { type: String, default: null }
}, { timestamps: true });

export const CandidateAnalysisModel = mongoose.model('CandidateAnalysis', CandidateAnalysisSchema);
