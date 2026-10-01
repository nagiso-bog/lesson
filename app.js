const STORAGE_KEY = "vista-lab-tasks";
const CREATED_KEY = "vista-lab-created";
const PAGE_SIZE = 4;

const form = document.querySelector("#taskForm");
const titleInput = document.querySelector("#taskTitle");
const detailInput = document.querySelector("#taskDetail");
const list = document.querySelector("#taskList");
const emptyMsg = document.querySelector("#emptyMsg");
const loadMoreBtn = document.querySelector("#loadMore");
const categoryFilter = document.querySelector("#categoryFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const searchInput = document.querySelector("#search");

const icons = {
  done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.5l3 3 6-6.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13v7a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h7"/><path d="M18 2.5l3.5 3.5L12 15.5H8.5V12z" fill="currentColor"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V3.5h8V6M5.5 6l1 15h11l1-15M10 10v7M14 10v7"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
};

// ---------- State ----------
let visibleCount = PAGE_SIZE;
let editingId = null;
let tasks = loadTasks();
let createdTotal = Number(localStorage.getItem(CREATED_KEY)) || 1500;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  // Demo tasks for the first launch
  const demo = [
    ["Learn Javascript", "Master the language powering the modern web.", "study", "high"],
    ["Learn CSS Grid", "Build flexible two-dimensional layouts.", "study", "medium"],
    ["Team meeting", "Discuss sprint goals with the team.", "work", "high"],
    ["Morning run", "Run 5 km in the park before work.", "personal", "low"],
    ["Code review", "Review pull requests from colleagues.", "work", "medium"],
    ["Read a book", "Finish two chapters of a new book.", "personal", "low"],
  ];
  return demo.map(([title, detail, category, priority], i) => ({
    id: Date.now() + i,
    title,
    detail,
    category,
    priority,
    date: "07-07-2023",
    done: i === 3,
  }));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(CREATED_KEY, String(createdTotal));
}

const pad = (n) => String(n).padStart(2, "0");
const formatDate = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

// ---------- Calendar (static, as in the design) ----------
function renderCalendar() {
  // April 2024: weeks 14–19, Monday first, the 3rd is highlighted
  const year = 2024;
  const month = 3;
  const highlighted = 3;

  const cells = ['<span></span>'];
  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach((d, i) => {
    cells.push(`<span class="cal-weekday${i > 4 ? " cal-weekend" : ""}">${d}</span>`);
  });

  const cursor = new Date(year, month, 1);
  for (let week = 14; week <= 19; week++) {
    cells.push(`<span class="cal-week">${week}</span>`);
    for (let i = 0; i < 7; i++) {
      const classes = [];
      const inMonth = cursor.getMonth() === month;
      if (inMonth) classes.push("cal-muted");
      if (i > 4) classes.push("cal-weekend");
      if (inMonth && cursor.getDate() === highlighted) classes.push("cal-today");
      cells.push(`<span class="${classes.join(" ")}">${cursor.getDate()}</span>`);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  document.querySelector("#calendar").innerHTML = cells.join("");
}

// ---------- Tasks ----------
function filteredTasks() {
  const query = searchInput.value.trim().toLowerCase();
  return tasks.filter((t) =>
    (categoryFilter.value === "all" || t.category === categoryFilter.value) &&
    (priorityFilter.value === "all" || t.priority === priorityFilter.value) &&
    t.title.toLowerCase().includes(query)
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML.replace(/"/g, "&quot;");
}

function createTaskItem(task) {
  const item = document.createElement("li");
  item.className = "task" + (task.done ? " task--done" : "");
  item.dataset.id = task.id;

  const isEditing = editingId === task.id;
  const body = isEditing
    ? `<input class="task__edit-input" name="title" value="${escapeHtml(task.title)}">
       <input class="task__edit-input" name="detail" value="${escapeHtml(task.detail)}">`
    : `<h3 class="task__title">${escapeHtml(task.title)}</h3>
       <p class="task__detail">${escapeHtml(task.detail)}</p>`;

  item.innerHTML = `
    <div class="task__body">
      ${body}
      <div class="task__meta">
        <span>Start date :</span><span>${task.date}</span>
        <span class="task__tag task__tag--${task.priority}">${task.priority}</span>
      </div>
    </div>
    <div class="task__actions">
      <button class="btn-done" data-action="done" title="${task.done ? "Mark as pending" : "Mark as done"}">${icons.done}</button>
      <button data-action="${isEditing ? "save" : "edit"}" title="${isEditing ? "Save" : "Edit"}">${isEditing ? icons.save : icons.edit}</button>
      <button data-action="delete" title="Delete">${icons.trash}</button>
    </div>`;
  return item;
}

function renderTasks() {
  const filtered = filteredTasks();
  list.innerHTML = "";
  filtered.slice(0, visibleCount).forEach((task) => list.append(createTaskItem(task)));

  emptyMsg.hidden = filtered.length > 0;
  loadMoreBtn.hidden = filtered.length <= visibleCount;
  renderStats();

  const editInput = list.querySelector(".task__edit-input");
  if (editInput) editInput.focus();
}

function renderStats() {
  const completed = tasks.filter((t) => t.done).length;
  document.querySelector("#completedCount").textContent = pad(completed);
  document.querySelector("#pendingCount").textContent = pad(tasks.length - completed);
  document.querySelector("#createdCount").textContent = createdTotal.toLocaleString("en-US");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  tasks.unshift({
    id: Date.now(),
    title,
    detail: detailInput.value.trim(),
    category: categoryFilter.value === "all" ? "personal" : categoryFilter.value,
    priority: priorityFilter.value === "all" ? "medium" : priorityFilter.value,
    date: formatDate(new Date()),
    done: false,
  });
  createdTotal++;
  searchInput.value = "";
  form.reset();
  titleInput.focus();
  save();
  renderTasks();
});

list.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.closest(".task").dataset.id);
  const task = tasks.find((t) => t.id === id);

  switch (btn.dataset.action) {
    case "done":
      task.done = !task.done;
      break;
    case "edit":
      editingId = id;
      break;
    case "save":
      saveEdit(task, btn.closest(".task"));
      break;
    case "delete":
      tasks = tasks.filter((t) => t.id !== id);
      break;
  }
  save();
  renderTasks();
});

function saveEdit(task, item) {
  const title = item.querySelector('[name="title"]').value.trim();
  if (title) task.title = title;
  task.detail = item.querySelector('[name="detail"]').value.trim();
  editingId = null;
}

list.addEventListener("keydown", (e) => {
  if (!e.target.classList.contains("task__edit-input")) return;
  if (e.key === "Enter") {
    const item = e.target.closest(".task");
    saveEdit(tasks.find((t) => t.id === Number(item.dataset.id)), item);
    save();
    renderTasks();
  } else if (e.key === "Escape") {
    editingId = null;
    renderTasks();
  }
});

loadMoreBtn.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderTasks();
});

[categoryFilter, priorityFilter, searchInput].forEach((el) =>
  el.addEventListener("input", () => {
    visibleCount = PAGE_SIZE;
    renderTasks();
  })
);

// ---------- Scale main to the screen ----------
const DESIGN_WIDTH = 860;
const container = document.querySelector(".container");

function scaleMain() {
  const scale = Math.max(1, document.documentElement.clientWidth / DESIGN_WIDTH);
  container.style.zoom = scale;
}
window.addEventListener("resize", scaleMain);

// ---------- Init ----------
scaleMain();
renderCalendar();
renderTasks();
