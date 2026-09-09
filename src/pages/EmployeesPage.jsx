import { useState, useMemo } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { useLeads } from '../hooks/useLeads';
import { ROLE_LABELS } from '../utils/roles';
import Button from '../components/common/Button';
import AddEmployeeModal from '../components/employees/AddEmployeeModal';
import EditEmployeeModal from '../components/employees/EditEmployeeModal';
import EmployeeDetailsModal from '../components/employees/EmployeeDetailsModal';
import AddLeadModal from '../components/leads/AddLeadModal';
import WorkloadChart from '../components/employees/WorkloadChart';
import Spinner from '../components/common/Spinner';
import * as api from '../services/api';
import {
  Building2,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  Users,
  Award,
  CheckCircle2,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export default function EmployeesPage() {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { leads, addLead } = useLeads();

  const [modalOpen, setModalOpen] = useState(false);
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [inspectEmployee, setInspectEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  /* Computed Employee Stats */
  const employeeStats = useMemo(() => {
    const totalEmps = employees.length;

    let topRep = null;
    let maxWon = -1;

    employees.forEach((emp) => {
      const empWon = leads.filter(
        (l) => (l.assignedToRaw === emp.id || l.assignedTo === emp.name) && l.status === 'Won'
      ).length;

      if (empWon > maxWon) {
        maxWon = empWon;
        topRep = emp;
      }
    });

    const avgLeads = totalEmps > 0 ? (leads.length / totalEmps).toFixed(1) : '0';

    return { totalEmps, topRep: topRep ? topRep.name : '—', avgLeads };
  }, [employees, leads]);

  /* Filtered Employees */
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        (emp.name && emp.name.toLowerCase().includes(term)) ||
        (emp.email && emp.email.toLowerCase().includes(term)) ||
        (emp.phone && emp.phone.toLowerCase().includes(term)) ||
        (emp.location && emp.location.toLowerCase().includes(term)) ||
        (emp.language && emp.language.toLowerCase().includes(term)) ||
        (emp.languages && String(emp.languages).toLowerCase().includes(term)) ||
        (emp.role && emp.role.toLowerCase().includes(term))
      );
    });
  }, [employees, searchTerm]);

  const handleDelete = async (employee) => {
    if (window.confirm(`Are you sure you want to remove employee "${employee.name}"?`)) {
      try {
        await deleteEmployee(employee.id);
      } catch (err) {
        console.error('Failed to remove employee:', err);
      }
    }
  };

  const handleToggleActive = async (employee) => {
    try {
      await api.toggleEmployeeActive(employee.id);
      updateEmployee(employee.id, { isActive: employee.isActive === false ? true : false });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Employee Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dimmed)' }}>
            Manage staff profiles, assigned regions, roles, and monitor individual sales performance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--color-surface-elevated)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--color-text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <TableIcon size={15} /> Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'cards' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'cards' ? '#fff' : 'var(--color-text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <LayoutGrid size={15} /> Cards
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setAddLeadModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserPlus size={16} color="var(--color-primary)" /> Add Lead
          </Button>

          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserPlus size={16} /> Add Employee
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--color-surface-elevated)', padding: '1.15rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{employeeStats.totalEmps}</div>
            <div style={{ fontSize: '0.775rem', color: 'var(--color-text-dimmed)' }}>Total Staff Members</div>
          </div>
        </div>

        <div style={{ background: 'var(--color-surface-elevated)', padding: '1.15rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>{employeeStats.topRep}</div>
            <div style={{ fontSize: '0.775rem', color: 'var(--color-text-dimmed)' }}>Top Performer Rep</div>
          </div>
        </div>

        <div style={{ background: 'var(--color-surface-elevated)', padding: '1.15rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>{employeeStats.avgLeads}</div>
            <div style={{ fontSize: '0.775rem', color: 'var(--color-text-dimmed)' }}>Avg Leads / Rep</div>
          </div>
        </div>
      </div>

      {/* ── Team Capacity & Workload Chart ── */}
      <WorkloadChart />

      {/* Search Bar */}
      <div style={{ position: 'relative', width: '320px' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-dimmed)',
          }}
        />
        <input
          type="text"
          placeholder="Search staff by name, location, role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem 0.55rem 2.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* Content Rendering */}
      {filteredEmployees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', color: 'var(--color-text-dimmed)' }}>
          <Building2 size={40} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
          <div style={{ fontWeight: 600 }}>No employees found matching criteria</div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="leads-table-wrapper" style={{ borderRadius: 'var(--radius-lg)' }}>
          <table className="employees-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location / Region</th>
                <th>Languages</th>
                <th>Role</th>
                <th>Assigned Workload</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const assignedCount = leads.filter(
                  (l) => l.assignedToRaw === emp.id || l.assignedTo === emp.name
                ).length;

                return (
                  <tr key={emp.id}>
                    <td className="employees-table__name" title={emp.name} style={{ fontWeight: 700 }}>
                      {emp.name}
                    </td>
                    <td className="employees-table__secondary" title={emp.email}>{emp.email}</td>
                    <td className="employees-table__secondary" title={emp.phone}>{emp.phone || '—'}</td>
                    <td className="employees-table__secondary" title={emp.location || '—'}>{emp.location || '—'}</td>
                    <td className="employees-table__secondary" title={emp.language || emp.languages || 'English'}>{emp.language || emp.languages || 'English'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem', fontWeight: 700,
                        background: emp.isActive !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: emp.isActive !== false ? '#10b981' : '#ef4444',
                      }}>
                        {emp.isActive !== false ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {ROLE_LABELS[emp.role] || emp.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {assignedCount} {assignedCount === 1 ? 'lead' : 'leads'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleActive(emp)}
                          title={emp.isActive !== false ? 'Deactivate Member' : 'Activate Member'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: emp.isActive !== false ? '#10b981' : 'var(--color-text-dimmed)' }}
                        >
                          {emp.isActive !== false ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setInspectEmployee(emp)}
                          title="Inspect Employee Performance"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Eye size={14} /> Profile
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingEmployee(emp)}
                          title="Edit Employee"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(emp)}
                          title="Remove Employee"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards View Mode */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
          {filteredEmployees.map((emp) => {
            const assignedCount = leads.filter(
              (l) => l.assignedToRaw === emp.id || l.assignedTo === emp.name
            ).length;

            return (
              <div
                key={emp.id}
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EMP'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{emp.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dimmed)' }}>{ROLE_LABELS[emp.role] || emp.role}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.65rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div>📧 {emp.email}</div>
                  <div>📞 {emp.phone || 'N/A'}</div>
                  <div>📍 {emp.location || 'Unassigned Region'}</div>
                  <div>🌐 {emp.language || emp.languages || 'English'}</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>⚡ Active Workload: {assignedCount} Leads</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <Button variant="secondary" size="sm" onClick={() => setInspectEmployee(emp)} style={{ flex: 1, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}>
                    <Eye size={14} /> Profile
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditingEmployee(emp)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(emp)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddEmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addEmployee}
      />

      <AddLeadModal
        isOpen={addLeadModalOpen}
        onClose={() => setAddLeadModalOpen(false)}
        onSave={addLead}
      />

      <EditEmployeeModal
        isOpen={!!editingEmployee}
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onUpdate={updateEmployee}
      />

      <EmployeeDetailsModal
        isOpen={!!inspectEmployee}
        employee={inspectEmployee}
        leads={leads}
        onClose={() => setInspectEmployee(null)}
        onEditEmployee={(emp) => {
          setInspectEmployee(null);
          setEditingEmployee(emp);
        }}
      />
    </div>
  );
}
