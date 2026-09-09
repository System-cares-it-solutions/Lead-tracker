import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import NotepadModal from './NotepadModal';
import CommentThread from './CommentThread';
import LeadTimeline from './LeadTimeline';
import {
  LEAD_STATUSES, LEAD_SOURCES, LEAD_PRIORITIES, LOST_REASONS,
  formatCurrency, getScoreColor, STATUS_COLORS, PRIORITY_COLORS,
} from '../../utils/leadStatuses';
import { Phone, Mail, Users, FileText, Plus, MapPin, Tag, UserCheck, MessageSquare, DollarSign, Building2, Calendar, Zap, MessageCircle, History } from 'lucide-react';
import './Notepad.css';

const inputStyle = {
  width: '100%', padding: '0.55rem 0.7rem', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: '0.85rem',
};

const labelStyle = {
  display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)',
  marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em',
};

export default function LeadDetailsModal({
  isOpen,
  onClose,
  lead,
  employees = [],
  onSave,
  onAddActivity,
}) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'deal' | 'activity'

  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', location: '', platform: '',
    status: 'New', assignedTo: '', notes: '',
    // Enterprise fields
    company: '', designation: '', dealValue: '', priority: 'Medium',
    source: 'Website', expectedCloseDate: '',
    tags: '', lostReason: '', contactMethod: '',
  });

  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [showNotepadModal, setShowNotepadModal] = useState(false);

  // Activity Tab State
  const [activityText, setActivityText] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityError, setActivityError] = useState('');

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        location: lead.location || '',
        platform: lead.platform || lead.source || '',
        status: lead.status || 'New',
        assignedTo: lead.assignedToRaw || lead.assignedTo || '',
        notes: lead.notes || '',
        // Enterprise fields
        company: lead.company || '',
        designation: lead.designation || '',
        dealValue: lead.dealValue || '',
        priority: lead.priority || 'Medium',
        source: lead.source || 'Website',
        expectedCloseDate: lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toISOString().split('T')[0] : '',
        tags: (lead.tags || []).join(', '),
        lostReason: lead.lostReason || '',
        contactMethod: lead.contactMethod || '',
      });
      setActiveTab('info');
    }
  }, [lead]);

  const cleanPhone = (phone) => (phone ? phone.replace(/[^0-9]/g, '') : '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lead) return;
    try {
      setSavingInfo(true);
      setInfoError('');

      // Find employee name if assignedTo is an ID
      const emp = employees.find((e) => e.id === formData.assignedTo || e.name === formData.assignedTo);
      const updates = {
        ...formData,
        assignedTo: emp ? emp.name : (formData.assignedTo || 'Unassigned'),
        assignedToRaw: emp ? emp.id : (formData.assignedTo || null),
        dealValue: formData.dealValue ? Number(formData.dealValue) : 0,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        expectedCloseDate: formData.expectedCloseDate || null,
      };

      await onSave(lead.id, updates);
      onClose();
    } catch (err) {
      setInfoError(err.message || 'Failed to update lead');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!lead || !activityText.trim()) return;
    try {
      setSavingActivity(true);
      setActivityError('');
      await onAddActivity(lead.id, {
        type: activityType,
        note: activityText.trim(),
        text: activityText.trim(),
      });
      setActivityText('');
    } catch (err) {
      setActivityError(err.message || 'Failed to add activity');
    } finally {
      setSavingActivity(false);
    }
  };

  if (!lead) return null;

  const activities = lead.activities || [];
  const leadScore = lead.leadScore || 0;
  const scoreColor = getScoreColor(leadScore);

  const tabBtn = (key, label, count) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        padding: '0.45rem 0.85rem', background: 'transparent', border: 'none',
        borderBottom: activeTab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
        color: activeTab === key ? 'var(--color-primary)' : 'var(--color-text-muted)',
        fontWeight: 700, cursor: 'pointer', fontSize: '0.825rem',
      }}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lead: ${lead.name || 'Details'}`}>
      {/* Header Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-md)', padding: '0.85rem 1.15rem', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {formData.name || 'Unnamed Lead'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {formData.company && (
              <span style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Building2 size={11} /> {formData.company}
              </span>
            )}
            {formData.designation && (
              <span style={{ fontSize: '0.775rem', color: 'var(--color-text-dimmed)' }}>• {formData.designation}</span>
            )}
            <span style={{
              padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)',
              background: STATUS_COLORS[formData.status]?.bg || 'rgba(100,116,139,0.12)',
              color: STATUS_COLORS[formData.status]?.text || '#64748b',
              fontSize: '0.675rem', fontWeight: 700,
            }}>{formData.status}</span>
            <span style={{
              padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)',
              background: PRIORITY_COLORS[formData.priority]?.bg || 'rgba(245,158,11,0.12)',
              color: PRIORITY_COLORS[formData.priority]?.text || '#f59e0b',
              fontSize: '0.675rem', fontWeight: 700,
            }}>{formData.priority}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {lead.dealValue > 0 && (
            <div style={{
              padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.12)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dimmed)', fontWeight: 600 }}>DEAL VALUE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(lead.dealValue)}</div>
            </div>
          )}
          <div style={{
            padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)',
            background: `${scoreColor}18`, textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dimmed)', fontWeight: 600 }}>SCORE</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: scoreColor }}>{leadScore}</div>
          </div>
          {formData.phone && formData.phone !== '—' && (
            <>
              <a href={`tel:${cleanPhone(formData.phone)}`} style={{
                padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none',
              }}><Phone size={14} /> Call</a>
              <a href={`https://wa.me/${cleanPhone(formData.phone)}`} target="_blank" rel="noopener noreferrer" style={{
                padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)',
                background: 'rgba(37, 211, 102, 0.15)', color: '#25D366',
                fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none',
              }}><MessageSquare size={14} /> WhatsApp</a>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabBtn('info', 'Contact & Details')}
        {tabBtn('deal', 'Deal & Business')}
        {tabBtn('activity', 'Activity', activities.length)}
        {tabBtn('comments', 'Discussion', lead.commentCount || undefined)}
        {tabBtn('timeline', 'Timeline')}
      </div>

      {/* ── Contact & Details Tab ── */}
      {activeTab === 'info' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {infoError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)' }}>{infoError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Lead Name</label>
              <input name="name" value={formData.name} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                {Object.values(LEAD_STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input name="location" value={formData.location} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Assigned Employee</label>
              <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} style={inputStyle}>
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.location || 'All Regions'})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange} style={inputStyle}>
                {LEAD_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Source</label>
              <select name="source" value={formData.source} onChange={handleChange} style={inputStyle}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {formData.status === 'Lost' && (
            <div>
              <label style={labelStyle}>Lost Reason</label>
              <select name="lostReason" value={formData.lostReason} onChange={handleChange} style={inputStyle}>
                <option value="">Select reason...</option>
                {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Notes</label>
              <button type="button" onClick={() => setShowNotepadModal(true)} style={{
                background: 'none', border: 'none', color: 'var(--color-primary)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              }}><FileText size={12} /> Full Notepad</button>
            </div>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Enter notes..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" loading={savingInfo}>Save Changes</Button>
          </div>
        </form>
      )}

      {/* ── Deal & Business Tab ── */}
      {activeTab === 'deal' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Company / Organization</label>
              <input name="company" value={formData.company} onChange={handleChange} placeholder="Organization name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Designation / Job Title</label>
              <input name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. CTO, VP Sales" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Deal Value (₹)</label>
              <input name="dealValue" type="number" value={formData.dealValue} onChange={handleChange} placeholder="0" min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Expected Close Date</label>
              <input name="expectedCloseDate" type="date" value={formData.expectedCloseDate} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Platform</label>
            <input name="platform" value={formData.platform} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Tags (comma separated)</label>
            <input name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g. VIP, Enterprise, Hot Lead" style={inputStyle} />
          </div>

          {/* Deal Summary Card */}
          {lead.dealValue > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--radius-md)',
              padding: '0.85rem', marginTop: '0.25rem',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-dimmed)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Deal Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-dimmed)' }}>Value: </span>
                  <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(lead.dealValue)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-dimmed)' }}>Score: </span>
                  <strong style={{ color: scoreColor }}>{leadScore}/100</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-dimmed)' }}>Stage: </span>
                  <strong>{lead.status}</strong>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" loading={savingInfo}>Save Changes</Button>
          </div>
        </form>
      )}

      {/* ── Activity Tab ── */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <form onSubmit={handleActivitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'var(--color-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileText size={14} color="var(--color-primary)" /> Log Activity
              </h4>
              <select value={activityType} onChange={(e) => setActivityType(e.target.value)} style={{
                padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 600,
              }}>
                <option value="note">📝 Note</option>
                <option value="call">📞 Call</option>
                <option value="email">✉️ Email</option>
                <option value="meeting">👥 Meeting</option>
              </select>
            </div>
            {activityError && <div style={{ color: 'var(--color-danger)', fontSize: '0.825rem' }}>{activityError}</div>}
            <textarea placeholder="Describe the interaction..." value={activityText} onChange={(e) => setActivityText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" type="submit" loading={savingActivity} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={14} /> Add Activity
              </Button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <p style={{ color: 'var(--color-text-dimmed)', textAlign: 'center', fontSize: '0.85rem' }}>No activities logged yet.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} style={{
                  padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${act.type === 'call' ? '#10b981' : act.type === 'email' ? '#6366f1' : act.type === 'meeting' ? '#f59e0b' : 'var(--color-border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.725rem', textTransform: 'uppercase', color: act.type === 'call' ? '#10b981' : act.type === 'email' ? '#6366f1' : act.type === 'meeting' ? '#f59e0b' : 'var(--color-primary)' }}>
                      {act.type} {act.authorName && act.authorName !== 'System' ? `• ${act.authorName}` : ''}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dimmed)' }}>{new Date(act.date || act.timestamp).toLocaleString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{act.note || act.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Comments / Discussion Tab ── */}
      {activeTab === 'comments' && (
        <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          <CommentThread leadId={lead.id} />
        </div>
      )}

      {/* ── Timeline Tab ── */}
      {activeTab === 'timeline' && (
        <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          <LeadTimeline leadId={lead.id} />
        </div>
      )}

      <NotepadModal
        isOpen={showNotepadModal}
        onClose={() => setShowNotepadModal(false)}
        lead={lead}
        initialNotes={formData.notes}
        onSave={async (leadId, updates) => {
          setFormData((prev) => ({ ...prev, notes: updates.notes }));
          if (onSave) {
            await onSave(leadId, updates);
          }
        }}
        onAddActivity={onAddActivity}
      />
    </Modal>
  );
}
