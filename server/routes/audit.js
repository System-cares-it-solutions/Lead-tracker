import express from 'express';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// GET /api/audit — Paginated audit log with filters
router.get('/', async (req, res) => {
  try {
    const { action, entityType, userId, page = 1, limit = 50, search, startDate, endDate } = req.query;

    let filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = e;
      }
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { description: regex },
        { entityName: regex },
        { userName: regex },
        { action: regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit/entity/:entityId — Audit logs for a specific entity
router.get('/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const logs = await AuditLog.find({ entityId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit/clear-all — Clear all audit logs (POST fallback)
router.post('/clear-all', async (req, res) => {
  try {
    await AuditLog.deleteMany({});
    res.json({ message: 'All audit logs deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit/all — Clear all audit logs (POST fallback)
router.post('/all', async (req, res) => {
  try {
    await AuditLog.deleteMany({});
    res.json({ message: 'All audit logs deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/audit/all — Clear all audit logs
router.delete('/all', async (req, res) => {
  try {
    await AuditLog.deleteMany({});
    res.json({ message: 'All audit logs deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/audit — Clear all audit logs (root alias)
router.delete('/', async (req, res) => {
  try {
    await AuditLog.deleteMany({});
    res.json({ message: 'All audit logs deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/audit/:id — Delete a specific audit log entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'all' || id === 'clear-all' || id === 'clear') {
      await AuditLog.deleteMany({});
      return res.json({ message: 'All audit logs deleted successfully' });
    }
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
    const deleted = await AuditLog.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: 'Audit log entry not found' });
    }
    res.json({ message: 'Audit log entry deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
