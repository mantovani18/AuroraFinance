/* =========================================================
   studies.js
   Área de Estudos:
   - Bloco de notas / resumos
   - Flashcards (frente/verso com navegação)
   - Planejamento de estudos (agenda integrada ao calendário)
   ========================================================= */

const AuroraStudies = (() => {
  let flashcards = [];
  let fcIndex = 0;
  let fcShowingBack = false;
  let editingNoteId = null;

  function init() {
    bindStudyTabs();
    bindNotes();
    bindFlashcards();
    bindStudyPlan();
    loadAll();
  }

  function bindStudyTabs() {
    document.querySelectorAll("#study-tabs .seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#study-tabs .seg-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        document.querySelectorAll(".study-panel").forEach((p) => p.classList.add("is-hidden"));
        document.getElementById(`study-${btn.dataset.study}`).classList.remove("is-hidden");
      });
    });
  }

  async function loadAll() {
    await renderNotes();
    await loadFlashcards();
    await renderStudyPlan();
  }

  /* ===================== NOTAS ===================== */
  function bindNotes() {
    const backdrop = document.getElementById("note-backdrop");
    document.getElementById("btn-new-note").addEventListener("click", () => openNoteModal());
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeNoteModal();
    });
    document.getElementById("note-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("note-title").value.trim();
      const body = document.getElementById("note-body").value.trim();
      if (!title) return;

      if (editingNoteId) {
        const all = await AuroraStorage.getAll("notes");
        const found = all.find((n) => n.id === editingNoteId);
        await AuroraStorage.put("notes", { ...found, title, body, updatedAt: Date.now() });
      } else {
        await AuroraStorage.put("notes", {
          id: AuroraStorage.generateId(),
          title,
          body,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      closeNoteModal();
      renderNotes();
    });
  }

  function openNoteModal(note = null) {
    editingNoteId = note ? note.id : null;
    document.getElementById("note-title").value = note ? note.title : "";
    document.getElementById("note-body").value = note ? note.body : "";
    document.getElementById("note-backdrop").hidden = false;
  }
  function closeNoteModal() {
    document.getElementById("note-backdrop").hidden = true;
    document.getElementById("note-form").reset();
    editingNoteId = null;
  }

  async function renderNotes() {
    const notes = (await AuroraStorage.getAll("notes")).sort((a, b) => b.updatedAt - a.updatedAt);
    const container = document.getElementById("note-list");
    container.innerHTML = "";
    if (notes.length === 0) {
      container.innerHTML = '<p class="empty-hint">Nenhuma nota ainda. Crie resumos de estudo ou anotações pessoais.</p>';
      return;
    }
    notes.forEach((n) => {
      const div = document.createElement("div");
      div.className = "note-item";
      div.innerHTML = `
        <div class="note-item__title">${escapeHTML(n.title)}</div>
        <div class="note-item__excerpt">${escapeHTML(n.body || "")}</div>
        <div class="note-item__date">${new Date(n.updatedAt).toLocaleDateString("pt-BR")}</div>
      `;
      div.addEventListener("click", () => openNoteModal(n));
      div.addEventListener("dblclick", async () => {
        if (confirm("Excluir esta nota?")) {
          await AuroraStorage.remove("notes", n.id);
          renderNotes();
        }
      });
      container.appendChild(div);
    });
  }

  /* ===================== FLASHCARDS ===================== */
  function bindFlashcards() {
    const backdrop = document.getElementById("flashcard-backdrop");
    document.getElementById("btn-new-flashcard").addEventListener("click", () => {
      backdrop.hidden = false;
    });
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.hidden = true;
    });
    document.getElementById("flashcard-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const front = document.getElementById("flashcard-front").value.trim();
      const back = document.getElementById("flashcard-back").value.trim();
      if (!front || !back) return;
      await AuroraStorage.put("flashcards", { id: AuroraStorage.generateId(), front, back, createdAt: Date.now() });
      e.target.reset();
      backdrop.hidden = true;
      await loadFlashcards();
    });

    document.getElementById("flashcard-stage").addEventListener("click", flipCard);
    document.getElementById("fc-flip").addEventListener("click", flipCard);
    document.getElementById("fc-prev").addEventListener("click", () => moveCard(-1));
    document.getElementById("fc-next").addEventListener("click", () => moveCard(1));
  }

  async function loadFlashcards() {
    flashcards = (await AuroraStorage.getAll("flashcards")).sort((a, b) => a.createdAt - b.createdAt);
    fcIndex = 0;
    fcShowingBack = false;
    renderFlashcardStage();
  }

  function renderFlashcardStage() {
    const stage = document.getElementById("flashcard-stage");
    const controls = document.getElementById("flashcard-controls");
    if (flashcards.length === 0) {
      stage.innerHTML = '<p class="empty-hint">Crie seu primeiro flashcard para começar a estudar.</p>';
      controls.style.display = "none";
      return;
    }
    controls.style.display = "flex";
    const card = flashcards[fcIndex];
    const content = fcShowingBack ? card.back : card.front;
    stage.innerHTML = `<div class="flashcard${fcShowingBack ? " is-back" : ""}">${escapeHTML(content)}</div>`;
    document.getElementById("fc-progress").textContent = `${fcIndex + 1}/${flashcards.length}`;
  }

  function flipCard() {
    if (flashcards.length === 0) return;
    fcShowingBack = !fcShowingBack;
    renderFlashcardStage();
  }
  function moveCard(delta) {
    if (flashcards.length === 0) return;
    fcIndex = (fcIndex + delta + flashcards.length) % flashcards.length;
    fcShowingBack = false;
    renderFlashcardStage();
  }

  /* ===================== PLANEJAMENTO DE ESTUDOS ===================== */
  function bindStudyPlan() {
    document.getElementById("plan-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const subject = document.getElementById("plan-subject").value.trim();
      const date = document.getElementById("plan-date").value;
      if (!subject || !date) {
        AuroraApp.toast("Informe a matéria e a data de estudo.");
        return;
      }
      await AuroraStorage.put("studyplan", {
        id: AuroraStorage.generateId(),
        subject,
        date: new Date(date + "T09:00:00").toISOString(),
        done: false,
        createdAt: Date.now(),
      });
      document.getElementById("plan-form").reset();
      renderStudyPlan();
      if (window.AuroraTasks) AuroraTasks.renderCalendar();
    });
  }

  async function renderStudyPlan() {
    const plans = (await AuroraStorage.getAll("studyplan")).sort((a, b) => new Date(a.date) - new Date(b.date));
    const ul = document.getElementById("plan-list");
    ul.innerHTML = "";
    if (plans.length === 0) {
      ul.innerHTML = '<li class="empty-hint">Agende seus estudos para organizar sua semana.</li>';
      return;
    }
    plans.forEach((p) => {
      const li = document.createElement("li");
      li.className = `check-item${p.done ? " is-done" : ""}`;
      li.innerHTML = `
        <input type="checkbox" ${p.done ? "checked" : ""} />
        <span class="check-item__text">${escapeHTML(p.subject)} — ${new Date(p.date).toLocaleDateString("pt-BR")}</span>
        <button class="check-item__del" aria-label="Remover">✕</button>
      `;
      li.querySelector("input").addEventListener("change", async (e) => {
        await AuroraStorage.put("studyplan", { ...p, done: e.target.checked });
        renderStudyPlan();
      });
      li.querySelector(".check-item__del").addEventListener("click", async () => {
        await AuroraStorage.remove("studyplan", p.id);
        renderStudyPlan();
        if (window.AuroraTasks) AuroraTasks.renderCalendar();
      });
      ul.appendChild(li);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();
