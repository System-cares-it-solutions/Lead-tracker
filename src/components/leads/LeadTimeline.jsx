import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import Spinner from '../common/Spinner';
import {
  Clock, CheckCircle2, UserCheck, Edit3, MessageSquare,
  AlertTriangle, ArrowRight, Shield, Zap, Calendar,
} from 'lucide-react';

export default function LeadTimeline({ leadId }) {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    api.fetchLeadTimeline(leadId)
      .then((data) => setTimelineData(data))
      .catch((err) => console.error('Failed to load timeline:', err))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>;
  }

  const events = timelineData?.timeline || [];

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <Clock size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
        <p>No timeline events recorded yet.</p>
      </div>
    );
  }

  const getEventIcon = (event) => {
    switch (event.type) {
      case 'created':
        return <Zap size={14} color="var(--color-primary)" />;
      case 'stage_change':
        return <ArrowRight size={14} color="#f59e0b" />;
      case 'activity':
        return <MessageSquare size={14} color="#06b6d4" />;
      case 'audit':
        if (event.action?.includes('assign') || event.action?.includes('swap')) {
          return <UserCheck size={14} color="#8b5cf6" />;
        }
        if (event.action?.includes('status')) {
          return <CheckCircle2 size={14} color="#10b981" />;
        }
        return <Shield size={14} color="var(--color-text-muted)" />;
      default:
        return <Clock size={14} color="var(--color-text-dimmed)" />;
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
      {/* Vertical Timeline Line */}
      <div
        style={{
          position: 'absolute',
          left: '7px',
          top: '8px',
          bottom: '8px',
          width: '2px',
          background: 'var(--color-border)',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {events.map((event, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            {/* Node bullet */}
            <div
              style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              {getEventIcon(event)}
            </div>

            {/* Event card */}
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-subtle)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  {event.description || event.action || 'Event recorded'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dimmed)' }}>
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>

              {event.user && (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  By: <strong style={{ color: 'var(--color-text)' }}>{event.user}</strong>
                </div>
              )}

              {event.changes && (
                <div
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface-elevated)',
                    fontSize: '0.72rem',
                    color: 'var(--color-text-dimmed)',
                    fontFamily: 'monospace',
                  }}
                >
                  {typeof event.changes === 'object' ? JSON.stringify(event.changes) : event.changes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
