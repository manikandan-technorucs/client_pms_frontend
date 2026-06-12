import React from 'react';
import { Button } from 'primereact/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  onBack?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  onBack,
}) => {
  return (
    <div className="page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <i className="pi pi-angle-right" style={{ fontSize: '10px' }} />}
              {crumb.href ? (
                <a href={crumb.href}>{crumb.label}</a>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="page-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <Button
              icon="pi pi-arrow-left"
              className="p-button-text p-button-sm"
              onClick={onBack}
              tooltip="Go back"
              style={{ color: 'var(--text-secondary)' }}
            />
          )}
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="action-btn-group">{actions}</div>}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
};

export default PageHeader;
