import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Chips } from 'primereact/chips';
import { FileUpload } from 'primereact/fileupload';
import { Divider } from 'primereact/divider';

import attachmentsApi from '../../api/attachmentsApi';
import type { Attachment, Task, TaskCreate, TaskUpdate, StatusValue } from '../../types';
import { STATUS_OPTIONS } from '../../types';

interface TaskDialogProps {
  visible: boolean;
  task?: Task | null;
  projectId: number;
  parentId?: number | null;

  allTasks?: Task[];
  onHide: () => void;
  onSave: (
    data: TaskCreate | TaskUpdate,
    keepIds: number[],
    newFiles: File[],
  ) => Promise<void>;
}


interface FormState {
  name: string;
  description: string;
  start_date: Date | null;
  end_date: Date | null;
  assignees: string[];
  status: StatusValue;
  parent_id: number | null;
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  start_date: null,
  end_date: null,
  assignees: [],
  status: 'open',
  parent_id: null,
};


function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'pi pi-image';
  if (['pdf'].includes(ext)) return 'pi pi-file-pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'pi pi-file-excel';
  if (['doc', 'docx'].includes(ext)) return 'pi pi-file-word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'pi pi-file-excel';
  return 'pi pi-file';
}

const TaskDialog: React.FC<TaskDialogProps> = ({
  visible,
  task,
  projectId,
  parentId,
  allTasks = [],
  onHide,
  onSave,
}) => {
  const isEdit = !!task;
  const fileUploadRef = useRef<FileUpload>(null);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);

  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!visible) return;
    setStagedFiles([]);
    setError(null);
    if (fileUploadRef.current) fileUploadRef.current.clear();

    if (task) {
      setForm({
        name: task.name,
        description: task.description ?? '',
        start_date: task.start_date ? new Date(task.start_date) : null,
        end_date: task.end_date ? new Date(task.end_date) : null,
        assignees: task.assignees ?? [],
        status: task.status,
        parent_id: task.parent_id ?? null,
      });
      setExistingAttachments(task.attachments ?? []);
    } else {
      setForm({ ...DEFAULT_FORM, parent_id: parentId ?? null });
      setExistingAttachments([]);
    }
  }, [visible, task, parentId]);

  const set = <K extends keyof FormState>(field: K) =>
    (val: FormState[K]) => setForm((prev) => ({ ...prev, [field]: val }));

  const formatDate = (d: Date | null) =>
    d ? d.toISOString().split('T')[0] : undefined;

  // ── A) Inline delete existing attachment (client-side only, no API call) ──
  const handleDeleteExisting = (id: number) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDownload = async (att: Attachment) => {
    try {
      const url = await attachmentsApi.getSignedUrl(att.id);
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to fetch signed URL", err);
    }
  };

  // ── B) FileUpload: accumulate new files into staging queue ──
  const handleFileSelect = (e: any) => {
    const incoming = Array.from(e.files) as File[];
    setStagedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const deduped = incoming.filter((f) => !names.has(f.name));
      return [...prev, ...deduped];
    });
  };

  const removeStagedFile = (name: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  // ── Submit ──
  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Task name is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const keepIds = existingAttachments.map((a) => a.id);

    try {
      if (isEdit && task) {
        const updatePayload: TaskUpdate = {
          name: form.name.trim(),
          description: form.description || undefined,
          start_date: formatDate(form.start_date),
          end_date: formatDate(form.end_date),
          assignees: form.assignees,
          status: form.status,
          parent_id: form.parent_id,
        };
        await onSave(updatePayload, keepIds, stagedFiles);
      } else {
        const createPayload: TaskCreate = {
          project_id: projectId,
          parent_id: form.parent_id,
          name: form.name.trim(),
          description: form.description || undefined,
          start_date: formatDate(form.start_date),
          end_date: formatDate(form.end_date),
          assignees: form.assignees,
          status: form.status,
        };
        await onSave(createPayload, keepIds, stagedFiles);
      }
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Parent options ──
  const parentOptions = allTasks
    .filter((t) => t.id !== task?.id)
    .map((t) => ({ label: t.name, value: t.id }));

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
      <Button
        label="Cancel"
        icon="pi pi-times"
        className="p-button-text"
        onClick={onHide}
        disabled={saving}
      />
      <Button
        label={saving ? 'Saving…' : isEdit ? 'Update Task' : 'Create Task'}
        icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
        onClick={handleSave}
        disabled={saving}
      />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={isEdit ? `Edit Task — ${task?.name}` : 'New Task'}
      footer={footer}
      style={{ width: '640px' }}
      modal
      draggable={false}
    >
      {/* ── Core Fields ── */}
      <div className="form-grid">
        <div className="form-field form-field-full">
          <label>Task Name *</label>
          <InputText
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder="Describe the task…"
          />
        </div>

        <div className="form-field form-field-full">
          <label>Description</label>
          <InputTextarea
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            placeholder="Detailed notes, acceptance criteria…"
            autoResize
            rows={3}
          />
        </div>

        <div className="form-field">
          <label>Start Date</label>
          <Calendar
            value={form.start_date}
            onChange={(e) => set('start_date')(e.value ?? null)}
            dateFormat="yy-mm-dd"
            showIcon
            showButtonBar
          />
        </div>

        <div className="form-field">
          <label>End Date</label>
          <Calendar
            value={form.end_date}
            onChange={(e) => set('end_date')(e.value ?? null)}
            dateFormat="yy-mm-dd"
            showIcon
            showButtonBar
          />
        </div>

        <div className="form-field">
          <label>Status</label>
          <Dropdown
            value={form.status}
            options={STATUS_OPTIONS}
            onChange={(e) => set('status')(e.value)}
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div className="form-field">
          <label>Parent Task</label>
          <Dropdown
            value={form.parent_id}
            options={[{ label: '— None (root task) —', value: null }, ...parentOptions]}
            onChange={(e) => set('parent_id')(e.value)}
            optionLabel="label"
            optionValue="value"
            placeholder="None"
          />
        </div>

        <div className="form-field form-field-full">
          <label>Assignees (type name, press Enter)</label>
          <Chips
            value={form.assignees}
            onChange={(e) => set('assignees')(e.value ?? [])}
            placeholder="Add assignee name…"
            separator=","
          />
        </div>
      </div>

      <Divider />

      {/* ── A) Existing Attachments Panel ── */}
      {existingAttachments.length > 0 && (
        <>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <span className="section-title">
              <i className="pi pi-paperclip" style={{ color: 'var(--accent)' }} />
              Current Attachments ({existingAttachments.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Click <i className="pi pi-trash" /> to remove on save
            </span>
          </div>
          <div className="attachment-grid">
            {existingAttachments.map((att) => (
              <div key={att.id} className="attachment-card">
                <i className={fileIcon(att.file_name) + ' file-icon'} />
                <span className="file-name" title={att.file_name}>
                  {att.file_name.length > 24
                    ? att.file_name.slice(0, 21) + '…'
                    : att.file_name}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleDownload(att)}
                    title="Download attachment"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
                  >
                    <i className="pi pi-download" />
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteExisting(att.id)}
                    title="Remove attachment"
                    type="button"
                  >
                    <i className="pi pi-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Divider />
        </>
      )}

      {/* ── B) New File Upload — staging queue ── */}
      <div className="section-header" style={{ marginBottom: '12px' }}>
        <span className="section-title">
          <i className="pi pi-upload" style={{ color: 'var(--accent)' }} />
          Add New Attachments
        </span>
      </div>

      <FileUpload
        ref={fileUploadRef}
        name="new_files"
        multiple
        customUpload
        auto={false}
        chooseLabel="Choose Files"
        uploadLabel="Stage Files"
        cancelLabel="Clear"
        onSelect={handleFileSelect}
        onClear={() => setStagedFiles([])}
        emptyTemplate={
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Drag & drop files here or click Choose Files
          </p>
        }
        style={{ border: '1px dashed var(--border)', borderRadius: '8px' }}
      />

      {stagedFiles.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <i className="pi pi-clock" /> {stagedFiles.length} file(s) staged for upload on save:
          </p>
          <div className="attachment-grid">
            {stagedFiles.map((f) => (
              <div key={f.name} className="attachment-card">
                <i className={fileIcon(f.name) + ' file-icon'} style={{ color: '#f59e0b' }} />
                <span className="file-name" title={f.name}>
                  {f.name.length > 24 ? f.name.slice(0, 21) + '…' : f.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                  }}
                >
                  {(f.size / 1024).toFixed(1)} KB
                </span>
                <button
                  className="delete-btn"
                  onClick={() => removeStagedFile(f.name)}
                  title="Remove from queue"
                  type="button"
                >
                  <i className="pi pi-times" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>
          <i className="pi pi-exclamation-triangle" /> {error}
        </p>
      )}
    </Dialog>
  );
};

export default TaskDialog;
