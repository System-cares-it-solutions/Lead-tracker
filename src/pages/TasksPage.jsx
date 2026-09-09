import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ROLES } from '../utils/roles';
import { formatCurrency } from '../utils/leadStatuses';
import * as api from '../services/api';
import Spinner from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import {
  CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2,
  Calendar, Filter, Search, Trash2, Edit3, ChevronDown,
  Target, TrendingUp, Timer, XCircle, ListChecks, BarChart3,
} from 'lucide-react';

const TASK_CATEGORIES = [
  { key: 'follow_up', label: 'Follow Up', icon: '📞' },
  { key: 'call', label: 'Call', icon: '☎️' },
  { key: 'meeting', label: 'Meeting', icon: '🤝' },
  { key: 'email', label: 'Email', icon: '📧' },
  { key: 'proposal', label: 'Proposal', icon: '📋' },
  { key: 'review', label: 'Review', icon: '🔍' },
  { key: 'other', label: 'Other', icon: '📌' },
];

const PRIORITY_COLORS = {
  Low: { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' },
  Medium: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
  High: { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316' },
  Critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  in_progress: { label: 'In Progress', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
};

export default function TasksPage() {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const isAdmin = role === ROLES.ADMIN;

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', leadId: '', assignedTo: '',
    dueDate: '', priority: 'Medium', category: 'other', notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (!isAdmin) filters.assignedTo = user?.id || user?.name;
      if (filterStatus) filters.status = filterStatus;
      if (filterPriority) filters.priority = filterPriority;
      if (search) filters.search = search;

      const [taskData, statsData] = await Promise.all([
        api.fetchTasks(filters),
        api.fetchTaskStats(isAdmin ? {} : { assignedTo: user?.id }),
      ]);
      setTasks(taskData.tasks || []);
      setStats(statsData);

      if (isAdmin) {
        const emps = await api.fetchEmployees();
        setEmployees(emps.filter((e) => e.role === 'employee'));
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterStatus, filterPriority]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = () => {
    setEditTask(null);
    setForm({ title: '', description: '', leadId: '', assignedTo: '', dueDate: '', priority: 'Medium', category: 'other', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      leadId: task.leadId || '',
      assignedTo: task.assignedTo || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      priority: task.priority || 'Medium',
      category: task.category || 'other',
      notes: task.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Task title is required', 'error');
      return;
    }
    try {
      if (editTask) {
        await api.updateTask(editTask.id, form);
        showToast('Task updated successfully', 'success');
      } else {
        await api.addTask({
          ...form,
          createdBy: user?.id,
          createdByName: user?.name,
        });
        showToast('Task created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save task', 'error');
    }
  };

  const handleComplete = async (task) => {
    try {
      await api.completeTask(task.id, user?.id, user?.name);
      showToast('Task completed!', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      showToast('Task deleted', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await api.updateTask(task.id, { status: newStatus });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const cardStyle = {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    padding: '1.25rem',
  };

  const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: '1 1 180px',
    minWidth: '180px',
  };

  if (loading && tasks.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <CheckSquare size={24} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-primary)' }} />
            Task Manager
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {isAdmin ? 'Manage all tasks across the team' : 'View and manage your tasks'}
          </p>
        </div>
        <Button onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> New Task
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={statCardStyle}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ListChecks size={20} color="var(--color-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Tasks</div>
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.pending}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pending</div>
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.overdue > 0 ? '#ef4444' : undefined }}>{stats.overdue}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Overdue</div>
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.completed}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Completed</div>
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={20} color="var(--color-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.completionRate}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Completion Rate</div>
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} color="#06b6d4" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.dueThisWeek}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Due This Week</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ ...cardStyle, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 250px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dimmed)' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}
            />
          </div>
        </form>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}>
          <option value="">All Priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* Tasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {tasks.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <CheckSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No tasks found</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Create your first task to get started</p>
          </div>
        ) : (
          tasks.map((task) => {
            const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';
            const cat = TASK_CATEGORIES.find((c) => c.key === task.category) || TASK_CATEGORIES[6];

            return (
              <div key={task.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', opacity: task.status === 'completed' ? 0.7 : 1, transition: 'all 0.2s', borderLeft: `3px solid ${isOverdue ? '#ef4444' : sc.color}` }}>
                {/* Checkbox */}
                <button
                  onClick={() => task.status !== 'completed' && handleComplete(task)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${task.status === 'completed' ? '#10b981' : 'var(--color-border)'}`, background: task.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', cursor: task.status === 'completed' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  {task.status === 'completed' && <CheckCircle2 size={16} color="#10b981" />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                      {cat.icon} {task.title}
                    </span>
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: pc.bg, color: pc.text }}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-dimmed)', flexWrap: 'wrap' }}>
                    {task.dueDate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? '#ef4444' : undefined }}>
                        <Calendar size={12} />
                        {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isOverdue && ' (Overdue!)'}
                      </span>
                    )}
                    {task.assignedToName && (
                      <span>👤 {task.assignedToName}</span>
                    )}
                    {task.leadName && (
                      <span>🎯 {task.leadName}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {task.status !== 'completed' && (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.75rem' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Complete</option>
                    </select>
                  )}
                  <button onClick={() => openEditModal(task)} title="Edit"
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(task)} title="Delete"
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal isOpen={showModal} title={editTask ? 'Edit Task' : 'Create New Task'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter task title"
                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Task description..." rows={3}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Due Date</label>
                <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}>
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Assign To</label>
                  <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}>
                    <option value="">Unassigned</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editTask ? 'Update Task' : 'Create Task'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
