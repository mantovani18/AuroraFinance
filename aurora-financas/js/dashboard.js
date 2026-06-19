/* =========================================================
   dashboard.js
   Renderiza KPIs, gráficos (Chart.js) e listas de
   transações nas telas Início e Finanças. Também controla
   o modal de criação/edição manual de lançamentos.
   ========================================================= */

const AuroraDashboard = (() => {
  let charts = {};
  let currentPeriod = "week";
  let editingTxId = null;

  function chartColors() {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    return {
      grid: isLight ? "rgba(11,16,32,0.07)" : "rgba(255,255,255,0.07)",
      text: isLight ? "#5C6478" : "#9AA3B8",
      teal: "#2DD4BF",
      mint: "#34D399",
      coral: "#FF6B6B",
      gold: "#F5B942",
      indigo: "#6C7CFF",
    };
  }

  const PALETTE = ["#2DD4BF", "#34D399", "#F5B942", "#FF6B6B", "#6C7CFF", "#FF9F6C", "#5EC8E0", "#C792EA", "#9CCC65", "#FF80AB", "#80CBC4"];

  /* ---------- inicialização ---------- */
  function init() {
    bindPeriodTabs();
    bindTxModal();
    document.getElementById("filter-type").addEventListener("change", renderFinanceList);
    document.getElementById("filter-category").addEventListener("change", renderFinanceList);
    window.addEventListener("aurora:tx-updated", refreshAll);
    window.addEventListener("aurora:theme-changed", refreshAll);
  }

  async function refreshAll() {
    await renderHome();
    await renderFinanceView();
  }

  /* ===================== HOME ===================== */
  async function renderHome() {
    const summary = await AuroraFinance.getSummary();

    setText("home-balance", formatCurrency(summary.balance));
    setText("home-income", formatCurrency(summary.incomeMonth));
    setText("home-expense", formatCurrency(summary.expenseMonth));
    setText("kpi-income", formatCurrency(summary.incomeMonth));
    setText("kpi-expense", formatCurrency(summary.expenseMonth));
    setText("kpi-savings", formatCurrency(summary.savings));
    setText("kpi-count", String(summary.countMonth));

    await renderBalanceChart();
    await renderCategoryChart();
    await renderRecentList();
  }

  async function renderBalanceChart() {
    const { labels, values } = await AuroraFinance.getBalanceEvolution(30);
    const c = chartColors();
    const ctx = document.getElementById("chart-balance");
    if (!ctx) return;

    destroyChart("balance");
    charts.balance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Saldo",
            data: values,
            borderColor: c.teal,
            backgroundColor: makeGradient(ctx, c.teal),
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2.5,
          },
        ],
      },
      options: baseLineOptions(c),
    });
  }

  async function renderCategoryChart() {
    const data = await AuroraFinance.getCategoryBreakdown("expense", "month");
    const c = chartColors();
    const ctx = document.getElementById("chart-category");
    if (!ctx) return;

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const labels = entries.map(([key]) => AuroraFinance.getCategoryMeta("expense", key).label);
    const values = entries.map(([, v]) => v);

    destroyChart("category");

    if (entries.length === 0) {
      ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    charts.category = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: PALETTE, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { color: c.text, font: { size: 11 }, boxWidth: 10, padding: 12 } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}` } },
        },
      },
    });
  }

  async function renderRecentList() {
    const all = await AuroraFinance.listAll();
    renderTxList(document.getElementById("home-recent-list"), all.slice(0, 6));
  }

  /* ===================== FINANÇAS VIEW ===================== */
  function bindPeriodTabs() {
    document.querySelectorAll("#finance-period-tabs .seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#finance-period-tabs .seg-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        currentPeriod = btn.dataset.period;
        renderPeriodChart();
      });
    });
  }

  async function renderFinanceView() {
    await populateCategoryFilter();
    await renderPeriodChart();
    await renderComparisonChart();
    await renderFinanceList();
  }

  async function populateCategoryFilter() {
    const select = document.getElementById("filter-category");
    const currentVal = select.value;
    const allCats = [...AuroraFinance.getCategories("expense"), ...AuroraFinance.getCategories("income")];
    select.innerHTML = '<option value="all">Todas categorias</option>';
    const seen = new Set();
    allCats.forEach((c) => {
      if (seen.has(c.key)) return;
      seen.add(c.key);
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = `${c.icon} ${c.label}`;
      select.appendChild(opt);
    });
    select.value = currentVal || "all";
  }

  async function renderPeriodChart() {
    const { labels, incomeData, expenseData } = await AuroraFinance.getPeriodSeries(currentPeriod);
    const c = chartColors();
    const ctx = document.getElementById("chart-period");
    if (!ctx) return;
    destroyChart("period");
    charts.period = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Receitas", data: incomeData, backgroundColor: c.mint, borderRadius: 6, maxBarThickness: 26 },
          { label: "Despesas", data: expenseData, backgroundColor: c.coral, borderRadius: 6, maxBarThickness: 26 },
        ],
      },
      options: baseBarOptions(c),
    });
  }

  async function renderComparisonChart() {
    const { labels, incomeData, expenseData } = await AuroraFinance.getLast12MonthsComparison();
    const c = chartColors();
    const ctx = document.getElementById("chart-comparison");
    if (!ctx) return;
    destroyChart("comparison");
    charts.comparison = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Receitas", data: incomeData, backgroundColor: c.teal, borderRadius: 6, maxBarThickness: 22 },
          { label: "Despesas", data: expenseData, backgroundColor: c.gold, borderRadius: 6, maxBarThickness: 22 },
        ],
      },
      options: baseBarOptions(c),
    });
  }

  async function renderFinanceList() {
    const all = await AuroraFinance.listAll();
    const type = document.getElementById("filter-type").value;
    const cat = document.getElementById("filter-category").value;

    let filtered = all;
    if (type !== "all") filtered = filtered.filter((t) => t.type === type);
    if (cat !== "all") filtered = filtered.filter((t) => t.category === cat);

    renderTxList(document.getElementById("financas-list"), filtered);
  }

  /* ===================== LISTA GENÉRICA DE TRANSAÇÕES ===================== */
  function renderTxList(ulEl, txs) {
    if (!ulEl) return;
    ulEl.innerHTML = "";
    if (txs.length === 0) {
      ulEl.innerHTML = '<li class="empty-hint">Nenhum lançamento ainda. Use o chat ou o botão "+ Novo" para começar.</li>';
      return;
    }
    txs.forEach((t) => {
      const meta = AuroraFinance.getCategoryMeta(t.type, t.category);
      const li = document.createElement("li");
      li.className = "tx-item";
      li.innerHTML = `
        <div class="tx-item__icon">${meta.icon}</div>
        <div class="tx-item__body">
          <div class="tx-item__desc">${escapeHTML(t.description)}</div>
          <div class="tx-item__meta">${meta.label} · ${formatDate(t.date)}</div>
        </div>
        <div class="tx-item__value tx-item__value--${t.type}">${t.type === "income" ? "+" : "-"} ${formatCurrency(t.value)}</div>
      `;
      li.addEventListener("click", () => openTxModal(t));
      ulEl.appendChild(li);
    });
  }

  /* ===================== MODAL DE LANÇAMENTO ===================== */
  function bindTxModal() {
    const backdrop = document.getElementById("tx-backdrop");
    const form = document.getElementById("tx-form");
    const typeTabsWrap = document.getElementById("tx-type-tabs");

    document.getElementById("btn-add-tx").addEventListener("click", () => openTxModal());
    document.getElementById("fab-chat").addEventListener("click", () => {
      AuroraApp.goTo("chat");
    });

    typeTabsWrap.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        typeTabsWrap.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        populateCategorySelect(btn.dataset.type);
      });
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeTxModal();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const type = typeTabsWrap.querySelector(".seg-btn.is-active").dataset.type;
      const desc = document.getElementById("tx-desc").value.trim();
      const value = parseFloat(document.getElementById("tx-value").value);
      const category = document.getElementById("tx-category").value;
      const dateInput = document.getElementById("tx-date").value;
      const date = dateInput ? new Date(dateInput + "T12:00:00").toISOString() : new Date().toISOString();

      if (!desc || !value || value <= 0) {
        AuroraApp.toast("Preencha descrição e valor corretamente.");
        return;
      }

      if (editingTxId) {
        await AuroraFinance.update(editingTxId, { type, description: desc, value, category, date });
        AuroraApp.toast("Lançamento atualizado.");
      } else {
        await AuroraFinance.add({ type, description: desc, value, category, date, source: "manual" });
        AuroraApp.toast("Lançamento salvo com sucesso.");
      }

      closeTxModal();
      window.dispatchEvent(new CustomEvent("aurora:tx-updated"));
    });
  }

  function populateCategorySelect(type) {
    const select = document.getElementById("tx-category");
    select.innerHTML = "";
    AuroraFinance.getCategories(type).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = `${c.icon} ${c.label}`;
      select.appendChild(opt);
    });
  }

  function openTxModal(tx = null) {
    editingTxId = tx ? tx.id : null;
    document.getElementById("tx-modal-title").textContent = tx ? "Editar lançamento" : "Novo lançamento";
    const typeTabsWrap = document.getElementById("tx-type-tabs");
    const type = tx ? tx.type : "expense";

    typeTabsWrap.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.type === type));
    populateCategorySelect(type);

    document.getElementById("tx-desc").value = tx ? tx.description : "";
    document.getElementById("tx-value").value = tx ? tx.value : "";
    document.getElementById("tx-category").value = tx ? tx.category : AuroraFinance.getCategories(type)[0].key;
    document.getElementById("tx-date").value = tx ? new Date(tx.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

    document.getElementById("tx-backdrop").hidden = false;
  }

  function closeTxModal() {
    document.getElementById("tx-backdrop").hidden = true;
    document.getElementById("tx-form").reset();
    editingTxId = null;
  }

  /* ===================== HELPERS ===================== */
  function destroyChart(key) {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
  }

  function makeGradient(canvas, color) {
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 180);
    gradient.addColorStop(0, hexToRgba(color, 0.35));
    gradient.addColorStop(1, hexToRgba(color, 0));
    return gradient;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function baseLineOptions(c) {
    return {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.text, font: { size: 10 } } },
        y: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 10 }, callback: (v) => formatCompact(v) } },
      },
    };
  }

  function baseBarOptions(c) {
    return {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: c.text, font: { size: 11 }, boxWidth: 10 } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.text, font: { size: 10 } } },
        y: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 10 }, callback: (v) => formatCompact(v) } },
      },
    };
  }

  function formatCurrency(v) {
    return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function formatCompact(v) {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1).replace(".0", "") + "k";
    return v;
  }
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, refreshAll, renderHome, renderFinanceView, openTxModal };
})();
