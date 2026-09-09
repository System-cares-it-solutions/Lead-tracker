import { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { useEmployees } from '../hooks/useEmployees';
import { ROLES } from '../utils/roles';
import { formatCurrency, STATUS_COLORS, PRIORITY_COLORS, getScoreColor, PIPELINE_STAGES } from '../utils/leadStatuses';
import Spinner from '../components/common/Spinner';
import GoalTracker from '../components/common/GoalTracker';
import * as api from '../services/api';
import {
  Users, Sparkles, CheckCircle2, Trophy, XCircle, TrendingUp,
  Target, Phone, MessageSquare, Award, Clock, ArrowUpRight,
  DollarSign, Zap, BarChart3, Activity, Briefcase, CheckSquare,
  Tag, Copy, Gauge,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { leads, loading, error, updateStatus } = useLeads();
  const { employees } = useEmployees();
  const [forecast, setForecast] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [recentAudit, setRecentAudit] = useState([]);

  const isAdmin = role === ROLES.ADMIN;

  useEffect(() => {
    if (isAdmin) {
      api.fetchAnalyticsForecast().then(setForecast).catch(() => {});
      api.fetchAnalyticsVelocity().then(setVelocity).catch(() => {});
      api.fetchAuditLogs({ limit: 8 }).then((d) => setRecentAudit(d.logs || [])).catch(() => {});
    }
  }, [isAdmin]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === 'New').length;
    const qualified = leads.filter((l) => l.status === 'Qualified').length;
    const won = leads.filter((l) => l.status === 'Won').length;
    const lost = leads.filter((l) => l.status === 'Lost').length;
    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0';
    const totalDealValue = leads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const wonDealValue = leads.filter((l) => l.status === 'Won').reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const avgDealValue = won > 0 ? Math.round(wonDealValue / won) : 0;
    const criticalLeads = leads.filter((l) => l.priority === 'Critical' && !['Won', 'Lost', 'Trash'].includes(l.status)).length;
    return { total, newCount, qualified, won, lost, conversionRate, totalDealValue, wonDealValue, avgDealValue, criticalLeads };
  }, [leads]);

  const followUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const TWENTY_THREE_HOURS_MS = 23 * 60 * 60 * 1000;
    const now = Date.now();

    return leads.filter((l) => {
      if (l.status === 'Won' || l.status === 'Lost' || l.status === 'Trash') return false;

      // Check if lead is in New status for 24+ hours
      const isNew24h = (l.status || 'New') === 'New' && l.createdAt && (now - new Date(l.createdAt).getTime()) >= TWENTY_FOUR_HOURS_MS;

      // Check if scheduled followUpDate is today or earlier
      const isScheduledDue = l.followUpDate && new Date(l.followUpDate) < tomorrow;

      // Check if lead is 23+ hrs old
      const isExpiringSoon = l.createdAt && (now - new Date(l.createdAt).getTime()) >= TWENTY_THREE_HOURS_MS;

      return isNew24h || isScheduledDue || isExpiringSoon;
    });
  }, [leads]);

  /* Leaderboard for Admin */
  const leaderboard = useMemo(() => {
    if (!isAdmin || !employees.length) return [];
    return employees
      .map((emp) => {
        const empLeads = leads.filter(
          (l) => l.assignedToRaw === emp.id || l.assignedTo === emp.name
        );
        const wonCount = empLeads.filter((l) => l.status === 'Won').length;
        const totalCount = empLeads.length;
        const wonValue = empLeads.filter((l) => l.status === 'Won').reduce((s, l) => s + (l.dealValue || 0), 0);
        const convRate = totalCount > 0 ? ((wonCount / totalCount) * 100).toFixed(0) : '0';
        return {
          id: emp.id,
          name: emp.name,
          totalLeads: totalCount,
          wonLeads: wonCount,
          wonValue,
          conversionRate: convRate,
        };
      })
      .sort((a, b) => b.wonValue - a.wonValue || b.wonLeads - a.wonLeads);
  }, [isAdmin, employees, leads]);

  /* Top Deals */
  const topDeals = useMemo(() => {
    return leads
      .filter((l) => (l.dealValue || 0) > 0 && !['Won', 'Lost', 'Trash'].includes(l.status))
      .sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0))
      .slice(0, 5);
  }, [leads]);

  /* Analytics Data */
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const platformData = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      const plat = l.source || l.platform || 'Unknown';
      counts[plat] = (counts[plat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const statusData = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      const st = l.status || 'New';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const priorityData = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      const pr = l.priority || 'Medium';
      counts[pr] = (counts[pr] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const cleanPhone = (p) => (p ? p.replace(/[^0-9]/g, '') : '');

  if (loading) return <Spinner />;

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Welcome Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)' }}>
            Welcome back, {user?.name || 'User'} 👋
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {isAdmin
              ? "Here is your team's lead pipeline and performance snapshot today."
              : "Here are your active assigned leads, performance target, and action items."}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dimmed)', fontWeight: 600, textTransform: 'uppercase' }}>Pipeline Value</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(stats.totalDealValue)}</div>
          </div>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dimmed)', fontWeight: 600, textTransform: 'uppercase' }}>Conversion Rate</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-success)' }}>{stats.conversionRate}%</div>
          </div>
        </div>
      </div>

      {/* ── Goal Tracking ── */}
      <GoalTracker userId={isAdmin ? null : user?.id} />

      {/* ── Quick Actions ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <NavLink
          to="/tasks"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
        >
          <CheckSquare size={15} color="var(--color-primary)" /> Tasks
        </NavLink>

        <NavLink
          to="/leads"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
        >
          <Users size={15} color="#06b6d4" /> Pipeline
        </NavLink>

        {isAdmin && (
          <>
            <NavLink
              to="/duplicates"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              <Copy size={15} color="#f59e0b" /> Detect Duplicates
            </NavLink>

            <NavLink
              to="/tags"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              <Tag size={15} color="#ec4899" /> Tag Manager
            </NavLink>
          </>
        )}
      </div>

      {/* ── Stats Grid ── */}
      <div className="dashboard__stats">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--total"><Users size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.total}</span>
            <span className="stat-card__label">{isAdmin ? 'Total System Leads' : 'My Assigned Leads'}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--new"><Sparkles size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.newCount}</span>
            <span className="stat-card__label">New Opportunities</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}><DollarSign size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{formatCurrency(stats.wonDealValue)}</span>
            <span className="stat-card__label">Won Revenue</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}><Trophy size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.won}</span>
            <span className="stat-card__label">Deals Won</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}><Zap size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.criticalLeads}</span>
            <span className="stat-card__label">Critical Priority</span>
          </div>
        </div>
        {velocity && (
          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}><Gauge size={22} /></div>
            <div className="stat-card__info">
              <span className="stat-card__value">{velocity.avgVelocityDays || 0}d</span>
              <span className="stat-card__label">Avg Close Velocity</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ── Employee Goal Target Progress ── */}
      {!isAdmin && (
        <div style={{
          background: 'var(--color-surface-elevated)', padding: '1.5rem',
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>Monthly Conversion Target</h3>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              {stats.won} / 10 Deals Achieved
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'var(--color-surface)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{
              width: `${Math.min((stats.won / 10) * 100, 100)}%`, height: '100%',
              background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
              borderRadius: '999px', transition: 'width 0.5s ease',
            }} />
          </div>
          {stats.wonDealValue > 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Revenue generated: <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(stats.wonDealValue)}</strong>
              {stats.avgDealValue > 0 && <span> • Avg deal: <strong>{formatCurrency(stats.avgDealValue)}</strong></span>}
            </div>
          )}
        </div>
      )}

      {/* ── Top Deals in Pipeline ── */}
      {topDeals.length > 0 && (
        <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} color="#8b5cf6" /> Top Deals in Pipeline
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dimmed)' }}>Highest value active opportunities</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {topDeals.map((deal) => (
              <div key={deal.id} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '1rem',
                borderLeft: `3px solid ${PRIORITY_COLORS[deal.priority]?.text || '#f59e0b'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{deal.name}</div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(deal.dealValue)}</span>
                </div>
                {deal.company && <div style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>{deal.company}</div>}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)',
                    background: STATUS_COLORS[deal.status]?.bg || 'rgba(100,116,139,0.12)',
                    color: STATUS_COLORS[deal.status]?.text || '#64748b',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>{deal.status}</span>
                  <span style={{
                    padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)',
                    background: PRIORITY_COLORS[deal.priority]?.bg || 'rgba(245,158,11,0.12)',
                    color: PRIORITY_COLORS[deal.priority]?.text || '#f59e0b',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>{deal.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Due Follow-ups Action List ── */}
      <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="var(--color-warning)" /> Immediate Action Needed ({followUps.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dimmed)' }}>Leads requiring follow-up action</span>
        </div>

        {followUps.length === 0 ? (
          <p style={{ color: 'var(--color-text-dimmed)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            🎉 Great job! No pending follow-ups due today.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {followUps.slice(0, 6).map((l) => (
              <div
                key={l.id}
                style={{
                  background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${PRIORITY_COLORS[l.priority]?.text || 'var(--color-warning)'}`,
                  display: 'flex', flexDirection: 'column', gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>{l.name}</h4>
                    <span style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
                      📍 {l.location || 'Unknown'}
                      {l.company && ` • ${l.company}`}
                    </span>
                  </div>
                  {l.dealValue > 0 && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatCurrency(l.dealValue)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {l.createdAt && (l.status || 'New') === 'New' && (Date.now() - new Date(l.createdAt).getTime()) >= 24 * 60 * 60 * 1000 ? (
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.18)', color: 'var(--color-danger)', fontSize: '0.725rem', fontWeight: 700 }}>
                      🚨 24h+ New Lead
                    </span>
                  ) : l.createdAt && (Date.now() - new Date(l.createdAt).getTime()) >= 23 * 60 * 60 * 1000 ? (
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', fontSize: '0.725rem', fontWeight: 700 }}>
                      Action Urgent (&lt;1h)
                    </span>
                  ) : (
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)', fontSize: '0.725rem', fontWeight: 700 }}>
                      Due Today
                    </span>
                  )}
                  {l.priority && l.priority !== 'Medium' && (
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)',
                      background: PRIORITY_COLORS[l.priority]?.bg, color: PRIORITY_COLORS[l.priority]?.text,
                      fontSize: '0.725rem', fontWeight: 700,
                    }}>{l.priority}</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {l.phone && (
                      <>
                        <a href={`tel:${cleanPhone(l.phone)}`} style={{
                          padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)',
                          background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
                          fontSize: '0.775rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        }}><Phone size={13} /> Call</a>
                        <a href={`https://wa.me/${cleanPhone(l.phone)}`} target="_blank" rel="noopener noreferrer" style={{
                          padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)',
                          background: 'rgba(37, 211, 102, 0.12)', color: '#25D366',
                          fontSize: '0.775rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        }}><MessageSquare size={13} /> WhatsApp</a>
                      </>
                    )}
                  </div>
                  <select
                    value={l.status || 'New'}
                    onChange={(e) => updateStatus(l.id, e.target.value)}
                    style={{
                      padding: '0.25rem 0.4rem', borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text)', fontSize: '0.75rem',
                    }}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Responded">Responded</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Admin Analytics & Team Leaderboard ── */}
      {isAdmin && (
        <>
          {/* Sales Leaderboard */}
          <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} color="#f59e0b" /> Sales Reps Leaderboard
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dimmed)' }}>Performance metrics by employee</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="leads-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Sales Representative</th>
                    <th>Assigned Leads</th>
                    <th>Won Deals</th>
                    <th>Revenue</th>
                    <th>Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((rep, idx) => (
                    <tr key={rep.id}>
                      <td style={{ fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : 'var(--color-text-muted)' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>{rep.name}</td>
                      <td>{rep.totalLeads}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{rep.wonLeads}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(rep.wonValue)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{rep.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analytics Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Status Distribution */}
            <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} color="#6366f1" /> Pipeline Status Distribution
              </h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-text-dimmed)" fontSize={11} tick={{ fill: 'var(--color-text-dimmed)' }} />
                    <YAxis stroke="var(--color-text-dimmed)" fontSize={11} tick={{ fill: 'var(--color-text-dimmed)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name]?.text || COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Source Distribution */}
            <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', fontWeight: 700 }}>Lead Sources</h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          {recentAudit.length > 0 && (
            <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="#06b6d4" /> Recent System Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentAudit.map((log) => (
                  <div key={log.id || log._id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.825rem',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>{log.description}</span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--color-text-dimmed)', whiteSpace: 'nowrap' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
