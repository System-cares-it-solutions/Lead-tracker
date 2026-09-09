/**
 * Standard Lead status constants.
 */
export const LEAD_STATUSES = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  RESPONDED: 'Responded',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
  TRASH: 'Trash',
};

/**
 * Ordered pipeline stages with display config.
 */
export const PIPELINE_STAGES = [
  { key: 'New', label: 'New', color: '#6366f1', probability: 0.1 },
  { key: 'Contacted', label: 'Contacted', color: '#06b6d4', probability: 0.2 },
  { key: 'Responded', label: 'Responded', color: '#8b5cf6', probability: 0.3 },
  { key: 'Qualified', label: 'Qualified', color: '#a855f7', probability: 0.5 },
  { key: 'Proposal Sent', label: 'Proposal Sent', color: '#f59e0b', probability: 0.65 },
  { key: 'Negotiation', label: 'Negotiation', color: '#ec4899', probability: 0.8 },
  { key: 'Won', label: 'Won', color: '#10b981', probability: 1.0 },
  { key: 'Lost', label: 'Lost', color: '#ef4444', probability: 0 },
  { key: 'Trash', label: 'Trash', color: '#64748b', probability: 0 },
];

/**
 * Lead priority levels.
 */
export const LEAD_PRIORITIES = [
  { key: 'Low', label: 'Low', color: '#64748b' },
  { key: 'Medium', label: 'Medium', color: '#f59e0b' },
  { key: 'High', label: 'High', color: '#f97316' },
  { key: 'Critical', label: 'Critical', color: '#ef4444' },
];

/**
 * Lead sources.
 */
export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'LinkedIn',
  'Cold Call',
  'Email Campaign',
  'Advertisement',
  'Trade Show',
  'Social Media',
  'Partner',
  'Organic Search',
  'Direct',
  'Other',
];



/**
 * Lost reasons.
 */
export const LOST_REASONS = [
  'Price too high',
  'Chose competitor',
  'No budget',
  'No response',
  'Bad timing',
  'Not a good fit',
  'Decision maker changed',
  'Project cancelled',
  'Went with internal solution',
  'Other',
];

/**
 * Priority badge colors for inline styling.
 */
export const PRIORITY_COLORS = {
  Low: { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' },
  Medium: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
  High: { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316' },
  Critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
};

/**
 * Status badge colors for inline styling.
 */
export const STATUS_COLORS = {
  New: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1' },
  Contacted: { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4' },
  Responded: { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6' },
  Qualified: { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' },
  'Proposal Sent': { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
  Negotiation: { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899' },
  Won: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981' },
  Lost: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' },
  Trash: { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' },
};

/**
 * Format currency value.
 */
export function formatCurrency(value, currency = 'INR') {
  if (!value && value !== 0) return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  if (currency === 'INR') {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return `$${num.toLocaleString('en-US')}`;
}

/**
 * Get lead score color based on value.
 */
export function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}
