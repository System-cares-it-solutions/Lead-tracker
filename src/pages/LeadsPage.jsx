import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { useEmployees } from '../hooks/useEmployees';
import LeadsTable from '../components/leads/LeadsTable';
import LeadsKanban from '../components/leads/LeadsKanban';
import LeadDetailsModal from '../components/leads/LeadDetailsModal';
import AddLeadModal from '../components/leads/AddLeadModal';
import Button from '../components/common/Button';
import { ROLES } from '../utils/roles';
import { Plus, LayoutGrid, Table, Sparkles, AlertTriangle, Trophy, Filter, Trash2 } from 'lucide-react';

export default function LeadsPage() {
  const { role } = useAuth();
  const { leads, loading, updateStatus, assignLead, swapLead, updateLeadDetails, deleteLead, deleteAllLeads, addLead, addLeadActivity } = useLeads();
  const { employees } = useEmployees();

  const isAdmin = role === ROLES.ADMIN;

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [activeChip, setActiveChip] = useState('all'); // 'all' | 'dueToday' | 'urgent' | 'won' | 'trash'
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [leadToView, setLeadToView] = useState(null);

  const filteredLeads = useMemo(() => {
    if (activeChip === 'all') return leads;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (activeChip === 'dueToday') {
      return leads.filter((l) => {
        if (!l.followUpDate) return false;
        const fDate = new Date(l.followUpDate);
        fDate.setHours(0, 0, 0, 0);
        return fDate.getTime() === now.getTime();
      });
    }

    if (activeChip === 'urgent') {
      return leads.filter((l) => {
        if (!l.createdAt || l.status === 'Trash' || l.status === 'Won' || l.status === 'Lost') return false;
        const elapsedHours = (Date.now() - new Date(l.createdAt).getTime()) / (60 * 60 * 1000);
        return 24 - elapsedHours <= 6;
      });
    }

    if (activeChip === 'won') {
      return leads.filter((l) => (l.status || '').toLowerCase() === 'won');
    }

    if (activeChip === 'trash') {
      return leads.filter((l) => (l.status || '').toLowerCase() === 'trash');
    }

    return leads;
  }, [leads, activeChip]);

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

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--color-text)',
            }}
          >
            {role === ROLES.EMPLOYEE ? 'My Leads Pipeline' : 'Master Leads Management'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dimmed)' }}>
            Track, update, and manage incoming leads in real-time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--color-surface-elevated)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--color-text-muted)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Table size={15} /> Table View
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'kanban' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'kanban' ? '#ffffff' : 'var(--color-text-muted)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <LayoutGrid size={15} /> Kanban Board
            </button>
          </div>

          <Button variant="primary" onClick={() => setAddModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Add Lead
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveChip('all')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid var(--color-border)',
            background: activeChip === 'all' ? 'var(--color-primary-light)' : 'var(--color-surface)',
            color: activeChip === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Filter size={13} /> All ({leads.length})
        </button>

        <button
          onClick={() => setActiveChip('dueToday')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid var(--color-border)',
            background: activeChip === 'dueToday' ? 'rgba(6, 182, 212, 0.15)' : 'var(--color-surface)',
            color: activeChip === 'dueToday' ? 'var(--color-info)' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Sparkles size={13} /> Due Follow-ups
        </button>

        <button
          onClick={() => setActiveChip('urgent')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid var(--color-border)',
            background: activeChip === 'urgent' ? 'rgba(244, 63, 94, 0.15)' : 'var(--color-surface)',
            color: activeChip === 'urgent' ? 'var(--color-danger)' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <AlertTriangle size={13} /> Urgent Aging
        </button>

        <button
          onClick={() => setActiveChip('won')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid var(--color-border)',
            background: activeChip === 'won' ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface)',
            color: activeChip === 'won' ? 'var(--color-success)' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Trophy size={13} /> Won Deals
        </button>

        <button
          onClick={() => setActiveChip('trash')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid var(--color-border)',
            background: activeChip === 'trash' ? 'rgba(100, 116, 139, 0.15)' : 'var(--color-surface)',
            color: activeChip === 'trash' ? '#64748b' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Trash2 size={13} /> Trash ({leads.filter((l) => (l.status || '').toLowerCase() === 'trash').length})
        </button>
      </div>

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
