import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../utils/roles';
import { PIPELINE_STAGES, formatCurrency, STATUS_COLORS, PRIORITY_COLORS } from '../utils/leadStatuses';
import Spinner from '../components/common/Spinner';
import DateRangePicker from '../components/common/DateRangePicker';
import ActivityHeatmap from '../components/common/ActivityHeatmap';
import * as api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, Target, DollarSign, Users, Award, BarChart3,
  ArrowUpRight, ArrowDownRight, Activity, Zap, PieChart as PieIcon,
  Gauge, Flame, Layers, ArrowLeftRight, Clock,
} from 'lucide-react';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#a855f7'];

export default function AnalyticsPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'velocity' | 'heatmap' | 'cohort' | 'comparison'
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState([]);
  const [trends, setTrends] = useState([]);
  const [sources, setSources] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [comparisonPeriod, setComparisonPeriod] = useState('month');
  const [trendPeriod, setTrendPeriod] = useState('daily');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  useEffect(() => {
    api.fetchAnalyticsTrends(trendPeriod, trendPeriod === 'monthly' ? 365 : trendPeriod === 'weekly' ? 90 : 30, dateRange)
      .then(setTrends)
      .catch(() => {});
  }, [trendPeriod, dateRange]);

  useEffect(() => {
    if (activeTab === 'comparison') {
      api.fetchAnalyticsComparison(comparisonPeriod)
        .then(setComparison)
        .catch(() => {});
    }
  }, [activeTab, comparisonPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchWithFallback = async (apiCall, fallback) => {
        try {
          return await apiCall();
        } catch (err) {
          console.error("Failed to fetch analytics endpoint:", err);
          return fallback;
        }
      };

      const [pipelineData, trendsData, sourcesData, performanceData, forecastData, velocityData, cohortData] = await Promise.all([
        fetchWithFallback(() => api.fetchAnalyticsPipeline(dateRange), []),
        fetchWithFallback(() => api.fetchAnalyticsTrends(trendPeriod, 30, dateRange), []),
        fetchWithFallback(() => api.fetchAnalyticsSources(dateRange), []),
        fetchWithFallback(() => api.fetchAnalyticsPerformance(dateRange), []),
        fetchWithFallback(() => api.fetchAnalyticsForecast(dateRange), null),
        fetchWithFallback(() => api.fetchAnalyticsVelocity(dateRange), null),
        fetchWithFallback(() => api.fetchAnalyticsCohort(6), []),
      ]);

      setPipeline(pipelineData);
      setTrends(trendsData);
      setSources(sourcesData);
      setPerformance(performanceData);
      setForecast(forecastData);
      setVelocity(velocityData);
      setCohorts(cohortData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const activePipeline = useMemo(() =>
    pipeline.filter((p) => !['Lost', 'Trash'].includes(p.stage)),
  [pipeline]);

  if (loading) return <Spinner />;

  const kpiCards = [
    {
      label: 'Total Pipeline Value',
      value: formatCurrency(forecast?.totalPipelineValue || 0),
      icon: <DollarSign size={22} />,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
    },
    {
      label: 'Weighted Forecast',
      value: formatCurrency(forecast?.weightedForecast || 0),
      icon: <Target size={22} />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Closed Revenue',
      value: formatCurrency(forecast?.closedRevenue || 0),
      icon: <TrendingUp size={22} />,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      label: 'Active Deals',
      value: forecast?.totalDeals || 0,
      icon: <Zap size={22} />,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
    },
  ];

  const tabBtn = (key, label, icon) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.55rem 0.95rem',
        background: activeTab === key ? 'var(--color-primary)' : 'var(--color-surface)',
        color: activeTab === key ? '#fff' : 'var(--color-text-muted)',
        border: `1px solid ${activeTab === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        fontWeight: 700,
        fontSize: '0.8rem',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={24} color="var(--color-primary)" /> Advanced Analytics & Intelligence
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Real-time pipeline intelligence, velocity tracking, cohort performance, and comparative analytics.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
          <button onClick={loadData} style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <Activity size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {tabBtn('overview', 'Pipeline Overview', <BarChart3 size={15} />)}
        {tabBtn('velocity', 'Lead Velocity', <Gauge size={15} />)}
        {tabBtn('heatmap', 'Activity Heatmap', <Flame size={15} />)}
        {tabBtn('cohort', 'Cohort Analysis', <Layers size={15} />)}
        {tabBtn('comparison', 'Period Comparison', <ArrowLeftRight size={15} />)}
      </div>

      {/* ────────────────── OVERVIEW TAB ────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {kpiCards.map((kpi, i) => (
              <div key={i} style={{
                background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {kpi.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dimmed)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline Funnel */}
          <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--color-primary)" /> Revenue Pipeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activePipeline.map((stage) => {
                const maxVal = Math.max(...activePipeline.map((s) => s.totalValue), 1);
                const widthPct = Math.max((stage.totalValue / maxVal) * 100, 4);
                const stageConfig = PIPELINE_STAGES.find((s) => s.key === stage.stage);
                const color = stageConfig?.color || '#6366f1';
                return (
                  <div key={stage.stage} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 120, fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'right', flexShrink: 0 }}>{stage.stage}</div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ height: 32, background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <div style={{
                          width: `${widthPct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                          borderRadius: 'var(--radius-sm)', transition: 'width 0.8s ease', display: 'flex', alignItems: 'center',
                          justifyContent: 'flex-end', paddingRight: '0.5rem', minWidth: 'fit-content',
                        }}>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                            {stage.count} leads • {formatCurrency(stage.totalValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Trend Analysis */}
            <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="#10b981" /> Lead Trends
                </h3>
                <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--color-surface)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                  {['daily', 'weekly', 'monthly'].map((p) => (
                    <button key={p} onClick={() => setTrendPeriod(p)} style={{
                      padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', border: 'none',
                      background: trendPeriod === p ? 'var(--color-primary)' : 'transparent',
                      color: trendPeriod === p ? '#fff' : 'var(--color-text-dimmed)',
                      fontSize: '0.725rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" stroke="var(--color-text-dimmed)" fontSize={11} tick={{ fill: 'var(--color-text-dimmed)' }} />
                    <YAxis stroke="var(--color-text-dimmed)" fontSize={11} tick={{ fill: 'var(--color-text-dimmed)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Area type="monotone" dataKey="total" stroke="#6366f1" fill="rgba(99, 102, 241, 0.15)" name="Total Leads" />
                    <Area type="monotone" dataKey="won" stroke="#10b981" fill="rgba(16, 185, 129, 0.15)" name="Won Deals" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Source Distribution */}
            <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieIcon size={18} color="#f59e0b" /> Lead Source Distribution
              </h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="total"
                      nameKey="source"
                      label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sources.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Source ROI Table */}
          <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={18} color="#10b981" /> Source Conversion Analysis
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Source</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Total Leads</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Won</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Lost</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Conversion Rate</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Pipeline Value</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Won Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.source} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>{s.source}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>{s.total}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-success)', fontWeight: 700 }}>{s.won}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-danger)' }}>{s.lost}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                          background: Number(s.conversionRate) >= 30 ? 'rgba(16, 185, 129, 0.12)' : Number(s.conversionRate) >= 15 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: Number(s.conversionRate) >= 30 ? '#10b981' : Number(s.conversionRate) >= 15 ? '#f59e0b' : '#ef4444',
                          fontWeight: 700, fontSize: '0.75rem',
                        }}>{s.conversionRate}%</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>{formatCurrency(s.totalValue)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(s.wonValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ────────────────── VELOCITY TAB ────────────────── */}
      {activeTab === 'velocity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Velocity KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Gauge size={20} color="var(--color-primary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Average Deal Cycle</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {velocity?.avgVelocityDays || 0} <span style={{ fontSize: '1rem', fontWeight: 600 }}>days</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)', marginTop: '0.25rem' }}>From creation to Won</div>
            </div>

            <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Zap size={20} color="#10b981" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Fastest Closed Deal</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
                {velocity?.fastestDealDays || 0} <span style={{ fontSize: '1rem', fontWeight: 600 }}>days</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)', marginTop: '0.25rem' }}>Record speed</div>
            </div>

            <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={20} color="#f59e0b" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Slowest Closed Deal</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
                {velocity?.slowestDealDays || 0} <span style={{ fontSize: '1rem', fontWeight: 600 }}>days</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)', marginTop: '0.25rem' }}>Longest negotiation</div>
            </div>
          </div>

          {/* Velocity Trend Chart */}
          {velocity?.velocityTrend && velocity.velocityTrend.length > 0 && (
            <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>Monthly Deal Velocity (Days to Close)</h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velocity.velocityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" stroke="var(--color-text-dimmed)" fontSize={11} tick={{ fill: 'var(--color-text-dimmed)' }} />
                    <YAxis stroke="var(--color-text-dimmed)" fontSize={11} tick={{ fill: 'var(--color-text-dimmed)' }} unit=" d" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Line type="monotone" dataKey="avgDays" name="Avg Days to Close" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── HEATMAP TAB ────────────────── */}
      {activeTab === 'heatmap' && (
        <ActivityHeatmap days={90} />
      )}

      {/* ────────────────── COHORT TAB ────────────────── */}
      {activeTab === 'cohort' && (
        <div style={{ background: 'var(--color-surface-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--color-primary)" /> Monthly Cohort Analysis
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Cohort Month</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Leads Created</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Deals Won</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Lost</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Active</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Conversion Rate</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--color-text-muted)' }}>Cohort Revenue</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.month} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>{c.month}</td>
                    <td style={{ textAlign: 'center', padding: '0.75rem' }}>{c.total}</td>
                    <td style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-success)', fontWeight: 700 }}>{c.won}</td>
                    <td style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-danger)' }}>{c.lost}</td>
                    <td style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-primary)' }}>{c.active}</td>
                    <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                        background: Number(c.conversionRate) >= 30 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                        color: Number(c.conversionRate) >= 30 ? '#10b981' : 'var(--color-primary)',
                        fontWeight: 700, fontSize: '0.75rem',
                      }}>{c.conversionRate}%</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      {formatCurrency(c.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── COMPARISON TAB ────────────────── */}
      {activeTab === 'comparison' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['week', 'month', 'quarter'].map((p) => (
              <button
                key={p}
                onClick={() => setComparisonPeriod(p)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${comparisonPeriod === p ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: comparisonPeriod === p ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: comparisonPeriod === p ? '#fff' : 'var(--color-text)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                vs Previous {p}
              </button>
            ))}
          </div>

          {comparison && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Total Leads Generated', curr: comparison.current.total, prev: comparison.previous.total, change: comparison.changes.total },
                { label: 'Deals Won', curr: comparison.current.won, prev: comparison.previous.won, change: comparison.changes.won },
                { label: 'Won Revenue', curr: formatCurrency(comparison.current.revenue), prev: formatCurrency(comparison.previous.revenue), change: comparison.changes.revenue },
                { label: 'Pipeline Generated', curr: formatCurrency(comparison.current.pipeline), prev: formatCurrency(comparison.previous.pipeline), change: comparison.changes.pipeline },
              ].map((item, i) => {
                const isPositive = Number(item.change) >= 0;
                return (
                  <div key={i} style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dimmed)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      {item.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)' }}>{item.curr}</div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                        fontSize: '0.75rem', fontWeight: 700,
                        color: isPositive ? '#10b981' : '#ef4444',
                      }}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {item.change}%
                      </div>
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                      Previous {comparisonPeriod}: {item.prev}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
