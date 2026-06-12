import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div className="empty-state" style={{ height: '80vh' }}>
    <i className="pi pi-exclamation-circle" style={{ fontSize: '48px', color: 'var(--accent)', opacity: 0.5 }} />
    <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>404 — Page Not Found</h2>
    <p style={{ color: 'var(--text-secondary)' }}>The page you're looking for doesn't exist.</p>
    <Link to="/projects">
      <button
        style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '9px 20px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600,
        }}
      >
        <i className="pi pi-arrow-left" style={{ marginRight: '6px' }} />
        Back to Projects
      </button>
    </Link>
  </div>
);

export default NotFoundPage;
