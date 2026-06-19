/* =========================================================
   tasks.js
   Módulo de Organização Pessoal:
   - Tarefas / Checklist
   - Metas financeiras (com barra de progresso)
   - Hábitos diários (com streak)
   - Calendário simples com eventos
   ========================================================= */

const AuroraTasks = (() => {
  let calendarDate = new Date();

  function init() {
    bindOrgTabs();
    bindTaskForm();
    bindGoalForm();
    bindHabitForm();
    bindCalendarNav();
    renderAll();
  }

  function bindOrgTabs() {
    document.querySelectorAll("#org-tabs .seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#org-tabs .seg-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        document.querySelectorAll(".org-panel").forEach((p) => p.classList.add("is-hidden"));
        document.getElementById(`org-${btn.dataset.org}`).classList.remove("is-hidden");
      });
    });
  }

  async function renderAll() {
    await renderTasks();
    await renderGoals();
    await renderHabits();
    await renderCalendar();
  }

  /* ===================== TAREFAS ===================== */
  function bindTaskForm() {
    document.getElementById("task-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("task-input");
      const text = input.value.trim();
      if (!text) return;
      await AuroraStorage.put("tasks", { id: AuroraStorage.generateId(), text, done: false, createdAt: Date.now() });
      input.value = "";
      renderTasks();
    });
  }

  async function renderTasks() {
    const tasks = (await AuroraStorage.getAll("tasks")).sort((a, b) => b.createdAt - a.createdAt);
    const ul = document.getElementById("task-list");
    ul.innerHTML = "";
    if (tasks.length === 0) {
      ul.innerHTML = '<li class="empty-hint">Nenhuma tarefa por aqui. Adicione a primeira!</li>';
      return;
    }
    tasks.forEach((t) => {
      const li = document.createElement("li");
      li.className = `check-item${t.done ? " is-done" : ""}`;
      li.innerHTML = `
        <input type="checkbox" ${t.done ? "checked" : ""} />
        <span class="check-item__text">${escapeHTML(t.text)}</span>
        <button class="check-item__del" aria-label="Remover">✕</button>
      `;
      li.querySelector("input").addEventListener("change", async (e) => {
        await AuroraStorage.put("tasks", { ...t, done: e.target.checked });
        renderTasks();
      });
      li.querySelector(".check-item__del").addEventListener("click", async () => {
        await AuroraStorage.remove("tasks", t.id);
        renderTasks();
      });
      ul.appendChild(li);
    });
  }

  /* ===================== METAS ===================== */
  function bindGoalForm() {
    document.getElementById("goal-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("goal-name").value.trim();
      const target = parseFloat(document.getElementById("goal-target").value);
      if (!name || !target || target <= 0) {
        AuroraApp.toast("Informe nome e valor objetivo da meta.");
        return;
      }
      await AuroraStorage.put("goals", {
        id: AuroraStorage.generateId(),
        name,
        target,
        current: 0,
        createdAt: Date.now(),
      });
      document.getElementById("goal-form").reset();
      renderGoals();
    });
  }

  async function renderGoals() {
    const goals = (await AuroraStorage.getAll("goals")).sort((a, b) => b.createdAt - a.createdAt);
    const ul = document.getElementById("goal-list");
    ul.innerHTML = "";
    if (goals.length === 0) {
      ul.innerHTML = '<li class="empty-hint">Crie metas para acompanhar seus objetivos financeiros.</li>';
      return;
    }
    goals.forEach((g) => {
      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
      const li = document.createElement("li");
      li.className = "goal-item";
      li.innerHTML = `
        <div class="goal-item__head"><span>${escapeHTML(g.name)}</span><span>${pct}%</span></div>
        <div class="goal-bar"><div class="goal-bar__fill" style="width:${pct}%"></div></div>
        <div class="goal-item__meta"><span>${formatCurrency(g.current)}</span><span>de ${formatCurrency(g.target)}</span></div>
        <div class="goal-item__actions">
          <button class="btn-outline goal-add">+ Adicionar valor</button>
          <button class="btn-outline btn-outline--danger goal-del">Excluir</button>
        </div>
      `;
      li.querySelector(".goal-add").addEventListener("click", async () => {
        const amount = parseFloat(prompt("Quanto deseja adicionar a essa meta? (R$)", "50"));
        if (!isNaN(amount) && amount > 0) {
          await AuroraStorage.put("goals", { ...g, current: g.current + amount });
          renderGoals();
        }
      });
      li.querySelector(".goal-del").addEventListener("click", async () => {
        await AuroraStorage.remove("goals", g.id);
        renderGoals();
      });
      ul.appendChild(li);
    });
  }

  /* ===================== HÁBITOS ===================== */
  function bindHabitForm() {
    document.getElementById("habit-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("habit-input");
      const name = input.value.trim();
      if (!name) return;
      await AuroraStorage.put("habits", {
        id: AuroraStorage.generateId(),
        name,
        streak: 0,
        lastDone: null,
        createdAt: Date.now(),
      });
      input.value = "";
      renderHabits();
    });
  }

  async function renderHabits() {
    const habits = (await AuroraStorage.getAll("habits")).sort((a, b) => b.createdAt - a.createdAt);
    const ul = document.getElementById("habit-list");
    ul.innerHTML = "";
    if (habits.length === 0) {
      ul.innerHTML = '<li class="empty-hint">Adicione hábitos para construir sua rotina ideal.</li>';
      return;
    }
    const todayStr = new Date().toDateString();
    habits.forEach((h) => {
      const doneToday = h.lastDone === todayStr;
      const li = document.createElement("li");
      li.className = "habit-item";
      li.innerHTML = `
        <button class="habit-check${doneToday ? " is-done" : ""}">${doneToday ? "✓" : ""}</button>
        <span class="habit-item__name">${escapeHTML(h.name)}</span>
        <span class="habit-streak">🔥 ${h.streak}</span>
      `;
      li.querySelector(".habit-check").addEventListener("click", async () => {
        if (doneToday) {
          await AuroraStorage.put("habits", { ...h, lastDone: null, streak: Math.max(0, h.streak - 1) });
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const continuedStreak = h.lastDone === yesterday.toDateString();
          await AuroraStorage.put("habits", {
            ...h,
            lastDone: todayStr,
            streak: continuedStreak ? h.streak + 1 : 1,
          });
        }
        renderHabits();
      });
      ul.appendChild(li);
    });
  }

  /* ===================== CALENDÁRIO ===================== */
  function bindCalendarNav() {
    document.getElementById("cal-prev").addEventListener("click", () => {
      calendarDate.setMonth(calendarDate.getMonth() - 1);
      renderCalendar();
    });
    document.getElementById("cal-next").addEventListener("click", () => {
      calendarDate.setMonth(calendarDate.getMonth() + 1);
      renderCalendar();
    });
  }

  async function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const title = document.getElementById("calendar-title");
    if (!grid) return;

    title.textContent = calendarDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const events = await AuroraStorage.getAll("events");
    const studyPlans = await AuroraStorage.getAll("studyplan");
    const allMarks = [...events.map((e) => e.date), ...studyPlans.map((p) => p.date)];

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    grid.innerHTML = "";
    ["D", "S", "T", "Q", "Q", "S", "S"].forEach((d) => {
      const el = document.createElement("div");
      el.className = "cal-dow";
      el.textContent = d;
      grid.appendChild(el);
    });

    for (let i = 0; i < startOffset; i++) {
      const el = document.createElement("div");
      el.className = "cal-day is-empty";
      grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = dateObj.toISOString().slice(0, 10);
      const isToday = dateObj.toDateString() === today.toDateString();
      const hasEvent = allMarks.some((m) => m && m.slice(0, 10) === dateKey);

      const el = document.createElement("div");
      el.className = `cal-day${isToday ? " is-today" : ""}${hasEvent ? " has-event" : ""}`;
      el.textContent = String(d);
      el.addEventListener("click", () => showDayEvents(dateKey, events, studyPlans));
      grid.appendChild(el);
    }
  }

  function showDayEvents(dateKey, events, studyPlans) {
    const container = document.getElementById("calendar-day-events");
    const dayEvents = events.filter((e) => e.date && e.date.slice(0, 10) === dateKey);
    const dayPlans = studyPlans.filter((p) => p.date && p.date.slice(0, 10) === dateKey);

    if (dayEvents.length === 0 && dayPlans.length === 0) {
      container.innerHTML = `<p class="empty-hint">Nenhum evento em ${formatDateBR(dateKey)}.</p>`;
      return;
    }
    let html = `<h4 style="margin:14px 0 8px;font-size:13px;color:var(--text-dim)">${formatDateBR(dateKey)}</h4><ul class="check-list">`;
    dayEvents.forEach((e) => (html += `<li class="check-item"><span class="check-item__text">📌 ${escapeHTML(e.title)}</span></li>`));
    dayPlans.forEach((p) => (html += `<li class="check-item"><span class="check-item__text">📚 Estudar: ${escapeHTML(p.subject)}</span></li>`));
    html += "</ul>";
    container.innerHTML = html;
  }

  function formatDateBR(dateKey) {
    const [y, m, d] = dateKey.split("-");
    return `${d}/${m}/${y}`;
  }
  function formatCurrency(v) {
    return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, renderCalendar, renderAll };
})();
