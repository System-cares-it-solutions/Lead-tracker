import Lead from '../models/Lead.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Automation Engine — Rule-based automation for leads
 * 
 * 1. Auto-escalate stale leads (no activity for 48h)
 * 2. Auto-score leads based on engagement
 * 3. Auto-detect overdue tasks and update status
 * 4. Auto-compute stage tracking
 */

/* ── Helper ── */
async function createAuditLog(data) {
  try {
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      entityType: 'system',
      ...data,
    });
  } catch (err) {
    console.error('[AutomationEngine:AuditLog] Failed:', err.message);
  }
}

/**
 * 1. Auto-escalate stale leads
 * Leads with no activity for 48+ hours get priority bumped
 */
async function autoEscalateStaleLeads() {
  try {
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);

    const staleLeads = await Lead.find({
      status: { $nin: ['Won', 'Lost', 'Trash'] },
      priority: { $in: ['Low', 'Medium'] },
      lastContactedAt: { $lt: cutoff },
    });

    let escalated = 0;
    for (const lead of staleLeads) {
      const newPriority = lead.priority === 'Low' ? 'Medium' : 'High';
      lead.priority = newPriority;
      lead.activities.unshift({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'note',
        note: `⚡ Auto-escalated priority to ${newPriority} (no activity for 48+ hours)`,
        authorName: 'Automation Engine',
        timestamp: new Date().toISOString(),
      });
      await lead.save();
      escalated++;

      // Notify assigned employee
      if (lead.assignedToRaw) {
        await Notification.create({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          title: '⚡ Lead Priority Escalated',
          message: `Lead "${lead.name}" has been auto-escalated to ${newPriority} priority due to 48+ hours of inactivity.`,
          type: 'warning',
          recipientId: lead.assignedToRaw,
        });
      }
    }

    if (escalated > 0) {
      console.log(`[AutomationEngine] Auto-escalated ${escalated} stale lead(s)`);
    }
  } catch (err) {
    console.error('[AutomationEngine:Escalate] Error:', err.message);
  }
}

/**
 * 2. Auto-score leads based on engagement
 * Recompute engagement score based on activities, touchpoints, response time
 */
async function autoScoreLeads() {
  try {
    const leads = await Lead.find({ status: { $nin: ['Won', 'Lost', 'Trash'] } });

    for (const lead of leads) {
      let engagementScore = 0;

      // Activities count
      const activityCount = (lead.activities || []).length;
      engagementScore += Math.min(activityCount * 5, 25);

      // Touchpoints
      engagementScore += Math.min((lead.touchpoints || 0) * 3, 15);

      // Call count
      engagementScore += Math.min((lead.callCount || 0) * 5, 20);

      // Has follow-up date set
      if (lead.followUpDate) engagementScore += 10;

      // Has deal value
      if (lead.dealValue > 0) engagementScore += 10;

      // Recency of last contact
      if (lead.lastContactedAt) {
        const hoursSinceContact = (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceContact < 24) engagementScore += 20;
        else if (hoursSinceContact < 72) engagementScore += 10;
        else if (hoursSinceContact < 168) engagementScore += 5;
      }

      // Comment count
      engagementScore += Math.min((lead.commentCount || 0) * 3, 10);

      lead.engagementScore = Math.min(engagementScore, 100);

      // Compute conversion probability based on stage + engagement
      const stageProbability = {
        New: 10, Contacted: 20, Responded: 35, Qualified: 50,
        'Proposal Sent': 65, Negotiation: 80,
      };
      const stageProb = stageProbability[lead.status] || 10;
      lead.conversionProbability = Math.min(
        Math.round(stageProb * 0.6 + lead.engagementScore * 0.4),
        99
      );

      await lead.save();
    }
  } catch (err) {
    console.error('[AutomationEngine:Score] Error:', err.message);
  }
}

/**
 * 3. Auto-detect overdue tasks
 * Mark tasks as overdue if past due date
 */
async function autoDetectOverdueTasks() {
  try {
    const result = await Task.updateMany(
      {
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $lt: new Date() },
      },
      { status: 'overdue' }
    );

    if (result.modifiedCount > 0) {
      console.log(`[AutomationEngine] Marked ${result.modifiedCount} task(s) as overdue`);
    }
  } catch (err) {
    console.error('[AutomationEngine:Overdue] Error:', err.message);
  }
}

/**
 * Main automation runner — called periodically
 */
export async function runAutomationEngine() {
  try {
    await autoEscalateStaleLeads();
    await autoScoreLeads();
    await autoDetectOverdueTasks();
  } catch (err) {
    console.error('[AutomationEngine] Error running automation:', err.message);
  }
}
