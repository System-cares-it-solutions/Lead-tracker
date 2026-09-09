import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const employees = await User.find({}).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees (add employee)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const newId = `emp_${Date.now()}`;

    const employee = new User({
      id: newId,
      name: data.name,
      email: data.email,
      password: data.password || 'emp123',
      role: data.role || 'employee',
      phone: data.phone || '',
      location: data.location || '',
      language: data.language !== undefined && data.language !== null && String(data.language).trim() !== '' ? String(data.language).trim() : 'English',
      avatar: data.avatar || null,
    });

    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id (update employee)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.language !== undefined) {
      updates.language = String(updates.language).trim();
    } else if (updates.languages !== undefined) {
      updates.language = String(updates.languages).trim();
    }

    const queryConditions = [{ id: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryConditions.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    let employee = await User.findOneAndUpdate({ $or: queryConditions }, updates, { returnDocument: 'after', runValidators: true });

    if (!employee && updates.email) {
      employee = await User.findOneAndUpdate({ email: updates.email.toLowerCase().trim() }, updates, { returnDocument: 'after', runValidators: true });
    }

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/employees/:id (delete employee)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const queryConditions = [{ id: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryConditions.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    await User.deleteOne({ $or: queryConditions });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/workload — Employee workload analysis
router.get('/workload', async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }).lean();
    const Lead = (await import('../models/Lead.js')).default;
    const Task = (await import('../models/Task.js')).default;
    const allLeads = await Lead.find({ status: { $nin: ['Trash'] } }).lean();
    const allTasks = await Task.find({ status: { $nin: ['completed', 'cancelled'] } }).lean();

    const workload = employees.map((emp) => {
      const empLeads = allLeads.filter(
        (l) => l.assignedToRaw === emp.id || l.assignedTo === emp.name
      );
      const empTasks = allTasks.filter(
        (t) => t.assignedTo === emp.id || t.assignedTo === emp.name
      );

      const activeLeads = empLeads.filter((l) => !['Won', 'Lost'].includes(l.status)).length;
      const wonLeads = empLeads.filter((l) => l.status === 'Won').length;
      const pendingTasks = empTasks.filter((t) => t.status === 'pending').length;
      const overdueTasks = empTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length;
      const totalDealValue = empLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
      const criticalLeads = empLeads.filter((l) => l.priority === 'Critical' && !['Won', 'Lost'].includes(l.status)).length;

      // Capacity score (0-100, higher = more busy)
      const capacityScore = Math.min(100, activeLeads * 5 + pendingTasks * 10 + overdueTasks * 20 + criticalLeads * 15);

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department || '',
        isActive: emp.isActive !== false,
        totalLeads: empLeads.length,
        activeLeads,
        wonLeads,
        pendingTasks,
        overdueTasks,
        totalDealValue,
        criticalLeads,
        capacityScore,
        status: capacityScore >= 80 ? 'Overloaded' : capacityScore >= 50 ? 'Busy' : capacityScore >= 20 ? 'Normal' : 'Available',
      };
    });

    workload.sort((a, b) => b.capacityScore - a.capacityScore);
    res.json(workload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id/toggle-active — Activate/deactivate employee
router.put('/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const queryConditions = [{ id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryConditions.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    const employee = await User.findOne({ $or: queryConditions });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    employee.isActive = !employee.isActive;
    await employee.save();

    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
