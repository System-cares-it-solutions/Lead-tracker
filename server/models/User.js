import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'employee'] },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    language: { type: String, default: 'English' },
    avatar: { type: String, default: null },

    // ── Enterprise Fields ──
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    salesTarget: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // ── Advanced Fields ──
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
    permissions: [{ type: String }],
    teamId: { type: String, default: null },
    managerId: { type: String, default: null },
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
    monthlyTarget: { type: Number, default: 0 },
    quarterlyTarget: { type: Number, default: 0 },
    notificationPreferences: {
      type: mongoose.Schema.Types.Mixed,
      default: { assignments: true, swaps: true, warnings: true, imports: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
