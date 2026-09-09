import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    name: { type: String, required: true, unique: true },
    color: { type: String, default: '#6366f1' },
    category: {
      type: String,
      enum: ['industry', 'source', 'priority', 'region', 'product', 'custom'],
      default: 'custom',
    },
    description: { type: String, default: '' },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

tagSchema.index({ name: 1 });
tagSchema.index({ category: 1 });
tagSchema.index({ usageCount: -1 });

export default mongoose.model('Tag', tagSchema);
