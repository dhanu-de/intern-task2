/**
 * TaskFlow — script.js
 * Vanilla JavaScript To-Do List App
 * Features: Add, Complete, Delete, Filter, LocalStorage, Dark Mode, Datetime
 */

'use strict';

// ── DOM References ───────────────────────────────────────────
const taskInput      = document.getElementById('taskInput');
const taskStartInput = document.getElementById('taskStartInput');
const taskEndInput   = document.getElementById('taskEndInput');
const addBtn         = document.getElementById('addBtn');
const taskList       = document.getElementById('taskList');
const emptyState     = document.getElementById('emptyState');
const errorMsg       = document.getElementById('errorMsg');
const totalCount     = document.getElementById('totalCount');
const completedCount = document.getElementById('completedCount');
const pendingCount   = document.getElementById('pendingCount');
const clearCompleted = document.getElementById('clearCompleted');
const themeToggle    = document.getElementById('themeToggle');
const footerDatetime = document.getElementById('footerDatetime');
const filterBtns     = document.querySelectorAll('.filter-btn');

// ── State ────────────────────────────────────────────────────
let tasks  = [];          // Array of task objects
let filter = 'all';       // 'all' | 'active' | 'completed'

// ── LocalStorage Helpers ─────────────────────────────────────
function saveTasks() {
  localStorage.setItem('taskflow-tasks', JSON.stringify(tasks));
}

function loadTasks() {
  const stored = localStorage.getItem('taskflow-tasks');
  tasks = stored ? JSON.parse(stored) : [];
}

function saveTheme(theme) {
  localStorage.setItem('taskflow-theme', theme);
}

function loadTheme() {
  return localStorage.getItem('taskflow-theme') || 'light';
}

// ── Task Factory ─────────────────────────────────────────────
function createTask(text, startAt = null, endAt = null) {
  return {
    id:          Date.now(),            // Unique ID using timestamp
    text:        text.trim(),
    completed:   false,
    createdAt:   new Date().toISOString(),
    startAt:     startAt,
    endAt:       endAt,
    completedAt: null
  };
}

// ── Format Date ──────────────────────────────────────────────
function formatTaskDate(isoString, prefix = '') {
  if (!isoString) return '';
  const d = new Date(isoString);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return prefix ? `${prefix}: ${time} · ${date}` : `${time} · ${date}`;
}

function updateFooterDatetime() {
  const now = new Date();
  footerDatetime.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  }) + ' · ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Build a Task <li> Element ────────────────────────────────
function createTaskElement(task) {
  const li = document.createElement('li');
  li.classList.add('task-item');
  if (task.completed) li.classList.add('completed');
  li.dataset.id = task.id;

  // Checkbox
  const checkbox = document.createElement('div');
  checkbox.classList.add('task-checkbox');
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute('aria-checked', task.completed);
  checkbox.setAttribute('tabindex', '0');
  checkbox.title = task.completed ? 'Mark incomplete' : 'Mark complete';

  const checkMark = document.createElement('span');
  checkMark.classList.add('check-mark');
  checkMark.textContent = '✓';
  checkbox.appendChild(checkMark);

  // Task body
  const body = document.createElement('div');
  body.classList.add('task-body');

  const textEl = document.createElement('p');
  textEl.classList.add('task-text');
  textEl.textContent = task.text;

  const startMeta = document.createElement('p');
  startMeta.classList.add('task-meta');
  startMeta.textContent = formatTaskDate(task.startAt, 'Start');

  const endMeta = document.createElement('p');
  endMeta.classList.add('task-meta');
  endMeta.textContent = formatTaskDate(task.endAt, 'End');

  const createdMeta = document.createElement('p');
  createdMeta.classList.add('task-meta', 'meta-secondary');
  createdMeta.textContent = formatTaskDate(task.createdAt, 'Created');

  body.appendChild(textEl);
  body.appendChild(startMeta);
  body.appendChild(endMeta);
  body.appendChild(createdMeta);

  if (task.completed) {
    const statusMeta = document.createElement('p');
    statusMeta.classList.add('task-meta', 'task-status');
    if (task.endAt && task.completedAt) {
      const completedTime = new Date(task.completedAt);
      const endTime = new Date(task.endAt);
      const onTime = completedTime <= endTime;
      statusMeta.textContent = onTime ? 'Done on time' : 'Completed late';
      statusMeta.classList.add(onTime ? 'status-on-time' : 'status-late');
    } else {
      statusMeta.textContent = 'Completed';
    }
    body.appendChild(statusMeta);
  }

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('task-delete');
  deleteBtn.setAttribute('aria-label', 'Delete task');
  deleteBtn.title = 'Delete task';
  deleteBtn.textContent = '×';

  // ── Event: Toggle Complete ──────────────────────────────────
  function toggleComplete() {
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    li.classList.toggle('completed', task.completed);
    checkbox.setAttribute('aria-checked', task.completed);
    checkbox.title = task.completed ? 'Mark incomplete' : 'Mark complete';
    saveTasks();
    renderTasks();
    updateStats();
    applyFilter();
  }

  checkbox.addEventListener('click', toggleComplete);
  // Keyboard accessibility for checkbox
  checkbox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleComplete();
    }
  });

  // ── Event: Delete Task ──────────────────────────────────────
  deleteBtn.addEventListener('click', () => {
    // Animate out, then remove
    li.classList.add('removing');
    li.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks();
      updateStats();
    }, { once: true });
  });

  li.appendChild(checkbox);
  li.appendChild(body);
  li.appendChild(deleteBtn);

  return li;
}

// ── Render Tasks ─────────────────────────────────────────────
function renderTasks() {
  taskList.innerHTML = '';

  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach(task => {
      taskList.appendChild(createTaskElement(task));
    });
  }

  updateStats();
}

// ── Filter Logic ─────────────────────────────────────────────
function getFilteredTasks() {
  if (filter === 'active')    return tasks.filter(t => !t.completed);
  if (filter === 'completed') return tasks.filter(t => t.completed);
  return tasks;
}

function applyFilter() {
  renderTasks();
}

// ── Update Stats Counter ─────────────────────────────────────
function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending   = total - completed;

  totalCount.textContent     = total;
  completedCount.textContent = completed;
  pendingCount.textContent   = pending;
}

// ── Add Task ─────────────────────────────────────────────────
function addTask() {
  const text = taskInput.value.trim();
  const startValue = taskStartInput.value;
  const endValue = taskEndInput.value;

  if (!text) {
    showError('Please enter a task first!');
    taskInput.focus();
    return;
  }

  if (!startValue || !endValue) {
    showError('Please set both start and end time.');
    return;
  }

  const startAt = new Date(startValue).toISOString();
  const endAt = new Date(endValue).toISOString();

  if (new Date(startAt) > new Date(endAt)) {
    showError('Start time cannot be after end time.');
    taskStartInput.focus();
    return;
  }

  clearError();

  const newTask = createTask(text, startAt, endAt);
  tasks.push(newTask);     // Add to tasks array

  saveTasks();
  renderTasks();

  taskInput.value = '';    // Clear inputs
  taskStartInput.value = '';
  taskEndInput.value = '';
  taskInput.focus();
}

// ── Error Handling ───────────────────────────────────────────
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add('visible');
  taskInput.style.borderColor = '#c05050';
  taskInput.style.boxShadow   = '0 0 0 4px rgba(192,80,80,0.12)';
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.remove('visible');
  taskInput.style.borderColor = '';
  taskInput.style.boxShadow   = '';
}

// ── Clear Completed Tasks ────────────────────────────────────
function clearCompletedTasks() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
}

// ── Dark Mode ────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  saveTheme(next);
}

// ── Event Listeners ──────────────────────────────────────────

// Add button click
addBtn.addEventListener('click', addTask);

// Enter key on input
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

// Clear error when typing
taskInput.addEventListener('input', () => {
  if (taskInput.value.trim()) clearError();
});

// Filter tabs — event delegation on parent, but also direct on buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;

    // Update active state
    filterBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    applyFilter();
  });
});

// Clear completed
clearCompleted.addEventListener('click', clearCompletedTasks);

// Dark mode toggle
themeToggle.addEventListener('click', toggleTheme);

// ── Initialise App ───────────────────────────────────────────
function init() {
  loadTasks();
  applyTheme(loadTheme());
  renderTasks();
  updateFooterDatetime();

  // Update clock every minute
  setInterval(updateFooterDatetime, 60000);
}

init();