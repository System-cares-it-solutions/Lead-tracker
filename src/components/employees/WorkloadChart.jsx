import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import Spinner from '../common/Spinner';
import { formatCurrency } from '../../utils/leadStatuses';
import { Users, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

const STATUS_COLORS = {
  Available: '#10b981',
  Normal: '#06b6d4',
  Busy: '#f59e0b',
  Overloaded: '#ef4444',
};

export default function WorkloadChart() {
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.fetchEmployeeWorkload()
      .then((data) => setWorkload(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load workload:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>;
  }

  if (workload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={18} color="var(--color-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Team Capacity & Workload</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {workload.length} team members
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {workload.map((emp) => {
          const color = STATUS_COLORS[emp.status] || '#6366f1';

          return (
            <div
              key={emp.id}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  >
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{emp.name}</span>
                    {emp.department && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dimmed)', marginLeft: '0.4rem' }}>
                        ({emp.department})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: `${color}20`,
                      color: color,
                    }}
                  >
                    {emp.status} ({emp.capacityScore}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '6px',
                  borderRadius: '3px',
                  background: 'var(--color-surface)',
                  overflow: 'hidden',
                  marginBottom: '0.4rem',
                }}
              >
                <div
                  style={{
                    width: `${emp.capacityScore}%`,
                    height: '100%',
                    background: color,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Metrics row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: 'var(--color-text-muted)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span>
                  Active Leads: <strong style={{ color: 'var(--color-text)' }}>{emp.activeLeads}</strong>
                </span>
                <span>
                  Tasks: <strong style={{ color: 'var(--color-text)' }}>{emp.pendingTasks}</strong>
                  {emp.overdueTasks > 0 && <span style={{ color: '#ef4444' }}> ({emp.overdueTasks} overdue)</span>}
                </span>
                <span>
                  Won Revenue: <strong style={{ color: '#10b981' }}>{formatCurrency(emp.totalDealValue)}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
