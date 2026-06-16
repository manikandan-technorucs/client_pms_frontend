import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode } from 'primereact/api';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import ProjectDialog from '../components/projects/ProjectDialog';
import { useProjectsContext } from '../context/ProjectsContext';
import type { Project, ProjectCreate, ProjectUpdate } from '../types';

// ── Stats helpers ─────────────────────────────────────────────────────────────
const STAT_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  total: { icon: 'pi pi-briefcase', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  open: { icon: 'pi pi-circle', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  in_progress: { icon: 'pi pi-spin pi-cog', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  resolved: { icon: 'pi pi-check-circle', color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
};

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  // ── Single shared fetch from context — NO duplicate API call ──────────────
  const { projects, loading, createProject, updateProject, deleteProject } = useProjectsContext();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [filters, setFilters] = useState<any>({
    name: { value: '', matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS }
  });

  const statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' }
  ];

  // ── Stats computed from context data — no additional API call needed ──
  const stats = {
    total: projects.length,
    open: projects.filter((p) => p.status === 'open').length,
    in_progress: projects.filter((p) => p.status === 'in_progress').length,
    resolved: projects.filter((p) => p.status === 'resolved').length,
  };

  // ── Dialog handlers ──
  const openCreate = () => { setEditingProject(null); setDialogVisible(true); };
  const openEdit = (p: Project) => { setEditingProject(p); setDialogVisible(true); };

  const handleSave = async (data: ProjectCreate | ProjectUpdate, keepIds: number[], newFiles: File[]) => {
    if (editingProject) {
      await updateProject(editingProject.id, data as ProjectUpdate, keepIds, newFiles);
      toast.current?.show({ severity: 'success', summary: 'Updated', detail: 'Project updated', life: 2500 });
    } else {
      await createProject(data as ProjectCreate, newFiles);
      toast.current?.show({ severity: 'success', summary: 'Created', detail: 'Project created', life: 2500 });
    }
  };

  const handleDelete = (p: Project) => {
    confirmDialog({
      message: `Delete project "${p.name}" and all its tasks, bugs, and files?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deleteProject(p.id);
          toast.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Project deleted', life: 2500 });
        } catch {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Delete failed', life: 3000 });
        }
      },
    });
  };

  // ── Column templates ──
  const nameTemplate = (row: Project) => (
    <span
      style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }}
      onClick={() => navigate(`/projects/${row.id}`)}
    >
      {row.name}
    </span>
  );

  const statusTemplate = (row: Project) => <StatusBadge status={row.status} />;

  const dateTemplate = (val: string | null) =>
    val ? <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{val}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const attachTemplate = (row: Project) => (
    <Tag
      value={String(row.attachments?.length ?? 0)}
      icon="pi pi-paperclip"
      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: '11px' }}
    />
  );

  const actionsTemplate = (row: Project) => (
    <div className="action-btn-group">
      <Button
        icon="pi pi-eye"
        className="p-button-text p-button-sm"
        tooltip="Open project"
        onClick={() => navigate(`/projects/${row.id}`)}
        style={{ color: 'var(--accent)' }}
      />
      <Button
        icon="pi pi-pencil"
        className="p-button-text p-button-sm"
        tooltip="Edit"
        onClick={() => openEdit(row)}
        style={{ color: 'var(--text-secondary)' }}
      />
      <Button
        icon="pi pi-trash"
        className="p-button-text p-button-sm p-button-danger"
        tooltip="Delete"
        onClick={() => handleDelete(row)}
      />
    </div>
  );

  const toolbarLeft = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Button
        label="New Project"
        icon="pi pi-plus"
        onClick={openCreate}
        style={{ background: 'var(--accent)', border: 'none' }}
      />
    </div>
  );

  return (
    <>
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />

      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''} in workspace`}
      />

      <div style={{ padding: '0 24px 24px' }}>
        {/* ── Stats row ── */}
        <div className="stats-row">
          {Object.entries(stats).map(([key, val]) => {
            const cfg = STAT_ICONS[key];
            const labels: Record<string, string> = {
              total: 'Total Projects', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
            };
            return (
              <div key={key} className="stat-card">
                <div className="stat-icon" style={{ background: cfg.bg }}>
                  <i className={cfg.icon} style={{ color: cfg.color }} />
                </div>
                <div className="stat-info">
                  <span className="stat-value" style={{ color: cfg.color }}>{val}</span>
                  <span className="stat-label">{labels[key]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DataTable ── */}
        <div className="pms-card">
          <Toolbar
            left={toolbarLeft}
            style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px 10px 0 0', borderBottom: '1px solid var(--border)' }}
          />
          <div style={{ padding: '16px 16px 0' }}>
            {/* Custom Sleek Filter Bar */}
        <div className="custom-filter-bar fade-in">
          <div className="custom-filter-item">
            <span className="custom-filter-label">Project Name</span>
            <InputText 
              placeholder="Search by name..." 
              className="custom-filter-input"
              value={filters.name.value || ''} 
              onChange={(e) => {
                const val = e.target.value;
                setFilters({ ...filters, name: { value: val, matchMode: FilterMatchMode.CONTAINS } });
              }} 
            />
          </div>
          <div className="custom-filter-item custom-filter-dropdown" style={{ maxWidth: '200px' }}>
            <span className="custom-filter-label">Status</span>
            <Dropdown 
              options={statusOptions} 
              value={filters.status.value} 
              onChange={(e) => setFilters({ ...filters, status: { value: e.value, matchMode: FilterMatchMode.EQUALS } })} 
              placeholder="Filter status" 
              showClear
            />
          </div>
        </div>

        <div className="table-card">
          <DataTable
            value={projects}
            loading={loading}
            filters={filters}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            sortMode="multiple"
            emptyMessage={
              <div className="empty-state">
                <i className="pi pi-briefcase" />
                <p>No projects yet — create your first one!</p>
              </div>
            }
            style={{ borderRadius: '0 0 10px 10px' }}
          >
            <Column field="id" header="ID" sortable style={{ width: '60px', color: 'var(--text-muted)', fontSize: '12px' }} />
            <Column field="name" header="Project Name" sortable body={nameTemplate} style={{ minWidth: '200px' }} />
            <Column field="status" header="Status" sortable body={statusTemplate} style={{ width: '130px' }} />
            <Column field="start_date" header="Start" sortable body={(r) => dateTemplate(r.start_date)} style={{ width: '110px' }} />
            <Column field="end_date" header="End" sortable body={(r) => dateTemplate(r.end_date)} style={{ width: '110px' }} />
            <Column header="Files" body={attachTemplate} style={{ width: '70px' }} />
            <Column header="Actions" body={actionsTemplate} style={{ width: '120px' }} />
          </DataTable>
        </div>
      </div>
      </div>
      </div>

      <ProjectDialog
        visible={dialogVisible}
        project={editingProject}
        onHide={() => setDialogVisible(false)}
        onSave={handleSave}
      />
    </>
  );
};

export default ProjectsPage;
