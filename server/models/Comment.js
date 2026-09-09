import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    leadId: { type: String, required: true, index: true },
    parentId: { type: String, default: null }, // For threading/replies
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, default: null },
    content: { type: String, required: true },
    mentions: [{ type: String }], // User IDs mentioned
    reactions: { type: mongoose.Schema.Types.Mixed, default: {} }, // { '👍': ['userId1'], '❤️': ['userId2'] }
    isEdited: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ leadId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ authorId: 1 });

export default mongoose.model('Comment', commentSchema);
