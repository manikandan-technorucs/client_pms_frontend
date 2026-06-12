import React from 'react';
import type { StatusValue } from '../../types';

interface StatusBadgeProps {
  status: StatusValue;
}

const STATUS_CONFIG: Record<StatusValue, { label: string; className: string; icon: string }> = {
  open: { label: 'Open', className: 'status-open', icon: 'pi pi-circle' },
  in_progress: { label: 'In Progress', className: 'status-in-progress', icon: 'pi pi-spinner' },
  resolved: { label: 'Resolved', className: 'status-resolved', icon: 'pi pi-check-circle' },
  closed: { label: 'Closed', className: 'status-closed', icon: 'pi pi-times-circle' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <span className={`status-badge ${config.className}`}>
      <i className={config.icon} style={{ fontSize: '9px' }} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
