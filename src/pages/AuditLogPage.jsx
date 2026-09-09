import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../utils/roles';
import Spinner from '../components/common/Spinner';
import DateRangePicker from '../components/common/DateRangePicker';
import * as api from '../services/api';
import {
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  FileText, Users, Package, Zap, Clock, Trash2,
} from 'lucide-react';

const ACTION_LABELS = {
  lead_created: { label: 'Lead Created', color: '#10b981', icon: <Zap size={14} /> },
  lead_updated: { label: 'Lead Updated', color: '#6366f1', icon: <FileText size={14} /> },
  lead_status_changed: { label: 'Status Changed', color: '#f59e0b', icon: <Zap size={14} /> },
  lead_assigned: { label: 'Lead Assigned', color: '#06b6d4', icon: <Users size={14} /> },
  lead_swapped: { label: 'Lead Swapped', color: '#8b5cf6', icon: <Users size={14} /> },
  lead_deleted: { label: 'Lead Deleted', color: '#ef4444', icon: <FileText size={14} /> },
  leads_imported: { label: 'Leads Imported', color: '#ec4899', icon: <Package size={14} /> },
  bulk_status_update: { label: 'Bulk Status Update', color: '#f97316', icon: <Zap size={14} /> },
  bulk_assign: { label: 'Bulk Assign', color: '#14b8a6', icon: <Users size={14} /> },
  bulk_delete: { label: 'Bulk Delete', color: '#ef4444', icon: <FileText size={14} /> },
  all_leads_deleted: { label: 'All Leads Deleted', color: '#ef4444', icon: <FileText size={14} /> },
  employee_created: { label: 'Employee Created', color: '#10b981', icon: <Users size={14} /> },
  employee_updated: { label: 'Employee Updated', color: '#6366f1', icon: <Users size={14} /> },
  employee_deleted: { label: 'Employee Deleted', color: '#ef4444', icon: <Users size={14} /> },
};

function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AuditLogPage() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    loadLogs();
  }, [page, filterAction, filterEntity, dateRange]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.fetchAuditLogs({
        page,
        limit: 30,
        action: filterAction || undefined,
        entityType: filterEntity || undefined,
        search: search || undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this audit log entry?')) return;
    try {
      await api.deleteAuditLog(id);
      loadLogs();
    } catch (err) {
      console.error('Failed to delete audit log entry:', err);
    }
  };

  const handleClearAllLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL audit logs? This action cannot be undone.')) return;
    try {
      await api.clearAllAuditLogs(logs);
      loadLogs();
    } catch (err) {
      console.error('Failed to clear audit logs:', err);
      alert('Failed to clear audit logs. Please ensure your backend server (node server/index.js) has been restarted.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={24} color="var(--color-primary)" /> Audit Log
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Complete history of all system actions and changes. {total > 0 && <span style={{ fontWeight: 600 }}>({total} entries)</span>}
          </p>
        </div>
        {role === ROLES.ADMIN && total > 0 && (
          <button
            onClick={handleClearAllLogs}
            style={{
              padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem',
              fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={14} /> Clear Audit Log
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--color-surface-elevated)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dimmed)' }} />
            <input
              type="text" placeholder="Search audit logs..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.4rem 0.75rem 0.4rem 2rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontSize: '0.825rem',
              }}
            />
          </div>
          <button type="submit" style={{
            padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>Search</button>
        </form>

        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={(dr) => { setDateRange(dr); setPage(1); }}
        />

        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} style={{
          padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
          background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.825rem',
        }}>
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }} style={{
          padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
          background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.825rem',
        }}>
          <option value="">All Entities</option>
          <option value="lead">Leads</option>
          <option value="user">Users</option>
          <option value="product">Products</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Logs */}
      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.length === 0 ? (
            <div style={{
              background: 'var(--color-surface-elevated)', padding: '3rem', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)', textAlign: 'center', color: 'var(--color-text-dimmed)',
            }}>
              <Shield size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.9rem' }}>No audit logs found matching your filters.</p>
            </div>
          ) : (
            logs.map((log) => {
              const actionConfig = ACTION_LABELS[log.action] || { label: log.action, color: '#64748b', icon: <FileText size={14} /> };
              return (
                <div key={log.id || log._id} style={{
                  background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: '0.85rem 1.15rem',
                  borderLeft: `3px solid ${actionConfig.color}`,
                  display: 'flex', alignItems: 'flex-start', gap: '0.85rem',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-elevated)'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                    background: `${actionConfig.color}18`, color: actionConfig.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                  }}>
                    {actionConfig.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)',
                        background: `${actionConfig.color}18`, color: actionConfig.color,
                        fontSize: '0.7rem', fontWeight: 700,
                      }}>{actionConfig.label}</span>
                      {log.entityName && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                          {log.entityName}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      {log.description}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.725rem', color: 'var(--color-text-dimmed)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Users size={11} /> {log.userName || 'System'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={11} /> {formatTimeAgo(log.createdAt)}
                      </span>
                    </div>
                  </div>
                  {role === ROLES.ADMIN && (
                    <button
                      onClick={() => handleDeleteLog(log.id || log._id)}
                      title="Delete log entry"
                      style={{
                        padding: '0.35rem', borderRadius: 'var(--radius-sm)', border: 'none',
                        background: 'transparent', color: 'var(--color-text-dimmed)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'color 0.15s ease, background 0.15s ease',
                        alignSelf: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-dimmed)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: page <= 1 ? 'var(--color-text-dimmed)' : 'var(--color-text)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            }}
          ><ChevronLeft size={14} /> Prev</button>
          <span style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: page >= totalPages ? 'var(--color-text-dimmed)' : 'var(--color-text)',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            }}
          >Next <ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
