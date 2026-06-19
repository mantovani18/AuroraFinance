# Aurora Finanças

Assistente financeiro pessoal por chat, dashboard inteligente, organização e estudos — 100% local, 100% privado, sem backend, sem servidor e sem custo mensal.

Inspirado na experiência de apps como ChatGPT, Notion, Apple Wallet e Apple Health, mas com identidade visual e código próprios e originais.

## ✨ Funcionalidades

- **Chat com IA local**: escreva "Gastei R$ 45 no mercado" ou "Recebi R$ 2500 de salário" e o app interpreta, categoriza e registra automaticamente.
- **Dashboard**: saldo atual, receitas/gastos do mês, economia acumulada, evolução do saldo, gastos por categoria, comparativo de meses.
- **Finanças**: lista completa de lançamentos, filtros por tipo/categoria, gráficos semanais/mensais.
- **Organização pessoal**: tarefas/checklist, metas financeiras com barra de progresso, hábitos com streak, calendário simples.
- **Estudos**: bloco de notas/resumos, flashcards (frente/verso), planejamento de estudos.
- **Relatórios**: exporte em JSON (backup completo), CSV (abre no Excel/Google Sheets) ou PDF.
- **PWA completo**: funciona offline, instalável na tela inicial do iPhone e Android, ícones e splash configurados.

## 🔒 Privacidade

Todos os dados ficam **somente no seu dispositivo**, salvos em IndexedDB (com fallback automático em localStorage). Nada é enviado para nenhum servidor — porque não existe servidor. O código não faz nenhuma chamada de rede além de carregar as bibliotecas gratuitas (Chart.js e jsPDF) e as fontes do Google Fonts.

## 🚀 Como hospedar gratuitamente no GitHub Pages

1. Crie um repositório novo no GitHub (ex: `aurora-financas`).
2. Faça upload de **todos** os arquivos e pastas deste projeto mantendo a mesma estrutura:
   ```
   index.html
   manifest.json
   service-worker.js
   css/style.css
   js/*.js
   icons/*.png
   ```
3. No GitHub, vá em **Settings → Pages**.
4. Em "Source", selecione a branch `main` e a pasta `/ (root)`.
5. Salve. Em alguns minutos seu app estará em:
   `https://SEU-USUARIO.github.io/aurora-financas/`

> Importante: todos os caminhos do projeto são relativos (`./`), então funciona tanto na raiz de um domínio quanto em subpastas como o GitHub Pages usa.

## 📲 Como instalar no iPhone (iOS / Safari)

1. Abra o link do app no **Safari** (precisa ser o Safari, não funciona pelo Chrome no iOS).
2. Toque no ícone de **Compartilhar** (quadrado com seta para cima).
3. Escolha **"Adicionar à Tela de Início"**.
4. Toque em **Adicionar**.
5. O ícone do Aurora aparecerá na tela inicial como um app nativo, em tela cheia, funcionando offline.

## 🤖 Como instalar no Android (Chrome)

1. Abra o link do app no Chrome.
2. Toque no banner "Instalar Aurora" que aparece automaticamente, ou no menu (⋮) → **"Instalar aplicativo"**.
3. Confirme a instalação.

## 🛠️ Stack técnica

- HTML5, CSS3, JavaScript ES6+ (sem frameworks, sem build step)
- IndexedDB + localStorage (persistência local)
- Chart.js (gráficos) e jsPDF (exportação em PDF), carregados via CDN gratuito
- Service Worker + Web App Manifest (PWA completo, offline-first)
- IA local baseada em regras (regex + dicionário de categorias) para interpretar linguagem natural em português, sem nenhuma API paga ou externa

## 📁 Estrutura de arquivos

```
aurora-financas/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── storage.js     → camada de persistência (IndexedDB/localStorage)
│   ├── finance.js     → categorias, CRUD financeiro, parser de linguagem natural
│   ├── chat.js         → tela de chat conversacional
│   ├── dashboard.js   → gráficos, KPIs, modal de lançamento
│   ├── tasks.js        → tarefas, metas, hábitos, calendário
│   ├── studies.js      → notas, flashcards, planejamento de estudos
│   ├── export.js      → exportação JSON/CSV/PDF
│   ├── pwa.js          → service worker + instalação
│   └── app.js          → roteamento, tema, inicialização geral
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```

## ⚖️ Aviso legal

Este é um projeto original, desenvolvido do zero, apenas **inspirado** na categoria de assistentes financeiros pessoais por chat. Não reutiliza código, marca, conteúdo ou ativos de nenhum produto de terceiros.
