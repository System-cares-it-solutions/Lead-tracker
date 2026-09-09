import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, default: 'note' },
    note: { type: String, default: '' },
    authorName: { type: String, default: 'System' },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    platform: { type: String, default: 'Website' },
    name: { type: String, required: true },
    email: { type: String, default: '—' },
    phone: { type: String, default: '—' },
    location: { type: String, default: '—' },
    assignedTo: { type: String, default: null }, // Employee ID or Name
    assignedToRaw: { type: String, default: null },
    status: { type: String, default: 'New' },
    callCount: { type: Number, default: 0 },
    followUpDate: { type: String, default: null },
    notes: { type: String, default: '' },
    activities: { type: [activitySchema], default: [] },
    createdBy: { type: String, default: null },
    createdByRole: { type: String, default: null },
    expirationWarned: { type: Boolean, default: false },
    notifiedNew24h: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },

    // ── Enterprise Fields ──
    dealValue: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },
    source: {
      type: String,
      default: 'Website',
    },
    company: { type: String, default: '' },
    designation: { type: String, default: '' },
    tags: { type: [String], default: [] },
    expectedCloseDate: { type: Date, default: null },
    lostReason: { type: String, default: '' },
    wonDate: { type: Date, default: null },
    lastContactedAt: { type: Date, default: null },
    contactMethod: { type: String, default: '' },

    // ── Advanced Enterprise Fields ──
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    pipeline: { type: String, default: 'default' },
    attachmentCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    taskCount: { type: Number, default: 0 },
    conversionProbability: { type: Number, default: 0, min: 0, max: 100 },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    touchpoints: { type: Number, default: 0 },
    firstResponseAt: { type: Date, default: null },
    averageResponseTime: { type: Number, default: 0 }, // in minutes
    stageEnteredAt: { type: Date, default: null },
    stageHistory: [{
      stage: String,
      enteredAt: Date,
      exitedAt: Date,
      duration: Number, // in minutes
    }],
  },
  { timestamps: true }
);

leadSchema.index({ assignedToRaw: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ dealValue: -1 });
leadSchema.index({ leadScore: -1 });
leadSchema.index({ company: 'text', name: 'text' });

export default mongoose.model('Lead', leadSchema);
