import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as api from '../services/api';
import Spinner from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import {
  Tag, Plus, Trash2, Edit3, Search, Palette,
  BarChart3, TrendingUp, Hash,
} from 'lucide-react';

const TAG_CATEGORIES = [
  { key: 'industry', label: 'Industry', color: '#6366f1' },
  { key: 'source', label: 'Source', color: '#06b6d4' },
  { key: 'priority', label: 'Priority', color: '#f59e0b' },
  { key: 'region', label: 'Region', color: '#10b981' },
  { key: 'product', label: 'Product', color: '#ec4899' },
  { key: 'custom', label: 'Custom', color: '#8b5cf6' },
];

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#64748b',
  '#059669', '#d946ef', '#0891b2', '#7c3aed', '#be123c',
];

export default function TagManagerPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tags, setTags] = useState([]);
  const [tagStats, setTagStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTag, setEditTag] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'stats'

  const [form, setForm] = useState({
    name: '', color: '#6366f1', category: 'custom', description: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tagsData, statsData] = await Promise.all([
        api.fetchTags({ category: filterCategory, search }),
        api.fetchTagStats(),
      ]);
      setTags(tagsData);
      setTagStats(statsData);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterCategory]);

  const openCreateModal = () => {
    setEditTag(null);
    setForm({ name: '', color: '#6366f1', category: 'custom', description: '' });
    setShowModal(true);
  };

  const openEditModal = (tag) => {
    setEditTag(tag);
    setForm({ name: tag.name, color: tag.color, category: tag.category, description: tag.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Tag name is required', 'error');
      return;
    }
    try {
      if (editTag) {
        await api.updateTag(editTag.id, form);
        showToast('Tag updated successfully', 'success');
      } else {
        await api.addTag({ ...form, createdBy: user?.id });
        showToast('Tag created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save tag', 'error');
    }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all leads.`)) return;
    try {
      await api.deleteTag(tag.id);
      showToast('Tag deleted', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredTags = tags.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const cardStyle = {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    padding: '1.25rem',
  };

  if (loading && tags.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <Tag size={24} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-primary)' }} />
            Tag Manager
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage tags for organizing and categorizing leads
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant={viewMode === 'grid' ? 'primary' : 'ghost'} onClick={() => setViewMode('grid')}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <Hash size={14} style={{ marginRight: '0.25rem' }} /> Tags
          </Button>
          <Button variant={viewMode === 'stats' ? 'primary' : 'ghost'} onClick={() => setViewMode('stats')}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <BarChart3 size={14} style={{ marginRight: '0.25rem' }} /> Analytics
          </Button>
          <Button onClick={openCreateModal}>
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> New Tag
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {TAG_CATEGORIES.map((cat) => {
          const count = tags.filter((t) => t.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(filterCategory === cat.key ? '' : cat.key)}
              style={{
                ...cardStyle,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                minWidth: '140px', flex: '1 1 140px',
                borderColor: filterCategory === cat.key ? cat.color : 'var(--color-border)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{count}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{cat.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ ...cardStyle, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dimmed)' }} />
          <input
            type="text"
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Tags Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {filteredTags.length === 0 ? (
            <div style={{ ...cardStyle, gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <Tag size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No tags found</p>
            </div>
          ) : (
            filteredTags.map((tag) => {
              const cat = TAG_CATEGORIES.find((c) => c.key === tag.category) || TAG_CATEGORIES[5];
              return (
                <div key={tag.id} style={{ ...cardStyle, position: 'relative', borderTop: `3px solid ${tag.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `${tag.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Hash size={16} color={tag.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tag.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dimmed)' }}>{cat.label}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => openEditModal(tag)} style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(tag)} style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {tag.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{tag.description}</p>
                  )}
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-dimmed)' }}>
                    <span>📊 {tag.usageCount || 0} leads</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Stats View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ ...cardStyle }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Tag Performance Analytics</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Tag</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Leads</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Won</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Conversion</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Deal Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tagStats.map((ts) => (
                    <tr key={ts.id || ts.name} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ts.color }} />
                          <span style={{ fontWeight: 600 }}>{ts.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>{ts.usageCount}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem', color: '#10b981' }}>{ts.wonCount}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: Number(ts.conversionRate) >= 30 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: Number(ts.conversionRate) >= 30 ? '#10b981' : '#f59e0b' }}>
                          {ts.conversionRate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>
                        ₹{(ts.totalDealValue || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal isOpen={showModal} title={editTag ? 'Edit Tag' : 'Create New Tag'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Tag Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter tag name"
                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.85rem' }}>
                {TAG_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--color-text-muted)' }}>
                <Palette size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Color
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--color-text)' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--color-text-muted)' }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." rows={2}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }} />
            </div>

            {/* Preview */}
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)' }}>Preview</span>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
                  background: `${form.color}20`, color: form.color,
                  fontSize: '0.8rem', fontWeight: 600,
                }}>
                  <Hash size={12} /> {form.name || 'tag-name'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editTag ? 'Update Tag' : 'Create Tag'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
