import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { Target, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/leadStatuses';

export default function GoalTracker({ userId = null }) {
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchGoals(userId)
      .then((data) => setGoals(data))
      .catch((err) => console.error('Failed to load goals:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !goals) return null;

  const renderProgressBar = (title, current, target, wonCount, icon, color) => {
    const progress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          padding: '1rem',
          flex: '1 1 240px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
            {icon}
            <span>{title}</span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color }}>
            {progress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '8px',
            borderRadius: '4px',
            background: 'var(--color-surface-elevated)',
            overflow: 'hidden',
            marginBottom: '0.5rem',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: color,
              borderRadius: '4px',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <span>
            Achieved: <strong style={{ color: 'var(--color-text)' }}>{formatCurrency(current)}</strong> ({wonCount} won)
          </span>
          <span>Target: {formatCurrency(target)}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {renderProgressBar(
        'Monthly Sales Goal',
        goals.monthly?.revenue || 0,
        goals.monthly?.target || 0,
        goals.monthly?.wonCount || 0,
        <Calendar size={16} color="var(--color-primary)" />,
        'var(--color-primary)'
      )}
      {renderProgressBar(
        'Quarterly Sales Goal',
        goals.quarterly?.revenue || 0,
        goals.quarterly?.target || 0,
        goals.quarterly?.wonCount || 0,
        <Trophy size={16} color="#f59e0b" />,
        '#f59e0b'
      )}
    </div>
  );
}
