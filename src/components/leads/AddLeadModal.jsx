import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { LEAD_STATUSES, LEAD_SOURCES, LEAD_PRIORITIES } from '../../utils/leadStatuses';

const inputStyle = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: '0.85rem',
};

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)',
  marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em',
};

export default function AddLeadModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    platform: '',
    notes: '',
    status: LEAD_STATUSES.NEW,
    // Enterprise fields
    company: '',
    designation: '',
    dealValue: '',
    priority: 'Medium',
    source: 'Website',
    expectedCloseDate: '',
    tags: '',
    contactMethod: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const submitData = {
        ...formData,
        dealValue: formData.dealValue ? Number(formData.dealValue) : 0,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        expectedCloseDate: formData.expectedCloseDate || null,
      };

      await onSave(submitData);
      setFormData({
        name: '', email: '', phone: '', location: '', platform: '', notes: '',
        status: LEAD_STATUSES.NEW, company: '', designation: '', dealValue: '',
        priority: 'Medium', source: 'Website', expectedCloseDate: '',
        tags: '', contactMethod: '',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Lead">
      {error && (
        <div style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
        {/* Contact Section */}
        <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.65rem' }}>Contact Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input name="name" value={formData.name} onChange={handleChange} required placeholder="Full name" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={labelStyle}>Designation</label>
                <input name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. CTO, Manager" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input name="location" value={formData.location} onChange={handleChange} placeholder="City, State" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* Business Section */}
        <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.65rem' }}>Business Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div>
              <label style={labelStyle}>Company</label>
              <input name="company" value={formData.company} onChange={handleChange} placeholder="Organization name" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={labelStyle}>Deal Value (₹)</label>
                <input name="dealValue" type="number" value={formData.dealValue} onChange={handleChange} placeholder="0" min="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Expected Close Date</label>
                <input name="expectedCloseDate" type="date" value={formData.expectedCloseDate} onChange={handleChange} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Config */}
        <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.65rem' }}>Lead Configuration</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
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
              <div>
                <label style={labelStyle}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                  {Object.values(LEAD_STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={labelStyle}>Platform</label>
                <input name="platform" value={formData.platform} onChange={handleChange} placeholder="e.g. Website, LinkedIn" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tags (comma separated)</label>
                <input name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g. VIP, Enterprise" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} placeholder="Additional notes..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>Add Lead</Button>
        </div>
      </form>
    </Modal>
  );
}
