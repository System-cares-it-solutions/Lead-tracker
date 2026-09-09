import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    leadId: { type: String, default: null },
    leadName: { type: String, default: '' },
    assignedTo: { type: String, default: null }, // User ID
    assignedToName: { type: String, default: '' },
    createdBy: { type: String, default: null },
    createdByName: { type: String, default: '' },
    dueDate: { type: Date, default: null },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
    category: {
      type: String,
      enum: ['follow_up', 'call', 'meeting', 'email', 'proposal', 'review', 'other'],
      default: 'other',
    },
    isRecurring: { type: Boolean, default: false },
    recurringPattern: { type: String, default: null }, // 'daily', 'weekly', 'monthly'
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ leadId: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ createdAt: -1 });

export default mongoose.model('Task', taskSchema);
