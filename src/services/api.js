/**
 * Centralized API module connected to MongoDB Atlas via Express backend.
 * Enterprise-grade lead management API layer.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  '/api';

async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const data = await res.json();
      throw new Error(data.error || 'API Request failed');
    }
    throw new Error(`Server returned HTTP ${res.status}`);
  }
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  // For non-JSON (like CSV export), return raw response
  return res;
}

/* ──────────────────────────── AUTH ──────────────────────────── */

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res);
  return { user: data.user, token: `token_${data.user.id}` };
}

export async function updateProfile(profileData) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  });
  return await handleResponse(res);
}

/* ──────────────────────────── LEADS ──────────────────────────── */

export async function fetchLeads(filters = {}) {
  const params = new URLSearchParams();
  if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.source) params.append('source', filters.source);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/leads${query}`);
  return await handleResponse(res);
}

export async function fetchLeadStats(filters = {}) {
  const params = new URLSearchParams();
  if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/leads/stats${query}`);
  return await handleResponse(res);
}

export async function updateLeadStatus(leadId, newStatus, extra = {}) {
  const res = await fetch(`${API_BASE}/leads/${leadId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, ...extra }),
  });
  return await handleResponse(res);
}

export async function updateLeadDetails(leadId, updates) {
  const res = await fetch(`${API_BASE}/leads/${leadId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return await handleResponse(res);
}

export async function assignLead(leadId, employeeId) {
  const res = await fetch(`${API_BASE}/leads/${leadId}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  return await handleResponse(res);
}

export async function swapLead(leadId, targetEmployeeId, targetEmployeeName, reason, currentUserId, currentUserName) {
  const res = await fetch(`${API_BASE}/leads/${leadId}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetEmployeeId, targetEmployeeName, reason, currentUserId, currentUserName }),
  });
  return await handleResponse(res);
}

export async function deleteLead(leadId) {
  const res = await fetch(`${API_BASE}/leads/${leadId}`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

export async function deleteAllLeads() {
  const res = await fetch(`${API_BASE}/leads/all`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

export async function addLead(leadData) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData),
  });
  return await handleResponse(res);
}

export async function bulkImportLeads(importedLeads, creatorId = null, creatorRole = null) {
  const res = await fetch(`${API_BASE}/leads/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads: importedLeads, creatorId, creatorRole }),
  });
  const data = await handleResponse(res);
  return data.leads;
}


export async function addLeadActivity(leadId, activity) {
  const res = await fetch(`${API_BASE}/leads/${leadId}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity),
  });
  return await handleResponse(res);
}

/* ──────────────────────── BULK OPERATIONS ──────────────────────── */

export async function bulkUpdateLeadStatus(leadIds, status, userId, userName, userRole) {
  const res = await fetch(`${API_BASE}/leads/bulk-status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadIds, status, userId, userName, userRole }),
  });
  return await handleResponse(res);
}

export async function bulkAssignLeads(leadIds, employeeId, userId, userName, userRole) {
  const res = await fetch(`${API_BASE}/leads/bulk-assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadIds, employeeId, userId, userName, userRole }),
  });
  return await handleResponse(res);
}

export async function bulkDeleteLeads(leadIds, userId, userName, userRole) {
  const res = await fetch(`${API_BASE}/leads/bulk-delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadIds, userId, userName, userRole }),
  });
  return await handleResponse(res);
}

export async function exportLeadsCSV(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.source) params.append('source', filters.source);
  if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/leads/export${query}`);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ──────────────────────────── ANALYTICS ──────────────────────────── */

function buildQuery(params = {}) {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      urlParams.append(key, val);
    }
  });
  const q = urlParams.toString();
  return q ? `?${q}` : '';
}

export async function fetchAnalyticsPipeline(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/analytics/pipeline${query}`);
  return await handleResponse(res);
}

export async function fetchAnalyticsTrends(period = 'daily', days = 30, filters = {}) {
  const query = buildQuery({ period, days, ...filters });
  const res = await fetch(`${API_BASE}/analytics/trends${query}`);
  return await handleResponse(res);
}

export async function fetchAnalyticsSources(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/analytics/sources${query}`);
  return await handleResponse(res);
}

export async function fetchAnalyticsPerformance(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/analytics/performance${query}`);
  return await handleResponse(res);
}

export async function fetchAnalyticsForecast(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/analytics/forecast${query}`);
  return await handleResponse(res);
}

export async function fetchConversionFunnel(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/analytics/conversion-funnel${query}`);
  return await handleResponse(res);
}

/* ──────────────────────────── AUDIT LOG ──────────────────────────── */

export async function fetchAuditLogs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.action) params.append('action', filters.action);
  if (filters.entityType) params.append('entityType', filters.entityType);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/audit${query}`);
  return await handleResponse(res);
}

export async function deleteAuditLog(id) {
  const res = await fetch(`${API_BASE}/audit/${id}`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

export async function clearAllAuditLogs(logs = []) {
  try {
    const res = await fetch(`${API_BASE}/audit/all`, { method: 'DELETE' });
    if (res.ok) return await handleResponse(res);
  } catch (err) {}

  try {
    const res = await fetch(`${API_BASE}/audit/clear-all`, { method: 'POST' });
    if (res.ok) return await handleResponse(res);
  } catch (err) {}

  try {
    const res = await fetch(`${API_BASE}/audit`, { method: 'DELETE' });
    if (res.ok) return await handleResponse(res);
  } catch (err) {}

  // Client emergency fallback if backend server hasn't loaded new routes into memory yet
  if (Array.isArray(logs) && logs.length > 0) {
    const results = await Promise.allSettled(
      logs.map((log) => deleteAuditLog(log.id || log._id))
    );
    const anySuccess = results.some((r) => r.status === 'fulfilled');
    if (anySuccess) return { message: 'Audit logs cleared' };
  }

  throw new Error('Server returned HTTP 404. Please restart your backend Express server (node server/index.js).');
}

/* ──────────────────────────── NOTIFICATIONS ──────────────────────────── */

export async function fetchNotifications(userId, role) {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (role) params.append('role', role);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/notifications${query}`);
    if (res.status === 404) {
      return [];
    }
    return await handleResponse(res);
  } catch (_err) {
    return [];
  }
}

export async function markNotificationAsRead(id, userId) {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return await handleResponse(res);
}

export async function markAllNotificationsAsRead(userId, role) {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  });
  return await handleResponse(res);
}

export async function clearNotifications(userId, role) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (role) params.append('role', role);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/notifications/clear${query}`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

/* ──────────────────────────── EMPLOYEES ──────────────────────────── */

export async function fetchEmployees() {
  const res = await fetch(`${API_BASE}/employees`);
  return await handleResponse(res);
}

export async function addEmployee(data) {
  const res = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await handleResponse(res);
}

export async function updateEmployee(employeeId, updatedData) {
  const res = await fetch(`${API_BASE}/employees/${employeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  });
  return await handleResponse(res);
}

export async function deleteEmployee(employeeId) {
  const res = await fetch(`${API_BASE}/employees/${employeeId}`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

/* ──────────────────────────── PRODUCTS ──────────────────────────── */

export async function fetchProducts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/products${query}`);
  return await handleResponse(res);
}

export async function addProduct(productData) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  return await handleResponse(res);
}

export async function updateProduct(id, productData) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  return await handleResponse(res);
}

/* ──────────────────────────── COMMENTS ──────────────────────────── */

export async function fetchComments(leadId) {
  const res = await fetch(`${API_BASE}/comments/${leadId}`);
  return await handleResponse(res);
}

export async function addComment(commentData) {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commentData),
  });
  return await handleResponse(res);
}

export async function editComment(commentId, content) {
  const res = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return await handleResponse(res);
}

export async function deleteComment(commentId) {
  const res = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

export async function togglePinComment(commentId) {
  const res = await fetch(`${API_BASE}/comments/${commentId}/pin`, {
    method: 'PUT',
  });
  return await handleResponse(res);
}

export async function reactToComment(commentId, emoji, userId) {
  const res = await fetch(`${API_BASE}/comments/${commentId}/react`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji, userId }),
  });
  return await handleResponse(res);
}

/* ──────────────────────────── TASKS ──────────────────────────── */

export async function fetchTasks(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/tasks${query}`);
  return await handleResponse(res);
}

export async function fetchTaskStats(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/tasks/stats${query}`);
  return await handleResponse(res);
}

export async function fetchOverdueTasks() {
  const res = await fetch(`${API_BASE}/tasks/overdue`);
  return await handleResponse(res);
}

export async function addTask(taskData) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
  return await handleResponse(res);
}

export async function updateTask(taskId, updates) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return await handleResponse(res);
}

export async function completeTask(taskId, userId, userName) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName }),
  });
  return await handleResponse(res);
}

export async function deleteTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

/* ──────────────────────────── TAGS ──────────────────────────── */

export async function fetchTags(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/tags${query}`);
  return await handleResponse(res);
}

export async function fetchTagStats() {
  const res = await fetch(`${API_BASE}/tags/stats`);
  return await handleResponse(res);
}

export async function addTag(tagData) {
  const res = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tagData),
  });
  return await handleResponse(res);
}

export async function updateTag(tagId, updates) {
  const res = await fetch(`${API_BASE}/tags/${tagId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return await handleResponse(res);
}

export async function deleteTag(tagId) {
  const res = await fetch(`${API_BASE}/tags/${tagId}`, {
    method: 'DELETE',
  });
  return await handleResponse(res);
}

/* ──────────────────────────── DASHBOARD ──────────────────────────── */

export async function fetchDashboardSummary(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/dashboard/summary${query}`);
  return await handleResponse(res);
}

export async function fetchActivityFeed(limit = 20) {
  const res = await fetch(`${API_BASE}/dashboard/activity-feed?limit=${limit}`);
  return await handleResponse(res);
}

export async function fetchLeaderboard(period = 'all') {
  const res = await fetch(`${API_BASE}/dashboard/leaderboard?period=${period}`);
  return await handleResponse(res);
}

export async function fetchGoals(userId = null) {
  const params = userId ? `?userId=${userId}` : '';
  const res = await fetch(`${API_BASE}/dashboard/goals${params}`);
  return await handleResponse(res);
}

/* ──────────────────── ADVANCED ANALYTICS ──────────────────── */

export async function fetchAnalyticsVelocity(filters = {}) {
  const query = buildQuery(filters);
  const res = await fetch(`${API_BASE}/analytics/velocity${query}`);
  return await handleResponse(res);
}

export async function fetchAnalyticsHeatmap(days = 90) {
  const res = await fetch(`${API_BASE}/analytics/heatmap?days=${days}`);
  return await handleResponse(res);
}

export async function fetchAnalyticsCohort(months = 6) {
  const res = await fetch(`${API_BASE}/analytics/cohort?months=${months}`);
  return await handleResponse(res);
}

export async function fetchAnalyticsComparison(period = 'month') {
  const res = await fetch(`${API_BASE}/analytics/comparison?period=${period}`);
  return await handleResponse(res);
}

/* ──────────────────── LEAD INTELLIGENCE ──────────────────── */

export async function fetchDuplicateLeads() {
  const res = await fetch(`${API_BASE}/leads/duplicates`);
  return await handleResponse(res);
}

export async function mergeLeads(primaryId, mergeIds, userId, userName) {
  const res = await fetch(`${API_BASE}/leads/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ primaryId, mergeIds, userId, userName }),
  });
  return await handleResponse(res);
}

export async function fetchLeadTimeline(leadId) {
  const res = await fetch(`${API_BASE}/leads/timeline/${leadId}`);
  return await handleResponse(res);
}

/* ──────────────────── EMPLOYEE WORKLOAD ──────────────────── */

export async function fetchEmployeeWorkload() {
  const res = await fetch(`${API_BASE}/employees/workload`);
  return await handleResponse(res);
}

export async function toggleEmployeeActive(employeeId) {
  const res = await fetch(`${API_BASE}/employees/${employeeId}/toggle-active`, {
    method: 'PUT',
  });
  return await handleResponse(res);
}
