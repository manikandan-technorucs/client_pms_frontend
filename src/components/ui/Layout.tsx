import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import projectsApi from '../../api/projectsApi';
import { useAuth } from '../../context/AuthContext';

const STATS_TTL_MS = 60_000; // Refresh stats every 60 seconds

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState({ totalTasks: 0, totalBugs: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Stats with 60s auto-refresh ──────────────────────────────────────────
  // Stats are cached server-side for 60s (Cache-Control header) so this
  // interval mainly ensures the sidebar stays in sync after CRUD operations.
  const fetchStats = useCallback(() => {
    projectsApi.getStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    fetchStats(); // immediate fetch on mount
    const intervalId = setInterval(fetchStats, STATS_TTL_MS);
    return () => clearInterval(intervalId); // cleanup on unmount
  }, [fetchStats]);

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <i className="pi pi-server" style={{ color: '#fff', fontSize: '16px' }} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">Project Management</span>
          <span className="sidebar-logo-subtitle">PMS</span>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Workspace</div>

        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
          onClick={() => setMobileMenuOpen(false)}
        >
          <i className="pi pi-briefcase" />
          Projects
        </NavLink>

        <div className="sidebar-section-label" style={{ marginTop: '24px' }}>Overall</div>
        <div className="sidebar-link" style={{ cursor: 'default', color: 'var(--text-secondary)' }}>
          <i className="pi pi-list-check" />
          Tasks
          <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
            {stats.totalTasks}
          </span>
        </div>
        <div className="sidebar-link" style={{ cursor: 'default', color: 'var(--text-secondary)' }}>
          <i className="pi pi-bug" />
          Bugs
          <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
            {stats.totalBugs}
          </span>
        </div>
        <div className="sidebar-section-label" style={{ marginTop: '24px' }}>System</div>
        <div
          className="sidebar-link"
          style={{ cursor: 'pointer', color: '#ef4444' }}
          onClick={() => { setMobileMenuOpen(false); logout(); navigate('/login'); }}
        >
          <i className="pi pi-sign-out" />
          Logout
        </div>
      </nav>

      {/* Version tag */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          v1.0.0 — Internal Build
        </span>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      {/* ── Mobile Header ───────────────────────────────── */}
      <div className="mobile-header">
        <div className="sidebar-logo" style={{ marginBottom: 0, padding: 0 }}>
          <div className="sidebar-logo-icon">
            <i className="pi pi-server" style={{ color: '#fff', fontSize: '16px' }} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name" style={{ fontSize: 15 }}>PMS Workspace</span>
          </div>
        </div>
        <Button 
          icon="pi pi-bars" 
          className="p-button-text" 
          onClick={() => setMobileMenuOpen(true)} 
          style={{ color: 'var(--text-primary)', padding: '0 8px' }} 
        />
      </div>

      {/* ── Mobile Sidebar Drawer ───────────────────────── */}
      <Sidebar 
        visible={mobileMenuOpen} 
        onHide={() => setMobileMenuOpen(false)} 
        className="mobile-sidebar"
        showCloseIcon={false}
        style={{ padding: 0, width: '280px', background: 'var(--bg-surface)' }}
      >
        {navContent}
      </Sidebar>

      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside className="sidebar">
        {navContent}
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <main className="main-content">
        <div className="page-area fade-in">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
