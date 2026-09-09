import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

/* ── Helper: create audit log ── */
async function createAuditLog(data) {
  try {
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...data,
    });
  } catch (err) {
    console.error('[AuditLog] Failed:', err.message);
  }
}

// GET /api/tasks — List tasks with filters
router.get('/', async (req, res) => {
  try {
    const { assignedTo, status, priority, leadId, category, search, sortBy, sortOrder, page = 1, limit = 50 } = req.query;
    let filter = {};

    if (assignedTo) {
      const emp = await User.findOne({ $or: [{ id: assignedTo }, { name: assignedTo }] }).lean();
      if (emp) {
        filter.$or = [{ assignedTo: emp.id }, { assignedTo: emp.name }];
      } else {
        filter.assignedTo = assignedTo;
      }
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (leadId) filter.leadId = leadId;
    if (category) filter.category = category;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      const searchConds = [{ title: regex }, { description: regex }, { leadName: regex }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConds }];
        delete filter.$or;
      } else {
        filter.$or = searchConds;
      }
    }

    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({ tasks, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/stats — Task statistics
router.get('/stats', async (req, res) => {
  try {
    const { assignedTo } = req.query;
    let filter = {};
    if (assignedTo) {
      const emp = await User.findOne({ $or: [{ id: assignedTo }, { name: assignedTo }] }).lean();
      if (emp) {
        filter.$or = [{ assignedTo: emp.id }, { assignedTo: emp.name }];
      }
    }

    const allTasks = await Task.find(filter).lean();
    const total = allTasks.length;
    const pending = allTasks.filter((t) => t.status === 'pending').length;
    const inProgress = allTasks.filter((t) => t.status === 'in_progress').length;
    const completed = allTasks.filter((t) => t.status === 'completed').length;
    const overdue = allTasks.filter((t) => {
      return t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < new Date();
    }).length;
    const cancelled = allTasks.filter((t) => t.status === 'cancelled').length;

    // Completion rate
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

    // By priority
    const byPriority = {};
    allTasks.forEach((t) => {
      const p = t.priority || 'Medium';
      byPriority[p] = (byPriority[p] || 0) + 1;
    });

    // By category
    const byCategory = {};
    allTasks.forEach((t) => {
      const c = t.category || 'other';
      byCategory[c] = (byCategory[c] || 0) + 1;
    });

    // Due this week
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeek = allTasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= weekEnd;
    }).length;

    res.json({
      total, pending, inProgress, completed, overdue, cancelled,
      completionRate, byPriority, byCategory, dueThisWeek,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/overdue — Overdue tasks
router.get('/overdue', async (req, res) => {
  try {
    const tasks = await Task.find({
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: new Date() },
    }).sort({ dueDate: 1 }).lean();

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id — Get a single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id }).lean();
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — Create task
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    let assigneeName = '';
    if (data.assignedTo) {
      const emp = await User.findOne({ $or: [{ id: data.assignedTo }, { name: data.assignedTo }] }).lean();
      if (emp) assigneeName = emp.name;
    }

    let leadName = '';
    if (data.leadId) {
      const lead = await Lead.findOne({ id: data.leadId }).lean();
      if (lead) leadName = lead.name;
    }

    const task = new Task({
      id: taskId,
      title: data.title,
      description: data.description || '',
      leadId: data.leadId || null,
      leadName,
      assignedTo: data.assignedTo || null,
      assignedToName: assigneeName || data.assignedToName || '',
      createdBy: data.createdBy || null,
      createdByName: data.createdByName || '',
      dueDate: data.dueDate || null,
      priority: data.priority || 'Medium',
      status: 'pending',
      category: data.category || 'other',
      isRecurring: data.isRecurring || false,
      recurringPattern: data.recurringPattern || null,
      notes: data.notes || '',
    });

    await task.save();

    // Update lead task count
    if (data.leadId) {
      await Lead.updateOne({ id: data.leadId }, { $inc: { taskCount: 1 } });
    }

    // Notify assigned employee
    if (data.assignedTo) {
      await Notification.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: 'New Task Assigned',
        message: `You have a new task: "${data.title}"${leadName ? ` for lead ${leadName}` : ''}`,
        type: 'general',
        recipientId: data.assignedTo,
        senderId: data.createdBy || null,
        senderName: data.createdByName || null,
      });
    }

    await createAuditLog({
      action: 'task_created',
      entityType: 'system',
      entityId: taskId,
      entityName: data.title,
      userId: data.createdBy,
      userName: data.createdByName || 'User',
      description: `Created task "${data.title}"`,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id/complete — Mark task complete
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;

    const task = await Task.findOneAndUpdate(
      { id },
      { status: 'completed', completedAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!task) return res.status(404).json({ error: 'Task not found' });

    await createAuditLog({
      action: 'task_completed',
      entityType: 'system',
      entityId: id,
      entityName: task.title,
      userId,
      userName: userName || 'User',
      description: `Completed task "${task.title}"`,
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ id }).lean();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    await Task.deleteOne({ id });

    // Update lead task count
    if (task.leadId) {
      const remaining = await Task.countDocuments({ leadId: task.leadId });
      await Lead.updateOne({ id: task.leadId }, { taskCount: remaining });
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
