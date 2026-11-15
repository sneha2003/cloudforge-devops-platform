const state = { tasks: [], activity: [], search: '', project: '', priority: '' };
const $ = (selector) => document.querySelector(selector);
const statusLabels = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
const demoMode = window.WORKBOARD_DEMO === true;

const demoTasks = [
  { id: 101, title: 'Define release readiness checks', description: 'Document health probes and acceptance criteria for the next production release.', project: 'Platform Reliability', priority: 'high', status: 'done', due_date: '2026-11-08' },
  { id: 102, title: 'Review container security report', description: 'Triage image findings and record accepted remediation actions.', project: 'Security', priority: 'high', status: 'in_progress', due_date: '2026-11-18' },
  { id: 103, title: 'Validate rollback runbook', description: 'Run the recovery procedure against the candidate WorkBoard image.', project: 'Platform Reliability', priority: 'medium', status: 'in_progress', due_date: '2026-11-20' },
  { id: 104, title: 'Refine service-level dashboard', description: 'Align latency and availability panels with operational review needs.', project: 'Observability', priority: 'medium', status: 'todo', due_date: '2026-11-24' },
  { id: 105, title: 'Publish deployment evidence', description: 'Attach CI results, image digest and verification outcome to the release.', project: 'Delivery', priority: 'low', status: 'todo', due_date: '2026-11-26' },
  { id: 106, title: 'Add incident correlation', description: 'Link failed releases to recovery events in the operations console.', project: 'Observability', priority: 'medium', status: 'done', due_date: '2026-11-11' },
];
const demoActivity = [
  { id: 3, action: 'completed', detail: 'Completed “Define release readiness checks”', created_at: new Date(Date.now() - 36e5).toISOString() },
  { id: 2, action: 'updated', detail: 'Moved “Review container security report” to In progress', created_at: new Date(Date.now() - 3 * 36e5).toISOString() },
  { id: 1, action: 'created', detail: 'Created “Publish deployment evidence”', created_at: new Date(Date.now() - 22 * 36e5).toISOString() },
];

if (demoMode) {
  state.tasks = structuredClone(demoTasks);
  state.activity = structuredClone(demoActivity);
  document.documentElement.classList.add('demo-mode');
}

function demoStats() {
  const done = state.tasks.filter((task) => task.status === 'done').length;
  const inProgress = state.tasks.filter((task) => task.status === 'in_progress').length;
  const today = new Date().toISOString().slice(0, 10);
  return { total: state.tasks.length, done, in_progress: inProgress, overdue: state.tasks.filter((task) => task.due_date && task.due_date < today && task.status !== 'done').length, completion_rate: state.tasks.length ? Math.round(done / state.tasks.length * 100) : 0, projects: new Set(state.tasks.map((task) => task.project)).size };
}

function recordDemo(action, detail) {
  state.activity.unshift({ id: Date.now(), action, detail, created_at: new Date().toISOString() });
}

async function api(path, options = {}) {
  if (demoMode) {
    const id = Number(path.split('/').at(-1));
    const payload = options.body ? JSON.parse(options.body) : null;
    if (path === '/api/tasks' && (!options.method || options.method === 'GET')) return structuredClone(state.tasks);
    if (path === '/api/stats') return demoStats();
    if (path === '/api/activity') return structuredClone(state.activity);
    if (path === '/api/tasks' && options.method === 'POST') {
      const task = { ...payload, id: Math.max(100, ...state.tasks.map((item) => item.id)) + 1 };
      state.tasks.push(task); recordDemo('created', `Created “${task.title}”`); return structuredClone(task);
    }
    if (path.startsWith('/api/tasks/') && options.method === 'PATCH') {
      const task = state.tasks.find((item) => item.id === id);
      if (!task) throw new Error('Task not found');
      Object.assign(task, payload);
      recordDemo(payload.status ? (payload.status === 'done' ? 'completed' : 'updated') : 'updated', payload.status ? `Moved “${task.title}” to ${statusLabels[task.status]}` : `Updated “${task.title}”`);
      return structuredClone(task);
    }
    if (path.startsWith('/api/tasks/') && options.method === 'DELETE') {
      const index = state.tasks.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('Task not found');
      const [task] = state.tasks.splice(index, 1); recordDemo('deleted', `Deleted “${task.title}”`); return null;
    }
    throw new Error('Unsupported demo action');
  }
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'No due date';
const relativeTime = (value) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86400), 'day');
};

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function filteredTasks() {
  return state.tasks.filter((task) => {
    const needle = state.search.toLowerCase();
    return (!needle || `${task.title} ${task.description} ${task.project}`.toLowerCase().includes(needle))
      && (!state.project || task.project === state.project)
      && (!state.priority || task.priority === state.priority);
  });
}

function taskCard(task) {
  const overdue = task.due_date && task.status !== 'done' && task.due_date < new Date().toISOString().slice(0, 10);
  return `<article class="task-card" data-id="${task.id}">
    <div class="task-top"><span class="project-tag">${escapeHtml(task.project)}</span><button class="card-menu edit-task" data-id="${task.id}" aria-label="Edit ${escapeHtml(task.title)}">•••</button></div>
    <h3>${escapeHtml(task.title)}</h3>${task.description ? `<p>${escapeHtml(task.description)}</p>` : '<p>No description added.</p>'}
    <div class="task-meta"><span class="priority priority-${task.priority}">${task.priority}</span>
      <select class="status-select" data-id="${task.id}" aria-label="Change task status">${Object.entries(statusLabels).map(([value,label]) => `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <span class="due ${overdue ? 'overdue' : ''}">${overdue ? 'Overdue · ' : ''}${formatDate(task.due_date)}</span></div>
  </article>`;
}

function renderTasks() {
  const tasks = filteredTasks();
  const groups = { todo: [], in_progress: [], done: [] };
  tasks.forEach((task) => groups[task.status].push(task));
  [['todo', '#todo-list', '#count-todo'], ['in_progress', '#progress-list', '#count-progress'], ['done', '#done-list', '#count-done']].forEach(([status, list, count]) => {
    $(count).textContent = groups[status].length;
    $(list).innerHTML = groups[status].length ? groups[status].map(taskCard).join('') : '<div class="empty-state">No tasks here yet</div>';
  });
  $('#task-count').textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
  document.querySelectorAll('.edit-task').forEach((button) => button.addEventListener('click', () => openDialog(Number(button.dataset.id))));
  document.querySelectorAll('.status-select').forEach((select) => select.addEventListener('change', async () => {
    try { await api(`/api/tasks/${select.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); await refresh(); showToast('Task moved'); }
    catch (error) { showToast(error.message); }
  }));
}

function renderProjects() {
  const projects = [...new Set(state.tasks.map((task) => task.project))].sort();
  $('#project-filter').innerHTML = '<option value="">All projects</option>' + projects.map((project) => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`).join('');
  $('#project-filter').value = state.project;
}

function renderActivity() {
  $('#activity-list').innerHTML = state.activity.length ? state.activity.map((item) => `<article class="activity-item"><span class="activity-symbol">${item.action === 'completed' ? '✓' : item.action === 'deleted' ? '×' : '↗'}</span><span class="activity-copy"><strong>${escapeHtml(item.detail)}</strong><small>${relativeTime(item.created_at)}</small></span></article>`).join('') : '<div class="empty-state">Activity will appear as your team works.</div>';
}

function renderStats(stats) {
  $('#stat-done').textContent = stats.done; $('#stat-progress').textContent = stats.in_progress; $('#stat-total').textContent = stats.total; $('#stat-overdue').textContent = stats.overdue;
  $('#completion-rate').textContent = `${stats.completion_rate}%`; $('#project-count').textContent = `${stats.projects} project${stats.projects === 1 ? '' : 's'}`;
}

async function refresh() {
  try {
    const [tasks, stats, activity] = await Promise.all([api('/api/tasks'), api('/api/stats'), api('/api/activity')]);
    state.tasks = tasks; state.activity = activity; renderProjects(); renderTasks(); renderStats(stats); renderActivity();
  } catch (error) { showToast(`Could not load WorkBoard: ${error.message}`); }
}

function openDialog(id = null) {
  const task = id ? state.tasks.find((item) => item.id === id) : null;
  $('#task-form').reset(); $('#task-id').value = task?.id || ''; $('#task-title').value = task?.title || ''; $('#task-description').value = task?.description || ''; $('#task-project').value = task?.project || 'General'; $('#task-due-date').value = task?.due_date || ''; $('#task-priority').value = task?.priority || 'medium'; $('#task-status').value = task?.status || 'todo';
  $('#dialog-eyebrow').textContent = task ? 'EDIT TASK' : 'NEW TASK'; $('#dialog-title').textContent = task ? 'Update this work item' : 'Add work to the board'; $('#save-task').textContent = task ? 'Save changes' : 'Create task'; $('#form-error').classList.add('hidden'); $('#task-dialog').showModal(); $('#task-title').focus();
  $('#delete-task').classList.toggle('hidden', !task);
}

$('#task-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const id = $('#task-id').value;
  const payload = { title: $('#task-title').value, description: $('#task-description').value, project: $('#task-project').value, due_date: $('#task-due-date').value || null, priority: $('#task-priority').value, status: $('#task-status').value };
  try { await api(id ? `/api/tasks/${id}` : '/api/tasks', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); $('#task-dialog').close(); await refresh(); showToast(id ? 'Task updated' : 'Task created'); }
  catch (error) { $('#form-error').textContent = error.message; $('#form-error').classList.remove('hidden'); }
});

$('#new-task-button').addEventListener('click', () => openDialog()); $('#close-dialog').addEventListener('click', () => $('#task-dialog').close()); $('#cancel-dialog').addEventListener('click', () => $('#task-dialog').close());
$('#delete-task').addEventListener('click', async () => {
  const id = $('#task-id').value;
  if (!id || !window.confirm('Delete this task? This cannot be undone.')) return;
  try { await api(`/api/tasks/${id}`, { method: 'DELETE' }); $('#task-dialog').close(); await refresh(); showToast('Task deleted'); }
  catch (error) { $('#form-error').textContent = error.message; $('#form-error').classList.remove('hidden'); }
});
$('#search').addEventListener('input', (event) => { state.search = event.target.value; renderTasks(); }); $('#project-filter').addEventListener('change', (event) => { state.project = event.target.value; renderTasks(); }); $('#priority-filter').addEventListener('change', (event) => { state.priority = event.target.value; renderTasks(); });
document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active')); button.classList.add('active'); $('#board-view').classList.toggle('hidden', button.dataset.view !== 'board'); $('#activity-view').classList.toggle('hidden', button.dataset.view !== 'activity'); document.querySelector('.sidebar').classList.remove('open'); }));
$('.mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
$('#today').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
refresh();
if (demoMode) showToast('Portfolio demo · changes stay in this browser session');

