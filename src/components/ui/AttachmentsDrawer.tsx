import React from 'react';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import attachmentsApi from '../../api/attachmentsApi';
import type { Attachment } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────
interface AttachmentsDrawerProps {
  visible: boolean;
  onHide: () => void;
  /** Label shown in the drawer header, e.g. "Task: Fix login bug" */
  entityLabel: string;
  /** The attachment list to display (read-only) */
  attachments: Attachment[];
}

// ─── Helper — determine icon and colour by file extension ────────────────────
function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'pi pi-image';
  if (ext === 'pdf') return 'pi pi-file-pdf';
  if (['doc', 'docx'].includes(ext)) return 'pi pi-file-word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'pi pi-file-excel';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'pi pi-file-excel';
  return 'pi pi-file';
}

function fileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '#34d399';
  if (ext === 'pdf') return '#f87171';
  if (['doc', 'docx'].includes(ext)) return '#60a5fa';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '#4ade80';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '#fb923c';
  return '#94a3b8';
}

// ─── Component ────────────────────────────────────────────────────────────────
const AttachmentsDrawer: React.FC<AttachmentsDrawerProps> = ({
  visible,
  onHide,
  entityLabel,
  attachments,
}) => {
  return (
    <Sidebar
      visible={visible}
      onHide={onHide}
      position="right"
      style={{ width: '420px', background: 'var(--bg-surface)' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'rgba(59,130,246,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="pi pi-paperclip" style={{ color: 'var(--accent)', fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Attachments
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              {entityLabel}
            </div>
          </div>
        </div>
      }
    >
      {attachments.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60%',
          color: 'var(--text-muted)', gap: 12,
        }}>
          <i className="pi pi-paperclip" style={{ fontSize: 40, opacity: 0.3 }} />
          <p style={{ fontSize: 13, margin: 0 }}>No attachments</p>
        </div>
      ) : (
        <div style={{ padding: '4px 0' }}>
          <p style={{
            fontSize: 12, color: 'var(--text-secondary)',
            marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="pi pi-info-circle" />
            {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                }}
              >
                {/* File icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: `${fileColor(att.file_name)}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i
                    className={fileIcon(att.file_name)}
                    style={{ fontSize: 18, color: fileColor(att.file_name) }}
                  />
                </div>

                {/* File name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={att.file_name}>
                    {att.file_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {att.file_name.split('.').pop()?.toUpperCase() ?? 'FILE'}
                  </div>
                </div>

                {/* Download button */}
                <div style={{ flexShrink: 0 }} title="Download file">
                  <Button
                    icon="pi pi-download"
                    className="p-button-text p-button-sm"
                    style={{ color: 'var(--accent)', padding: '6px 8px' }}
                    onClick={async (e) => {
                      try {
                        const url = await attachmentsApi.getSignedUrl(att.id);
                        window.open(url, '_blank');
                      } catch (err) {
                        console.error('Failed to get signed url', err);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Sidebar>
  );
};

export default AttachmentsDrawer;
