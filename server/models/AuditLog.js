import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    action: {
      type: String,
      required: true,
      // e.g. 'lead_created', 'lead_status_changed', 'lead_assigned', 'lead_deleted',
      // 'employee_created', 'employee_updated', 'employee_deleted',
      // 'bulk_status_update', 'bulk_assign', 'bulk_delete', 'leads_imported', 'lead_swapped'
    },
    entityType: {
      type: String,
      required: true,
      enum: ['lead', 'user', 'product', 'notification', 'system'],
    },
    entityId: { type: String, default: null },
    entityName: { type: String, default: '' },
    userId: { type: String, default: null },
    userName: { type: String, default: 'System' },
    userRole: { type: String, default: null },
    description: { type: String, default: '' },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entityType: 1 });
auditLogSchema.index({ userId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
