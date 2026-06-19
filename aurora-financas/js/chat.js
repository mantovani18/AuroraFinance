/* =========================================================
   chat.js
   Tela de chat conversacional. Interpreta mensagens do
   usuário usando a IA local baseada em regras (finance.js),
   registra lançamentos automaticamente e responde em
   linguagem natural.
   ========================================================= */

const AuroraChat = (() => {
  let messagesEl, formEl, inputEl, introEl;

  function init() {
    messagesEl = document.getElementById("chat-messages");
    formEl = document.getElementById("chat-form");
    inputEl = document.getElementById("chat-input");
    introEl = document.getElementById("chat-intro");

    formEl.addEventListener("submit", onSubmit);

    document.querySelectorAll(".suggestion-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        inputEl.value = chip.dataset.fill;
        formEl.dispatchEvent(new Event("submit", { cancelable: true }));
      });
    });

    loadHistory();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";

    addMessage("user", text);
    await persistMessage("user", text);
    hideIntroIfNeeded();

    await handleMessage(text);
  }

  function hideIntroIfNeeded() {
    if (introEl) introEl.style.display = "none";
  }

  async function handleMessage(text) {
    // 1) tenta detectar lançamento financeiro
    const parsed = AuroraFinance.parseMessage(text);

    if (parsed) {
      const tx = await AuroraFinance.add({ ...parsed, source: "chat" });
      const catMeta = AuroraFinance.getCategoryMeta(tx.type, tx.category);
      const verb = tx.type === "income" ? "Receita adicionada ao seu histórico" : "Despesa registrada com sucesso";
      const reply =
        `<strong>${verb}!</strong> ${catMeta.icon} ${formatCurrency(tx.value)} em <strong>${catMeta.label}</strong>` +
        (tx.description && tx.description.toLowerCase() !== catMeta.label.toLowerCase() ? ` — "${tx.description}"` : "");
      await respond(reply);

      // notifica outros módulos para atualizarem
      window.dispatchEvent(new CustomEvent("aurora:tx-updated"));
      return;
    }

    // 2) tenta detectar intenção de pergunta
    const intent = AuroraFinance.detectQueryIntent(text);
    if (intent) {
      const summary = await AuroraFinance.getSummary();
      let reply = "";
      switch (intent) {
        case "balance":
          reply = `Seu saldo atual é de <strong>${formatCurrency(summary.balance)}</strong>.`;
          break;
        case "expense_total":
          reply = `Você gastou <strong>${formatCurrency(summary.expenseMonth)}</strong> este mês.`;
          break;
        case "income_total":
          reply = `Você recebeu <strong>${formatCurrency(summary.incomeMonth)}</strong> este mês.`;
          break;
        case "savings":
          reply = `Sua economia acumulada é de <strong>${formatCurrency(summary.savings)}</strong>. Continue assim! 💪`;
          break;
        case "help":
          reply =
            "Posso te ajudar a registrar receitas e despesas só de conversar comigo. Tente algo como <em>\"Gastei R$ 50 no mercado\"</em> ou <em>\"Recebi R$ 1200 de freelance\"</em>. Também posso te dizer seu saldo, gastos e economia. 🙂";
          break;
      }
      await respond(reply);
      return;
    }

    // 3) não entendeu — orienta o usuário
    await respond(
      "Não consegui identificar um valor nessa mensagem. 🤔 Tente algo como <em>\"Gastei R$ 35 com Uber\"</em> ou <em>\"Recebi R$ 800 de freelance\"</em>."
    );
  }

  async function respond(html) {
    // pequena pausa para simular "pensamento" da assistente, sem usar API externa
    await new Promise((r) => setTimeout(r, 320));
    addMessage("bot", html, true);
    await persistMessage("bot", html);
  }

  function addMessage(role, content, isHTML = false) {
    const div = document.createElement("div");
    div.className = `msg msg--${role}`;
    if (isHTML) div.innerHTML = content;
    else div.textContent = content;

    const time = document.createElement("small");
    time.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    div.appendChild(time);

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ---------- persistência simples do histórico (settings store) ---------- */
  async function persistMessage(role, content) {
    const history = (await AuroraStorage.getSetting("chat_history")) || [];
    history.push({ role, content, ts: Date.now() });
    // mantém só as últimas 200 mensagens para não inchar o storage
    const trimmed = history.slice(-200);
    await AuroraStorage.setSetting("chat_history", trimmed);
  }

  async function loadHistory() {
    const history = (await AuroraStorage.getSetting("chat_history")) || [];
    if (history.length > 0) hideIntroIfNeeded();
    history.forEach((m) => addMessage(m.role, m.content, m.role === "bot"));
  }

  function formatCurrency(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return { init };
})();
