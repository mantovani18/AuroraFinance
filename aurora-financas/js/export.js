/* =========================================================
   export.js
   Exportação de dados financeiros do usuário.
   - JSON completo (backup)
   - CSV compatível com Excel
   - PDF (relatório resumido via jsPDF)
   Tudo gerado localmente, sem upload a servidores.
   ========================================================= */

const AuroraExport = (() => {
  function init() {
    document.getElementById("export-json").addEventListener("click", exportJSON);
    document.getElementById("export-csv").addEventListener("click", exportCSV);
    document.getElementById("export-pdf").addEventListener("click", exportPDF);
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  async function exportJSON() {
    const data = {};
    for (const store of AuroraStorage.STORES) {
      data[store] = await AuroraStorage.getAll(store);
    }
    data.exportedAt = new Date().toISOString();
    data.app = "Aurora Finanças";
    downloadBlob(JSON.stringify(data, null, 2), `aurora-backup-${dateStamp()}.json`, "application/json");
    AuroraApp.toast("Backup JSON exportado.");
  }

  async function exportCSV() {
    const txs = await AuroraFinance.listAll();
    const header = ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"];
    const rows = txs.map((t) => {
      const meta = AuroraFinance.getCategoryMeta(t.type, t.category);
      return [
        new Date(t.date).toLocaleDateString("pt-BR"),
        t.type === "income" ? "Receita" : "Despesa",
        meta.label,
        csvEscape(t.description),
        t.value.toFixed(2).replace(".", ","),
      ].join(";");
    });
    const csv = "\uFEFF" + [header.join(";"), ...rows].join("\r\n");
    downloadBlob(csv, `aurora-transacoes-${dateStamp()}.csv`, "text/csv;charset=utf-8;");
    AuroraApp.toast("Planilha CSV exportada.");
  }

  function csvEscape(str) {
    if (str == null) return "";
    const s = String(str).replace(/"/g, '""');
    return s.includes(";") || s.includes(",") ? `"${s}"` : s;
  }

  async function exportPDF() {
    if (!window.jspdf) {
      AuroraApp.toast("Não foi possível carregar o gerador de PDF.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const summary = await AuroraFinance.getSummary();
    const txs = await AuroraFinance.listAll();

    doc.setFontSize(18);
    doc.text("Aurora Finanças — Relatório", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 24);

    doc.setTextColor(20);
    doc.setFontSize(12);
    doc.text(`Saldo atual: ${formatCurrency(summary.balance)}`, 14, 36);
    doc.text(`Receitas do mês: ${formatCurrency(summary.incomeMonth)}`, 14, 43);
    doc.text(`Gastos do mês: ${formatCurrency(summary.expenseMonth)}`, 14, 50);
    doc.text(`Economia acumulada: ${formatCurrency(summary.savings)}`, 14, 57);

    doc.setFontSize(13);
    doc.text("Lançamentos", 14, 70);
    doc.setFontSize(9);
    let y = 78;
    doc.setTextColor(100);
    doc.text("Data", 14, y);
    doc.text("Tipo", 38, y);
    doc.text("Categoria", 60, y);
    doc.text("Descrição", 95, y);
    doc.text("Valor", 175, y);
    y += 5;
    doc.setDrawColor(220);
    doc.line(14, y, 196, y);
    y += 4;
    doc.setTextColor(30);

    txs.slice(0, 200).forEach((t) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      const meta = AuroraFinance.getCategoryMeta(t.type, t.category);
      doc.text(new Date(t.date).toLocaleDateString("pt-BR"), 14, y);
      doc.text(t.type === "income" ? "Receita" : "Despesa", 38, y);
      doc.text(meta.label.slice(0, 16), 60, y);
      doc.text((t.description || "").slice(0, 28), 95, y);
      doc.text(formatCurrency(t.value), 175, y);
      y += 6;
    });

    doc.save(`aurora-relatorio-${dateStamp()}.pdf`);
    AuroraApp.toast("Relatório PDF exportado.");
  }

  function formatCurrency(v) {
    return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  return { init };
})();
