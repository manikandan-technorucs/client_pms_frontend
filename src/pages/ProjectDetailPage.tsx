import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import DetailViewModal from '../components/ui/DetailViewModal';
import { useProjectsContext } from '../context/ProjectsContext';
import { useTasks } from '../hooks/useTasks';
import tasksApi from '../api/tasksApi';
import { useBugs } from '../hooks/useBugs';
import type {
  Task, TaskCreate, TaskUpdate,
  Bug, BugCreate, BugUpdate,
  Attachment,
} from '../types';
import type { DetailItem } from '../components/ui/DetailViewModal';

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

/** Filter a tree recursively — runs only when nodes or filters change */
function filterTree(nodes: TreeNode[], filters: Record<string, string>): TreeNode[] {
  const activeFilters = Object.entries(filters).filter(([_, val]) => val !== '' && val != null);
  if (activeFilters.length === 0) return nodes;

  const filtered: TreeNode[] = [];
  for (const node of nodes) {
    let nodeMatches = true;
    for (const [key, val] of activeFilters) {
      let nodeVal = '';
      if (key === 'assignees') {
        nodeVal = (node.data.assignees || []).join(' ').toLowerCase();
      } else if (key === 'reporter') {
        nodeVal = String(node.data.reporter || '').toLowerCase();
      } else {
        nodeVal = String(node.data[key] || '').toLowerCase();
      }
      if (!nodeVal.includes(String(val).toLowerCase())) {
        nodeMatches = false;
        break;
      }
    }

    let filteredChildren: TreeNode[] = [];
    if (node.children?.length) {
      filteredChildren = filterTree(node.children, filters);
    }

    if (nodeMatches || filteredChildren.length > 0) {
      filtered.push({
        ...node,
        children: filteredChildren,
        expanded: filteredChildren.length > 0 ? true : node.expanded,
      });
    }
  }
  return filtered;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  // ── Project from shared context — NO additional API call ──────────────────
  const { projects } = useProjectsContext();
  const project = useMemo(
    () => projects.find((p) => p.id === id) ?? null,
    [projects, id],
  );

  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask, refresh: refreshTasks } = useTasks(id);
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

  // ── Detail view modal state (double-click) ── callbacks defined after memos
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const closeDetail = () => setDetailItem(null);

  // ── Custom Filter States ──
  const [taskFilters, setTaskFilters] = useState({ name: '', status: '', assignees: '' });
  const [bugFilters, setBugFilters] = useState({ title: '', status: '', reporter: '' });

  // ── Memoized derived data — prevents recomputing on every render ──────────
  const allFlatTasks = useMemo(() => flattenTasks(tasks), [tasks]);
  const allFlatBugs = useMemo(() => flattenBugs(bugs), [bugs]);

  const taskTreeNodes = useMemo(() => buildTaskTree(tasks), [tasks]);
  const bugTreeNodes = useMemo(() => buildBugTree(bugs), [bugs]);

  // filterTree only runs when the tree data OR filters change (not on every render)
  const filteredTaskTreeNodes = useMemo(
    () => filterTree(taskTreeNodes, taskFilters),
    [taskTreeNodes, taskFilters],
  );
  const filteredBugTreeNodes = useMemo(
    () => filterTree(bugTreeNodes, bugFilters),
    [bugTreeNodes, bugFilters],
  );

  // Attachment count — memoized to avoid re-calculation on unrelated renders
  const totalAttachments = useMemo(() => {
    const projectCount = project?.attachments?.length ?? 0;
    const taskCount = allFlatTasks.reduce((s, t) => s + (t.attachments?.length ?? 0), 0);
    const bugCount = allFlatBugs.reduce((s, b) => s + (b.attachments?.length ?? 0), 0);
    return projectCount + taskCount + bugCount;
  }, [project, allFlatTasks, allFlatBugs]);

  // ── Detail view modal callbacks (need allFlatTasks — declared above) ──
  const openTaskDetail = useCallback((task: Task) =>
    setDetailItem({ type: 'task', data: task }),
  []);
  const openBugDetail = useCallback((bug: Bug) => {
    const taskName = bug.task_id
      ? allFlatTasks.find(t => t.id === bug.task_id)?.name ?? `Task #${bug.task_id}`
      : undefined;
    setDetailItem({ type: 'bug', data: bug, taskName });
  }, [allFlatTasks]);

  const statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' }
  ];

  // ── Task dialog handlers ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      const res = await tasksApi.importCsv(id, file);
      toast.current?.show({ severity: 'success', summary: 'Import Successful', detail: res.message, life: 3000 });
      await refreshTasks();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Import failed';
      toast.current?.show({ severity: 'error', summary: 'Import Failed', detail: msg, life: 5000 });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCreateTask = useCallback((parentId: number | null = null) => {
    setEditingTask(null);
    setTaskParentId(parentId);
    setTaskDialogVisible(true);
  }, []);

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskParentId(null);
    setTaskDialogVisible(true);
  }, []);

  const openTaskAttachments = useCallback((task: Task) => {
    setDrawerLabel(`Task: ${task.name}`);
    setDrawerAttachments(task.attachments ?? []);
    setDrawerVisible(true);
  }, []);

  const handleSaveTask = useCallback(async (
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
  }, [editingTask, updateTask, createTask]);

  const handleDeleteTask = useCallback((task: Task) => {
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
  }, [deleteTask]);

  // ── Bug dialog handlers ──
  const openCreateBug = useCallback((parentId: number | null = null) => {
    setEditingBug(null);
    setBugParentId(parentId);
    setBugDialogVisible(true);
  }, []);

  const openEditBug = useCallback((bug: Bug) => {
    setEditingBug(bug);
    setBugParentId(null);
    setBugDialogVisible(true);
  }, []);

  const openBugAttachments = useCallback((bug: Bug) => {
    setDrawerLabel(`Bug: ${bug.title}`);
    setDrawerAttachments(bug.attachments ?? []);
    setDrawerVisible(true);
  }, []);

  const handleSaveBug = useCallback(async (
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
  }, [editingBug, updateBug, createBug]);

  const handleDeleteBug = useCallback((bug: Bug) => {
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
  }, [deleteBug]);

  // ── Column templates — Tasks ──
  const taskNameTemplate = useCallback((node: TreeNode) => {
    const task = node.data as Task;
    const depth = (node.key as string).split('-').length - 1;
    
    const subtasks = task.subtasks || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(s => s.status === 'resolved' || s.status === 'closed').length;
    const progressText = totalSubtasks > 0 ? ` (${completedSubtasks}/${totalSubtasks})` : '';

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span
          className="dbl-click-cell"
          style={{ fontWeight: depth === 0 ? 600 : 400 }}
          onDoubleClick={(e) => { e.stopPropagation(); openTaskDetail(task); }}
          title="Double-click for details"
        >
          {task.name}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{progressText}</span>
        </span>
        {task.attachments?.length > 0 && (
          <Tag value={String(task.attachments.length)} icon="pi pi-paperclip"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '10px', padding: '1px 6px' }} />
        )}
      </div>
    );
  }, [openTaskDetail]);

  const taskAssigneesTemplate = useCallback((node: TreeNode) => {
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
  }, []);

  const taskStatusTemplate = useCallback(
    (node: TreeNode) => <StatusBadge status={(node.data as Task).status} />, []
  );

  const dateTemplate = useCallback((val: string | null) =>
    val ? <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{val}</span>
      : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>,
  []);

  const taskActionsTemplate = useCallback((node: TreeNode) => {
    const task = node.data as Task;
    const depth = (node.key as string).split('-').length - 1;
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
        {depth === 0 && (
          <Button
            icon="pi pi-sitemap"
            className="p-button-text p-button-sm"
            tooltip="Add sub-task"
            onClick={() => openCreateTask(task.id)}
            style={{ color: 'var(--text-secondary)' }}
          />
        )}
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
  }, [openTaskAttachments, openCreateTask, openEditTask, handleDeleteTask]);

  // ── Column templates — Bugs ──
  const bugTitleTemplate = useCallback((node: TreeNode) => {
    const bug = node.data as Bug;
    const depth = (node.key as string).split('-').length - 1;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <i className="pi pi-bug" style={{ color: '#f87171', fontSize: '12px' }} />
        <span
          className="dbl-click-cell"
          style={{ fontWeight: depth === 0 ? 600 : 400 }}
          onDoubleClick={(e) => { e.stopPropagation(); openBugDetail(bug); }}
          title="Double-click for details"
        >
          {bug.title}
        </span>
        {bug.attachments?.length > 0 && (
          <Tag value={String(bug.attachments.length)} icon="pi pi-paperclip"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '10px', padding: '1px 6px' }} />
        )}
      </div>
    );
  }, [openBugDetail]);

  const bugReporterTemplate = useCallback((node: TreeNode) => {
    const bug = node.data as Bug;
    return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{bug.reporter}</span>;
  }, []);

  const bugLinkedTaskTemplate = useCallback((node: TreeNode) => {
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
  }, [allFlatTasks]);

  const bugStatusTemplate = useCallback(
    (node: TreeNode) => <StatusBadge status={(node.data as Bug).status} />, []
  );

  const bugActionsTemplate = useCallback((node: TreeNode) => {
    const bug = node.data as Bug;
    const depth = (node.key as string).split('-').length - 1;
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
        {depth === 0 && (
          <Button
            icon="pi pi-sitemap"
            className="p-button-text p-button-sm"
            tooltip="Add sub-bug"
            onClick={() => openCreateBug(bug.id)}
            style={{ color: 'var(--text-secondary)' }}
          />
        )}
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
  }, [openBugAttachments, openCreateBug, openEditBug, handleDeleteBug]);

  const projectAttachments = project?.attachments ?? [];

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
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvImport} style={{ display: 'none' }} />
                  <Button
                    label="Import CSV"
                    icon="pi pi-upload"
                    loading={isImporting}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
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
                    onChange={(e) => setTaskFilters((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="custom-filter-item custom-filter-dropdown" style={{ maxWidth: '180px' }}>
                  <span className="custom-filter-label">Status</span>
                  <Dropdown
                    options={statusOptions}
                    value={taskFilters.status}
                    onChange={(e) => setTaskFilters((prev) => ({ ...prev, status: e.value ?? '' }))}
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
                    onChange={(e) => setTaskFilters((prev) => ({ ...prev, assignees: e.target.value }))}
                  />
                </div>
              </div>

              <TreeTable
                value={filteredTaskTreeNodes}
                loading={tasksLoading}
                scrollable
                paginator
                rows={10}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
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
                    onChange={(e) => setBugFilters((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="custom-filter-item custom-filter-dropdown" style={{ maxWidth: '180px' }}>
                  <span className="custom-filter-label">Status</span>
                  <Dropdown
                    options={statusOptions}
                    value={bugFilters.status}
                    onChange={(e) => setBugFilters((prev) => ({ ...prev, status: e.value ?? '' }))}
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
                    onChange={(e) => setBugFilters((prev) => ({ ...prev, reporter: e.target.value }))}
                  />
                </div>
              </div>

              <TreeTable
                value={filteredBugTreeNodes}
                loading={bugsLoading}
                scrollable
                paginator
                rows={10}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                tableStyle={{ minWidth: '880px' }}
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
                  onAttachmentsChange={() => {
                    // Attachment changes are reflected via context refresh
                    // (ProjectAttachmentsPanel handles its own local state)
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

      {/* ── Detail View Modal (double-click) ── */}
      <DetailViewModal
        item={detailItem}
        onHide={closeDetail}
        onEdit={
          detailItem?.type === 'task'
            ? () => openEditTask(detailItem.data as Task)
            : detailItem?.type === 'bug'
            ? () => openEditBug(detailItem.data as Bug)
            : undefined
        }
      />
    </>
  );
};

export default ProjectDetailPage;
