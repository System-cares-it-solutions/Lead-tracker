import { useState, useMemo, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { useEmployees } from '../hooks/useEmployees';
import LeadsTable from '../components/leads/LeadsTable';
import LeadsKanban from '../components/leads/LeadsKanban';
import LeadDetailsModal from '../components/leads/LeadDetailsModal';
import AddLeadModal from '../components/leads/AddLeadModal';
import Button from '../components/common/Button';
import { ROLES } from '../utils/roles';
import { LEAD_SOURCES, LEAD_PRIORITIES, PIPELINE_STAGES, formatCurrency } from '../utils/leadStatuses';
import * as api from '../services/api';
import {
  Plus, LayoutGrid, Table, Sparkles, AlertTriangle, Trophy,
  Filter, Trash2, Search, Download, ChevronDown, CheckSquare,
  XCircle, UserCheck, BarChart3, Copy, ArrowRight,
} from 'lucide-react';

export default function LeadsPage() {
  const { user, role } = useAuth();
  const { leads, loading, updateStatus, assignLead, swapLead, updateLeadDetails, deleteLead, deleteAllLeads, addLead, addLeadActivity, refreshLeads } = useLeads();
  const { employees } = useEmployees();

  const isAdmin = role === ROLES.ADMIN;

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [activeChip, setActiveChip] = useState('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [leadToView, setLeadToView] = useState(null);
  const [duplicatesCount, setDuplicatesCount] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      api.fetchDuplicateLeads()
        .then((d) => setDuplicatesCount(d?.totalDuplicates || 0))
        .catch(() => {});
    }
  }, [isAdmin, leads.length]);

  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk Selection
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const filteredLeads = useMemo(() => {
    let result = leads;

    // Chip filters
    if (activeChip === 'dueToday') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      result = result.filter((l) => {
        if (!l.followUpDate) return false;
        const fDate = new Date(l.followUpDate);
        fDate.setHours(0, 0, 0, 0);
        return fDate.getTime() === now.getTime();
      });
    } else if (activeChip === 'urgent') {
      result = result.filter((l) => {
        if (!l.createdAt || l.status === 'Trash' || l.status === 'Won' || l.status === 'Lost') return false;
        const elapsedHours = (Date.now() - new Date(l.createdAt).getTime()) / (60 * 60 * 1000);
        return 24 - elapsedHours <= 6;
      });
    } else if (activeChip === 'won') {
      result = result.filter((l) => (l.status || '').toLowerCase() === 'won');
    } else if (activeChip === 'trash') {
      result = result.filter((l) => (l.status || '').toLowerCase() === 'trash');
    } else if (activeChip === 'critical') {
      result = result.filter((l) => l.priority === 'Critical' && !['Won', 'Lost', 'Trash'].includes(l.status));
    } else if (activeChip === 'highValue') {
      result = result.filter((l) => (l.dealValue || 0) > 0).sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0));
    }

    // Advanced filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((l) =>
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.phone && l.phone.toLowerCase().includes(term)) ||
        (l.company && l.company.toLowerCase().includes(term)) ||
        (l.location && l.location.toLowerCase().includes(term)) ||
        (l.notes && l.notes.toLowerCase().includes(term))
      );
    }
    if (filterPriority) {
      result = result.filter((l) => l.priority === filterPriority);
    }
    if (filterSource) {
      result = result.filter((l) => l.source === filterSource);
    }
    if (filterStatus) {
      result = result.filter((l) => l.status === filterStatus);
    }

    return result;
  }, [leads, activeChip, searchTerm, filterPriority, filterSource, filterStatus]);

  const handleViewClick = (lead) => {
    setLeadToView(lead);
    setDetailsModalOpen(true);
  };

  const handleDeleteClick = async (leadOrId) => {
    const id = typeof leadOrId === 'object' && leadOrId !== null ? leadOrId.id : leadOrId;
    try {
      await deleteLead(id);
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const handleDeleteAllClick = async () => {
    if (window.confirm('Are you ABSOLUTELY sure you want to delete ALL leads? This cannot be undone.')) {
      try {
        await deleteAllLeads();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleSelectLead = (leadId) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedLeads.size) return;
    try {
      await api.bulkUpdateLeadStatus(
        Array.from(selectedLeads), status, user?.id, user?.name, role
      );
      setSelectedLeads(new Set());
      refreshLeads();
    } catch (err) {
      console.error('Bulk status update failed:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedLeads.size) return;
    if (!window.confirm(`Delete ${selectedLeads.size} selected lead(s)? This cannot be undone.`)) return;
    try {
      await api.bulkDeleteLeads(
        Array.from(selectedLeads), user?.id, user?.name, role
      );
      setSelectedLeads(new Set());
      refreshLeads();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.exportLeadsCSV({
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        source: filterSource || undefined,
        assignedTo: role === ROLES.EMPLOYEE ? user?.id : undefined,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterPriority('');
    setFilterSource('');
    setFilterStatus('');
    setActiveChip('all');
  };

  const hasActiveFilters = searchTerm || filterPriority || filterSource || filterStatus;

  const chipStyle = (chipName, bgActive, colorActive) => ({
    padding: '0.4rem 0.85rem', borderRadius: '999px', border: '1px solid var(--color-border)',
    background: activeChip === chipName ? bgActive : 'var(--color-surface)',
    color: activeChip === chipName ? colorActive : 'var(--color-text-muted)',
    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {role === ROLES.EMPLOYEE ? 'My Leads Pipeline' : 'Master Leads Management'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dimmed)' }}>
            Track, update, and manage incoming leads in real-time.
            {leads.length > 0 && (
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {' '}• {leads.length} total • Pipeline: {formatCurrency(leads.reduce((s, l) => s + (l.dealValue || 0), 0))}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dimmed)' }} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontSize: '0.825rem', width: 200,
              }}
            />
          </div>

          {/* Filter Toggle */}
          <button onClick={() => setShowFilters(!showFilters)} style={{
            padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: showFilters ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: showFilters ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <Filter size={14} /> Filters
            {hasActiveFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />}
          </button>

          {/* Export */}
          <button onClick={handleExportCSV} style={{
            padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <Download size={14} /> Export
          </button>

          {/* View Mode Toggle */}
          <div style={{
            display: 'inline-flex', background: 'var(--color-surface-elevated)',
            padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
          }}>
            <button onClick={() => setViewMode('table')} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'table' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer',
            }}><Table size={15} /> Table</button>
            <button onClick={() => setViewMode('kanban')} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: viewMode === 'kanban' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'kanban' ? '#ffffff' : 'var(--color-text-muted)',
              fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer',
            }}><LayoutGrid size={15} /> Kanban</button>
          </div>

          <Button variant="primary" onClick={() => setAddModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Add Lead
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div style={{
          background: 'var(--color-surface-elevated)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          animation: 'fadeIn 0.2s ease',
        }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{
            padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.825rem',
          }}>
            <option value="">All Statuses</option>
            {PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{
            padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.825rem',
          }}>
            <option value="">All Priorities</option>
            {LEAD_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>

          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={{
            padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.825rem',
          }}>
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={{
              padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            }}>
              <XCircle size={13} /> Clear Filters
            </button>
          )}

          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dimmed)', marginLeft: 'auto' }}>
            Showing {filteredLeads.length} of {leads.length} leads
          </span>
        </div>
      )}

      {/* Duplicate Leads Banner */}
      {isAdmin && duplicatesCount > 0 && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Copy size={18} color="#f59e0b" />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600 }}>
              {duplicatesCount} potential duplicate lead(s) detected across the system.
            </span>
          </div>
          <NavLink
            to="/duplicates"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: '#f59e0b',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.75rem',
              textDecoration: 'none',
            }}
          >
            Review & Merge <ArrowRight size={13} />
          </NavLink>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveChip('all')} style={chipStyle('all', 'var(--color-primary-light)', 'var(--color-primary)')}>
          <Filter size={13} /> All ({leads.length})
        </button>
        <button onClick={() => setActiveChip('critical')} style={chipStyle('critical', 'rgba(239, 68, 68, 0.15)', '#ef4444')}>
          <AlertTriangle size={13} /> Critical ({leads.filter((l) => l.priority === 'Critical' && !['Won', 'Lost', 'Trash'].includes(l.status)).length})
        </button>
        <button onClick={() => setActiveChip('highValue')} style={chipStyle('highValue', 'rgba(139, 92, 246, 0.15)', '#8b5cf6')}>
          <BarChart3 size={13} /> High Value
        </button>
        <button onClick={() => setActiveChip('dueToday')} style={chipStyle('dueToday', 'rgba(6, 182, 212, 0.15)', 'var(--color-info)')}>
          <Sparkles size={13} /> Due Follow-ups
        </button>
        <button onClick={() => setActiveChip('urgent')} style={chipStyle('urgent', 'rgba(244, 63, 94, 0.15)', 'var(--color-danger)')}>
          <AlertTriangle size={13} /> Urgent Aging
        </button>
        <button onClick={() => setActiveChip('won')} style={chipStyle('won', 'rgba(16, 185, 129, 0.15)', 'var(--color-success)')}>
          <Trophy size={13} /> Won Deals
        </button>
        <button onClick={() => setActiveChip('trash')} style={chipStyle('trash', 'rgba(100, 116, 139, 0.15)', '#64748b')}>
          <Trash2 size={13} /> Trash ({leads.filter((l) => (l.status || '').toLowerCase() === 'trash').length})
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeads.size > 0 && (
        <div style={{
          background: 'var(--color-primary-light)', border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)' }}>
            <CheckSquare size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {selectedLeads.size} selected
          </span>
          <div style={{ height: 20, width: 1, background: 'rgba(99, 102, 241, 0.3)' }} />
          <button onClick={() => handleBulkStatusUpdate('Contacted')} style={{
            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4',
            fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer',
          }}>→ Contacted</button>
          <button onClick={() => handleBulkStatusUpdate('Qualified')} style={{
            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7',
            fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer',
          }}>→ Qualified</button>
          <button onClick={() => handleBulkStatusUpdate('Won')} style={{
            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
            fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer',
          }}>→ Won</button>
          <button onClick={() => handleBulkStatusUpdate('Trash')} style={{
            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'rgba(100, 116, 139, 0.15)', color: '#64748b',
            fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer',
          }}>→ Trash</button>
          <button onClick={handleBulkDelete} style={{
            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
            fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer',
          }}><Trash2 size={12} style={{ verticalAlign: 'middle' }} /> Delete</button>
          <button onClick={() => setSelectedLeads(new Set())} style={{
            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'transparent', color: 'var(--color-text-dimmed)',
            fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto',
          }}>Clear Selection</button>
        </div>
      )}

      {/* Main View rendering */}
      {viewMode === 'table' ? (
        <LeadsTable
          leads={filteredLeads}
          loading={loading}
          employees={employees}
          currentUserRole={role}
          hideImportExcel={true}
          onStatusChange={updateStatus}
          onAssignLead={assignLead}
          onSwapLead={swapLead}
          onEditClick={handleViewClick}
          onUpdateLeadDetails={updateLeadDetails}
          onAddActivity={addLeadActivity}
          onDeleteClick={handleDeleteClick}
          onDeleteAllClick={handleDeleteAllClick}
          selectedLeads={selectedLeads}
          onToggleSelect={toggleSelectLead}
          onToggleSelectAll={toggleSelectAll}
        />
      ) : (
        <LeadsKanban
          leads={filteredLeads}
          employees={employees}
          onStatusChange={updateStatus}
          onEditClick={handleViewClick}
          onSwapLead={swapLead}
          onUpdateLeadDetails={updateLeadDetails}
          onAddActivity={addLeadActivity}
        />
      )}

      <LeadDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setLeadToView(null);
        }}
        lead={leadToView}
        employees={employees}
        onSave={updateLeadDetails}
        onAddActivity={addLeadActivity}
      />

      <AddLeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={addLead}
      />
    </div>
  );
}
