import express from 'express';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import AuditLog from '../models/AuditLog.js';
import Comment from '../models/Comment.js';

const router = express.Router();

// GET /api/dashboard/summary — Aggregated dashboard KPIs
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        dateFilter.createdAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = e;
      }
    }

    const leads = await Lead.find(dateFilter).lean();
    const total = leads.length;
    const newLeads = leads.filter((l) => l.status === 'New').length;
    const wonLeads = leads.filter((l) => l.status === 'Won');
    const lostLeads = leads.filter((l) => l.status === 'Lost').length;
    const activeLeads = leads.filter((l) => !['Won', 'Lost', 'Trash'].includes(l.status)).length;

    const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const totalPipeline = leads.filter((l) => !['Won', 'Lost', 'Trash'].includes(l.status))
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const conversionRate = total > 0 ? ((wonLeads.length / total) * 100).toFixed(1) : '0';
    const avgDealValue = wonLeads.length > 0 ? Math.round(totalRevenue / wonLeads.length) : 0;

    // Lead velocity: average days from creation to Won
    const wonWithDates = wonLeads.filter((l) => l.createdAt && l.wonDate);
    let avgVelocityDays = 0;
    if (wonWithDates.length > 0) {
      const totalDays = wonWithDates.reduce((sum, l) => {
        const diffMs = new Date(l.wonDate) - new Date(l.createdAt);
        return sum + (diffMs / (1000 * 60 * 60 * 24));
      }, 0);
      avgVelocityDays = (totalDays / wonWithDates.length).toFixed(1);
    }

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: new Date() },
    });

    // Today's new leads
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaysLeads = await Lead.countDocuments({ createdAt: { $gte: todayStart } });

    // This week comparison
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekLeads = await Lead.countDocuments({ createdAt: { $gte: oneWeekAgo } });
    const lastWeekLeads = await Lead.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } });
    const weekGrowth = lastWeekLeads > 0
      ? (((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100).toFixed(1)
      : thisWeekLeads > 0 ? '100' : '0';

    res.json({
      total,
      newLeads,
      wonCount: wonLeads.length,
      lostLeads,
      activeLeads,
      totalRevenue,
      totalPipeline,
      conversionRate,
      avgDealValue,
      avgVelocityDays,
      overdueTasks,
      todaysLeads,
      thisWeekLeads,
      lastWeekLeads,
      weekGrowth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/activity-feed — Recent system activity feed
router.get('/activity-feed', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const feed = logs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      userName: log.userName,
      userRole: log.userRole,
      entityType: log.entityType,
      entityName: log.entityName,
      timestamp: log.createdAt,
    }));

    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/leaderboard — Employee leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    let dateFilter = {};

    if (period === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter.createdAt = { $gte: today };
    } else if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter.createdAt = { $gte: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter.createdAt = { $gte: monthAgo };
    } else if (period === 'quarter') {
      const quarterAgo = new Date();
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      dateFilter.createdAt = { $gte: quarterAgo };
    }

    const employees = await User.find({ role: 'employee', isActive: true }).lean();
    const leads = await Lead.find(dateFilter).lean();

    const leaderboard = employees.map((emp) => {
      const empLeads = leads.filter(
        (l) => l.assignedToRaw === emp.id || l.assignedTo === emp.name
      );
      const wonLeads = empLeads.filter((l) => l.status === 'Won');
      const wonRevenue = wonLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);

      return {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        department: emp.department || '',
        totalLeads: empLeads.length,
        wonLeads: wonLeads.length,
        wonRevenue,
        conversionRate: empLeads.length > 0 ? ((wonLeads.length / empLeads.length) * 100).toFixed(1) : '0',
        salesTarget: emp.salesTarget || 0,
        monthlyTarget: emp.monthlyTarget || 0,
        targetProgress: emp.salesTarget > 0 ? ((wonRevenue / emp.salesTarget) * 100).toFixed(1) : '0',
      };
    });

    leaderboard.sort((a, b) => b.wonRevenue - a.wonRevenue || b.wonLeads - a.wonLeads);

    // Add rank
    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/goals — Goal tracking
router.get('/goals', async (req, res) => {
  try {
    const { userId } = req.query;

    // Monthly period
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Quarterly period
    const now = new Date();
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
    quarterStart.setHours(0, 0, 0, 0);

    let empFilter = {};
    if (userId) {
      const emp = await User.findOne({ $or: [{ id: userId }, { name: userId }] }).lean();
      if (emp) {
        empFilter.$or = [{ assignedToRaw: emp.id }, { assignedTo: emp.name }];
      }
    }

    // Monthly stats
    const monthlyLeads = await Lead.find({
      ...empFilter,
      status: 'Won',
      wonDate: { $gte: monthStart },
    }).lean();
    const monthlyRevenue = monthlyLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const monthlyWonCount = monthlyLeads.length;

    // Quarterly stats
    const quarterlyLeads = await Lead.find({
      ...empFilter,
      status: 'Won',
      wonDate: { $gte: quarterStart },
    }).lean();
    const quarterlyRevenue = quarterlyLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const quarterlyWonCount = quarterlyLeads.length;

    // Get targets
    let monthlyTarget = 0;
    let quarterlyTarget = 0;
    let salesTarget = 0;

    if (userId) {
      const user = await User.findOne({ $or: [{ id: userId }, { name: userId }] }).lean();
      if (user) {
        monthlyTarget = user.monthlyTarget || 0;
        quarterlyTarget = user.quarterlyTarget || 0;
        salesTarget = user.salesTarget || 0;
      }
    } else {
      // Sum all employee targets
      const allEmps = await User.find({ role: 'employee', isActive: true }).lean();
      monthlyTarget = allEmps.reduce((sum, e) => sum + (e.monthlyTarget || 0), 0);
      quarterlyTarget = allEmps.reduce((sum, e) => sum + (e.quarterlyTarget || 0), 0);
      salesTarget = allEmps.reduce((sum, e) => sum + (e.salesTarget || 0), 0);
    }

    res.json({
      monthly: {
        revenue: monthlyRevenue,
        target: monthlyTarget,
        wonCount: monthlyWonCount,
        progress: monthlyTarget > 0 ? ((monthlyRevenue / monthlyTarget) * 100).toFixed(1) : '0',
      },
      quarterly: {
        revenue: quarterlyRevenue,
        target: quarterlyTarget,
        wonCount: quarterlyWonCount,
        progress: quarterlyTarget > 0 ? ((quarterlyRevenue / quarterlyTarget) * 100).toFixed(1) : '0',
      },
      overall: {
        target: salesTarget,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
