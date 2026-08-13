import { useState, useMemo } from 'react';
import Button from '../common/Button';
import { Phone, MessageSquare, Notebook, ArrowRightLeft, User, Sparkles, CheckCircle2, Trophy, XCircle, Trash2, Search, Filter, X } from 'lucide-react';
import NotepadModal from './NotepadModal';
import SwapLeadModal from './SwapLeadModal';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../utils/roles';
import './LeadsKanban.css';

const KANBAN_COLUMNS = [
  { id: 'New', label: 'New', color: '#6366f1', icon: Sparkles },
  { id: 'Contacted', label: 'Contacted', color: '#06b6d4', icon: Phone },
  { id: 'Qualified', label: 'Qualified', color: '#8b5cf6', icon: CheckCircle2 },
  { id: 'Won', label: 'Won', color: '#10b981', icon: Trophy },
  { id: 'Lost', label: 'Lost', color: '#ef4444', icon: XCircle },
  { id: 'Trash', label: 'Trash', color: '#64748b', icon: Trash2 },
];

export default function LeadsKanban({
  leads = [],
  employees = [],
  onStatusChange,
  onEditClick,
  onSwapLead,
  onUpdateLeadDetails,
  onAddActivity,
}) {
  const { user, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [activeNotepadLead, setActiveNotepadLead] = useState(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [leadToSwap, setLeadToSwap] = useState(null);

  const cleanPhone = (phone) => (phone ? phone.replace(/[^0-9]/g, '') : '');

  const handleContactAction = (lead, actionType) => {
    const leadId = lead.id || lead._id;
    if ((lead.status || 'New') === 'New') {
      if (onStatusChange) {
        onStatusChange(leadId, 'Contacted');
      }
    }
    if (onAddActivity) {
      const type = actionType === 'call' ? 'call' : 'note';
      const note =
        actionType === 'call'
          ? `Phone call attempt made to lead (${lead.phone || 'No phone'}). Status set to Contacted.`
          : `WhatsApp message attempt initiated with lead (${lead.phone || 'No phone'}). Status set to Contacted.`;
      onAddActivity(leadId, {
        type,
        note,
        text: note,
        authorName: user?.name || 'System',
      });
    }
  };

  // Extract unique platforms
  const platformOptions = useMemo(() => {
    const set = new Set();
    leads.forEach((l) => {
      if (l.platform && l.platform !== '—') set.add(l.platform);
    });
    return Array.from(set);
  }, [leads]);

  // Filter leads based on search term and platform
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          (l.name && l.name.toLowerCase().includes(term)) ||
          (l.email && l.email.toLowerCase().includes(term)) ||
          (l.phone && l.phone.toLowerCase().includes(term)) ||
          (l.location && l.location.toLowerCase().includes(term)) ||
          (l.platform && l.platform.toLowerCase().includes(term)) ||
          (l.notes && l.notes.toLowerCase().includes(term));
        if (!matches) return false;
      }

      if (platformFilter !== 'all') {
        if ((l.platform || '').toLowerCase() !== platformFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [leads, searchTerm, platformFilter]);

  const handleStatusMove = async (leadId, newStatus) => {
    if (onStatusChange) {
      await onStatusChange(leadId, newStatus);
    }
  };

  const handleSaveNotes = async (leadId, updates) => {
    if (onUpdateLeadDetails) {
      await onUpdateLeadDetails(leadId, { notes: updates.notes });
    }
  };

  return (
    <div className="kanban-board" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Kanban Toolbar with Search & Platform Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--color-surface-elevated)',
          padding: '0.85rem 1.15rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-dimmed)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="leads-table__search"
            placeholder="Search Kanban cards by name, phone, platform..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: '2.25rem',
              paddingRight: searchTerm ? '2rem' : '0.75rem',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-dimmed)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <option value="all">All Platforms</option>
            {platformOptions.map((plat) => (
              <option key={plat} value={plat}>
                {plat}
              </option>
            ))}
          </select>

          <span
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: '0.775rem',
              fontWeight: 700,
            }}
          >
            Showing {filteredLeads.length} of {leads.length} cards
          </span>
        </div>
      </div>

      {/* Kanban Grid Columns */}
      <div className="kanban-grid">
        {KANBAN_COLUMNS.map((col) => {
          const ColumnIcon = col.icon;
          const columnLeads = filteredLeads.filter(
            (l) => (l.status || 'New').toLowerCase() === col.id.toLowerCase()
          );

          return (
            <div key={col.id} className="kanban-column">
              <div className="kanban-column__header" style={{ borderTopColor: col.color }}>
                <div className="kanban-column__title">
                  <ColumnIcon size={16} style={{ color: col.color }} />
                  <span>{col.label}</span>
                </div>
                <span className="kanban-column__count">{columnLeads.length}</span>
              </div>

              <div className="kanban-column__cards">
                {columnLeads.length === 0 ? (
                  <div className="kanban-column__empty">No leads in {col.label}</div>
                ) : (
                  columnLeads.map((lead) => {
                    const assignedEmp = employees.find(
                      (e) => e.id === lead.assignedToRaw || e.name === lead.assignedTo
                    );
                    const assigneeName = assignedEmp ? assignedEmp.name : (lead.assignedTo || 'Unassigned');

                    return (
                      <div key={lead.id} className="kanban-card">
                        <div className="kanban-card__header">
                          <span className="kanban-card__platform">{lead.platform || 'General'}</span>
                          <div className="kanban-card__actions-top">
                            <select
                              value={lead.status || 'New'}
                              onChange={(e) => handleStatusMove(lead.id, e.target.value)}
                              className="kanban-card__status-select"
                            >
                              {KANBAN_COLUMNS.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Move to {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <h4
                          className="kanban-card__name"
                          onClick={() => onEditClick && onEditClick(lead)}
                          title="Click to view/edit lead details"
                        >
                          {lead.name || 'Unnamed Lead'}
                        </h4>

                        <div className="kanban-card__details">
                          {lead.phone && lead.phone !== '—' && (
                            <div className="kanban-card__detail-item">
                              <Phone size={13} />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          {lead.location && lead.location !== '—' && (
                            <div className="kanban-card__detail-item">
                              <span>📍 {lead.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Assignee Badge */}
                        <div className="kanban-card__assignee">
                          <User size={13} />
                          <span>{assigneeName}</span>
                        </div>

                        {/* Notes Preview */}
                        <div
                          className="kanban-card__notes"
                          onClick={() => setActiveNotepadLead(lead)}
                          title="Click to open Notepad"
                        >
                          <Notebook size={13} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
                          <span className="kanban-card__notes-text">
                            {lead.notes || 'Add note...'}
                          </span>
                        </div>

                        {/* Footer Controls */}
                        <div className="kanban-card__footer">
                          <div className="kanban-card__contact-btns">
                             {lead.phone && lead.phone !== '—' && (
                              <>
                                <a
                                  href={`tel:${cleanPhone(lead.phone)}`}
                                  className="kanban-btn kanban-btn--call"
                                  title="Call Lead"
                                  onClick={() => handleContactAction(lead, 'call')}
                                >
                                  <Phone size={14} />
                                </a>
                                <a
                                  href={`https://wa.me/${cleanPhone(lead.phone)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="kanban-btn kanban-btn--whatsapp"
                                  title="WhatsApp"
                                  onClick={() => handleContactAction(lead, 'whatsapp')}
                                >
                                  <MessageSquare size={14} />
                                </a>
                              </>
                            )}
                            <button
                              className="kanban-btn kanban-btn--swap"
                              onClick={() => {
                                setLeadToSwap(lead);
                                setSwapModalOpen(true);
                              }}
                              title="Swap / Reassign Lead"
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onEditClick && onEditClick(lead)}
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <NotepadModal
        isOpen={!!activeNotepadLead}
        onClose={() => setActiveNotepadLead(null)}
        lead={activeNotepadLead}
        onSave={handleSaveNotes}
        onAddActivity={onAddActivity}
      />

      <SwapLeadModal
        isOpen={swapModalOpen}
        onClose={() => {
          setSwapModalOpen(false);
          setLeadToSwap(null);
        }}
        lead={leadToSwap}
        employees={employees}
        currentUserId={user?.id}
        onSwap={onSwapLead}
      />
    </div>
  );
}
