import mongoose from 'mongoose';

const RequirementSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, default: 'skill' }, // language, framework, database, cloud, devops, tool, experience, education, domain
  priority: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'PREFERRED'],
    required: true 
  },
  normalizedWeight: { type: Number, required: true }, // 0 to 1
  reason: { type: String },
  keywords: [String],
  isPrimaryTech: { type: Boolean, default: false }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  telegramChatId: { type: Number, required: true, index: true },
  telegramUserId: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['IDLE', 'JD_RECEIVED', 'ANALYZING_JD', 'JD_READY', 'ANALYZING_RESUMES', 'COMPLETED'],
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
    frozenAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now, expires: 86400 * 7 } // Auto-expire after 7 days
}, { timestamps: true });

export const SessionModel = mongoose.model('Session', SessionSchema);
