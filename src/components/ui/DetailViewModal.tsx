import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import StatusBadge from './StatusBadge';
import type { Project, Task, Bug, Attachment } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.8px', color: 'var(--text-muted)',
      }}>
        {label}
      </span>
      <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

function DateVal({ val }: { val: string | null }) {
  return val
    ? <span>{val}</span>
    : <span style={{ color: 'var(--text-muted)' }}>—</span>;
}

function AssigneeChips({ assignees }: { assignees: string[] }) {
  if (!assignees?.length)
    return <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {assignees.map(a => (
        <span key={a} style={{
          background: 'var(--accent-muted)', color: 'var(--accent)',
          borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500,
        }}>{a}</span>
      ))}
    </div>
  );
}

function AttachList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments?.length)
    return <span style={{ color: 'var(--text-muted)' }}>None</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {attachments.map(a => (
        <div key={a.id} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-elevated)', borderRadius: 6, padding: '6px 10px',
        }}>
          <i className="pi pi-paperclip" style={{ color: 'var(--accent)', fontSize: 12 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            {a.file_name}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0',
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1px', color: 'var(--accent)', whiteSpace: 'nowrap',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function AuditField({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className={icon} style={{ color: 'var(--text-muted)', fontSize: 12, width: 14 }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}:</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}

function formatTs(ts: string | null | undefined) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    });
  } catch {
    return ts;
  }
}

// ─── Entity-specific content renderers ────────────────────────────────────────

function ProjectContent({ project }: { project: Project & Record<string, any> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionDivider label="Project Info" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DetailRow label="Status"><StatusBadge status={project.status} /></DetailRow>
        <DetailRow label="Attachments">
          <Tag
            value={String(project.attachments?.length ?? 0)}
            icon="pi pi-paperclip"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          />
        </DetailRow>
        <DetailRow label="Start Date"><DateVal val={project.start_date} /></DetailRow>
        <DetailRow label="End Date"><DateVal val={project.end_date} /></DetailRow>
      </div>
      {project.description && (
        <DetailRow label="Description">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {project.description}
          </p>
        </DetailRow>
      )}

      <SectionDivider label="Attachments" />
      <AttachList attachments={project.attachments ?? []} />

      <SectionDivider label="Audit" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AuditField icon="pi pi-user-plus" label="Created by" value={project.created_by} />
        <AuditField icon="pi pi-clock" label="Created at" value={formatTs(project.created_at)} />
        <AuditField icon="pi pi-user-edit" label="Updated by" value={project.updated_by} />
        <AuditField icon="pi pi-clock" label="Updated at" value={formatTs(project.updated_at)} />
      </div>
    </div>
  );
}

function TaskContent({ task }: { task: Task & Record<string, any> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionDivider label="Task Info" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DetailRow label="Status"><StatusBadge status={task.status} /></DetailRow>
        <DetailRow label="Assignees"><AssigneeChips assignees={task.assignees} /></DetailRow>
        <DetailRow label="Start Date"><DateVal val={task.start_date} /></DetailRow>
        <DetailRow label="End Date"><DateVal val={task.end_date} /></DetailRow>
        {task.parent_id && (
          <DetailRow label="Parent Task ID">
            <span style={{ fontFamily: 'monospace', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>
              #{task.parent_id}
            </span>
          </DetailRow>
        )}
        <DetailRow label="Subtasks">
          <span>{task.subtasks?.length ?? 0} sub-task(s)</span>
        </DetailRow>
      </div>
      {task.description && (
        <DetailRow label="Description">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {task.description}
          </p>
        </DetailRow>
      )}

      <SectionDivider label="Attachments" />
      <AttachList attachments={task.attachments ?? []} />

      <SectionDivider label="Audit" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AuditField icon="pi pi-user-plus" label="Created by" value={task.created_by} />
        <AuditField icon="pi pi-clock" label="Created at" value={formatTs(task.created_at)} />
        <AuditField icon="pi pi-user-edit" label="Updated by" value={task.updated_by} />
        <AuditField icon="pi pi-clock" label="Updated at" value={formatTs(task.updated_at)} />
      </div>
    </div>
  );
}

function BugContent({ bug, taskName }: { bug: Bug & Record<string, any>; taskName?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionDivider label="Bug Info" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DetailRow label="Status"><StatusBadge status={bug.status} /></DetailRow>
        <DetailRow label="Reporter">
          <span style={{ fontWeight: 500 }}>{bug.reporter || '—'}</span>
        </DetailRow>
        <DetailRow label="Start Date"><DateVal val={bug.start_date} /></DetailRow>
        <DetailRow label="End Date"><DateVal val={bug.end_date} /></DetailRow>
        {taskName && (
          <DetailRow label="Linked Task">
            <span style={{
              background: 'var(--bg-elevated)', color: 'var(--accent)',
              borderRadius: 6, padding: '2px 8px', fontSize: 12,
            }}>{taskName}</span>
          </DetailRow>
        )}
        {bug.parent_id && (
          <DetailRow label="Parent Bug ID">
            <span style={{ fontFamily: 'monospace', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>
              #{bug.parent_id}
            </span>
          </DetailRow>
        )}
        <DetailRow label="Assignees"><AssigneeChips assignees={bug.assignees ?? []} /></DetailRow>
        <DetailRow label="Sub-bugs">
          <span>{bug.sub_bugs?.length ?? 0} sub-bug(s)</span>
        </DetailRow>
      </div>
      {bug.description && (
        <DetailRow label="Description">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {bug.description}
          </p>
        </DetailRow>
      )}

      <SectionDivider label="Attachments" />
      <AttachList attachments={bug.attachments ?? []} />

      <SectionDivider label="Audit" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AuditField icon="pi pi-user-plus" label="Created by" value={bug.created_by} />
        <AuditField icon="pi pi-clock" label="Created at" value={formatTs(bug.created_at)} />
        <AuditField icon="pi pi-user-edit" label="Updated by" value={bug.updated_by} />
        <AuditField icon="pi pi-clock" label="Updated at" value={formatTs(bug.updated_at)} />
      </div>
    </div>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type DetailItem =
  | { type: 'project'; data: Project }
  | { type: 'task'; data: Task; taskName?: string }
  | { type: 'bug'; data: Bug; taskName?: string };

interface Props {
  item: DetailItem | null;
  onHide: () => void;
  onEdit?: () => void;
}

const ENTITY_META = {
  project: { icon: 'pi pi-briefcase', color: '#60a5fa', label: 'Project' },
  task:    { icon: 'pi pi-list-check',  color: '#a78bfa', label: 'Task'    },
  bug:     { icon: 'pi pi-bug',         color: '#f87171', label: 'Bug'     },
};

const DetailViewModal: React.FC<Props> = ({ item, onHide, onEdit }) => {
  if (!item) return null;

  const meta = ENTITY_META[item.type];
  const title = item.type === 'project'
    ? (item.data as Project).name
    : item.type === 'task'
    ? (item.data as Task).name
    : (item.data as Bug).title;

  const headerEl = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `${meta.color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={meta.icon} style={{ color: meta.color, fontSize: 16 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1px', color: meta.color,
        }}>{meta.label} · #{item.data.id}</span>
        <span style={{
          fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 460,
        }} title={title}>{title}</span>
      </div>
    </div>
  );

  const footerEl = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      {onEdit && (
        <Button
          label="Edit"
          icon="pi pi-pencil"
          className="p-button-outlined p-button-sm"
          onClick={() => { onHide(); onEdit(); }}
          style={{ fontSize: 13 }}
        />
      )}
      <Button
        label="Close"
        icon="pi pi-times"
        className="p-button-text p-button-sm"
        onClick={onHide}
        style={{ fontSize: 13 }}
      />
    </div>
  );

  return (
    <Dialog
      visible
      onHide={onHide}
      header={headerEl}
      footer={footerEl}
      style={{ width: '560px', maxWidth: '95vw' }}
      contentStyle={{ padding: '24px 24px 16px', maxHeight: '70vh', overflowY: 'auto' }}
      modal
      dismissableMask
      draggable={false}
    >
      {item.type === 'project' && <ProjectContent project={item.data as any} />}
      {item.type === 'task'    && <TaskContent task={item.data as any} />}
      {item.type === 'bug'     && <BugContent bug={item.data as any} taskName={(item as any).taskName} />}
    </Dialog>
  );
};

export default DetailViewModal;
