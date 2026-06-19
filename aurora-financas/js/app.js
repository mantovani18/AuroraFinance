/* =========================================================
   app.js
   Ponto de entrada do Aurora Finanças.
   Responsável por:
   - Inicializar storage e todos os módulos
   - Roteamento entre telas (SPA simples por troca de classe)
   - Tema claro/escuro com persistência
   - Sheet de configurações, reset de dados
   - Sistema de toast global
   ========================================================= */

const AuroraApp = (() => {
  let toastTimeout = null;

  async function init() {
    await AuroraStorage.init();
    await applyStoredTheme();

    bindNavigation();
    bindThemeToggle();
    bindSettingsSheet();
    bindResetData();
    setDefaultDates();

    AuroraChat.init();
    AuroraDashboard.init();
    AuroraTasks.init();
    AuroraStudies.init();
    AuroraExport.init();
    AuroraPWA.init();

    await AuroraDashboard.refreshAll();

    routeFromQueryParam();
  }

  /* ===================== NAVEGAÇÃO ===================== */
  function bindNavigation() {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => goTo(btn.dataset.view));
    });
    document.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => goTo(btn.dataset.go));
    });
    document.getElementById("fab-chat").addEventListener("click", () => goTo("chat"));
  }

  function goTo(viewName) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.dataset.view === viewName));
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("is-active", n.dataset.view === viewName));

    const fab = document.getElementById("fab-chat");
    fab.style.display = viewName === "chat" ? "none" : "flex";

    document.getElementById("views").scrollTop = 0;

    if (viewName === "financas") AuroraDashboard.renderFinanceView();
    if (viewName === "home") AuroraDashboard.renderHome();
  }

  function routeFromQueryParam() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view && document.getElementById(`view-${view}`)) goTo(view);
    else goTo("home");
  }

  /* ===================== TEMA ===================== */
  async function applyStoredTheme() {
    const stored = await AuroraStorage.getSetting("theme", null);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark === false ? "light" : "dark");
    setTheme(theme, false);
  }

  function setTheme(theme, persist = true) {
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");

    const darkToggle = document.getElementById("toggle-dark");
    if (darkToggle) darkToggle.checked = theme !== "light";

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", theme === "light" ? "#F4F6FB" : "#0B1020");

    if (persist) AuroraStorage.setSetting("theme", theme);
    window.dispatchEvent(new CustomEvent("aurora:theme-changed"));
  }

  function bindThemeToggle() {
    document.getElementById("btn-theme").addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      setTheme(isLight ? "dark" : "light");
    });
    document.getElementById("toggle-dark").addEventListener("change", (e) => {
      setTheme(e.target.checked ? "dark" : "light");
    });
  }

  /* ===================== SETTINGS SHEET ===================== */
  function bindSettingsSheet() {
    const backdrop = document.getElementById("settings-backdrop");
    document.getElementById("btn-settings").addEventListener("click", () => {
      backdrop.hidden = false;
    });
    document.getElementById("btn-close-settings").addEventListener("click", () => {
      backdrop.hidden = true;
    });
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.hidden = true;
    });
  }

  function bindResetData() {
    document.getElementById("reset-data").addEventListener("click", async () => {
      const confirmed = confirm("Isso vai apagar PERMANENTEMENTE todos os seus dados financeiros, tarefas, metas, notas e flashcards deste dispositivo. Deseja continuar?");
      if (!confirmed) return;
      await AuroraStorage.clearAll();
      toast("Todos os dados foram apagados.");
      setTimeout(() => window.location.reload(), 900);
    });
  }

  /* ===================== DATAS PADRÃO ===================== */
  function setDefaultDates() {
    const today = new Date().toISOString().slice(0, 10);
    const txDate = document.getElementById("tx-date");
    const planDate = document.getElementById("plan-date");
    if (txDate && !txDate.value) txDate.value = today;
    if (planDate) planDate.min = today;
  }

  /* ===================== TOAST ===================== */
  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove("is-visible"), 2600);
  }

  return { init, goTo, toast, setTheme };
})();

document.addEventListener("DOMContentLoaded", () => {
  AuroraApp.init();
});
