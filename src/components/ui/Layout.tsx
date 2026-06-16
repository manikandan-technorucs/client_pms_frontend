import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import projectsApi from '../../api/projectsApi';
import { useAuth } from '../../context/AuthContext';

const STATS_TTL_MS = 60_000; // Refresh stats every 60 seconds

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState({ totalTasks: 0, totalBugs: 0 });
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

  return (
    <div className="app-shell">
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <i className="pi pi-server" style={{ color: '#fff', fontSize: '16px' }} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">Project Management</span>
            <span className="sidebar-logo-subtitle">PMS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Workspace</div>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
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
            onClick={() => { logout(); navigate('/login'); }}
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
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <main className="main-content">
        <div className="page-area fade-in">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
