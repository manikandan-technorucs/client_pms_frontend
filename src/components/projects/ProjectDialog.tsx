import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FileUpload } from 'primereact/fileupload';
import { Divider } from 'primereact/divider';

import attachmentsApi from '../../api/attachmentsApi';
import type { Project, ProjectCreate, ProjectUpdate, StatusValue, Attachment } from '../../types';
import { STATUS_OPTIONS } from '../../types';

interface ProjectDialogProps {
  visible: boolean;
  project?: Project | null;
  onHide: () => void;
  onSave: (data: ProjectCreate | ProjectUpdate, keepIds: number[], newFiles: File[]) => Promise<void>;
}

interface FormState {
  name: string;
  description: string;
  start_date: Date | null;
  end_date: Date | null;
  status: StatusValue;
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  start_date: null,
  end_date: null,
  status: 'open',
};

const ProjectDialog: React.FC<ProjectDialogProps> = ({
  visible,
  project,
  onHide,
  onSave,
}) => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileUploadRef = useRef<FileUpload>(null);

  const isEdit = !!project;

  useEffect(() => {
    if (visible) {
      if (project) {
        setForm({
          name: project.name,
          description: project.description ?? '',
          start_date: project.start_date ? new Date(project.start_date) : null,
          end_date: project.end_date ? new Date(project.end_date) : null,
          status: project.status,
        });
        setExistingAttachments(project.attachments ?? []);
      } else {
        setForm(DEFAULT_FORM);
        setExistingAttachments([]);
      }
      setStagedFiles([]);
      if (fileUploadRef.current) {
        fileUploadRef.current.clear();
      }
      setError(null);
    }
  }, [visible, project]);

  const set = (field: keyof FormState) => (val: unknown) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const formatDate = (d: Date | null) =>
    d ? d.toISOString().split('T')[0] : undefined;

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

  const handleFileSelect = (e: any) => {
    const incoming = Array.from(e.files) as File[];
    setStagedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const novel = incoming.filter((f) => !names.has(f.name));
      return [...prev, ...novel];
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const keepIds = existingAttachments.map((a) => a.id);
      await onSave({
        name: form.name.trim(),
        description: form.description || undefined,
        start_date: formatDate(form.start_date),
        end_date: formatDate(form.end_date),
        status: form.status,
      }, keepIds, stagedFiles);
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

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
        label={saving ? 'Saving…' : isEdit ? 'Update Project' : 'Create Project'}
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
      header={isEdit ? 'Edit Project' : 'New Project'}
      footer={footer}
      style={{ width: '520px' }}
      modal
      draggable={false}
    >
      <div className="form-grid">
        <div className="form-field form-field-full">
          <label>Project Name *</label>
          <InputText
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder="e.g. TechnoRUCS v2 Release"
          />
        </div>

        <div className="form-field form-field-full">
          <label>Description</label>
          <InputTextarea
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            placeholder="Project overview…"
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
      </div>

      <Divider />

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
                <i className="pi pi-file file-icon" />
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

      <div className="section-header" style={{ marginBottom: '12px' }}>
        <span className="section-title">
          <i className="pi pi-upload" style={{ color: 'var(--accent)' }} />
          Add Attachments
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
        <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <i className="pi pi-info-circle" style={{ marginRight: '6px' }} />
          {stagedFiles.length} file(s) ready to upload on save.
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

export default ProjectDialog;
