import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../utils/roles';
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  UserCheck,
  Building2,
  Settings,
  Package,
  LogOut,
  BarChart3,
  FileText,
  Shield,
  CheckSquare,
  Tag,
  Copy,
} from 'lucide-react';
import './Sidebar.css';

/**
 * Navigation sidebar — links are conditionally rendered per role.
 * Includes Logout button at the bottom footer.
 */
export default function Sidebar({ isOpen, onClose }) {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = role === ROLES.ADMIN;

  const linkClass = ({ isActive }) =>
    `sidebar__link${isActive ? ' sidebar__link--active' : ''}`;

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__logo">LM</div>
          <span className="sidebar__brand-name">Lead Manager</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          <span className="sidebar__section-title">Main</span>

          <NavLink to="/" end className={linkClass} onClick={onClose}>
            <span className="sidebar__link-icon"><LayoutDashboard size={18} /></span>
            Dashboard
          </NavLink>

          {isAdmin && (
            <NavLink to="/assignment" className={linkClass} onClick={onClose}>
              <span className="sidebar__link-icon"><UserCheck size={18} /></span>
              Assign Leads
            </NavLink>
          )}

          <NavLink to="/leads" className={linkClass} onClick={onClose}>
            <span className="sidebar__link-icon"><Users size={18} /></span>
            {role === ROLES.EMPLOYEE ? 'My Leads' : 'All Leads'}
          </NavLink>

          <NavLink to="/products" className={linkClass} onClick={onClose}>
            <span className="sidebar__link-icon"><Package size={18} /></span>
            Products
          </NavLink>

          <NavLink to="/import" className={linkClass} onClick={onClose}>
            <span className="sidebar__link-icon"><UploadCloud size={18} /></span>
            Import Leads
          </NavLink>

          <NavLink to="/tasks" className={linkClass} onClick={onClose}>
            <span className="sidebar__link-icon"><CheckSquare size={18} /></span>
            Tasks
          </NavLink>

          {/* Enterprise Navigation */}
          <span className="sidebar__section-title">Intelligence</span>

          {isAdmin && (
            <NavLink to="/analytics" className={linkClass} onClick={onClose}>
              <span className="sidebar__link-icon"><BarChart3 size={18} /></span>
              Analytics
            </NavLink>
          )}

          <NavLink to="/reports" className={linkClass} onClick={onClose}>
            <span className="sidebar__link-icon"><FileText size={18} /></span>
            Reports
          </NavLink>

          {isAdmin && (
            <NavLink to="/audit-log" className={linkClass} onClick={onClose}>
              <span className="sidebar__link-icon"><Shield size={18} /></span>
              Audit Log
            </NavLink>
          )}

          {isAdmin && (
            <>
              <span className="sidebar__section-title">Management</span>

              <NavLink to="/employees" className={linkClass} onClick={onClose}>
                <span className="sidebar__link-icon"><Building2 size={18} /></span>
                Employees
              </NavLink>

              <NavLink to="/tags" className={linkClass} onClick={onClose}>
                <span className="sidebar__link-icon"><Tag size={18} /></span>
                Tag Manager
              </NavLink>

              <NavLink to="/duplicates" className={linkClass} onClick={onClose}>
                <span className="sidebar__link-icon"><Copy size={18} /></span>
                Duplicates
              </NavLink>
            </>
          )}

          <span className="sidebar__section-title">Account</span>

          <NavLink to="/settings" className={linkClass} onClick={onClose}>
            <span className="sidebar__link-icon"><Settings size={18} /></span>
            Settings
          </NavLink>
        </nav>

        {/* Footer with Logout */}
        <div className="sidebar__footer">
          <button className="sidebar__logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          <span className="sidebar__copyright">© 2026 Lead Manager</span>
        </div>
      </aside>
    </>
  );
}
