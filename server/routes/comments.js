import express from 'express';
import Comment from '../models/Comment.js';
import Lead from '../models/Lead.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// GET /api/comments/:leadId — Get threaded comments for a lead
router.get('/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const comments = await Comment.find({ leadId }).sort({ createdAt: -1 }).lean();

    // Build threaded structure
    const commentMap = {};
    const roots = [];

    comments.forEach((c) => {
      commentMap[c.id] = { ...c, replies: [] };
    });

    comments.forEach((c) => {
      if (c.parentId && commentMap[c.parentId]) {
        commentMap[c.parentId].replies.push(commentMap[c.id]);
      } else {
        roots.push(commentMap[c.id]);
      }
    });

    // Sort roots: pinned first, then by date
    roots.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(roots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comments/count/:leadId — Get comment count for a lead
router.get('/count/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const count = await Comment.countDocuments({ leadId });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comments — Create a comment
router.post('/', async (req, res) => {
  try {
    const { leadId, parentId, authorId, authorName, authorRole, content, mentions } = req.body;

    if (!leadId || !content) {
      return res.status(400).json({ error: 'leadId and content are required' });
    }

    const comment = new Comment({
      id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      leadId,
      parentId: parentId || null,
      authorId: authorId || 'system',
      authorName: authorName || 'System',
      authorRole: authorRole || null,
      content,
      mentions: mentions || [],
    });

    await comment.save();

    // Update lead comment count
    await Lead.updateOne({ id: leadId }, { $inc: { commentCount: 1 } });

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      for (const userId of mentions) {
        await Notification.create({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          title: 'You were mentioned in a comment',
          message: `${authorName} mentioned you in a comment on a lead.`,
          type: 'general',
          recipientId: userId,
          senderId: authorId,
          senderName: authorName,
        });
      }
    }

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/comments/:id — Edit comment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findOneAndUpdate(
      { id },
      { content, isEdited: true, editedAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id — Delete comment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findOne({ id }).lean();

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Delete the comment and all its replies
    await Comment.deleteMany({ $or: [{ id }, { parentId: id }] });

    // Update lead comment count
    const remainingCount = await Comment.countDocuments({ leadId: comment.leadId });
    await Lead.updateOne({ id: comment.leadId }, { commentCount: remainingCount });

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/comments/:id/pin — Pin/unpin comment
router.put('/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findOne({ id });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/comments/:id/react — Add/remove reaction
router.put('/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji, userId } = req.body;

    if (!emoji || !userId) {
      return res.status(400).json({ error: 'emoji and userId are required' });
    }

    const comment = await Comment.findOne({ id });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reactions = comment.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    const index = reactions[emoji].indexOf(userId);
    if (index > -1) {
      reactions[emoji].splice(index, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(userId);
    }

    comment.reactions = reactions;
    comment.markModified('reactions');
    await comment.save();

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
