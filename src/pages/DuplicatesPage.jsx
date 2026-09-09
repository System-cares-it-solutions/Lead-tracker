import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, STATUS_COLORS, PRIORITY_COLORS } from '../utils/leadStatuses';
import * as api from '../services/api';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import {
  Copy, GitMerge, AlertTriangle, Search, Users, Mail,
  Phone, Building2, RefreshCw, CheckCircle2, Eye,
} from 'lucide-react';

export default function DuplicatesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selectedPrimary, setSelectedPrimary] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.fetchDuplicateLeads();
      setData(result);
    } catch (err) {
      console.error('Failed to load duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleMerge = async (group, primaryId) => {
    if (!primaryId) {
      showToast('Please select a primary lead to keep', 'error');
      return;
    }

    const mergeIds = group.leads
      .map((l) => l.id)
      .filter((id) => id !== primaryId);

    if (!window.confirm(`Merge ${mergeIds.length} lead(s) into the primary lead? The duplicate(s) will be deleted.`)) return;

    setMerging(true);
    try {
      await api.mergeLeads(primaryId, mergeIds, user?.id, user?.name);
      showToast(`Successfully merged ${mergeIds.length} duplicate(s)`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Merge failed', 'error');
    } finally {
      setMerging(false);
    }
  };

  const cardStyle = {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    padding: '1.25rem',
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <Copy size={24} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-warning)' }} />
            Duplicate Detection
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Identify and merge duplicate leads to keep your CRM clean
          </p>
        </div>
        <Button variant="ghost" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Rescan
        </Button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ ...cardStyle, flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Copy size={22} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{data?.totalGroups || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Duplicate Groups</div>
          </div>
        </div>
        <div style={{ ...cardStyle, flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{data?.totalDuplicates || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Duplicates</div>
          </div>
        </div>
        <div style={{ ...cardStyle, flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (data?.totalGroups || 0) === 0 ? '#10b981' : undefined }}>
              {(data?.totalGroups || 0) === 0 ? 'Clean' : 'Action Needed'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Database Status</div>
          </div>
        </div>
      </div>

      {/* Duplicate Groups */}
      {(!data?.groups || data.groups.length === 0) ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
          <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No Duplicates Found</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Your lead database is clean. No duplicate leads were detected.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.groups.map((group, idx) => {
            const isExpanded = expandedGroup === idx;
            const primary = selectedPrimary[idx] || group.leads[0]?.id;

            return (
              <div key={idx} style={{ ...cardStyle, borderLeft: '3px solid #f59e0b' }}>
                {/* Group Header */}
                <div
                  onClick={() => setExpandedGroup(isExpanded ? null : idx)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isExpanded ? '1rem' : 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} color="#f59e0b" />
                    </div>
                    <div>
                      <span style={{ fontWeight: 700 }}>
                        {group.count} Duplicate Leads
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Match type: {group.matchType}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Button
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleMerge(group, primary); }}
                      disabled={merging}
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <GitMerge size={14} /> Merge
                    </Button>
                    <Eye size={16} color="var(--color-text-dimmed)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>

                {/* Expanded Leads */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)', marginBottom: '0.25rem' }}>
                      Select the primary lead to keep (others will be merged into it):
                    </div>
                    {group.leads.map((lead) => {
                      const isPrimary = primary === lead.id;
                      const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.New;
                      const pc = PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.Medium;

                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedPrimary({ ...selectedPrimary, [idx]: lead.id })}
                          style={{
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${isPrimary ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: isPrimary ? 'var(--color-primary-light)' : 'var(--color-surface-elevated)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isPrimary && (
                                <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.6rem', fontWeight: 800, background: 'var(--color-primary)', color: '#fff', textTransform: 'uppercase' }}>
                                  Primary
                                </span>
                              )}
                              <span style={{ fontWeight: 700 }}>{lead.name}</span>
                              <span style={{ padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 600, background: sc.bg, color: sc.text }}>
                                {lead.status}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)' }}>{lead.id}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Mail size={12} /> {lead.email || '—'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={12} /> {lead.phone || '—'}
                            </span>
                            {lead.company && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Building2 size={12} /> {lead.company}
                              </span>
                            )}
                            {lead.dealValue > 0 && (
                              <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                                {formatCurrency(lead.dealValue)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
