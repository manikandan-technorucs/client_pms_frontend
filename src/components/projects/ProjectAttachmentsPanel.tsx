import React, { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';

import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Toast } from 'primereact/toast';
import attachmentsApi from '../../api/attachmentsApi';
import type { Attachment } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProjectAttachmentsPanelProps {
  projectId: number;
  /** Initial attachment list — mutated via API calls */
  attachments: Attachment[];
  /** Called when attachments change so the parent can refresh project data */
  onAttachmentsChange: (updated: Attachment[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const ProjectAttachmentsPanel: React.FC<ProjectAttachmentsPanelProps> = ({
  projectId,
  attachments,
  onAttachmentsChange,
}) => {
  const toast = useRef<Toast>(null);
  const fileUploadRef = useRef<FileUpload>(null);

  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Stage files for upload ──
  const handleFileSelect = (e: any) => {
    const incoming = Array.from(e.files) as File[];
    setStagedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !names.has(f.name))];
    });
  };

  const removeStagedFile = (name: string) =>
    setStagedFiles((prev) => prev.filter((f) => f.name !== name));

  // ── Upload staged files ──
  const handleUpload = async () => {
    if (!stagedFiles.length) return;
    setUploading(true);
    try {
      const newAttachments = await attachmentsApi.uploadToProject(projectId, stagedFiles);
      onAttachmentsChange([...attachments, ...newAttachments]);
      setStagedFiles([]);
      if (fileUploadRef.current) fileUploadRef.current.clear();
      toast.current?.show({
        severity: 'success',
        summary: 'Uploaded',
        detail: `${newAttachments.length} file(s) attached`,
        life: 2500,
      });
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Upload Failed',
        detail: err instanceof Error ? err.message : 'Upload error',
        life: 3500,
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Delete an existing attachment ──
  const handleDelete = (event: React.MouseEvent, att: Attachment) => {
    confirmPopup({
      target: event.currentTarget as HTMLElement,
      message: `Remove "${att.file_name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger p-button-sm',
      accept: async () => {
        try {
          await attachmentsApi.deleteFromProject(projectId, att.id);
          onAttachmentsChange(attachments.filter((a) => a.id !== att.id));
          toast.current?.show({
            severity: 'success',
            summary: 'Removed',
            detail: `"${att.file_name}" deleted`,
            life: 2000,
          });
        } catch (err) {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: err instanceof Error ? err.message : 'Delete failed',
            life: 3000,
          });
        }
      },
    });
  };

  return (
    <>
      <Toast ref={toast} position="top-right" />
      <ConfirmPopup />

      {/* ── Existing attachments ── */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <span className="section-title">
            <i className="pi pi-folder-open" style={{ color: 'var(--accent)' }} />
            Project Files
            {attachments.length > 0 && (
              <span style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                borderRadius: 20,
                padding: '1px 8px',
                fontSize: 11,
                fontWeight: 600,
                marginLeft: 4,
              }}>
                {attachments.length}
              </span>
            )}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Click <i className="pi pi-download" /> to download · <i className="pi pi-trash" /> to delete
          </span>
        </div>

        {attachments.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)', gap: 10,
            background: 'var(--bg-elevated)',
            borderRadius: 10, border: '1px dashed var(--border)',
          }}>
            <i className="pi pi-folder" style={{ fontSize: 32, opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No files attached to this project yet</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {attachments.map((att) => {
              const fileUrl = `/uploads/${att.file_path.split(/[\\/]/).pop() ?? att.file_name}`;
              return (
                <div
                  key={att.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    position: 'relative',
                    transition: 'border-color 0.15s, transform 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = 'var(--border-accent)';
                    el.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = 'var(--border)';
                    el.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Delete button */}
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(e, att)}
                    title="Remove attachment"
                    type="button"
                  >
                    <i className="pi pi-trash" />
                  </button>

                  {/* File icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    background: `${fileColor(att.file_name)}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i
                      className={fileIcon(att.file_name)}
                      style={{ fontSize: 24, color: fileColor(att.file_name) }}
                    />
                  </div>

                  {/* File name */}
                  <span style={{
                    fontSize: 11, color: 'var(--text-primary)',
                    textAlign: 'center', wordBreak: 'break-all',
                    lineHeight: 1.3, fontWeight: 500,
                    maxHeight: 32, overflow: 'hidden',
                  }} title={att.file_name}>
                    {att.file_name.length > 26 ? att.file_name.slice(0, 23) + '…' : att.file_name}
                  </span>

                  {/* Type badge */}
                  <span style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    background: 'var(--bg-base)',
                    padding: '2px 6px', borderRadius: 4,
                  }}>
                    {att.file_name.split('.').pop()?.toUpperCase() ?? 'FILE'}
                  </span>

                  {/* Download link */}
                  <a
                    href={fileUrl}
                    download={att.file_name}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      color: 'var(--accent)', fontSize: 11, textDecoration: 'none',
                      padding: '4px 10px', borderRadius: 6,
                      background: 'var(--accent-muted)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(59,130,246,0.22)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'var(--accent-muted)';
                    }}
                  >
                    <i className="pi pi-download" style={{ fontSize: 11 }} />
                    Download
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upload new files ── */}
      <div>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <span className="section-title">
            <i className="pi pi-upload" style={{ color: '#a78bfa' }} />
            Upload Files
          </span>
        </div>

        <FileUpload
          ref={fileUploadRef}
          name="new_files"
          multiple
          customUpload
          auto={false}
          chooseLabel="Choose Files"
          uploadLabel="Upload All"
          cancelLabel="Clear"
          onSelect={handleFileSelect}
          onClear={() => setStagedFiles([])}
          emptyTemplate={
            <div style={{
              textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
              padding: '24px 0',
            }}>
              <i className="pi pi-cloud-upload" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.4 }} />
              Drag & drop files here or click Choose Files
            </div>
          }
          style={{ border: '1px dashed var(--border)', borderRadius: 10 }}
        />

        {stagedFiles.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 12,
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                <i className="pi pi-clock" style={{ marginRight: 6 }} />
                {stagedFiles.length} file(s) ready to upload:
              </p>
              <Button
                label={uploading ? 'Uploading…' : `Upload ${stagedFiles.length} file(s)`}
                icon={uploading ? 'pi pi-spin pi-spinner' : 'pi pi-cloud-upload'}
                onClick={handleUpload}
                disabled={uploading}
                style={{ background: 'var(--accent)', border: 'none', fontSize: 12 }}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 10,
            }}>
              {stagedFiles.map((f) => (
                <div key={f.name} className="attachment-card" style={{ opacity: uploading ? 0.6 : 1 }}>
                  <i
                    className={fileIcon(f.name) + ' file-icon'}
                    style={{ color: '#f59e0b' }}
                  />
                  <span className="file-name" title={f.name}>
                    {f.name.length > 22 ? f.name.slice(0, 19) + '…' : f.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {formatBytes(f.size)}
                  </span>
                  {!uploading && (
                    <button
                      className="delete-btn"
                      onClick={() => removeStagedFile(f.name)}
                      title="Remove from queue"
                      type="button"
                    >
                      <i className="pi pi-times" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectAttachmentsPanel;
