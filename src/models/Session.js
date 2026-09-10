import mongoose from 'mongoose';

const RequirementSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['TECHNICAL', 'EXPERIENCE', 'EDUCATION', 'CERTIFICATION', 'DOMAIN', 'SOFT_SKILL', 'RESPONSIBILITY', 'OTHER'],
    default: 'TECHNICAL' 
  },
  priority: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'PREFERRED'],
    required: true 
  },
  multiplier: { type: Number, required: true },
  normalizedWeight: { type: Number, required: true }, // percentage (0 - 100)
  reason: { type: String },
  isPrimaryTech: { type: Boolean, default: false }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  telegramChatId: { type: Number, required: true, index: true },
  telegramUserId: { type: Number, required: true },
  state: { 
    type: String, 
    enum: ['IDLE', 'WAITING_FOR_JD', 'ANALYZING_JD', 'JD_READY', 'WAITING_FOR_RESUMES', 'ANALYZING_RESUMES', 'RESULT_READY', 'FOLLOW_UP'],
    default: 'IDLE'
  },
  jobDescription: {
    rawText: { type: String },
    sourceType: { type: String, enum: ['TEXT', 'PDF', 'DOCX'] },
    filename: { type: String },
    jobTitle: { type: String },
    primaryRole: { type: String },
    primaryTechnologies: [String],
    summary: { type: String },
    experienceYearsRequired: { type: Number, default: 0 },
    requirements: [RequirementSchema],
    frozen: { type: Boolean, default: true },
    frozenAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-expire after 24h
}, { timestamps: true });

export const SessionModel = mongoose.model('Session', SessionSchema);
