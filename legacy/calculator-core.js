// ==========================================
// SHARED CALCULATOR CORE LOGIC
// Extracted to avoid duplication between script.js and script-kit.js
// ==========================================

function createFilamentRow(weight = 0, filamentId = '', filamentCostKg = 0) {
    const rowId = filamentRowCounter++;
    
    const row = document.createElement('div');
    row.className = 'filament-row input-row';
    row.style.cssText = 'background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid var(--border-card); margin: 0; display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: end;';
    
    // Filament Select
    const selectDiv = document.createElement('div');
    selectDiv.className = 'input-group';
    selectDiv.style.margin = '0';
    selectDiv.style.gridColumn = '1 / 3';
    selectDiv.style.gridRow = '1';
    selectDiv.innerHTML = `
        <label style="font-size: 11px;">Filamento Salvo</label>
        <div class="input-wrapper">
            <select class="row-filament-select" style="font-size: 13px; padding: 6px;">
                <option value="">Preço Manual</option>
            </select>
        </div>
    `;
    const selectEl = selectDiv.querySelector('select');
    
    // Populate select
    const savedFilaments = JSON.parse(localStorage.getItem('meus3d_filaments')) || [];
    savedFilaments.forEach(f => {
        const pricePerKg = (f.price / f.weight) * 1000;
        const opt = document.createElement('option');
        opt.value = pricePerKg;
        opt.dataset.id = f.id;
        opt.textContent = `${f.brand} ${f.material} - ${f.colorName} (R$ ${pricePerKg.toFixed(2).replace('.',',')}/kg)`;
        if (String(f.id) === String(filamentId)) opt.selected = true;
        selectEl.appendChild(opt);
    });

    // Cost input
    const costDiv = document.createElement('div');
    costDiv.className = 'input-group';
    costDiv.style.margin = '0';
    costDiv.style.gridColumn = '1';
    costDiv.style.gridRow = '2';
    costDiv.innerHTML = `
        <label style="font-size: 11px;">Custo/kg</label>
        <div class="input-wrapper">
            <span class="input-prefix" style="padding: 0 6px; font-size: 12px;">R$</span>
            <input type="number" class="row-cost" placeholder="0,00" min="0" step="0.01" style="font-size: 13px; padding: 6px; padding-left: 2.2rem;">
        </div>
    `;
    const costEl = costDiv.querySelector('input');
    costEl.value = filamentCostKg || (selectEl.selectedIndex > 0 ? selectEl.value : '');

    // Weight input
    const weightDiv = document.createElement('div');
    weightDiv.className = 'input-group';
    weightDiv.style.margin = '0';
    weightDiv.style.gridColumn = '2';
    weightDiv.style.gridRow = '2';
    weightDiv.innerHTML = `
        <label style="font-size: 11px;">Peso (g)</label>
        <div class="input-wrapper">
            <input type="number" class="row-weight" placeholder="0" min="0" step="0.1" style="font-size: 13px; padding: 6px; padding-right: 2.5rem;">
            <span class="input-suffix" style="padding: 0 6px; font-size: 12px;">g</span>
        </div>
    `;
    const weightEl = weightDiv.querySelector('input');
    weightEl.value = weight || '';

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-secondary row-remove-btn';
    removeBtn.style.cssText = 'padding: 6px; height: 32px; width: 32px; display: flex; align-items: center; justify-content: center; color: var(--accent-red); border-color: rgba(239, 68, 68, 0.3); grid-column: 3; grid-row: 1;';
    removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    
    removeBtn.onclick = () => {
        if (DOM.filamentsContainer.children.length > 1) {
            row.remove();
            calculateRealtime();
        }
    };

    selectEl.addEventListener('change', () => {
        if (selectEl.value) costEl.value = parseFloat(selectEl.value).toFixed(2);
        calculateRealtime();
    });

    [costEl, weightEl].forEach(el => el.addEventListener('input', calculateRealtime));

    row.appendChild(selectDiv);
    row.appendChild(costDiv);
    row.appendChild(weightDiv);
    row.appendChild(removeBtn);
    
    DOM.filamentsContainer.appendChild(row);
}

function populateAuxiliarySelects(selectEl) {
    selectEl.innerHTML = '<option value="">Selecione o Insumo...</option>';
    const savedAuxiliaries = Object.values(JSON.parse(localStorage.getItem('meus3d_aux_inventory') || '{}'));
    savedAuxiliaries.forEach(aux => {
        const avgUnitCost = aux.totalValue / aux.qty;
        const option = document.createElement('option');
        option.value = avgUnitCost;
        option.dataset.id = aux.id;
        option.textContent = `${aux.name} (R$ ${avgUnitCost.toFixed(4).replace('.', ',')}/un)`;
        selectEl.appendChild(option);
    });
}

function loadTheme() {
    const savedTheme = localStorage.getItem('meus3d_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function formatCurrency(value) {
    return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function formatPercent(value) {
    return value.toFixed(2).replace('.', ',') + '%';
}

function animateResults() {
    document.querySelectorAll('.result-item').forEach(item => {
        item.classList.remove('updated');
        void item.offsetWidth; // trigger reflow
        item.classList.add('updated');
    });
}

function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#9ca3af' : '#4b5563',
        grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        blue: '#6366f1',
        purple: '#a855f7',
        green: '#22c55e',
        amber: '#f59e0b',
        red: '#ef4444',
        cyan: '#06b6d4',
        blueAlpha: 'rgba(99, 102, 241, 0.7)',
        greenAlpha: 'rgba(34, 197, 94, 0.7)',
        purpleAlpha: 'rgba(168, 85, 247, 0.7)',
        amberAlpha: 'rgba(245, 158, 11, 0.7)',
        redAlpha: 'rgba(239, 68, 68, 0.7)',
        cyanAlpha: 'rgba(6, 182, 212, 0.7)',
    };
}

function destroyCharts() {
    Object.keys(chartInstances).forEach(key => {
        if (chartInstances[key]) {
            chartInstances[key].destroy();
            chartInstances[key] = null;
        }
    });
}

function addToHistory(values, results) {
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleString('pt-BR'),
        name: values.productName,
        values: { ...values },
        results: { ...results },
    };

    calculationHistory.unshift(entry);
    if (calculationHistory.length > 50) calculationHistory.pop();
    saveHistory();
    updateHistoryBadge();
    renderHistoryList();
}

function updateHistoryBadge() {
    const count = calculationHistory.length;
    DOM.historyBadge.textContent = count;
    DOM.historyBadge.classList.toggle('visible', count > 0);
}

function deleteHistoryItem(id) {
    calculationHistory = calculationHistory.filter(h => h.id !== id);
    saveHistory();
    updateHistoryBadge();
    renderHistoryList();
    showToast('Item removido do histórico.', 'info');
}

function toggleHistorySidebar() {
    DOM.historySidebar.classList.toggle('open');
    DOM.sidebarOverlay.classList.toggle('visible');
    renderHistoryList();
}

function closeHistorySidebar() {
    DOM.historySidebar.classList.remove('open');
    DOM.sidebarOverlay.classList.remove('visible');
}

function saveProduct() {
    const values = getInputValues();
    const results = computeResults(values);

    if (!values.productName || !values.productName.trim()) {
        if (window.showToast) window.showToast('Preencha o nome do produto antes de salvar!', 'error');
        return;
    }

    if (values.salePrice <= 0) {
        if (window.showToast) window.showToast('Defina um preço de venda antes de salvar!', 'error');
        return;
    }

    const product = {
        id: Date.now(),
        date: new Date().toLocaleString('pt-BR'),
        name: values.productName,
        values: { ...values },
        results: { ...results },
    };

    savedProducts.unshift(product);
    saveSavedProducts();
    renderSavedProducts();
    showToast(`"${values.productName}" salvo com sucesso!`, 'success');
}

function deleteSavedProduct(id) {
    const product = savedProducts.find(p => p.id === id);
    savedProducts = savedProducts.filter(p => p.id !== id);
    saveSavedProducts();
    renderSavedProducts();
    showToast(`"${product?.name || 'Produto'}" removido.`, 'info');
}

function animateDefaultButton(btn) {
    btn.style.transform = 'scale(1.15) rotate(90deg)';
    setTimeout(() => { btn.style.transform = ''; }, 400);
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('meus3d_theme', next);

    // Update charts colors
    setTimeout(() => {
        if (currentResults) {
            updateCharts(currentResults);
        } else {
            destroyCharts();
            initCharts();
        }
    }, 100);
}

function calculate() {
    const values = getInputValues();
    const results = computeResults(values);
    currentResults = { ...results, ...values };

    updateResultsUI(currentResults);
    updateCharts(results);
    animateResults();

    // Add to history
    addToHistory(values, results);

    showToast('Cálculo realizado com sucesso!', 'success');
}

function clearAllHistory() {
    if (calculationHistory.length === 0) return;
    calculationHistory = [];
    saveHistory();
    updateHistoryBadge();
    renderHistoryList();
    // Also clear saved products
    savedProducts = [];
    saveSavedProducts();
    renderSavedProducts();
    showToast('Histórico e produtos salvos foram limpos.', 'info');
}

function getMarketplaces() {
    const defaultMkt = [{ id: 'direct', name: 'Venda Direta', commissionRate: 0, defaultShipping: 0, removable: false }];
    try {
        const stored = localStorage.getItem('meus3d_marketplaces');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error("Error loading marketplaces:", e);
    }
    return defaultMkt;
}

function initFilaments() {
    DOM.filamentsContainer.innerHTML = '';
    createFilamentRow();
    
    try {
        DOM.btnAddAuxiliary.addEventListener('click', () => {
            addAuxiliaryRow();
        });
    } catch(e) {
        alert("Erro ao adicionar listener no botão Auxiliares: " + e.message);
    }

    DOM.btnAddFilament.addEventListener('click', () => {
        createFilamentRow();
        calculateRealtime();
    });
}

function addAuxiliaryRow(auxId = '', qty = 1) {
    try {
        const row = document.createElement('div');
        row.className = 'filament-row';
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';

        const selectWrap = document.createElement('div');
        selectWrap.className = 'input-wrapper';
        selectWrap.style.flex = '2';
        const select = document.createElement('select');
        select.className = 'row-aux-select';
        select.style.cssText = 'width: 100%; padding: 0.6rem 0.8rem; background: var(--bg-input); border: 1px solid var(--border-input); border-radius: var(--radius-sm); color: var(--text-primary); appearance: none; -webkit-appearance: none; font-size: 13px; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; background-size: 1.2em;';
        populateAuxiliarySelects(select);
        
        if (auxId) {
            const opt = Array.from(select.options).find(o => o.dataset.id === auxId);
            if (opt) select.value = opt.value;
        }
        
        selectWrap.appendChild(select);

        const qtyWrap = document.createElement('div');
        qtyWrap.className = 'input-wrapper';
        qtyWrap.style.flex = '1';
        const inputQty = document.createElement('input');
        inputQty.type = 'number';
        inputQty.className = 'row-aux-qty';
        inputQty.placeholder = 'Qtd';
        inputQty.min = '0';
        inputQty.step = '1';
        inputQty.value = qty;
        qtyWrap.appendChild(inputQty);
        
        const suffix = document.createElement('span');
        suffix.className = 'input-suffix';
        suffix.textContent = 'un';
        qtyWrap.appendChild(suffix);

        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.className = 'btn-icon';
        btnRemove.style.color = '#ef4444';
        btnRemove.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        btnRemove.onclick = () => {
            row.remove();
            calculateRealtime();
        };

        select.addEventListener('change', calculateRealtime);
        inputQty.addEventListener('input', calculateRealtime);

        row.appendChild(selectWrap);
        row.appendChild(qtyWrap);
        row.appendChild(btnRemove);

        if (!DOM.auxiliariesContainer) {
            alert("Erro: DOM.auxiliariesContainer não existe!");
            return;
        }

        DOM.auxiliariesContainer.appendChild(row);
    } catch(e) {
        alert("Erro no addAuxiliaryRow: " + e.message);
    }
}

function initCharts() {
    const colors = getChartColors();

    // Cost Distribution Chart (Doughnut)
    const costCtx = document.getElementById('costDistributionChart').getContext('2d');
    chartInstances.costDistribution = new Chart(costCtx, {
        type: 'doughnut',
        data: {
            labels: ['Filamento', 'Energia', 'Máquina', 'Auxiliares', 'Pós-proc.', 'Design', 'Embalagem', 'Frete', 'Taxa Plataf.', 'Outros'],
            datasets: [{
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    colors.blueAlpha,
                    colors.amberAlpha,
                    colors.cyanAlpha,
                    colors.purpleAlpha,
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(139, 92, 246, 0.7)',
                    'rgba(20, 184, 166, 0.7)',
                    colors.redAlpha,
                    colors.greenAlpha,
                ],
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.text,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        padding: 12,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { family: "'Inter', sans-serif" },
                    bodyFont: { family: "'Inter', sans-serif" },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(ctx) {
                            return ` ${ctx.label}: R$ ${ctx.raw.toFixed(2).replace('.', ',')}`;
                        }
                    }
                }
            }
        }
    });

    // Profit Margin Chart (Doughnut / Gauge)
    const marginCtx = document.getElementById('profitMarginChart').getContext('2d');
    chartInstances.profitMargin = new Chart(marginCtx, {
        type: 'doughnut',
        data: {
            labels: ['Margem de Lucro', 'Custos'],
            datasets: [{
                data: [0, 100],
                backgroundColor: [colors.greenAlpha, 'rgba(128,128,128,0.15)'],
                borderWidth: 0,
                hoverOffset: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            rotation: -90,
            circumference: 180,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { family: "'Inter', sans-serif" },
                    bodyFont: { family: "'Inter', sans-serif" },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(ctx) {
                            return ` ${ctx.label}: ${ctx.raw.toFixed(2).replace('.', ',')}%`;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'marginCenterText',
            afterDraw(chart) {
                const { ctx, chartArea } = chart;
                const data = chart.data.datasets[0].data;
                const margin = data[0];
                const centerX = (chartArea.left + chartArea.right) / 2;
                const centerY = chartArea.bottom - 20;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = margin < 0 ? colors.red : colors.green;
                ctx.font = `bold 28px 'Inter', sans-serif`;
                ctx.fillText(`${margin.toFixed(1).replace('.', ',')}%`, centerX, centerY);
                ctx.restore();
            }
        }]
    });

    // Revenue vs Profit (Bar)
    const revenueCtx = document.getElementById('revenueVsProfitChart').getContext('2d');
    chartInstances.revenueVsProfit = new Chart(revenueCtx, {
        type: 'bar',
        data: {
            labels: ['Faturamento', 'Custos Totais', 'Lucro Total'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [colors.blueAlpha, colors.amberAlpha, colors.greenAlpha],
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 50,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { family: "'Inter', sans-serif" },
                    bodyFont: { family: "'Inter', sans-serif" },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(ctx) {
                            return ` R$ ${ctx.raw.toFixed(2).replace('.', ',')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: colors.text, font: { family: "'Inter', sans-serif", size: 11 } },
                    grid: { display: false },
                    border: { display: false },
                },
                y: {
                    ticks: {
                        color: colors.text,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        callback: function(val) { return 'R$ ' + val.toFixed(0); }
                    },
                    grid: { color: colors.grid },
                    border: { display: false },
                }
            }
        }
    });
}

function updateCharts(results) {
    const colors = getChartColors();
    const values = getInputValues();
    const quantity = values.quantity || 1;

    // Cost Distribution
    if (chartInstances.costDistribution) {
        const failMult = 1 + ((values.failureRate || 0) / 100);
        const filamentPerUnit = (results.filamentCost / quantity) * failMult;
        const energyPerUnit = (results.energyCost / quantity) * failMult;
        const machinePerUnit = (results.machineCost / quantity) * failMult;
        const auxiliaryPerUnit = (results.auxiliaryCost / quantity) * failMult;

        const postProcPerUnit = values.postProcessing || 0;
        const designPerUnit = values.designCost || 0;
        const packagingPerUnit = values.packagingCost;
        const shippingPerUnit = values.shippingCost;
        const feePerUnit = results.platformFeeValue;
        const otherPerUnit = values.otherCosts / quantity;

        chartInstances.costDistribution.data.datasets[0].data = [
            filamentPerUnit, energyPerUnit, machinePerUnit, auxiliaryPerUnit, postProcPerUnit, designPerUnit,
            packagingPerUnit, shippingPerUnit, feePerUnit, otherPerUnit
        ];
        chartInstances.costDistribution.options.plugins.legend.labels.color = colors.text;
        chartInstances.costDistribution.update('none');
    }

    // Profit Margin
    if (chartInstances.profitMargin) {
        const activeMargin = values.salePriceMarketplace > 0 ? results.profitMarginMarketplace : results.profitMarginDirect;
        const margin = Math.max(0, Math.min(100, activeMargin));
        const remaining = 100 - margin;
        chartInstances.profitMargin.data.datasets[0].data = [margin, remaining];
        chartInstances.profitMargin.data.datasets[0].backgroundColor[0] =
            activeMargin < 0 ? colors.redAlpha : (activeMargin < 20 ? colors.amberAlpha : colors.greenAlpha);
        chartInstances.profitMargin.update('none');
    }

    // Revenue vs Profit
    if (chartInstances.revenueVsProfit) {
        const totalCosts = results.unitCost * quantity + results.platformFeeValue * quantity;
        const activeRevenue = values.salePriceMarketplace > 0 ? results.totalRevenueMarketplace : results.totalRevenueDirect;
        const activeProfit = values.salePriceMarketplace > 0 ? results.totalProfitMarketplace : results.totalProfitDirect;
        
        chartInstances.revenueVsProfit.data.datasets[0].data = [
            activeRevenue,
            totalCosts,
            Math.max(0, activeProfit),
        ];
        chartInstances.revenueVsProfit.data.datasets[0].backgroundColor[2] =
            activeProfit < 0 ? colors.redAlpha : colors.greenAlpha;
        chartInstances.revenueVsProfit.options.scales.x.ticks.color = colors.text;
        chartInstances.revenueVsProfit.options.scales.y.ticks.color = colors.text;
        chartInstances.revenueVsProfit.options.scales.y.grid.color = colors.grid;
        chartInstances.revenueVsProfit.update('none');
    }
}

function loadHistory() {
    try {
        calculationHistory = JSON.parse(localStorage.getItem('history3d') || '[]');
    } catch {
        calculationHistory = [];
    }
}

function saveHistory() {
    localStorage.setItem('history3d', JSON.stringify(calculationHistory));
}

function renderHistoryList() {
    if (calculationHistory.length === 0) {
        DOM.historyList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <p>Nenhum cálculo realizado ainda</p>
            </div>
        `;
        return;
    }

    DOM.historyList.innerHTML = calculationHistory.map(entry => `
        <div class="history-item" data-id="${entry.id}">
            <div class="history-item-header">
                <span class="history-item-name">${escapeHTML(entry.name)}</span>
                <span class="history-item-date">${entry.date}</span>
            </div>
            <div class="history-item-details">
                <div class="history-detail">Custo/un: <strong>${formatCurrency(entry.results.unitCostProduction || entry.results.unitCost || 0)}</strong></div>
                <div class="history-detail">Venda: <strong>${formatCurrency((entry.values && entry.values.salePrice) || 0)}</strong></div>
                <div class="history-detail">Lucro/un: <strong style="color:${(entry.results.unitProfitDirect || entry.results.unitProfit || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatCurrency(entry.results.unitProfitDirect || entry.results.unitProfit || 0)}</strong></div>
                <div class="history-detail">Margem: <strong style="color:${(entry.results.profitMarginDirect || entry.results.profitMargin || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatPercent(entry.results.profitMarginDirect || entry.results.profitMargin || 0)}</strong></div>
            </div>
            <div class="history-item-actions">
                <button class="btn btn-small btn-secondary" onclick="loadFromHistory(${entry.id})">
                    Carregar
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteHistoryItem(${entry.id})">
                    Remover
                </button>
            </div>
        </div>
    `).join('');
}

function loadFromHistory(id) {
    const entry = calculationHistory.find(h => h.id === id);
    if (!entry) return;

    DOM.productName.value = entry.values.productName || '';
    if (DOM.machineIdSelect) DOM.machineIdSelect.value = entry.values.machineId || '';
    DOM.weight.value = entry.values.weight || '';
    DOM.filamentCost.value = entry.values.filamentCostKg || '';
    DOM.printTime.value = entry.values.printTime || '';
    DOM.powerConsumption.value = entry.values.powerWatts || '';
    DOM.kwhCost.value = entry.values.kwhCost || '';
    DOM.quantity.value = entry.values.quantity || 1;
    DOM.packagingCost.value = entry.values.packagingCost || '';
    if (DOM.shippingCost) DOM.shippingCost.value = entry.values.shippingCost || '';
    if (DOM.platformFee) DOM.platformFee.value = entry.values.platformFee || '';
    DOM.otherCosts.value = entry.values.otherCosts || '';
    DOM.machineHourCost.value = entry.values.machineHourCost || '';
    DOM.postProcessing.value = entry.values.postProcessing || '';
    DOM.designCost.value = entry.values.designCost || '';
    DOM.failureRate.value = entry.values.failureRate || '';
    DOM.salePrice.value = entry.values.salePrice || '';

    closeHistorySidebar();
    showToast('Dados carregados do histórico!', 'info');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadSavedProducts() {
    try {
        savedProducts = JSON.parse(localStorage.getItem('savedProducts3d') || '[]');
    } catch {
        savedProducts = [];
    }
}

function saveSavedProducts() {
    localStorage.setItem('savedProducts3d', JSON.stringify(savedProducts));
}

function renderSavedProducts() {
    if (savedProducts.length === 0) {
        DOM.savedProductsSection.style.display = 'none';
        return;
    }

    DOM.savedProductsSection.style.display = 'block';

    DOM.savedProductsList.innerHTML = savedProducts.map(product => `
        <div class="saved-product-card" data-id="${product.id}">
            <div class="saved-product-name">${escapeHTML(product.name)}</div>
            <div class="saved-product-date">${product.date}</div>
            <div class="saved-product-stats">
                <div class="saved-product-stat">Custo/un: <strong>${formatCurrency(product.results.unitCostProduction || product.results.unitCost || 0)}</strong></div>
                <div class="saved-product-stat">Venda: <strong>${formatCurrency((product.values && product.values.salePrice) || 0)}</strong></div>
                <div class="saved-product-stat ${(product.results.unitProfitDirect || product.results.unitProfit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">Lucro/un: <strong>${formatCurrency(product.results.unitProfitDirect || product.results.unitProfit || 0)}</strong></div>
                <div class="saved-product-stat ${(product.results.profitMarginDirect || product.results.profitMargin || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">Margem: <strong>${formatPercent(product.results.profitMarginDirect || product.results.profitMargin || 0)}</strong></div>
            </div>
            <div class="saved-product-actions">
                <button class="btn btn-small btn-secondary" onclick="loadSavedProduct(${product.id})">Carregar</button>
                <button class="btn btn-small btn-danger" onclick="deleteSavedProduct(${product.id})">Remover</button>
            </div>
        </div>
    `).join('');
}

function loadSavedProduct(id) {
    const product = savedProducts.find(p => p.id === id);
    if (!product) return;

    DOM.productName.value = product.values.productName || '';
    if (DOM.machineIdSelect) DOM.machineIdSelect.value = product.values.machineId || '';
    DOM.weight.value = product.values.weight || '';
    DOM.filamentCost.value = product.values.filamentCostKg || '';
    DOM.printTime.value = product.values.printTime || '';
    DOM.powerConsumption.value = product.values.powerWatts || '';
    DOM.kwhCost.value = product.values.kwhCost || '';
    DOM.quantity.value = product.values.quantity || 1;
    DOM.packagingCost.value = product.values.packagingCost || '';
    if (DOM.shippingCost) DOM.shippingCost.value = product.values.shippingCost || '';
    if (DOM.platformFee) DOM.platformFee.value = product.values.platformFee || '';
    DOM.otherCosts.value = product.values.otherCosts || '';
    DOM.machineHourCost.value = product.values.machineHourCost || '';
    DOM.postProcessing.value = product.values.postProcessing || '';
    DOM.designCost.value = product.values.designCost || '';
    DOM.failureRate.value = product.values.failureRate || '';
    DOM.salePrice.value = product.values.salePrice || '';

    showToast(`"${product.name}" carregado!`, 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearForm() {
    // Clear product-specific fields
    DOM.productName.value = '';
    DOM.weight.value = '';
    DOM.printTime.value = '';
    DOM.quantity.value = '1';
    DOM.salePrice.value = '';

    // Reload saved defaults (keep them filled)
    loadDefaults();
    
    calculateRealtime();

    currentResults = null;

    // Reset results UI
    document.querySelectorAll('.result-value').forEach(el => {
        if (el.dataset.result === 'profitMarginResult') {
            el.textContent = '0,00%';
        } else {
            el.textContent = 'R$ 0,00';
        }
    });

    document.querySelectorAll('.result-sub-value').forEach(el => {
        const sub = el.dataset.subResult;
        if (!sub) return;
        if (sub === 'totalRevenueUnit' || sub === 'unitProfitResult') {
            el.textContent = 'un.: R$ 0,00';
        } else {
            el.textContent = 'Mesa: R$ 0,00';
        }
    });

    // Reset profit highlight
    [DOM.resultUnitProfit, DOM.resultTotalProfit].forEach(el => {
        if (el) {
            el.classList.remove('result-negative');
            el.classList.add('result-highlight-green');
        }
    });

    // Reset charts
    destroyCharts();
    initCharts();

    showToast('Formulário limpo! Valores padrão mantidos.', 'info');
}

function saveAllDefaults() {
    const defaults = {
        filamentCost: DOM.filamentCost.value,
        powerWatts: DOM.powerConsumption.value,
        kwhCost: DOM.kwhCost.value,
        packagingCost: DOM.packagingCost.value,
        shippingCost: DOM.shippingCost ? DOM.shippingCost.value : 0,
        platformFee: DOM.platformFee ? DOM.platformFee.value : 0,
        otherCosts: DOM.otherCosts.value,
        machineHourCost: DOM.machineHourCost.value,
        postProcessing: DOM.postProcessing.value,
        designCost: DOM.designCost.value,
        failureRate: DOM.failureRate.value,
    };
    localStorage.setItem('defaults3d', JSON.stringify(defaults));
    showToast('Configurações padrão salvas!', 'success');
    animateDefaultButton(DOM.saveAllDefaults);
    updateDefaultButtons();
}

function loadDefaults() {
    try {
        const defaults = JSON.parse(localStorage.getItem('defaults3d'));
        if (defaults) {
            if (defaults.filamentCost) DOM.filamentCost.value = defaults.filamentCost;
            if (defaults.powerWatts) DOM.powerConsumption.value = defaults.powerWatts;
            if (defaults.kwhCost) DOM.kwhCost.value = defaults.kwhCost;
            if (defaults.packagingCost) DOM.packagingCost.value = defaults.packagingCost;
            if (defaults.shippingCost) DOM.shippingCost.value = defaults.shippingCost;
            if (defaults.platformFee) DOM.platformFee.value = defaults.platformFee;
            if (defaults.otherCosts) DOM.otherCosts.value = defaults.otherCosts;
            if (defaults.machineHourCost) DOM.machineHourCost.value = defaults.machineHourCost;
            if (defaults.postProcessing) DOM.postProcessing.value = defaults.postProcessing;
            if (defaults.designCost) DOM.designCost.value = defaults.designCost;
            if (defaults.failureRate) DOM.failureRate.value = defaults.failureRate;
        }
    } catch { /* ignore */ }
}

function updateDefaultButtons() {
    const hasSaved = localStorage.getItem('defaults3d') !== null;
    DOM.saveAllDefaults.classList.toggle('btn-icon-saved', hasSaved);
}

function exportPDF() {
    const values = getInputValues();
    const results = computeResults(values);

    if (values.salePrice <= 0 && values.weight <= 0) {
        showToast('Preencha os dados antes de exportar!', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, pageWidth, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Orçamento - Impressão 3D', pageWidth / 2, 16, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(values.productName, pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(9);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 32, { align: 'center' });

        // Reset text color
        doc.setTextColor(30, 30, 30);

        let yPos = 45;

        // Section: Dados da Impressão
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text('Dados da Impressão', 14, yPos);
        yPos += 3;

        const printBody = [
            ['Peso Total da Mesa', `${values.weight} g`],
            ['Custo do Filamento/kg', formatCurrency(values.filamentCostKg)],
            ['Tempo de Impressão', `${values.printTime} h`],
            ['Potência da Impressora', `${values.powerWatts} W`],
            ['Valor do kWh', formatCurrency(values.kwhCost)],
            ['Quantidade de Peças', `${values.quantity} un.`],
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Parâmetro', 'Valor']],
            body: printBody,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], fontSize: 10 },
            bodyStyles: { fontSize: 10 },
            margin: { left: 14, right: 14 },
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Section: Custos Operacionais
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(245, 158, 11);
        doc.text('Custos Operacionais', 14, yPos);
        yPos += 3;

        doc.autoTable({
            startY: yPos,
            head: [['Parâmetro', 'Valor']],
            body: [
                ['Embalagem/un.', formatCurrency(values.packagingCost)],
                ['Frete/un.', formatCurrency(values.shippingCost)],
                ['Taxa da Plataforma', `${values.platformFee}%`],
                ['Outros Custos', formatCurrency(values.otherCosts)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], fontSize: 10 },
            bodyStyles: { fontSize: 10 },
            margin: { left: 14, right: 14 },
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Section: Máquina & Extras
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(6, 182, 212);
        doc.text('Máquina & Extras', 14, yPos);
        yPos += 3;

        doc.autoTable({
            startY: yPos,
            head: [['Parâmetro', 'Valor']],
            body: [
                ['Custo Horário da Máquina', `${formatCurrency(values.machineHourCost)}/h`],
                ['Pós-processamento/peça', formatCurrency(values.postProcessing)],
                ['Design/modelagem/peça', formatCurrency(values.designCost)],
                ['Taxa de Falha', `${values.failureRate}%`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [6, 182, 212], fontSize: 10 },
            bodyStyles: { fontSize: 10 },
            margin: { left: 14, right: 14 },
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Section: Resultados
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Resultados', 14, yPos);
        yPos += 3;

        doc.autoTable({
            startY: yPos,
            head: [['Métrica', 'Valor/Unidade', 'Valor Total (Mesa)']],
            body: [
                ['Custo do Filamento', formatCurrency(results.filamentCost / results.quantity), formatCurrency(results.filamentCost)],
                ['Custo de Energia', formatCurrency(results.energyCost / results.quantity), formatCurrency(results.energyCost)],
                ['Custo da Máquina', formatCurrency(results.machineCost / results.quantity), formatCurrency(results.machineCost)],
                ['Insumos Auxiliares', formatCurrency(results.auxiliaryCost / results.quantity), formatCurrency(results.auxiliaryCost)],
                ['Reserva de Falhas (Seguro)', formatCurrency(results.totalFailureCost / results.quantity), formatCurrency(results.totalFailureCost)],
                ['Custo Total Produção', formatCurrency(results.totalPrintCost / results.quantity), formatCurrency(results.totalPrintCost)],
                ['Embalagem', formatCurrency(results.totalPackagingCost / results.quantity), formatCurrency(results.totalPackagingCost)],
                ['Frete', formatCurrency(results.totalShippingCost / results.quantity), formatCurrency(results.totalShippingCost)],
                ['Pós-processamento', formatCurrency(results.totalPostProcessing / results.quantity), formatCurrency(results.totalPostProcessing)],
                ['Design / Modelagem', formatCurrency(results.totalDesignCost / results.quantity), formatCurrency(results.totalDesignCost)],
                ['Taxa da Plataforma', formatCurrency(results.platformFeeValue), formatCurrency(results.totalPlatformFee)],
                ['Outros Custos', formatCurrency(results.totalOtherCosts / results.quantity), formatCurrency(results.totalOtherCosts)],
                ['Custo por Unidade', formatCurrency(results.unitCost), formatCurrency(results.unitCost * results.quantity)],
                ['Preço de Venda', formatCurrency(values.salePrice), formatCurrency(values.salePrice * results.quantity)],
                ['Lucro por Unidade', formatCurrency(results.unitProfit), formatCurrency(results.totalProfit)],
                ['Faturamento Total', formatCurrency(values.salePrice), formatCurrency(results.totalRevenue)],
                ['Margem de Lucro', formatPercent(results.profitMargin), formatPercent(results.profitMargin)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], fontSize: 10 },
            bodyStyles: { fontSize: 10 },
            margin: { left: 14, right: 14 },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const label = data.row.raw[0];
                    if (label === 'Lucro por Unidade' || label === 'Lucro') {
                        if (results.unitProfit < 0) {
                            data.cell.styles.textColor = [239, 68, 68];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [34, 197, 94];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    } else if (label === 'Margem de Lucro') {
                        const color = results.profitMargin < 0 ? [239, 68, 68] : [34, 197, 94];
                        data.cell.styles.textColor = color;
                        data.cell.styles.fontStyle = 'bold';
                    } else if (label === 'Faturamento Total') {
                        data.cell.styles.textColor = [99, 102, 241];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        // Footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Calculadora de Precificação 3D - Gerado automaticamente', pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Save
        const filename = `orcamento-3d-${values.productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}.pdf`;
        doc.save(filename);

        showToast('PDF exportado com sucesso!', 'success');
    } catch (err) {
        console.error('PDF export error:', err);
        showToast('Erro ao exportar PDF. Tente novamente.', 'error');
    }
}



function populatePackagingSelect() {
    if (!DOM.packagingIdSelect) return;
    const select = DOM.packagingIdSelect;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Customizado...</option>';
    
    let embalagens = [];
    try {
        embalagens = JSON.parse(localStorage.getItem('meus3d_embalagens_montadas_v1') || '[]');
    } catch(e) {}

    let inv = {};
    try {
        inv = JSON.parse(localStorage.getItem('meus3d_embalagens_v1') || '{}');
    } catch(e) {}

    embalagens.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        
        let dynTotal = 0;
        if (e.items && e.items.length > 0) {
            e.items.forEach(pItem => {
                if (inv[pItem.insumoId]) {
                    const ins = inv[pItem.insumoId];
                    if (ins.qty > 0) {
                        dynTotal += (ins.totalValue / ins.qty) * pItem.qty;
                    }
                }
            });
        }
        const finalCost = dynTotal > 0 ? dynTotal : (e.totalCost || 0);

        opt.textContent = `${e.name} - R$ ${finalCost.toFixed(2)}`;
        opt.dataset.cost = finalCost;
        select.appendChild(opt);
    });

    if (currentValue && embalagens.find(e => e.id === currentValue)) {
        select.value = currentValue;
    }
}
