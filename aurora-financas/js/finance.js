/* =========================================================
   finance.js
   Núcleo financeiro do Aurora.
   - Categorias automáticas
   - CRUD de transações (via AuroraStorage)
   - Agregações para dashboard (mês, semana, comparativo)
   - Parser de linguagem natural (IA local baseada em regras)
   ========================================================= */

const AuroraFinance = (() => {
  const STORE = "transactions";

  /* ---------- categorias ---------- */
  const EXPENSE_CATEGORIES = [
    { key: "alimentacao", label: "Alimentação", icon: "🍽️", keywords: ["restaurante", "almoço", "almoco", "jantar", "lanche", "comida", "ifood", "pizza", "padaria", "café", "cafe", "bar"] },
    { key: "mercado", label: "Mercado", icon: "🛒", keywords: ["mercado", "supermercado", "compras de casa", "feira", "hortifruti", "atacadao", "atacadão"] },
    { key: "transporte", label: "Transporte", icon: "🚌", keywords: ["uber", "99", "taxi", "ônibus", "onibus", "metro", "metrô", "passagem", "transporte"] },
    { key: "combustivel", label: "Combustível", icon: "⛽", keywords: ["gasolina", "combustivel", "combustível", "álcool", "alcool", "etanol", "posto", "diesel"] },
    { key: "moradia", label: "Moradia", icon: "🏠", keywords: ["aluguel", "condominio", "condomínio", "iptu", "moradia", "reforma", "agua", "água", "luz", "energia", "gas", "gás"] },
    { key: "internet", label: "Internet", icon: "📶", keywords: ["internet", "wifi", "wi-fi", "fibra", "telefone", "celular", "plano de dados"] },
    { key: "streaming", label: "Streaming", icon: "🎬", keywords: ["netflix", "spotify", "streaming", "disney", "amazon prime", "hbo", "youtube premium", "assinatura"] },
    { key: "saude", label: "Saúde", icon: "💊", keywords: ["farmacia", "farmácia", "remedio", "remédio", "medico", "médico", "consulta", "exame", "plano de saude", "saúde", "dentista", "academia"] },
    { key: "educacao", label: "Educação", icon: "📚", keywords: ["curso", "faculdade", "mensalidade", "livro", "educação", "educacao", "escola", "material escolar"] },
    { key: "lazer", label: "Lazer", icon: "🎮", keywords: ["cinema", "show", "viagem", "passeio", "jogo", "lazer", "festa", "balada", "ingresso", "parque"] },
    { key: "outros_despesa", label: "Outros", icon: "🧾", keywords: [] },
  ];

  const INCOME_CATEGORIES = [
    { key: "salario", label: "Salário", icon: "💼", keywords: ["salario", "salário", "pagamento da empresa", "contracheque", "holerite"] },
    { key: "freelance", label: "Freelance", icon: "💻", keywords: ["freelance", "freela", "bico", "projeto extra", "trabalho extra"] },
    { key: "comissao", label: "Comissão", icon: "🤝", keywords: ["comissão", "comissao", "bonificação", "bonificacao", "bonus", "bônus"] },
    { key: "investimentos", label: "Investimentos", icon: "📈", keywords: ["dividendo", "rendimento", "investimento", "juros", "renda fixa", "ações", "acoes", "cdb", "tesouro"] },
    { key: "vendas", label: "Vendas", icon: "🏷️", keywords: ["venda", "vendi", "vendas"] },
    { key: "outros_receita", label: "Outros", icon: "✨", keywords: ["presente", "deram", "ganhei", "prêmio", "premio", "reembolso"] },
  ];

  function getCategories(type) {
    return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }
  function getCategoryMeta(type, key) {
    const list = getCategories(type);
    return list.find((c) => c.key === key) || list[list.length - 1];
  }

  /* ---------- detecção de categoria por texto ---------- */
  function detectCategory(text, type) {
    const normalized = normalizeText(text);
    const list = getCategories(type);
    for (const cat of list) {
      for (const kw of cat.keywords) {
        if (normalized.includes(normalizeText(kw))) return cat.key;
      }
    }
    return type === "income" ? "outros_receita" : "outros_despesa";
  }

  function normalizeText(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /* ---------- CRUD ---------- */
  async function listAll() {
    const all = await AuroraStorage.getAll(STORE);
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function add(tx) {
    const record = {
      id: AuroraStorage.generateId(),
      type: tx.type, // 'income' | 'expense'
      description: tx.description,
      value: Math.abs(parseFloat(tx.value) || 0),
      category: tx.category,
      date: tx.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: tx.source || "manual", // 'manual' | 'chat'
    };
    await AuroraStorage.put(STORE, record);
    return record;
  }

  async function update(id, patch) {
    const all = await AuroraStorage.getAll(STORE);
    const found = all.find((t) => t.id === id);
    if (!found) return null;
    const updated = { ...found, ...patch };
    await AuroraStorage.put(STORE, updated);
    return updated;
  }

  async function removeTx(id) {
    return AuroraStorage.remove(STORE, id);
  }

  /* ---------- agregações ---------- */
  function isSameMonth(dateStr, ref = new Date()) {
    const d = new Date(dateStr);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  }
  function isSameWeek(dateStr, ref = new Date()) {
    const d = new Date(dateStr);
    const start = new Date(ref);
    start.setDate(ref.getDate() - ref.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }

  async function getSummary() {
    const all = await listAll();
    const now = new Date();

    const monthTx = all.filter((t) => isSameMonth(t.date, now));
    const incomeMonth = sum(monthTx.filter((t) => t.type === "income"));
    const expenseMonth = sum(monthTx.filter((t) => t.type === "expense"));

    const totalIncome = sum(all.filter((t) => t.type === "income"));
    const totalExpense = sum(all.filter((t) => t.type === "expense"));
    const balance = totalIncome - totalExpense;

    // economia acumulada: soma de (receita - despesa) por mês, somente meses positivos
    const monthMap = groupByMonth(all);
    let savings = 0;
    Object.values(monthMap).forEach((m) => {
      const diff = sum(m.filter((t) => t.type === "income")) - sum(m.filter((t) => t.type === "expense"));
      if (diff > 0) savings += diff;
    });

    return {
      balance,
      incomeMonth,
      expenseMonth,
      savings,
      countMonth: monthTx.length,
      all,
    };
  }

  function sum(arr) {
    return arr.reduce((acc, t) => acc + (t.value || 0), 0);
  }

  function groupByMonth(all) {
    const map = {};
    all.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }

  async function getCategoryBreakdown(type = "expense", period = "month") {
    const all = await listAll();
    const now = new Date();
    let filtered = all.filter((t) => t.type === type);
    if (period === "month") filtered = filtered.filter((t) => isSameMonth(t.date, now));
    if (period === "week") filtered = filtered.filter((t) => isSameWeek(t.date, now));

    const map = {};
    filtered.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.value;
    });
    return map;
  }

  async function getLast12MonthsComparison() {
    const all = await listAll();
    const map = groupByMonth(all);
    const now = new Date();
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthTx = map[key] || [];
      labels.push(d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""));
      incomeData.push(sum(monthTx.filter((t) => t.type === "income")));
      expenseData.push(sum(monthTx.filter((t) => t.type === "expense")));
    }
    return { labels, incomeData, expenseData };
  }

  async function getBalanceEvolution(days = 30) {
    const all = await listAll();
    const sorted = [...all].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days);

    const labels = [];
    const values = [];
    let running = sorted
      .filter((t) => new Date(t.date) < start)
      .reduce((acc, t) => acc + (t.type === "income" ? t.value : -t.value), 0);

    for (let i = days; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayTx = sorted.filter((t) => sameDay(new Date(t.date), day));
      dayTx.forEach((t) => {
        running += t.type === "income" ? t.value : -t.value;
      });
      if (i % Math.ceil(days / 10) === 0 || i === 0) {
        labels.push(day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
        values.push(Math.round(running * 100) / 100);
      }
    }
    return { labels, values };
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async function getPeriodSeries(period = "week") {
    const all = await listAll();
    const now = new Date();
    let labels = [];
    let incomeData = [];
    let expenseData = [];

    if (period === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const dayTx = all.filter((t) => sameDay(new Date(t.date), day));
        labels.push(day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""));
        incomeData.push(sum(dayTx.filter((t) => t.type === "income")));
        expenseData.push(sum(dayTx.filter((t) => t.type === "expense")));
      }
    } else if (period === "month") {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const weeks = Math.ceil(daysInMonth / 7);
      for (let w = 0; w < weeks; w++) {
        const wStart = w * 7 + 1;
        const wEnd = Math.min(wStart + 6, daysInMonth);
        const weekTx = all.filter((t) => {
          const d = new Date(t.date);
          return isSameMonth(t.date, now) && d.getDate() >= wStart && d.getDate() <= wEnd;
        });
        labels.push(`${wStart}-${wEnd}`);
        incomeData.push(sum(weekTx.filter((t) => t.type === "income")));
        expenseData.push(sum(weekTx.filter((t) => t.type === "expense")));
      }
    } else {
      const map = groupByMonth(all);
      const keys = Object.keys(map).sort();
      keys.forEach((k) => {
        const [y, m] = k.split("-");
        labels.push(`${m}/${y.slice(2)}`);
        incomeData.push(sum(map[k].filter((t) => t.type === "income")));
        expenseData.push(sum(map[k].filter((t) => t.type === "expense")));
      });
    }
    return { labels, incomeData, expenseData };
  }

  /* ---------- IA local: parser de linguagem natural ---------- */
  /**
   * Interpreta uma frase em português e tenta extrair:
   * - tipo (income/expense)
   * - valor
   * - descrição
   * - categoria
   * Retorna null se não conseguir identificar um lançamento financeiro.
   */
  function parseMessage(rawText) {
    const text = rawText.trim();
    const normalized = normalizeText(text);

    // 1) extrair valor monetário: R$ 120, 120,00, 120.50, 120 reais
    const valueMatch = text.match(/r?\$?\s*(\d{1,3}(?:[.\s]?\d{3})*(?:[.,]\d{1,2})?)\s*(reais|r\$)?/i);
    let value = null;
    if (valueMatch) {
      let raw = valueMatch[1].replace(/\s/g, "");
      // normaliza separador decimal: se tem , e . assume , como decimal (formato BR)
      if (raw.includes(",") && raw.includes(".")) {
        raw = raw.replace(/\./g, "").replace(",", ".");
      } else if (raw.includes(",")) {
        raw = raw.replace(",", ".");
      }
      value = parseFloat(raw);
    }

    if (value === null || isNaN(value) || value <= 0) {
      return null; // não é um lançamento financeiro identificável
    }

    // 2) detectar tipo: receita ou despesa
    const incomeSignals = ["recebi", "ganhei", "entrou", "caiu", "vendi", "faturei", "lucro", "receita", "salario", "salário", "pagamento recebido", "me pagaram", "depositaram"];
    const expenseSignals = ["gastei", "paguei", "comprei", "saiu", "gasto", "despesa", "debitado", "torrei"];

    let type = null;
    if (incomeSignals.some((s) => normalized.includes(normalizeText(s)))) type = "income";
    if (expenseSignals.some((s) => normalized.includes(normalizeText(s)))) type = "expense";

    // fallback: se nenhum sinal, mas tem "de" + categoria de receita comum -> assume despesa (mais comum em chats financeiros)
    if (!type) type = "expense";

    // 3) categoria
    const category = detectCategory(text, type);

    // 4) descrição: remove valores e palavras-gatilho, capitaliza
    let desc = text
      .replace(/r?\$?\s*\d{1,3}(?:[.\s]?\d{3})*(?:[.,]\d{1,2})?\s*(reais|r\$)?/gi, "")
      .replace(/\b(gastei|paguei|comprei|recebi|ganhei|de|do|da|no|na|com|em|hoje|ontem)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!desc) {
      const catMeta = getCategoryMeta(type, category);
      desc = catMeta.label;
    }
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);

    return { type, value, description: desc, category };
  }

  /**
   * Detecta intenções de pergunta (não lançamento), ex: "qual meu saldo?"
   */
  function detectQueryIntent(rawText) {
    const n = normalizeText(rawText);
    if (/(qual|quanto).*(saldo)/.test(n) || n.includes("meu saldo")) return "balance";
    if (/(quanto).*(gastei|gasto)/.test(n)) return "expense_total";
    if (/(quanto).*(recebi|ganhei|receita)/.test(n)) return "income_total";
    if (n.includes("economia") || n.includes("economizei")) return "savings";
    if (n.includes("ajuda") || n.includes("o que voce faz") || n.includes("o que você faz")) return "help";
    return null;
  }

  return {
    getCategories,
    getCategoryMeta,
    detectCategory,
    listAll,
    add,
    update,
    remove: removeTx,
    getSummary,
    getCategoryBreakdown,
    getLast12MonthsComparison,
    getBalanceEvolution,
    getPeriodSeries,
    parseMessage,
    detectQueryIntent,
    normalizeText,
  };
})();
