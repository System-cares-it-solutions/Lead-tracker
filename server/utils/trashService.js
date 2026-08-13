import Lead from '../models/Lead.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

/**
 * Automatically manages lead lifecycle & expiration:
 * 
 * 1. Expiration Warning (1 hour before SLA expiration):
 *    - Finds active leads created 23-24 hours ago and notifies Employee & Admin.
 * 
 * 2. SLA Expiration (24 hours after creation):
 *    - Moves active leads created 24+ hours ago to status 'Trash' and sets trashedAt timestamp.
 * 
 * 3. Trash Purging (24 hours in Trash):
 *    - Permanently deletes leads that have been in 'Trash' for 24+ hours (trashedAt <= 24h ago or updatedAt <= 24h ago).
 */
export async function checkAndTrashExpiredLeads() {
  try {
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const TWENTY_THREE_HOURS_MS = 23 * 60 * 60 * 1000;
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - TWENTY_FOUR_HOURS_MS);
    const twentyThreeHoursAgo = new Date(now - TWENTY_THREE_HOURS_MS);

    // ── 1. Check leads expiring in <= 1 hour (created between 23h and 24h ago) ──
    const warningLeads = await Lead.find({
      createdAt: { $gte: twentyFourHoursAgo, $lte: twentyThreeHoursAgo },
      status: { $nin: ['Trash', 'Won', 'Lost'] },
      expirationWarned: { $ne: true },
    });

    for (const lead of warningLeads) {
      lead.expirationWarned = true;
      
      const activityNote = '⏰ URGENT: Lead expires in less than 1 hour! Immediate follow-up action needed.';
      lead.activities.unshift({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'note',
        note: activityNote,
        authorName: 'System',
        timestamp: new Date().toISOString(),
      });

      await lead.save();

      const timestamp = Date.now();
      const uniqueSuffix = Math.random().toString(36).substr(2, 4);

      // Notify Admin
      await Notification.create({
        id: `notif_${timestamp}_admin_exp_${uniqueSuffix}`,
        title: '⚠️ Lead Expiring in 1 Hour!',
        message: `Lead "${lead.name}" (${lead.assignedTo || 'Unassigned'}) expires in less than 1 hour! Immediate follow-up action needed.`,
        type: 'warning',
        recipientRole: 'admin',
      });

      // Notify Assigned Employee if assigned
      let employeeRecipient = lead.assignedToRaw;
      if (!employeeRecipient && lead.assignedTo && lead.assignedTo !== 'Unassigned') {
        const emp = await User.findOne({
          $or: [{ id: lead.assignedTo }, { name: lead.assignedTo }],
        }).lean();
        if (emp) {
          employeeRecipient = emp.id;
        }
      }

      if (employeeRecipient) {
        await Notification.create({
          id: `notif_${timestamp}_emp_exp_${uniqueSuffix}`,
          title: '⚠️ Action Required: Lead Expiring Soon!',
          message: `Your assigned lead "${lead.name}" expires in less than 1 hour! Immediate follow-up action needed.`,
          type: 'warning',
          recipientId: employeeRecipient,
        });
      }
    }

    // ── 2. Check leads in 'New' status for 24+ hours and notify Employee & Admin ──
    const newExpiredLeads = await Lead.find({
      createdAt: { $lte: twentyFourHoursAgo },
      status: 'New',
      notifiedNew24h: { $ne: true },
    });

    for (const lead of newExpiredLeads) {
      lead.notifiedNew24h = true;

      const activityNote = '🚨 URGENT: Lead has remained in New status for 24 hours! Immediate Action Needed.';
      lead.activities.unshift({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'note',
        note: activityNote,
        authorName: 'System',
        timestamp: new Date().toISOString(),
      });

      await lead.save();

      const timestamp = Date.now();
      const uniqueSuffix = Math.random().toString(36).substr(2, 4);

      // Notify Admin
      await Notification.create({
        id: `notif_${timestamp}_admin_24h_${uniqueSuffix}`,
        title: '🚨 Immediate Action Needed!',
        message: `Lead "${lead.name}" (${lead.assignedTo || 'Unassigned'}) has been in New status for 24 hours! Immediate Action Needed.`,
        type: 'warning',
        recipientRole: 'admin',
      });

      // Notify Assigned Employee if assigned
      let employeeRecipient = lead.assignedToRaw;
      if (!employeeRecipient && lead.assignedTo && lead.assignedTo !== 'Unassigned') {
        const emp = await User.findOne({
          $or: [{ id: lead.assignedTo }, { name: lead.assignedTo }],
        }).lean();
        if (emp) {
          employeeRecipient = emp.id;
        }
      }

      if (employeeRecipient) {
        await Notification.create({
          id: `notif_${timestamp}_emp_24h_${uniqueSuffix}`,
          title: '🚨 Immediate Action Needed!',
          message: `Your assigned lead "${lead.name}" has been in New status for 24 hours! Immediate Action Needed.`,
          type: 'warning',
          recipientId: employeeRecipient,
        });
      }
    }

    // ── 3. Automatically purge/delete leads that have been in Trash for 24+ hours ──
    const trashedLeadsToDelete = await Lead.find({
      status: 'Trash',
      $or: [
        { trashedAt: { $lte: twentyFourHoursAgo } },
        { trashedAt: null, updatedAt: { $lte: twentyFourHoursAgo } },
      ],
    });

    if (trashedLeadsToDelete && trashedLeadsToDelete.length > 0) {
      console.log(`[TrashService] Permanently deleting ${trashedLeadsToDelete.length} trash lead(s) older than 24 hours...`);
      const idsToDelete = trashedLeadsToDelete.map((l) => l._id);
      await Lead.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (err) {
    console.error('[TrashService] Error running auto-trash, expiry warning, and purge check:', err);
  }
}


