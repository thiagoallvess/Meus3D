const fs = require('fs');
let loja = fs.readFileSync('loja.html', 'utf8');

// Extract CSS
const styleStart = loja.indexOf('<style>');
const styleEnd = loja.indexOf('</style>') + 8;
const css = loja.substring(styleStart, styleEnd).replace('</style>', 
  '/* DRE CSS */\n' +
  '.dre-filters { display:flex; gap:12px; margin-bottom:20px; }\n' +
  '.dre-filters select { padding:10px 14px; background:#0d1117; border:1px solid #1f2937; border-radius:8px; color:#f9fafb; outline:none; }\n' +
  '.dre-summary { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:16px; margin-bottom:30px; }\n' +
  '.dre-card { background:#0d1117; border:1px solid #1f2937; border-radius:12px; padding:20px; box-shadow:0 4px 20px rgba(0,0,0,.2); }\n' +
  '.dre-card-title { font-size:12px; color:#9ca3af; text-transform:uppercase; font-weight:700; letter-spacing:0.05em; }\n' +
  '.dre-card-value { font-size:24px; font-weight:700; font-family:\\\'JetBrains Mono\\\', monospace; margin-top:8px; }\n' +
  '.val-green { color:#34d399; } .val-red { color:#f87171; } .val-blue { color:#60a5fa; } .val-yellow { color:#fbbf24; }\n' +
  '.dre-table-container { background:#0d1117; border:1px solid #1f2937; border-radius:12px; overflow-x:auto; margin-bottom:30px; box-shadow:0 4px 20px rgba(0,0,0,.2); }\n' +
  '.dre-table { width:100%; border-collapse:collapse; min-width:600px; }\n' +
  '.dre-table th, .dre-table td { padding:14px 20px; text-align:left; border-bottom:1px solid #1f2937; }\n' +
  '.dre-table th { background:#111827; font-size:12px; text-transform:uppercase; color:#6b7280; font-weight:700; }\n' +
  '.dre-table tr.total-row td { font-weight:700; background:rgba(255,255,255,0.02); }\n' +
  '.dre-table tr.main-row td { font-weight:700; color:#f9fafb; }\n' +
  '.dre-table tr.sub-row td { padding-left:40px; color:#9ca3af; font-size:14px; }\n' +
  '.dre-table td.money { text-align:right; font-family:\\\'JetBrains Mono\\\', monospace; }\n' +
  '.chart-container { background:#0d1117; border:1px solid #1f2937; border-radius:12px; padding:20px; margin-bottom:30px; height: 300px; }' +
  '</style>');

// Extract Drawer
const drawerStart = loja.indexOf('<div class="drawer-overlay"');
const drawerEnd = loja.indexOf('</nav>') + 6;
let drawer = loja.substring(drawerStart, drawerEnd) + '\n    </div>';
drawer = drawer.replace('loja.html" class="drawer-nav-item active"', 'loja.html" class="drawer-nav-item"');
drawer += '\n        <a href="dre.html" class="drawer-nav-item active">\n            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>\n            DRE & Financeiro\n        </a>\n    </nav>\n</div>';
drawer = drawer.replace('</div>\n    </div>', '');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Meus 3D - DRE</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    ${css}
</head>
<body>
    ${drawer}
    <header class="page-header">
        <div class="page-header-inner">
            <button class="menu-btn" id="menuBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
            <div class="header-logo">⬡</div>
            <div>
                <h1 class="header-title">DRE & Financeiro</h1>
                <div class="header-sub">Demonstração do Resultado do Exercício</div>
            </div>
        </div>
    </header>

    <div class="wrap">
        <div class="dre-filters">
            <select id="monthFilter">
                <option value="all">Todo o Período</option>
                <option value="0">Janeiro</option><option value="1">Fevereiro</option><option value="2">Março</option>
                <option value="3">Abril</option><option value="4">Maio</option><option value="5">Junho</option>
                <option value="6">Julho</option><option value="7">Agosto</option><option value="8">Setembro</option>
                <option value="9">Outubro</option><option value="10">Novembro</option><option value="11">Dezembro</option>
            </select>
            <select id="yearFilter">
                <option value="all">Todos os Anos</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
            </select>
        </div>

        <div class="dre-summary">
            <div class="dre-card">
                <div class="dre-card-title">Receita Bruta Total</div>
                <div class="dre-card-value val-blue" id="sumReceita">R$ 0,00</div>
            </div>
            <div class="dre-card">
                <div class="dre-card-title">Custos Variáveis (CPV + Taxas)</div>
                <div class="dre-card-value val-red" id="sumCpv">- R$ 0,00</div>
            </div>
            <div class="dre-card">
                <div class="dre-card-title">Lucro Líquido</div>
                <div class="dre-card-value val-green" id="sumLucro">R$ 0,00</div>
            </div>
            <div class="dre-card">
                <div class="dre-card-title">Margem Líquida</div>
                <div class="dre-card-value" id="sumMargem">0%</div>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="dreChart"></canvas>
        </div>

        <div class="dre-table-container">
            <table class="dre-table">
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th class="money">Valor (R$)</th>
                        <th class="money">% Receita</th>
                    </tr>
                </thead>
                <tbody id="dreBody">
                </tbody>
            </table>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-size:16px;">Despesas Adicionais (Operacionais)</h2>
            <button class="modal-btn modal-btn-save" id="addExpenseBtn">+ Lançar Despesa</button>
        </div>
        
        <div class="dre-table-container">
            <table class="dre-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th class="money">Valor (R$)</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody id="expensesBody">
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modals -->
    <div class="modal-overlay" id="expenseModal">
        <div class="modal-box">
            <h3 class="modal-title">Lançar Nova Despesa</h3>
            <div class="modal-field">
                <label>Descrição</label>
                <input type="text" id="expenseDesc" placeholder="Ex: Aluguel, Tráfego Pago, Embalagens Extras">
            </div>
            <div class="modal-field">
                <label>Data</label>
                <input type="date" id="expenseDate">
            </div>
            <div class="modal-field">
                <label>Valor (R$)</label>
                <input type="number" id="expenseValue" placeholder="0.00" step="0.01">
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel" id="closeExpenseModal">Cancelar</button>
                <button class="modal-btn modal-btn-save" id="saveExpenseBtn">Salvar</button>
            </div>
        </div>
    </div>

    <script>
        // Setup Drawer
        const menuBtn = document.getElementById('menuBtn');
        const drawer = document.querySelector('.app-drawer');
        const overlay = document.querySelector('.drawer-overlay');
        const closeBtn = document.querySelector('.drawer-close');

        function openMenu() {
            drawer.classList.add('open');
            overlay.classList.add('open');
        }
        function closeMenu() {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
        }
        menuBtn.addEventListener('click', openMenu);
        closeBtn.addEventListener('click', closeMenu);
        overlay.addEventListener('click', closeMenu);

        // Load Data
        function loadSales() {
            return JSON.parse(localStorage.getItem('meus3d_sales_history') || '[]');
        }
        function loadExpenses() {
            return JSON.parse(localStorage.getItem('meus3d_dre_expenses') || '[]');
        }
        function saveExpenses(exp) {
            localStorage.setItem('meus3d_dre_expenses', JSON.stringify(exp));
        }

        // DRE Logic
        let currentMonth = new Date().getMonth().toString();
        let currentYear = new Date().getFullYear().toString();
        document.getElementById('monthFilter').value = currentMonth;
        document.getElementById('yearFilter').value = currentYear;

        document.getElementById('monthFilter').addEventListener('change', (e) => { currentMonth = e.target.value; renderDRE(); });
        document.getElementById('yearFilter').addEventListener('change', (e) => { currentYear = e.target.value; renderDRE(); });

        function fmt(n) { return n.toFixed(2).replace('.', ','); }

        let chartInstance = null;

        function renderDRE() {
            const allSales = loadSales();
            const allExpenses = loadExpenses();

            // Filter
            const sales = allSales.filter(s => {
                if (currentMonth === 'all' && currentYear === 'all') return true;
                const d = new Date(s.timestamp);
                if (currentYear !== 'all' && d.getFullYear().toString() !== currentYear) return false;
                if (currentMonth !== 'all' && d.getMonth().toString() !== currentMonth) return false;
                return true;
            });
            const expenses = allExpenses.filter(e => {
                if (currentMonth === 'all' && currentYear === 'all') return true;
                const d = new Date(e.date);
                if (currentYear !== 'all' && d.getFullYear().toString() !== currentYear) return false;
                if (currentMonth !== 'all' && d.getMonth().toString() !== currentMonth) return false;
                return true;
            });

            // Calculate
            let recDireta = 0;
            let recMkt = 0;
            let cpv = 0;
            let taxasMkt = 0;

            sales.forEach(sale => {
                sale.items.forEach(item => {
                    const rev = item.price * item.qty;
                    if (item.channel === 'marketplace') {
                        recMkt += rev;
                        if (item.costs) {
                            cpv += (item.costs.unitCostProduction || 0) * item.qty;
                            taxasMkt += (item.costs.platformFeeValue || 0) * item.qty;
                        } else {
                            // Custo genérico caso não tenha snapshot (antigos)
                            cpv += (rev * 0.2); // chuta 20% de custo
                            taxasMkt += (rev * 0.2); // chuta 20% de taxa
                        }
                    } else {
                        recDireta += rev;
                        if (item.costs) {
                            cpv += (item.costs.unitCostProduction || 0) * item.qty;
                        } else {
                            cpv += (rev * 0.2); 
                        }
                    }
                });
            });

            const recBruta = recDireta + recMkt;
            const dedusoes = taxasMkt;
            const recLiquida = recBruta - dedusoes;
            const lucroBruto = recLiquida - cpv;
            const despOp = expenses.reduce((s, e) => s + Number(e.value), 0);
            const lucroLiquido = lucroBruto - despOp;
            const margem = recBruta > 0 ? (lucroLiquido / recBruta) * 100 : 0;

            // Update Cards
            document.getElementById('sumReceita').textContent = 'R$ ' + fmt(recBruta);
            document.getElementById('sumCpv').textContent = '- R$ ' + fmt(cpv + taxasMkt);
            document.getElementById('sumLucro').textContent = 'R$ ' + fmt(lucroLiquido);
            document.getElementById('sumLucro').className = 'dre-card-value ' + (lucroLiquido >= 0 ? 'val-green' : 'val-red');
            document.getElementById('sumMargem').textContent = fmt(margem) + '%';
            document.getElementById('sumMargem').className = 'dre-card-value ' + (margem >= 0 ? 'val-green' : 'val-red');

            // Render Table
            const body = document.getElementById('dreBody');
            const pct = (val) => recBruta > 0 ? fmt((val / recBruta) * 100) + '%' : '0,00%';
            
            body.innerHTML = \`
                <tr class="main-row"><td>1. Receita Bruta de Vendas</td><td class="money">R$ \${fmt(recBruta)}</td><td class="money">100,00%</td></tr>
                <tr class="sub-row"><td>Venda Direta</td><td class="money">R$ \${fmt(recDireta)}</td><td class="money">\${pct(recDireta)}</td></tr>
                <tr class="sub-row"><td>Venda Marketplace</td><td class="money">R$ \${fmt(recMkt)}</td><td class="money">\${pct(recMkt)}</td></tr>
                
                <tr class="main-row"><td>2. Deduções da Receita</td><td class="money val-red">- R$ \${fmt(dedusoes)}</td><td class="money">\${pct(dedusoes)}</td></tr>
                <tr class="sub-row"><td>Taxas de Marketplace</td><td class="money val-red">- R$ \${fmt(taxasMkt)}</td><td class="money">\${pct(taxasMkt)}</td></tr>
                
                <tr class="total-row" style="color:#60a5fa;"><td>3. Receita Líquida (1 - 2)</td><td class="money">R$ \${fmt(recLiquida)}</td><td class="money">\${pct(recLiquida)}</td></tr>
                
                <tr class="main-row"><td>4. Custos (CPV)</td><td class="money val-red">- R$ \${fmt(cpv)}</td><td class="money">\${pct(cpv)}</td></tr>
                <tr class="sub-row"><td>Custos de Produção</td><td class="money val-red">- R$ \${fmt(cpv)}</td><td class="money">\${pct(cpv)}</td></tr>
                
                <tr class="total-row" style="color:#fbbf24;"><td>5. Lucro Bruto (3 - 4)</td><td class="money">R$ \${fmt(lucroBruto)}</td><td class="money">\${pct(lucroBruto)}</td></tr>
                
                <tr class="main-row"><td>6. Despesas Operacionais Adicionais</td><td class="money val-red">- R$ \${fmt(despOp)}</td><td class="money">\${pct(despOp)}</td></tr>
                
                <tr class="total-row" style="color:\${lucroLiquido>=0?'#34d399':'#f87171'};font-size:16px;"><td>7. Lucro Líquido Final (5 - 6)</td><td class="money">R$ \${fmt(lucroLiquido)}</td><td class="money">\${pct(lucroLiquido)}</td></tr>
            \`;

            // Render Expenses
            const expBody = document.getElementById('expensesBody');
            expBody.innerHTML = expenses.map(e => \`
                <tr>
                    <td>\${new Date(e.date).toLocaleDateString('pt-BR')}</td>
                    <td>\${e.desc}</td>
                    <td class="money">R$ \${fmt(Number(e.value))}</td>
                    <td>
                        <button onclick="delExpense('\${e.id}')" style="background:none;border:none;color:#f87171;cursor:pointer;">Remover</button>
                    </td>
                </tr>
            \`).join('');
            if(expenses.length === 0) {
                expBody.innerHTML = \`<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:24px;">Nenhuma despesa lançada neste período.</td></tr>\`;
            }

            // Update Chart
            updateChart(recLiquida, cpv, despOp, lucroLiquido);
        }

        function updateChart(recLiq, cpv, despOp, lucro) {
            const ctx = document.getElementById('dreChart').getContext('2d');
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            Chart.defaults.color = '#9ca3af';
            Chart.defaults.font.family = "'DM Sans', sans-serif";

            // Para o grafico, vamos mostrar: Receita Bruta, Custos, Despesas e Lucro
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Receita Líquida', 'CPV (Custos)', 'Desp. Adicionais', 'Lucro Líquido'],
                    datasets: [{
                        label: 'Valores Financeiros',
                        data: [recLiq, cpv, despOp, lucro],
                        backgroundColor: [
                            'rgba(96, 165, 250, 0.7)',
                            'rgba(248, 113, 113, 0.7)',
                            'rgba(248, 113, 113, 0.7)',
                            lucro >= 0 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(248, 113, 113, 0.7)'
                        ],
                        borderColor: [
                            '#60a5fa',
                            '#f87171',
                            '#f87171',
                            lucro >= 0 ? '#34d399' : '#f87171'
                        ],
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Expense Modal
        document.getElementById('addExpenseBtn').addEventListener('click', () => {
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('expenseModal').classList.add('open');
        });
        document.getElementById('closeExpenseModal').addEventListener('click', () => {
            document.getElementById('expenseModal').classList.remove('open');
        });
        document.getElementById('saveExpenseBtn').addEventListener('click', () => {
            const desc = document.getElementById('expenseDesc').value;
            const date = document.getElementById('expenseDate').value;
            const value = document.getElementById('expenseValue').value;
            if(!desc || !date || !value) return alert('Preencha todos os campos!');

            const exps = loadExpenses();
            exps.push({ id: Date.now().toString(), desc, date, value: Number(value) });
            saveExpenses(exps);

            document.getElementById('expenseModal').classList.remove('open');
            document.getElementById('expenseDesc').value = '';
            document.getElementById('expenseValue').value = '';
            renderDRE();
        });
        window.delExpense = (id) => {
            if(confirm('Tem certeza que deseja remover esta despesa?')) {
                const exps = loadExpenses();
                saveExpenses(exps.filter(e => e.id !== id));
                renderDRE();
            }
        };

        renderDRE();
    </script>
</body>
</html>`;

fs.writeFileSync('dre.html', html);

