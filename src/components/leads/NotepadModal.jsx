import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Phone, Mail, Users, FileText, Plus, Save, X, Trash2 } from 'lucide-react';

export default function NotepadModal({ isOpen, onClose, lead, initialNotes = '', onSave, onAddActivity, onStatusChange }) {
  const [notes, setNotes] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes || (lead?.notes && lead.notes !== '—' ? lead.notes : ''));
      setActivityType('note');
    }
  }, [isOpen, initialNotes, lead]);

  const handleSaveNotes = async () => {
    if (!lead) return;
    try {
      setSaving(true);
      const noteText = notes.trim();
      if (onSave) {
        await onSave(lead.id, { notes: noteText });
      }
      if (onAddActivity && noteText) {
        await onAddActivity(lead.id, {
          type: activityType || 'note',
          note: noteText,
          text: noteText,
        });
      }
      if ((lead.status || 'New') === 'New' && onStatusChange) {
        await onStatusChange(lead.id, 'Contacted');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogActivity = async () => {
    if (!lead || !notes.trim()) return;
    try {
      setSaving(true);
      if (onAddActivity) {
        await onAddActivity(lead.id, {
          type: activityType,
          note: notes.trim(),
          text: notes.trim(),
        });
      }
      // Also update main notes if requested
      if (onSave) {
        await onSave(lead.id, { notes: notes.trim() });
      }
      if ((lead.status || 'New') === 'New' && onStatusChange) {
        await onStatusChange(lead.id, 'Contacted');
      }
      onClose();
    } catch (err) {
      console.error('Failed to log activity:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !lead) return null;

  const activities = lead.activities || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lead Notes & Activity: ${lead.name}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Quick Activity Type Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            Select Category / Activity Type
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'note', label: 'General Note', icon: FileText },
              { id: 'call', label: 'Phone Call', icon: Phone },
              { id: 'email', label: 'Email Sent', icon: Mail },
              { id: 'meeting', label: 'Meeting / Demo', icon: Users },
            ].map((type) => {
              const Icon = type.icon;
              const isSelected = activityType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setActivityType(type.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isSelected ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
                    color: isSelected ? '#fff' : 'var(--color-text)',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  }}
                >
                  <Icon size={14} /> {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Spacious Textbox */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Lead Notes & Details
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)' }}>
              {notes.length} characters
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type comprehensive lead notes, requirements, phone call discussion, or meeting details..."
            rows={7}
            autoFocus
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface-elevated)',
              color: 'var(--color-text)',
              fontSize: '0.925rem',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Activity Timeline Records if present */}
        {activities.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Activity History ({activities.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto', paddingRight: '0.3rem' }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.825rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {act.type}
                    </span>
                    <span style={{ color: 'var(--color-text-dimmed)', fontSize: '0.75rem' }}>
                      {new Date(act.date || act.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{act.note || act.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <Button
            variant="secondary"
            onClick={() => setNotes('')}
            title="Clear notes field"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Trash2 size={15} /> Clear
          </Button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="ghost" onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <X size={15} /> Cancel
            </Button>

            {activityType !== 'note' ? (
              <Button variant="primary" onClick={handleLogActivity} loading={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={15} /> Log {activityType.toUpperCase()} & Save
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSaveNotes} loading={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Save size={15} /> Save Notes
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
