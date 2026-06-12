import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TreeTable } from 'primereact/treetable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import type { TreeNode } from 'primereact/treenode';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import TaskDialog from '../components/tasks/TaskDialog';
import BugDialog from '../components/bugs/BugDialog';
import AttachmentsDrawer from '../components/ui/AttachmentsDrawer';
import ProjectAttachmentsPanel from '../components/projects/ProjectAttachmentsPanel';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useBugs } from '../hooks/useBugs';
import type {
  Task, TaskCreate, TaskUpdate,
  Bug, BugCreate, BugUpdate,
  Attachment,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Flatten a task tree into a flat list (for parent selector) */
function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const recurse = (list: Task[]) => {
    for (const t of list) {
      result.push(t);
      if (t.subtasks?.length) recurse(t.subtasks);
    }
  };
  recurse(tasks);
  return result;
}

function flattenBugs(bugs: Bug[]): Bug[] {
  const result: Bug[] = [];
  const recurse = (list: Bug[]) => {
    for (const b of list) {
      result.push(b);
      if (b.sub_bugs?.length) recurse(b.sub_bugs);
    }
  };
  recurse(bugs);
  return result;
}

// ─── Task tree node builder ───────────────────────────────────────────────────
function buildTaskTree(tasks: Task[]): TreeNode[] {
  const convert = (t: Task, key: string): TreeNode => ({
    key,
    data: t,
    children: (t.subtasks ?? []).map((s, i) => convert(s, `${key}-${i}`)),
  });
  return tasks.map((t, i) => convert(t, String(i)));
}

function buildBugTree(bugs: Bug[]): TreeNode[] {
  const convert = (b: Bug, key: string): TreeNode => ({
    key,
    data: b,
    children: (b.sub_bugs ?? []).map((s, i) => convert(s, `${key}-${i}`)),
  });
  return bugs.map((b, i) => convert(b, String(i)));
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const { projects } = useProjects();
  const [project, setProject] = useState(() => projects.find((p) => p.id === id));

  // Keep local project in sync when projects list updates
  React.useEffect(() => {
    const found = projects.find((p) => p.id === id);
    if (found) setProject(found);
  }, [projects, id]);

  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks(id);
  const { bugs, loading: bugsLoading, createBug, updateBug, deleteBug } = useBugs(id);

  // ── Task dialog state ──
  const [taskDialogVisible, setTaskDialogVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskParentId, setTaskParentId] = useState<number | null>(null);

  // ── Bug dialog state ──
  const [bugDialogVisible, setBugDialogVisible] = useState(false);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [bugParentId, setBugParentId] = useState<number | null>(null);

  // ── Attachments drawer state ──
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerLabel, setDrawerLabel] = useState('');
  const [drawerAttachments, setDrawerAttachments] = useState<Attachment[]>([]);

  // ── Custom Filter States ──
  const [taskFilters, setTaskFilters] = useState({ name: '', status: '', assignees: '' });
  const [bugFilters, setBugFilters] = useState({ title: '', status: '', reporter: '' });

  const allFlatTasks = flattenTasks(tasks);
  const allFlatBugs = flattenBugs(bugs);

  // ── Manual Tree Filtering ──
  const filterTree = (nodes: TreeNode[], filters: Record<string, string>): TreeNode[] => {
    const activeFilters = Object.entries(filters).filter(([_, val]) => val !== '' && val != null);
    if (activeFilters.length === 0) return nodes;

    const filtered: TreeNode[] = [];
    for (const node of nodes) {
      let nodeMatches = true;
      for (const [key, val] of activeFilters) {
        let nodeVal = '';
        if (key === 'assignees') {
          nodeVal = (node.data.assignees || []).map((u: any) => u.username).join(' ').toLowerCase();
        } else if (key === 'reporter') {
          nodeVal = (node.data.reporter?.username || '').toLowerCase();
        } else {
          nodeVal = String(node.data[key] || '').toLowerCase();
        }
        
        const filterVal = String(val).toLowerCase();
        if (!nodeVal.includes(filterVal)) {
          nodeMatches = false;
          break;
        }
      }

      let filteredChildren: TreeNode[] = [];
      if (node.children && node.children.length > 0) {
        filteredChildren = filterTree(node.children, filters);
      }

      if (nodeMatches || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren,
          expanded: filteredChildren.length > 0 ? true : node.expanded
        });
      }
    }
    return filtered;
  };

  const statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' }
  ];

  // ── Task dialog handlers ──
  const openCreateTask = (parentId: number | null = null) => {
    setEditingTask(null);
    setTaskParentId(parentId);
    setTaskDialogVisible(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskParentId(null);
    setTaskDialogVisible(true);
  };

  const openTaskAttachments = (task: Task) => {
    setDrawerLabel(`Task: ${task.name}`);
    setDrawerAttachments(task.attachments ?? []);
    setDrawerVisible(true);
  };

  const handleSaveTask = async (
    data: TaskCreate | TaskUpdate,
    keepIds: number[],
    newFiles: File[],
  ) => {
    if (editingTask) {
      await updateTask(editingTask.id, data as TaskUpdate, keepIds, newFiles);
      toast.current?.show({ severity: 'success', summary: 'Updated', detail: 'Task updated', life: 2500 });
    } else {
      await createTask(data as TaskCreate);
      toast.current?.show({ severity: 'success', summary: 'Created', detail: 'Task created', life: 2500 });
    }
  };

  const handleDeleteTask = (task: Task) => {
    confirmDialog({
      message: `Delete task "${task.name}" and all sub-tasks?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deleteTask(task.id);
          toast.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Task deleted', life: 2500 });
        } catch {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Delete failed', life: 3000 });
        }
      },
    });
  };

  // ── Bug dialog handlers ──
  const openCreateBug = (parentId: number | null = null) => {
    setEditingBug(null);
    setBugParentId(parentId);
    setBugDialogVisible(true);
  };

  const openEditBug = (bug: Bug) => {
    setEditingBug(bug);
    setBugParentId(null);
    setBugDialogVisible(true);
  };

  const openBugAttachments = (bug: Bug) => {
    setDrawerLabel(`Bug: ${bug.title}`);
    setDrawerAttachments(bug.attachments ?? []);
    setDrawerVisible(true);
  };

  const handleSaveBug = async (
    data: BugCreate | BugUpdate,
    keepIds: number[],
    newFiles: File[],
  ) => {
    if (editingBug) {
      await updateBug(editingBug.id, data as BugUpdate, keepIds, newFiles);
      toast.current?.show({ severity: 'success', summary: 'Updated', detail: 'Bug updated', life: 2500 });
    } else {
      await createBug(data as BugCreate);
      toast.current?.show({ severity: 'success', summary: 'Created', detail: 'Bug reported', life: 2500 });
    }
  };

  const handleDeleteBug = (bug: Bug) => {
    confirmDialog({
      message: `Delete bug "${bug.title}" and all sub-bugs?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deleteBug(bug.id);
          toast.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Bug deleted', life: 2500 });
        } catch {
          toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Delete failed', life: 3000 });
        }
      },
    });
  };

  // ── Column templates — Tasks ──
  const taskNameTemplate = (node: TreeNode) => {
    const task = node.data as Task;
    const depth = (node.key as string).split('-').length - 1;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: depth === 0 ? 600 : 400 }}>{task.name}</span>
        {task.attachments?.length > 0 && (
          <Tag value={String(task.attachments.length)} icon="pi pi-paperclip"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '10px', padding: '1px 6px' }} />
        )}
      </div>
    );
  };

  const taskAssigneesTemplate = (node: TreeNode) => {
    const task = node.data as Task;
    const assignees = task.assignees ?? [];
    if (!assignees.length) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unassigned</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {assignees.slice(0, 3).map((a) => (
          <span key={a} style={{
            background: 'var(--accent-muted)', color: 'var(--accent)',
            borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 500,
          }}>{a}</span>
        ))}
        {assignees.length > 3 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>+{assignees.length - 3}</span>
        )}
      </div>
    );
  };

  const taskStatusTemplate = (node: TreeNode) => <StatusBadge status={(node.data as Task).status} />;

  const dateTemplate = (val: string | null) =>
    val ? <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{val}</span>
      : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>;

  const taskActionsTemplate = (node: TreeNode) => {
    const task = node.data as Task;
    const hasAttachments = (task.attachments?.length ?? 0) > 0;
    return (
      <div className="action-btn-group" style={{ minWidth: 136 }}>
        <Button
          icon="pi pi-paperclip"
          className="p-button-text p-button-sm"
          tooltip={hasAttachments ? `View ${task.attachments.length} attachment(s)` : undefined}
          onClick={hasAttachments ? () => openTaskAttachments(task) : undefined}
          style={{
            color: 'var(--accent)',
            visibility: hasAttachments ? 'visible' : 'hidden',
            pointerEvents: hasAttachments ? 'auto' : 'none',
          }}
        />
        <Button
          icon="pi pi-sitemap"
          className="p-button-text p-button-sm"
          tooltip="Add sub-task"
          onClick={() => openCreateTask(task.id)}
          style={{ color: 'var(--text-secondary)' }}
        />
        <Button
          icon="pi pi-pencil"
          className="p-button-text p-button-sm"
          tooltip="Edit task"
          onClick={() => openEditTask(task)}
          style={{ color: 'var(--text-secondary)' }}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-text p-button-sm p-button-danger"
          tooltip="Delete task"
          onClick={() => handleDeleteTask(task)}
        />
      </div>
    );
  };

  // ── Column templates — Bugs ──
  const bugTitleTemplate = (node: TreeNode) => {
    const bug = node.data as Bug;
    const depth = (node.key as string).split('-').length - 1;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <i className="pi pi-bug" style={{ color: '#f87171', fontSize: '12px' }} />
        <span style={{ fontWeight: depth === 0 ? 600 : 400 }}>{bug.title}</span>
        {bug.attachments?.length > 0 && (
          <Tag value={String(bug.attachments.length)} icon="pi pi-paperclip"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '10px', padding: '1px 6px' }} />
        )}
      </div>
    );
  };

  const bugReporterTemplate = (node: TreeNode) => {
    const bug = node.data as Bug;
    return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{bug.reporter}</span>;
  };

  const bugLinkedTaskTemplate = (node: TreeNode) => {
    const bug = node.data as Bug;
    if (!bug.task_id) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>;
    const task = allFlatTasks.find((t) => t.id === bug.task_id);
    return (
      <span style={{
        background: 'var(--bg-elevated)', color: 'var(--accent)',
        borderRadius: '6px', padding: '2px 8px', fontSize: '11px',
      }}>
        {task?.name ?? `Task #${bug.task_id}`}
      </span>
    );
  };

  const bugStatusTemplate = (node: TreeNode) => <StatusBadge status={(node.data as Bug).status} />;

  const bugActionsTemplate = (node: TreeNode) => {
    const bug = node.data as Bug;
    const hasAttachments = (bug.attachments?.length ?? 0) > 0;
    return (
      <div className="action-btn-group" style={{ minWidth: 136 }}>
        <Button
          icon="pi pi-paperclip"
          className="p-button-text p-button-sm"
          tooltip={hasAttachments ? `View ${bug.attachments.length} attachment(s)` : undefined}
          onClick={hasAttachments ? () => openBugAttachments(bug) : undefined}
          style={{
            color: 'var(--accent)',
            visibility: hasAttachments ? 'visible' : 'hidden',
            pointerEvents: hasAttachments ? 'auto' : 'none',
          }}
        />
        <Button
          icon="pi pi-sitemap"
          className="p-button-text p-button-sm"
          tooltip="Add sub-bug"
          onClick={() => openCreateBug(bug.id)}
          style={{ color: 'var(--text-secondary)' }}
        />
        <Button
          icon="pi pi-pencil"
          className="p-button-text p-button-sm"
          tooltip="Edit bug"
          onClick={() => openEditBug(bug)}
          style={{ color: 'var(--text-secondary)' }}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-text p-button-sm p-button-danger"
          tooltip="Delete bug"
          onClick={() => handleDeleteBug(bug)}
        />
      </div>
    );
  };

  const taskTreeNodes = buildTaskTree(tasks);
  const bugTreeNodes = buildBugTree(bugs);

  const filteredTaskTreeNodes = filterTree(taskTreeNodes, taskFilters);
  const filteredBugTreeNodes = filterTree(bugTreeNodes, bugFilters);

  const projectAttachments = project?.attachments ?? [];
  const totalAttachments = projectAttachments.length
    + allFlatTasks.reduce((s, t) => s + (t.attachments?.length ?? 0), 0)
    + allFlatBugs.reduce((s, b) => s + (b.attachments?.length ?? 0), 0);

  return (
    <>
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />

      {/* ── Attachments Drawer (tasks / bugs) ── */}
      <AttachmentsDrawer
        visible={drawerVisible}
        onHide={() => setDrawerVisible(false)}
        entityLabel={drawerLabel}
        attachments={drawerAttachments}
      />

      <PageHeader
        title={project?.name ?? `Project #${id}`}
        subtitle={project?.description ?? ''}
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project?.name ?? '…' }]}
        onBack={() => navigate('/projects')}
        actions={<StatusBadge status={project?.status ?? 'open'} />}
      />

      <div style={{ padding: '0 24px 24px' }}>
        {/* ── Summary cards ── */}
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <i className="pi pi-list-check" style={{ color: '#60a5fa' }} />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#60a5fa' }}>{allFlatTasks.length}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <i className="pi pi-bug" style={{ color: '#f87171' }} />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#f87171' }}>{allFlatBugs.length}</span>
              <span className="stat-label">Total Bugs</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <i className="pi pi-check-circle" style={{ color: '#34d399' }} />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#34d399' }}>
                {allFlatTasks.filter((t) => t.status === 'resolved').length}
              </span>
              <span className="stat-label">Tasks Resolved</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(167,139,250,0.12)' }}>
              <i className="pi pi-paperclip" style={{ color: '#a78bfa' }} />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#a78bfa' }}>{totalAttachments}</span>
              <span className="stat-label">Attachments</span>
            </div>
          </div>
        </div>

        {/* ── Tabs: Tasks | Bugs | Attachments ── */}
        <div className="pms-card">
          <TabView>
            {/* ══ Tasks Tab ══════════════════════════════════════════════════ */}
            <TabPanel
              header={`Tasks (${allFlatTasks.length})`}
              leftIcon="pi pi-list-check mr-2"
            >
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Collapsible hierarchy — click <i className="pi pi-chevron-right" /> to expand sub-tasks
                  </span>
                  <Button
                    label="Add Task"
                    icon="pi pi-plus"
                    onClick={() => openCreateTask(null)}
                    style={{ background: 'var(--accent)', border: 'none' }}
                  />
                </div>
              </div>

              {/* Custom Sleek Filter Bar for Tasks */}
              <div className="custom-filter-bar fade-in">
                <div className="custom-filter-item">
                  <span className="custom-filter-label">Task Name</span>
                  <InputText 
                    placeholder="Search name..." 
                    className="custom-filter-input"
                    value={taskFilters.name} 
                    onChange={(e) => setTaskFilters({ ...taskFilters, name: e.target.value })} 
                  />
                </div>
                <div className="custom-filter-item custom-filter-dropdown" style={{ maxWidth: '180px' }}>
                  <span className="custom-filter-label">Status</span>
                  <Dropdown 
                    options={statusOptions} 
                    value={taskFilters.status} 
                    onChange={(e) => setTaskFilters({ ...taskFilters, status: e.value })} 
                    placeholder="Filter status" 
                    showClear
                  />
                </div>
                <div className="custom-filter-item">
                  <span className="custom-filter-label">Assignees</span>
                  <InputText 
                    placeholder="Search user..." 
                    className="custom-filter-input"
                    value={taskFilters.assignees} 
                    onChange={(e) => setTaskFilters({ ...taskFilters, assignees: e.target.value })} 
                  />
                </div>
              </div>

              <TreeTable
                value={filteredTaskTreeNodes}
                loading={tasksLoading}
                scrollable
                tableStyle={{ minWidth: '880px' }}
                emptyMessage={
                  <div className="empty-state">
                    <i className="pi pi-list-check" />
                    <p>No tasks yet — add the first task!</p>
                  </div>
                }
              >
                <Column field="name" header="Task Name" body={taskNameTemplate} expander style={{ width: '280px' }} />
                <Column field="status" header="Status" body={taskStatusTemplate} style={{ width: '130px' }} />
                <Column field="assignees" header="Assignees" body={taskAssigneesTemplate} style={{ width: '200px' }} />
                <Column header="Start" body={(n) => dateTemplate((n.data as Task).start_date)} style={{ width: '110px' }} />
                <Column header="End" body={(n) => dateTemplate((n.data as Task).end_date)} style={{ width: '110px' }} />
                <Column header="Actions" body={taskActionsTemplate} style={{ width: '150px' }} />
              </TreeTable>
            </TabPanel>

            {/* ══ Bugs Tab ═══════════════════════════════════════════════════ */}
            <TabPanel
              header={`Bugs (${allFlatBugs.length})`}
              leftIcon="pi pi-bug mr-2"
            >
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Collapsible hierarchy — click <i className="pi pi-chevron-right" /> to expand sub-bugs
                  </span>
                  <Button
                    label="Report Bug"
                    icon="pi pi-plus"
                    onClick={() => openCreateBug(null)}
                    className="p-button-danger"
                    style={{ border: 'none' }}
                  />
                </div>
              </div>

              {/* Custom Sleek Filter Bar for Bugs */}
              <div className="custom-filter-bar fade-in">
                <div className="custom-filter-item">
                  <span className="custom-filter-label">Bug Title</span>
                  <InputText 
                    placeholder="Search title..." 
                    className="custom-filter-input"
                    value={bugFilters.title} 
                    onChange={(e) => setBugFilters({ ...bugFilters, title: e.target.value })} 
                  />
                </div>
                <div className="custom-filter-item custom-filter-dropdown" style={{ maxWidth: '180px' }}>
                  <span className="custom-filter-label">Status</span>
                  <Dropdown 
                    options={statusOptions} 
                    value={bugFilters.status} 
                    onChange={(e) => setBugFilters({ ...bugFilters, status: e.value })} 
                    placeholder="Filter status" 
                    showClear
                  />
                </div>
                <div className="custom-filter-item">
                  <span className="custom-filter-label">Reporter</span>
                  <InputText 
                    placeholder="Search user..." 
                    className="custom-filter-input"
                    value={bugFilters.reporter} 
                    onChange={(e) => setBugFilters({ ...bugFilters, reporter: e.target.value })} 
                  />
                </div>
              </div>

              <TreeTable
                value={filteredBugTreeNodes}
                loading={bugsLoading}
                scrollable
                tableStyle={{ minWidth: '960px' }}
                emptyMessage={
                  <div className="empty-state">
                    <i className="pi pi-bug" />
                    <p>No bugs reported — great work!</p>
                  </div>
                }
              >
                <Column field="title" header="Bug Title" body={bugTitleTemplate} expander style={{ width: '260px' }} />
                <Column field="status" header="Status" body={bugStatusTemplate} style={{ width: '130px' }} />
                <Column field="reporter" header="Reporter" body={bugReporterTemplate} style={{ width: '130px' }} />
                <Column header="Linked Task" body={bugLinkedTaskTemplate} style={{ width: '180px' }} />
                <Column header="Start" body={(n) => dateTemplate((n.data as Bug).start_date)} style={{ width: '110px' }} />
                <Column header="End" body={(n) => dateTemplate((n.data as Bug).end_date)} style={{ width: '110px' }} />
                <Column header="Actions" body={bugActionsTemplate} style={{ width: '150px' }} />
              </TreeTable>
            </TabPanel>

            {/* ══ Attachments Tab ═════════════════════════════════════════════ */}
            <TabPanel
              header={`Attachments (${projectAttachments.length})`}
              leftIcon="pi pi-paperclip mr-2"
            >
              {project ? (
                <ProjectAttachmentsPanel
                  projectId={id}
                  attachments={projectAttachments}
                  onAttachmentsChange={(updated) => {
                    if (project) setProject({ ...project, attachments: updated });
                  }}
                />
              ) : (
                <div className="empty-state">
                  <i className="pi pi-spin pi-spinner" />
                  <p>Loading project…</p>
                </div>
              )}
            </TabPanel>
          </TabView>
        </div>
      </div>

      {/* ── Task Dialog ── */}
      <TaskDialog
        visible={taskDialogVisible}
        task={editingTask}
        projectId={id}
        parentId={taskParentId}
        allTasks={allFlatTasks}
        onHide={() => setTaskDialogVisible(false)}
        onSave={handleSaveTask}
      />

      {/* ── Bug Dialog ── */}
      <BugDialog
        visible={bugDialogVisible}
        bug={editingBug}
        projectId={id}
        parentId={bugParentId}
        projectTasks={allFlatTasks}
        projectBugs={allFlatBugs}
        onHide={() => setBugDialogVisible(false)}
        onSave={handleSaveBug}
      />
    </>
  );
};

export default ProjectDetailPage;
