import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../utils/roles';
import Spinner from '../components/common/Spinner';
import DateRangePicker from '../components/common/DateRangePicker';
import * as api from '../services/api';
import {
  LEAD_SOURCES, LEAD_PRIORITIES, PIPELINE_STAGES, formatCurrency,
} from '../utils/leadStatuses';
import {
  FileText, Download, Filter, Calendar, RefreshCw, Printer, BarChart3,
} from 'lucide-react';

export default function ReportsPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [sources, setSources] = useState([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const filters = {
        ...(role === ROLES.EMPLOYEE ? { assignedTo: user?.id } : {}),
        ...dateRange,
      };
      const [statsData, pipelineData, sourcesData] = await Promise.all([
        api.fetchLeadStats(filters),
        api.fetchAnalyticsPipeline(dateRange),
        api.fetchAnalyticsSources(dateRange),
      ]);
      setStats(statsData);
      setPipeline(pipelineData);
      setSources(sourcesData);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.exportLeadsCSV({
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        source: filterSource || undefined,
        assignedTo: role === ROLES.EMPLOYEE ? user?.id : undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={24} color="var(--color-primary)" /> Reports Center
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Generate, filter, and export pipeline reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={loadReportData} style={{
            padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}><RefreshCw size={14} /> Refresh</button>
          <button onClick={handlePrint} style={{
            padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}><Printer size={14} /> Print</button>
          <button onClick={handleExportCSV} style={{
            padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: 'var(--color-surface-elevated)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <Filter size={16} color="var(--color-text-dimmed)" />
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
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
      </div>

      {/* Summary Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Total Leads', value: stats.total, color: '#6366f1' },
            { label: 'Total Pipeline', value: formatCurrency(stats.totalDealValue), color: '#8b5cf6' },
            { label: 'Won Revenue', value: formatCurrency(stats.wonDealValue), color: '#10b981' },
            { label: 'Won Deals', value: stats.wonCount, color: '#f59e0b' },
            { label: 'Conversion Rate', value: `${stats.conversionRate}%`, color: '#06b6d4' },
            { label: 'Avg Deal Value', value: formatCurrency(stats.avgDealValue), color: '#ec4899' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center',
              borderTop: `3px solid ${item.color}`,
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{item.value}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-dimmed)', textTransform: 'uppercase', marginTop: '0.2rem' }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Report */}
      <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={18} color="var(--color-primary)" /> Pipeline Report
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="leads-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Lead Count</th>
                <th>Total Deal Value</th>
                <th>% of Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.filter((p) => p.count > 0).map((p) => {
                const totalCount = pipeline.reduce((sum, s) => sum + s.count, 0);
                const pct = totalCount > 0 ? ((p.count / totalCount) * 100).toFixed(1) : '0';
                const stageConfig = PIPELINE_STAGES.find((s) => s.key === p.stage);
                return (
                  <tr key={p.stage}>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: stageConfig?.color || '#6366f1', display: 'inline-block',
                        }} />
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{p.stage}</span>
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.count}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.totalValue)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--color-surface)', borderRadius: 999, overflow: 'hidden', maxWidth: 100 }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: stageConfig?.color || '#6366f1',
                            borderRadius: 999,
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Report */}
      <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#f59e0b" /> Lead Source Report
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="leads-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Total</th>
                <th>Won</th>
                <th>Lost</th>
                <th>Conversion</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source}>
                  <td style={{ fontWeight: 700 }}>{s.source}</td>
                  <td>{s.total}</td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>{s.won}</td>
                  <td style={{ color: '#ef4444' }}>{s.lost}</td>
                  <td><strong>{s.conversionRate}%</strong></td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(s.wonValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
