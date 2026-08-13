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
  },
  { timestamps: true }
);

leadSchema.index({ assignedToRaw: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });

export default mongoose.model('Lead', leadSchema);
