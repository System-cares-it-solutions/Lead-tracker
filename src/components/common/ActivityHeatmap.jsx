import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import Spinner from '../common/Spinner';
import { Flame } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

export default function ActivityHeatmap({ days = 90 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.fetchAnalyticsHeatmap(days)
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load heatmap:', err))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>;
  }

  if (!data || !data.grid) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No activity data available</div>;
  }

  // Find max value in grid for scaling color intensity
  let maxVal = 1;
  data.grid.forEach((dayRow) => {
    dayRow.forEach((val) => {
      if (val > maxVal) maxVal = val;
    });
  });

  const getColor = (val) => {
    if (!val || val === 0) return 'var(--color-surface-elevated)';
    const ratio = val / maxVal;
    if (ratio < 0.25) return 'rgba(99, 102, 241, 0.25)';
    if (ratio < 0.5) return 'rgba(99, 102, 241, 0.5)';
    if (ratio < 0.75) return 'rgba(99, 102, 241, 0.75)';
    return '#6366f1';
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={18} color="#f59e0b" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Lead Generation Heatmap</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Total {data.totalLeads || 0} leads analyzed (last {days} days)
        </span>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ minWidth: '600px' }}>
          {/* Hour labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: '3px', marginBottom: '4px' }}>
            <div />
            {HOURS.map((h, i) => (
              <div key={i} style={{ fontSize: '0.6rem', color: 'var(--color-text-dimmed)', textAlign: 'center' }}>
                {i % 3 === 0 ? i : ''}
              </div>
            ))}
          </div>

          {/* Grid rows by day */}
          {DAYS.map((dayName, dayIdx) => (
            <div
              key={dayIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px repeat(24, 1fr)',
                gap: '3px',
                marginBottom: '3px',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {dayName}
              </div>
              {data.grid[dayIdx].map((val, hourIdx) => (
                <div
                  key={hourIdx}
                  title={`${dayName} ${hourIdx}:00 - ${val} lead(s)`}
                  style={{
                    height: '18px',
                    borderRadius: '2px',
                    background: getColor(val),
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              ))}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            <span>Less</span>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--color-surface-elevated)' }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(99, 102, 241, 0.25)' }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(99, 102, 241, 0.5)' }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(99, 102, 241, 0.75)' }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#6366f1' }} />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
