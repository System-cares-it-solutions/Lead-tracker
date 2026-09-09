import express from 'express';
import Lead from '../models/Lead.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * Helper to construct a date query object for Mongoose filtering on `createdAt`.
 */
function buildDateFilter(startDate, endDate) {
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
  return dateFilter;
}

// GET /api/analytics/pipeline — Pipeline funnel data (count + deal value per status)
router.get('/pipeline', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateFilter(startDate, endDate);

    const pipeline = await Lead.aggregate([
      ...(Object.keys(dateMatch).length ? [{ $match: dateMatch }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$dealValue', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const stageOrder = ['New', 'Contacted', 'Responded', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Trash'];
    const ordered = stageOrder.map((stage) => {
      const found = pipeline.find((p) => p._id === stage);
      return {
        stage,
        count: found ? found.count : 0,
        totalValue: found ? found.totalValue : 0,
      };
    });

    // Also include any stages not in the predefined order
    pipeline.forEach((p) => {
      if (!stageOrder.includes(p._id) && p._id) {
        ordered.push({ stage: p._id, count: p.count, totalValue: p.totalValue });
      }
    });

    res.json(ordered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/trends — Lead creation trends over time
router.get('/trends', async (req, res) => {
  try {
    const { period = 'daily', days = 30, startDate: qStart, endDate: qEnd } = req.query;
    
    let matchFilter = {};
    if (qStart || qEnd) {
      matchFilter = buildDateFilter(qStart, qEnd);
    } else {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      matchFilter = { createdAt: { $gte: startDate } };
    }

    let groupFormat;
    if (period === 'monthly') {
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    } else if (period === 'weekly') {
      groupFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
    } else {
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const trends = await Lead.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
          totalValue: { $sum: { $ifNull: ['$dealValue', 0] } },
          wonValue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Won'] }, { $ifNull: ['$dealValue', 0] }, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(
      trends.map((t) => ({
        date: t._id,
        total: t.total,
        won: t.won,
        lost: t.lost,
        totalValue: t.totalValue,
        wonValue: t.wonValue,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/sources — Lead source breakdown with conversion rates
router.get('/sources', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateFilter(startDate, endDate);

    const sources = await Lead.aggregate([
      ...(Object.keys(dateMatch).length ? [{ $match: dateMatch }] : []),
      {
        $group: {
          _id: { $ifNull: ['$source', 'Website'] },
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
          totalValue: { $sum: { $ifNull: ['$dealValue', 0] } },
          wonValue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Won'] }, { $ifNull: ['$dealValue', 0] }, 0],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json(
      sources.map((s) => ({
        source: s._id,
        total: s.total,
        won: s.won,
        lost: s.lost,
        conversionRate: s.total > 0 ? ((s.won / s.total) * 100).toFixed(1) : '0',
        totalValue: s.totalValue,
        wonValue: s.wonValue,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/performance — Employee performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateFilter(startDate, endDate);

    const employees = await User.find({ role: 'employee' }).lean();
    const leads = await Lead.find(dateMatch).lean();

    const performance = employees.map((emp) => {
      const empLeads = leads.filter(
        (l) => l.assignedToRaw === emp.id || l.assignedTo === emp.name
      );
      const totalLeads = empLeads.length;
      const wonLeads = empLeads.filter((l) => l.status === 'Won').length;
      const lostLeads = empLeads.filter((l) => l.status === 'Lost').length;
      const activeLeads = empLeads.filter(
        (l) => !['Won', 'Lost', 'Trash'].includes(l.status)
      ).length;
      const totalDealValue = empLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
      const wonDealValue = empLeads
        .filter((l) => l.status === 'Won')
        .reduce((sum, l) => sum + (l.dealValue || 0), 0);
      const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
      const avgDealValue = wonLeads > 0 ? Math.round(wonDealValue / wonLeads) : 0;
      const targetProgress = emp.salesTarget > 0 ? ((wonDealValue / emp.salesTarget) * 100).toFixed(1) : '0';

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department || '',
        totalLeads,
        wonLeads,
        lostLeads,
        activeLeads,
        totalDealValue,
        wonDealValue,
        conversionRate,
        avgDealValue,
        salesTarget: emp.salesTarget || 0,
        targetProgress,
      };
    });

    performance.sort((a, b) => b.wonDealValue - a.wonDealValue || b.wonLeads - a.wonLeads);
    res.json(performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/forecast — Revenue forecast based on pipeline
router.get('/forecast', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateFilter(startDate, endDate);

    // Probability weights for each stage
    const stageProbability = {
      New: 0.1,
      Contacted: 0.2,
      Responded: 0.3,
      Qualified: 0.5,
      'Proposal Sent': 0.65,
      Negotiation: 0.8,
      Won: 1.0,
      Lost: 0,
      Trash: 0,
    };

    const activeFilter = { ...dateMatch, status: { $nin: ['Lost', 'Trash'] } };
    const leads = await Lead.find(activeFilter).lean();

    let totalPipelineValue = 0;
    let weightedForecast = 0;
    const byStage = {};

    leads.forEach((l) => {
      const value = l.dealValue || 0;
      const stage = l.status || 'New';
      const prob = stageProbability[stage] ?? 0.1;

      totalPipelineValue += value;
      weightedForecast += value * prob;

      if (!byStage[stage]) {
        byStage[stage] = { count: 0, value: 0, weightedValue: 0, probability: prob };
      }
      byStage[stage].count++;
      byStage[stage].value += value;
      byStage[stage].weightedValue += value * prob;
    });

    const wonFilter = { ...dateMatch, status: 'Won' };
    const wonLeads = await Lead.find(wonFilter).lean();
    const closedRevenue = wonLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);

    res.json({
      totalPipelineValue,
      weightedForecast: Math.round(weightedForecast),
      closedRevenue,
      totalDeals: leads.length,
      byStage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/conversion-funnel — Stage-by-stage conversion rates
router.get('/conversion-funnel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateFilter(startDate, endDate);
    const stageOrder = ['New', 'Contacted', 'Responded', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won'];

    const matchFilter = { ...dateMatch, status: { $nin: ['Lost', 'Trash'] } };

    const counts = await Lead.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    // For funnel: each stage shows how many leads reached that stage or beyond
    const funnelData = stageOrder.map((stage, idx) => {
      let reached = 0;
      for (let i = idx; i < stageOrder.length; i++) {
        reached += countMap[stageOrder[i]] || 0;
      }
      return {
        stage,
        count: countMap[stage] || 0,
        reached,
      };
    });

    res.json(funnelData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/velocity — Lead velocity metrics
router.get('/velocity', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = buildDateFilter(startDate, endDate);

    const leads = await Lead.find({ ...dateMatch, status: 'Won' }).lean();

    // Average time from creation to Won
    const velocities = leads
      .filter((l) => l.createdAt && l.wonDate)
      .map((l) => {
        const diffMs = new Date(l.wonDate) - new Date(l.createdAt);
        return diffMs / (1000 * 60 * 60 * 24); // days
      });

    const avgVelocity = velocities.length > 0
      ? (velocities.reduce((a, b) => a + b, 0) / velocities.length).toFixed(1)
      : 0;
    const fastestDeal = velocities.length > 0 ? Math.min(...velocities).toFixed(1) : 0;
    const slowestDeal = velocities.length > 0 ? Math.max(...velocities).toFixed(1) : 0;

    // Stage duration analysis from stageHistory
    const allLeads = await Lead.find(dateMatch).lean();
    const stageOrder = ['New', 'Contacted', 'Responded', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won'];
    const stageDurations = {};

    stageOrder.forEach((stage) => {
      stageDurations[stage] = { totalMinutes: 0, count: 0 };
    });

    allLeads.forEach((lead) => {
      if (lead.stageHistory && lead.stageHistory.length > 0) {
        lead.stageHistory.forEach((sh) => {
          if (sh.duration && stageDurations[sh.stage]) {
            stageDurations[sh.stage].totalMinutes += sh.duration;
            stageDurations[sh.stage].count++;
          }
        });
      }
    });

    const avgStageDuration = {};
    Object.keys(stageDurations).forEach((stage) => {
      const s = stageDurations[stage];
      avgStageDuration[stage] = s.count > 0
        ? (s.totalMinutes / s.count / 60).toFixed(1) // hours
        : 0;
    });

    // Monthly velocity trend
    const monthlyVelocity = {};
    leads.forEach((l) => {
      if (l.wonDate) {
        const month = new Date(l.wonDate).toISOString().substring(0, 7);
        if (!monthlyVelocity[month]) monthlyVelocity[month] = { total: 0, count: 0 };
        if (l.createdAt) {
          const days = (new Date(l.wonDate) - new Date(l.createdAt)) / (1000 * 60 * 60 * 24);
          monthlyVelocity[month].total += days;
          monthlyVelocity[month].count++;
        }
      }
    });

    const velocityTrend = Object.entries(monthlyVelocity)
      .map(([month, data]) => ({
        month,
        avgDays: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
        deals: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      avgVelocityDays: Number(avgVelocity),
      fastestDealDays: Number(fastestDeal),
      slowestDealDays: Number(slowestDeal),
      totalWonDeals: velocities.length,
      avgStageDuration,
      velocityTrend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/heatmap — Activity heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const leads = await Lead.find({ createdAt: { $gte: startDate } }).lean();

    // By hour of day
    const byHour = new Array(24).fill(0);
    // By day of week (0=Sunday)
    const byDayOfWeek = new Array(7).fill(0);
    // Grid: [dayOfWeek][hour]
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));

    leads.forEach((l) => {
      if (l.createdAt) {
        const d = new Date(l.createdAt);
        const hour = d.getHours();
        const day = d.getDay();
        byHour[hour]++;
        byDayOfWeek[day]++;
        grid[day][hour]++;
      }
    });

    // Daily activity for the date range
    const dailyActivity = {};
    leads.forEach((l) => {
      if (l.createdAt) {
        const dateKey = new Date(l.createdAt).toISOString().split('T')[0];
        dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
      }
    });

    res.json({
      byHour,
      byDayOfWeek,
      grid,
      dailyActivity,
      totalLeads: leads.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/cohort — Cohort analysis
router.get('/cohort', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const leads = await Lead.find({ createdAt: { $gte: startDate } }).lean();

    // Group by creation month
    const cohorts = {};
    leads.forEach((l) => {
      const month = new Date(l.createdAt).toISOString().substring(0, 7);
      if (!cohorts[month]) {
        cohorts[month] = { total: 0, won: 0, lost: 0, active: 0, revenue: 0 };
      }
      cohorts[month].total++;
      if (l.status === 'Won') {
        cohorts[month].won++;
        cohorts[month].revenue += l.dealValue || 0;
      } else if (l.status === 'Lost') {
        cohorts[month].lost++;
      } else if (!['Trash'].includes(l.status)) {
        cohorts[month].active++;
      }
    });

    const result = Object.entries(cohorts)
      .map(([month, data]) => ({
        month,
        ...data,
        conversionRate: data.total > 0 ? ((data.won / data.total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/comparison — Period-over-period comparison
router.get('/comparison', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // 'week', 'month', 'quarter'

    const now = new Date();
    let currentStart, previousStart, previousEnd;

    if (period === 'week') {
      currentStart = new Date(now);
      currentStart.setDate(currentStart.getDate() - 7);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 7);
    } else if (period === 'quarter') {
      currentStart = new Date(now);
      currentStart.setMonth(currentStart.getMonth() - 3);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setMonth(previousStart.getMonth() - 3);
    } else {
      currentStart = new Date(now);
      currentStart.setMonth(currentStart.getMonth() - 1);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setMonth(previousStart.getMonth() - 1);
    }

    const currentLeads = await Lead.find({ createdAt: { $gte: currentStart } }).lean();
    const previousLeads = await Lead.find({ createdAt: { $gte: previousStart, $lt: previousEnd } }).lean();

    function computeMetrics(leads) {
      const total = leads.length;
      const won = leads.filter((l) => l.status === 'Won').length;
      const lost = leads.filter((l) => l.status === 'Lost').length;
      const revenue = leads.filter((l) => l.status === 'Won').reduce((sum, l) => sum + (l.dealValue || 0), 0);
      const pipeline = leads.filter((l) => !['Won', 'Lost', 'Trash'].includes(l.status))
        .reduce((sum, l) => sum + (l.dealValue || 0), 0);
      const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0';
      return { total, won, lost, revenue, pipeline, conversionRate };
    }

    const current = computeMetrics(currentLeads);
    const previous = computeMetrics(previousLeads);

    function calcChange(curr, prev) {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return (((curr - prev) / prev) * 100).toFixed(1);
    }

    res.json({
      period,
      current,
      previous,
      changes: {
        total: calcChange(current.total, previous.total),
        won: calcChange(current.won, previous.won),
        revenue: calcChange(current.revenue, previous.revenue),
        pipeline: calcChange(current.pipeline, previous.pipeline),
        conversionRate: (Number(current.conversionRate) - Number(previous.conversionRate)).toFixed(1),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
