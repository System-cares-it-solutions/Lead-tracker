import express from 'express';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { checkAndTrashExpiredLeads } from '../utils/trashService.js';

const router = express.Router();

/* ── Helper: compute lead score ── */
function computeLeadScore(lead) {
  let score = 0;
  if (lead.name && lead.name !== '—') score += 10;
  if (lead.email && lead.email !== '—') score += 15;
  if (lead.phone && lead.phone !== '—') score += 15;
  if (lead.company) score += 10;
  if (lead.designation) score += 10;
  if (lead.location && lead.location !== '—') score += 5;
  if (lead.dealValue && lead.dealValue > 0) score += 15;
  if (lead.source && lead.source !== 'Website') score += 5;
  if (lead.expectedCloseDate) score += 5;
  if (lead.callCount > 0) score += Math.min(lead.callCount * 2, 10);
  return Math.min(score, 100);
}

/* ── Helper: create audit log ── */
async function createAuditLog({ action, entityType, entityId, entityName, userId, userName, userRole, description, changes, metadata }) {
  try {
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action,
      entityType: entityType || 'lead',
      entityId,
      entityName: entityName || '',
      userId: userId || null,
      userName: userName || 'System',
      userRole: userRole || null,
      description: description || '',
      changes: changes || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to create audit log:', err.message);
  }
}

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    await checkAndTrashExpiredLeads();
    const { assignedTo, status, priority, source, search, sortBy, sortOrder, page, limit: limitParam } = req.query;
    let filter = {};

    if (assignedTo) {
      const employee = await User.findOne({
        $or: [{ id: assignedTo }, { name: assignedTo }],
      }).select('id name').lean();

      if (employee) {
        filter = {
          $or: [
            { assignedToRaw: employee.id },
            { assignedTo: employee.name },
            { assignedToRaw: assignedTo },
            { assignedTo: assignedTo },
          ],
        };
      } else {
        filter = {
          $or: [{ assignedToRaw: assignedTo }, { assignedTo: assignedTo }],
        };
      }
    }

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (source) {
      filter.source = source;
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { company: regex },
        { location: regex },
        { notes: regex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // Sorting
    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortDir };

    const leads = await Lead.find(filter).sort(sortObj).lean();
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/stats — Aggregated statistics
router.get('/stats', async (req, res) => {
  try {
    const { assignedTo, startDate, endDate } = req.query;
    let matchFilter = {};

    if (assignedTo) {
      const employee = await User.findOne({
        $or: [{ id: assignedTo }, { name: assignedTo }],
      }).select('id name').lean();

      if (employee) {
        matchFilter.$or = [
          { assignedToRaw: employee.id },
          { assignedTo: employee.name },
        ];
      }
    }

    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        matchFilter.createdAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchFilter.createdAt.$lte = e;
      }
    }

    const leads = await Lead.find(matchFilter).lean();

    const total = leads.length;
    const byStatus = {};
    const byPriority = {};
    const bySource = {};
    let totalDealValue = 0;
    let wonDealValue = 0;
    let wonCount = 0;

    leads.forEach((l) => {
      const st = l.status || 'New';
      byStatus[st] = (byStatus[st] || 0) + 1;

      const pr = l.priority || 'Medium';
      byPriority[pr] = (byPriority[pr] || 0) + 1;

      const src = l.source || 'Website';
      bySource[src] = (bySource[src] || 0) + 1;

      totalDealValue += l.dealValue || 0;

      if (st === 'Won') {
        wonDealValue += l.dealValue || 0;
        wonCount++;
      }
    });

    const conversionRate = total > 0 ? ((wonCount / total) * 100).toFixed(1) : '0';
    const avgDealValue = wonCount > 0 ? Math.round(wonDealValue / wonCount) : 0;

    res.json({
      total,
      byStatus,
      byPriority,
      bySource,
      totalDealValue,
      wonDealValue,
      wonCount,
      conversionRate,
      avgDealValue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/export — CSV export
router.get('/export', async (req, res) => {
  try {
    const { status, priority, source, assignedTo, startDate, endDate } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (source) filter.source = source;
    if (assignedTo) {
      const employee = await User.findOne({ $or: [{ id: assignedTo }, { name: assignedTo }] }).select('id name').lean();
      if (employee) {
        filter.$or = [{ assignedToRaw: employee.id }, { assignedTo: employee.name }];
      }
    }
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

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Designation', 'Location', 'Status', 'Priority', 'Source', 'Deal Value', 'Lead Score', 'Assigned To', 'Platform', 'Tags', 'Follow-Up Date', 'Expected Close Date', 'Created At'];
    const rows = leads.map((l) => [
      l.id,
      l.name,
      l.email,
      l.phone,
      l.company || '',
      l.designation || '',
      l.location,
      l.status,
      l.priority || 'Medium',
      l.source || 'Website',
      l.dealValue || 0,
      l.leadScore || 0,
      l.assignedTo || 'Unassigned',
      l.platform || 'Website',
      (l.tags || []).join('; '),
      l.followUpDate || '',
      l.expectedCloseDate ? new Date(l.expectedCloseDate).toISOString().split('T')[0] : '',
      l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '',
    ]);

    const escapeCSV = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads (add single lead)
router.post('/', async (req, res) => {
  try {
    const leadData = req.body;
    const newId = `lead_${Date.now()}`;
    
    let assigneeName = 'Unassigned';
    let assigneeRaw = leadData.assignedTo || null;

    if (leadData.assignedTo) {
      const emp = await User.findOne({
        $or: [{ id: leadData.assignedTo }, { name: leadData.assignedTo }],
      });
      if (emp) {
        assigneeName = emp.name;
        assigneeRaw = emp.id;
      }
    }

    const leadObj = {
      id: newId,
      platform: leadData.platform || 'Website',
      name: leadData.name,
      email: leadData.email || '—',
      phone: leadData.phone || '—',
      location: leadData.location || '—',
      assignedTo: assigneeName,
      assignedToRaw: assigneeRaw,
      status: leadData.status || 'New',
      callCount: leadData.callCount || 0,
      followUpDate: leadData.followUpDate || null,
      notes: leadData.notes || '',
      activities: leadData.activities || [],
      createdBy: leadData.createdBy || null,
      createdByRole: leadData.createdByRole || null,
      // Enterprise fields
      dealValue: Number(leadData.dealValue) || 0,
      currency: leadData.currency || 'INR',
      priority: leadData.priority || 'Medium',
      source: leadData.source || leadData.platform || 'Website',
      company: leadData.company || '',
      designation: leadData.designation || '',
      tags: Array.isArray(leadData.tags) ? leadData.tags : [],
      expectedCloseDate: leadData.expectedCloseDate || null,
      contactMethod: leadData.contactMethod || '',
    };

    leadObj.leadScore = computeLeadScore(leadObj);

    const lead = new Lead(leadObj);
    await lead.save();

    // Notify assigned employee if assigned on creation
    if (assigneeRaw) {
      await Notification.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: 'New Lead Assigned',
        message: `You got a new lead: ${lead.name} (${lead.platform || 'Direct'})${lead.dealValue ? ` — ₹${lead.dealValue.toLocaleString()}` : ''}`,
        type: 'assignment',
        recipientId: assigneeRaw,
      });
    }

    // Audit log
    await createAuditLog({
      action: 'lead_created',
      entityType: 'lead',
      entityId: newId,
      entityName: lead.name,
      userId: leadData.createdBy,
      userName: leadData.createdByName || 'User',
      userRole: leadData.createdByRole,
      description: `Created lead "${lead.name}"${lead.company ? ` from ${lead.company}` : ''}`,
    });

    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/import (bulk import)
router.post('/import', async (req, res) => {
  try {
    const { leads: rawLeads, creatorId, creatorRole } = req.body;
    if (!Array.isArray(rawLeads)) {
      return res.status(400).json({ error: 'leads must be an array' });
    }

    const createdLeads = [];
    for (const item of rawLeads) {
      const newId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      let assigneeName = 'Unassigned';
      let assigneeRaw = null;

      const rawAssigned = item.assignedTo || item['Assigned to'] || item.AssignedTo;
      if (rawAssigned && rawAssigned !== 'Unassigned') {
        const emp = await User.findOne({
          $or: [{ id: rawAssigned }, { name: rawAssigned }],
        });
        if (emp) {
          assigneeName = emp.name;
          assigneeRaw = emp.id;
        } else {
          assigneeName = rawAssigned;
          assigneeRaw = rawAssigned;
        }
      }

      const leadObj = {
        id: item.id || newId,
        platform: item.platform || item.Platform || item.Source || 'Website',
        name: item.name || item.Name || '—',
        email: item.email || item.Email || '—',
        phone: item.phone || item.Phone || '—',
        location: item.location || item.Location || item.Address || item.City || item.State || item.Place || '—',
        assignedTo: assigneeName,
        assignedToRaw: assigneeRaw,
        status: item.status || item.Status || 'New',
        callCount: Number(item.callCount) || 0,
        followUpDate: item.followUpDate || null,
        notes: item.notes || item.Notes || '',
        activities: Array.isArray(item.activities) ? item.activities : [],
        createdBy: creatorId || null,
        createdByRole: creatorRole || null,
        // Enterprise fields
        dealValue: Number(item.dealValue || item['Deal Value'] || 0),
        priority: item.priority || item.Priority || 'Medium',
        source: item.source || item.Source || item.platform || 'Website',
        company: item.company || item.Company || '',
        designation: item.designation || item.Designation || item['Job Title'] || '',
        tags: Array.isArray(item.tags) ? item.tags : [],
        expectedCloseDate: item.expectedCloseDate || null,
      };

      leadObj.leadScore = computeLeadScore(leadObj);

      const lead = new Lead(leadObj);
      await lead.save();
      createdLeads.push(lead);
    }

    // Trigger Notification for ALL (Both Employees & Admins)
    if (createdLeads.length > 0) {
      await Notification.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: 'Leads Imported',
        message: `${createdLeads.length} new lead(s) were imported into the system.`,
        type: 'import',
        recipientRole: 'all',
        senderId: creatorId || null,
      });

      await createAuditLog({
        action: 'leads_imported',
        entityType: 'lead',
        userId: creatorId,
        userRole: creatorRole,
        description: `Imported ${createdLeads.length} lead(s) into the system`,
        metadata: { count: createdLeads.length },
      });
    }

    res.status(201).json({ count: createdLeads.length, leads: createdLeads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/bulk-status (bulk status update)
router.put('/bulk-status', async (req, res) => {
  try {
    const { leadIds, status, userId, userName, userRole } = req.body;
    if (!Array.isArray(leadIds) || !status) {
      return res.status(400).json({ error: 'leadIds array and status are required' });
    }

    const updates = { status };
    if (status === 'Trash') {
      updates.trashedAt = new Date();
    } else {
      updates.trashedAt = null;
    }
    if (status === 'Won') {
      updates.wonDate = new Date();
    }

    await Lead.updateMany({ id: { $in: leadIds } }, updates);

    await createAuditLog({
      action: 'bulk_status_update',
      entityType: 'lead',
      userId,
      userName,
      userRole,
      description: `Bulk updated ${leadIds.length} lead(s) to status "${status}"`,
      metadata: { leadIds, newStatus: status },
    });

    res.json({ success: true, count: leadIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/bulk-assign (bulk assign)
router.put('/bulk-assign', async (req, res) => {
  try {
    const { leadIds, employeeId, userId, userName, userRole } = req.body;
    if (!Array.isArray(leadIds) || !employeeId) {
      return res.status(400).json({ error: 'leadIds array and employeeId are required' });
    }

    let assigneeName = 'Unassigned';
    let assigneeRaw = employeeId;
    const emp = await User.findOne({ $or: [{ id: employeeId }, { name: employeeId }] });
    if (emp) {
      assigneeName = emp.name;
      assigneeRaw = emp.id;
    }

    await Lead.updateMany(
      { id: { $in: leadIds } },
      { assignedTo: assigneeName, assignedToRaw: assigneeRaw }
    );

    // Notify the assigned employee
    if (assigneeRaw) {
      await Notification.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: 'Leads Bulk Assigned',
        message: `${leadIds.length} lead(s) have been assigned to you.`,
        type: 'assignment',
        recipientId: assigneeRaw,
      });
    }

    await createAuditLog({
      action: 'bulk_assign',
      entityType: 'lead',
      userId,
      userName,
      userRole,
      description: `Bulk assigned ${leadIds.length} lead(s) to ${assigneeName}`,
      metadata: { leadIds, assigneeName, assigneeRaw },
    });

    res.json({ success: true, count: leadIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/bulk-delete (bulk delete)
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { leadIds, userId, userName, userRole } = req.body;
    if (!Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    await Lead.deleteMany({ id: { $in: leadIds } });

    await createAuditLog({
      action: 'bulk_delete',
      entityType: 'lead',
      userId,
      userName,
      userRole,
      description: `Bulk deleted ${leadIds.length} lead(s)`,
      metadata: { leadIds },
    });

    res.json({ success: true, count: leadIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id (update details)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Recompute lead score if relevant fields changed
    if (updates.dealValue !== undefined || updates.company !== undefined || updates.email !== undefined) {
      const existing = await Lead.findOne({ id }).lean();
      if (existing) {
        const merged = { ...existing, ...updates };
        updates.leadScore = computeLeadScore(merged);
      }
    }

    if (updates.status === 'Won' && !updates.wonDate) {
      updates.wonDate = new Date();
    }

    const lead = await Lead.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Audit log for updates
    await createAuditLog({
      action: 'lead_updated',
      entityType: 'lead',
      entityId: id,
      entityName: lead.name,
      userId: updates._userId || null,
      userName: updates._userName || 'User',
      description: `Updated lead "${lead.name}"`,
      changes: updates,
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id/status (update status)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, lostReason, userId, userName } = req.body;

    const updates = { status };
    if (status === 'Trash') {
      updates.trashedAt = new Date();
    } else {
      updates.trashedAt = null;
    }
    if (status === 'Won') {
      updates.wonDate = new Date();
    }
    if (status === 'Lost' && lostReason) {
      updates.lostReason = lostReason;
    }
    if (status === 'Contacted' || status === 'Responded') {
      updates.lastContactedAt = new Date();
    }

    const lead = await Lead.findOneAndUpdate({ id }, updates, { returnDocument: 'after' });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await createAuditLog({
      action: 'lead_status_changed',
      entityType: 'lead',
      entityId: id,
      entityName: lead.name,
      userId,
      userName,
      description: `Changed status of "${lead.name}" to "${status}"`,
      changes: { status, lostReason: lostReason || undefined },
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id/assign (assign lead)
router.put('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    let assigneeName = 'Unassigned';
    let assigneeRaw = employeeId || null;

    if (employeeId) {
      const emp = await User.findOne({
        $or: [{ id: employeeId }, { name: employeeId }],
      });
      if (emp) {
        assigneeName = emp.name;
        assigneeRaw = emp.id;
      }
    }

    const lead = await Lead.findOneAndUpdate(
      { id },
      { assignedTo: assigneeName, assignedToRaw: assigneeRaw },
      { returnDocument: 'after' }
    );

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Trigger Notification for the assigned employee
    if (assigneeRaw) {
      await Notification.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: 'New Lead Assigned',
        message: `You got a new lead: ${lead.name} (${lead.platform || 'Direct'})`,
        type: 'assignment',
        recipientId: assigneeRaw,
      });
    }

    await createAuditLog({
      action: 'lead_assigned',
      entityType: 'lead',
      entityId: id,
      entityName: lead.name,
      description: `Assigned lead "${lead.name}" to ${assigneeName}`,
      changes: { assignedTo: assigneeName, assignedToRaw: assigneeRaw },
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/swap (swap lead between employees)
router.post('/:id/swap', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEmployeeId, targetEmployeeName, reason, currentUserId, currentUserName } = req.body;

    const lead = await Lead.findOne({ id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const previousAssignee = lead.assignedTo;
    let targetEmpName = targetEmployeeName || 'Employee';
    let targetEmpId = targetEmployeeId;

    if (targetEmployeeId) {
      const emp = await User.findOne({
        $or: [{ id: targetEmployeeId }, { name: targetEmployeeId }],
      });
      if (emp) {
        targetEmpName = emp.name;
        targetEmpId = emp.id;
      }
    }

    // Record swap activity in lead history
    lead.assignedTo = targetEmpName;
    lead.assignedToRaw = targetEmpId;
    lead.activities.unshift({
      id: `act_${Date.now()}`,
      type: 'note',
      note: `Lead swapped from ${currentUserName || 'employee'} to ${targetEmpName}. Reason: ${reason}`,
      authorName: currentUserName || 'System',
      timestamp: new Date().toISOString(),
    });

    await lead.save();

    const timestamp = Date.now();
    const swappingUser = currentUserName || 'An employee';

    // 1. Notify ONLY the ADMIN
    await Notification.create({
      id: `notif_${timestamp}_admin_${Math.random().toString(36).substr(2, 4)}`,
      title: 'Lead Swapped',
      message: `${swappingUser} swapped lead "${lead.name}" with ${targetEmpName}. Reason: ${reason}`,
      type: 'swap',
      recipientRole: 'admin',
      senderId: currentUserId || null,
      senderName: swappingUser,
    });

    // 2. Notify ONLY the SWAPPED EMPLOYEE (target employee)
    if (targetEmpId) {
      await Notification.create({
        id: `notif_${timestamp}_emp_${Math.random().toString(36).substr(2, 4)}`,
        title: 'Lead Swapped To You',
        message: `You received lead "${lead.name}" via swap from ${swappingUser}. Reason: ${reason}`,
        type: 'swap',
        recipientId: targetEmpId,
        senderId: currentUserId || null,
        senderName: swappingUser,
      });
    }

    await createAuditLog({
      action: 'lead_swapped',
      entityType: 'lead',
      entityId: id,
      entityName: lead.name,
      userId: currentUserId,
      userName: swappingUser,
      description: `Swapped lead "${lead.name}" from ${previousAssignee} to ${targetEmpName}. Reason: ${reason}`,
      changes: { from: previousAssignee, to: targetEmpName, reason },
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/activities (add activity)
router.post('/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const activity = req.body || {};

    const noteContent = (activity.note || activity.text || activity.message || activity.description || '').trim();

    const newActivity = {
      id: activity.id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: activity.type || 'note',
      note: noteContent || 'Activity logged',
      authorName: activity.authorName || 'System',
      timestamp: activity.timestamp || new Date().toISOString(),
    };

    const lead = await Lead.findOne({ id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update last contacted timestamp
    lead.lastContactedAt = new Date();
    lead.activities.unshift(newActivity);
    await lead.save();

    res.status(201).json(newActivity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/all (bulk delete all leads)
router.delete('/all', async (req, res) => {
  try {
    const count = await Lead.countDocuments();
    await Lead.deleteMany({});

    await createAuditLog({
      action: 'all_leads_deleted',
      entityType: 'lead',
      description: `Deleted all ${count} leads from the system`,
      metadata: { count },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id (delete lead)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({ id }).lean();
    await Lead.deleteOne({ id });

    if (lead) {
      await createAuditLog({
        action: 'lead_deleted',
        entityType: 'lead',
        entityId: id,
        entityName: lead.name,
        description: `Deleted lead "${lead.name}"`,
      });
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/duplicates — Duplicate lead detection
router.get('/duplicates', async (req, res) => {
  try {
    const leads = await Lead.find({ status: { $ne: 'Trash' } }).lean();
    const duplicateGroups = [];
    const processed = new Set();

    for (let i = 0; i < leads.length; i++) {
      if (processed.has(leads[i].id)) continue;

      const group = [leads[i]];

      for (let j = i + 1; j < leads.length; j++) {
        if (processed.has(leads[j].id)) continue;

        const a = leads[i];
        const b = leads[j];

        // Check duplicates by email, phone, or name+company
        const sameEmail = a.email && b.email && a.email !== '—' && b.email !== '—' &&
          a.email.toLowerCase() === b.email.toLowerCase();
        const samePhone = a.phone && b.phone && a.phone !== '—' && b.phone !== '—' &&
          a.phone.replace(/\D/g, '') === b.phone.replace(/\D/g, '');
        const sameName = a.name && b.name && a.name.toLowerCase() === b.name.toLowerCase() &&
          a.company && b.company && a.company.toLowerCase() === b.company.toLowerCase();

        if (sameEmail || samePhone || sameName) {
          group.push(leads[j]);
          processed.add(leads[j].id);
        }
      }

      if (group.length > 1) {
        processed.add(leads[i].id);
        duplicateGroups.push({
          matchType: 'email/phone/name',
          leads: group,
          count: group.length,
        });
      }
    }

    res.json({
      totalGroups: duplicateGroups.length,
      totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.count, 0),
      groups: duplicateGroups,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/merge — Merge duplicate leads
router.post('/merge', async (req, res) => {
  try {
    const { primaryId, mergeIds, userId, userName } = req.body;

    if (!primaryId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return res.status(400).json({ error: 'primaryId and mergeIds array are required' });
    }

    const primary = await Lead.findOne({ id: primaryId });
    if (!primary) return res.status(404).json({ error: 'Primary lead not found' });

    const mergeLeads = await Lead.find({ id: { $in: mergeIds } }).lean();

    // Merge data: keep primary's data, but fill in blanks from merge leads
    for (const ml of mergeLeads) {
      if ((!primary.email || primary.email === '—') && ml.email && ml.email !== '—') primary.email = ml.email;
      if ((!primary.phone || primary.phone === '—') && ml.phone && ml.phone !== '—') primary.phone = ml.phone;
      if (!primary.company && ml.company) primary.company = ml.company;
      if (!primary.designation && ml.designation) primary.designation = ml.designation;
      if ((!primary.location || primary.location === '—') && ml.location && ml.location !== '—') primary.location = ml.location;
      if (primary.dealValue === 0 && ml.dealValue > 0) primary.dealValue = ml.dealValue;

      // Merge activities
      if (ml.activities && ml.activities.length > 0) {
        primary.activities.push(...ml.activities);
      }

      // Merge tags
      if (ml.tags && ml.tags.length > 0) {
        const existingTags = new Set(primary.tags || []);
        ml.tags.forEach((t) => existingTags.add(t));
        primary.tags = [...existingTags];
      }

      // Add merge note
      primary.activities.unshift({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'note',
        note: `Merged with duplicate lead "${ml.name}" (${ml.id})`,
        authorName: userName || 'System',
        timestamp: new Date().toISOString(),
      });

      primary.touchpoints = (primary.touchpoints || 0) + (ml.touchpoints || 0) + (ml.callCount || 0);
    }

    // Recompute lead score
    primary.leadScore = computeLeadScore(primary);
    await primary.save();

    // Delete merged leads
    await Lead.deleteMany({ id: { $in: mergeIds } });

    // Audit log
    await createAuditLog({
      action: 'leads_merged',
      entityType: 'lead',
      entityId: primaryId,
      entityName: primary.name,
      userId,
      userName: userName || 'System',
      description: `Merged ${mergeIds.length} duplicate lead(s) into "${primary.name}"`,
      metadata: { primaryId, mergedIds: mergeIds },
    });

    res.json(primary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/timeline/:id — Full timeline/history for a lead
router.get('/timeline/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findOne({ id }).lean();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Get audit logs for this lead
    const auditLogs = await AuditLog.find({ entityId: id }).sort({ createdAt: -1 }).lean();

    // Build timeline
    const timeline = [];

    // Creation event
    timeline.push({
      type: 'created',
      timestamp: lead.createdAt,
      description: `Lead created via ${lead.platform || 'Direct'}`,
      user: lead.createdBy || 'System',
    });

    // Activities
    if (lead.activities) {
      lead.activities.forEach((act) => {
        timeline.push({
          type: 'activity',
          subtype: act.type,
          timestamp: act.timestamp,
          description: act.note,
          user: act.authorName,
        });
      });
    }

    // Audit log events
    auditLogs.forEach((log) => {
      timeline.push({
        type: 'audit',
        action: log.action,
        timestamp: log.createdAt,
        description: log.description,
        user: log.userName,
        changes: log.changes,
      });
    });

    // Stage history
    if (lead.stageHistory) {
      lead.stageHistory.forEach((sh) => {
        timeline.push({
          type: 'stage_change',
          timestamp: sh.enteredAt,
          description: `Entered stage "${sh.stage}"`,
          duration: sh.duration,
        });
      });
    }

    // Sort by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      lead: { id: lead.id, name: lead.name, status: lead.status },
      timeline,
      totalEvents: timeline.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
