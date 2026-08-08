/* =============================================
   CALCULADORA DE PRECIFICAÇÃO 3D
   ============================================= */

// =============================================
// DOM ELEMENTS
// =============================================
const DOM = {
    // Inputs
    productName: document.getElementById('productName'),
    machineIdSelect: document.getElementById('machineIdSelect'),
    filamentsContainer: document.getElementById('filamentsContainer'),
    auxiliariesContainer: document.getElementById('auxiliariesContainer'),
    btnAddAuxiliary: document.getElementById('btnAddAuxiliary'),
    btnAddFilament: document.getElementById('btnAddFilament'),
    inlineFilamentCost: document.querySelector('[data-result="inlineFilamentCost"]'),
    inlineEnergyCost: document.querySelector('[data-result="inlineEnergyCost"]'),
    inlineMachineCost: document.querySelector('[data-result="inlineMachineCost"]'),
    inlinePostProcessingCost: document.querySelector('[data-result="inlinePostProcessingCost"]'),
    inlineDesignCost: document.querySelector('[data-result="inlineDesignCost"]'),
    inlineFailureCost: document.querySelector('[data-result="inlineFailureCost"]'),
    
    
    printTime: document.getElementById('printTime'),
    printTimeMinutes: document.getElementById('printTimeMinutes'),
    powerConsumption: document.getElementById('powerConsumption'),
    kwhCost: document.getElementById('kwhCost'),
    quantity: document.getElementById('quantity'),
    packagingCost: document.getElementById('packagingCost'),
    packagingIdSelect: document.getElementById('packagingIdSelect'),
    shippingCost: document.getElementById('shippingCost'),
    platformFee: document.getElementById('platformFee'),
    otherCosts: document.getElementById('otherCosts'),
    machineHourCost: document.getElementById('machineHourCost'),
    postProcessing: document.getElementById('postProcessing'),
    designCost: document.getElementById('designCost'),
    failureRate: document.getElementById('failureRate'),
    salePrice: document.getElementById('salePrice'),
    salePriceMarketplace: document.getElementById('salePriceMarketplace'),
    marketplaceSelect: document.getElementById('marketplaceSelect'),

    // Buttons
    calculateBtn: document.getElementById('calculateBtn'),
    clearBtn: document.getElementById('clearBtn'),
    exportBtn: document.getElementById('exportBtn'),
    saveBtn: document.getElementById('saveBtn'),
    themeToggle: document.getElementById('themeToggle'),
    historyToggle: document.getElementById('historyToggle'),
    closeSidebar: document.getElementById('closeSidebar'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    saveAllDefaults: document.getElementById('saveAllDefaults'),

    // Results
    filamentCostUnit: document.querySelector('[data-result="filamentCostUnit"]'),
    filamentWeightUnit: document.querySelector('[data-result="filamentWeightUnit"]'),
    filamentWeightBatch: document.querySelector('[data-sub-result="filamentWeightBatch"]'),
    energyCostUnit: document.querySelector('[data-result="energyCostUnit"]'),
    machineCostUnit: document.querySelector('[data-result="machineCostUnit"]'),
    failureCostUnit: document.querySelector('[data-result="failureCostUnit"]'),
    packagingCostUnit: document.querySelector('[data-result="packagingCostUnit"]'),
    shippingCostUnit: document.querySelector('[data-result="shippingCostUnit"]'),
    postProcessingCostUnit: document.querySelector('[data-result="postProcessingCostUnit"]'),
    designCostUnit: document.querySelector('[data-result="designCostUnit"]'),
    platformFeeUnit: document.querySelector('[data-result="platformFeeUnit"]'),
    otherCostsUnit: document.querySelector('[data-result="otherCostsUnit"]'),
    unitCostTotalDirect: document.querySelector('[data-result="unitCostTotalDirect"]'),
    unitCostTotalMarketplace: document.querySelector('[data-result="unitCostTotalMarketplace"]'),
    unitProfitDirect: document.querySelector('[data-result="unitProfitDirect"]'),
    unitProfitMarketplace: document.querySelector('[data-result="unitProfitMarketplace"]'),

    // New batch fields inside unit cards
    filamentCostBatch: document.querySelector('[data-sub-result="filamentCostBatch"]'),
    energyCostBatch: document.querySelector('[data-sub-result="energyCostBatch"]'),
    machineCostBatch: document.querySelector('[data-sub-result="machineCostBatch"]'),
    failureCostBatch: document.querySelector('[data-sub-result="failureCostBatch"]'),
    packagingCostBatch: document.querySelector('[data-sub-result="packagingCostBatch"]'),
    shippingCostBatch: document.querySelector('[data-sub-result="shippingCostBatch"]'),
    postProcessingCostBatch: document.querySelector('[data-sub-result="postProcessingCostBatch"]'),
    designCostBatch: document.querySelector('[data-sub-result="designCostBatch"]'),
    platformFeeBatch: document.querySelector('[data-sub-result="platformFeeBatch"]'),
    otherCostsBatch: document.querySelector('[data-sub-result="otherCostsBatch"]'),
    unitCostTotalDirectBatch: document.querySelector('[data-sub-result="unitCostTotalDirectBatch"]'),
    unitCostTotalMarketplaceBatch: document.querySelector('[data-sub-result="unitCostTotalMarketplaceBatch"]'),
    unitProfitDirectBatch: document.querySelector('[data-sub-result="unitProfitDirectBatch"]'),
    unitProfitMarketplaceBatch: document.querySelector('[data-sub-result="unitProfitMarketplaceBatch"]'),

    totalPrintCostBatch: document.querySelector('[data-result="totalPrintCostBatch"]'),
    operationalCostBatch: document.querySelector('[data-result="operationalCostBatch"]'),
    totalCostBatch: document.querySelector('[data-result="totalCostBatch"]'),

    totalRevenueDirect: document.querySelector('[data-result="totalRevenueDirect"]'),
    totalProfitDirect: document.querySelector('[data-result="totalProfitDirect"]'),
    profitMarginDirect: document.querySelector('[data-result="profitMarginDirect"]'),

    totalRevenueMarketplace: document.querySelector('[data-result="totalRevenueMarketplace"]'),
    totalProfitMarketplace: document.querySelector('[data-result="totalProfitMarketplace"]'),
    profitMarginMarketplace: document.querySelector('[data-result="profitMarginMarketplace"]'),

    // Result items (for animation and styling)
    resultUnitProfitDirect: document.getElementById('resultUnitProfitDirect'),
    resultUnitProfitMarketplace: document.getElementById('resultUnitProfitMarketplace'),
    resultTotalProfitDirect: document.getElementById('resultTotalProfitDirect'),
    resultTotalProfitMarketplace: document.getElementById('resultTotalProfitMarketplace'),

    // Sections
    historySidebar: document.getElementById('historySidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    historyList: document.getElementById('historyList'),
    historyBadge: document.getElementById('historyBadge'),
    savedProductsSection: document.getElementById('savedProductsSection'),
    savedProductsList: document.getElementById('savedProductsList'),
    toastContainer: document.getElementById('toastContainer'),
    chartsSection: document.getElementById('chartsSection'),
};

// =============================================
// STATE
// =============================================
let chartInstances = {
    costDistribution: null,
    profitMargin: null,
    revenueVsProfit: null,
};

let calculationHistory = [];
let savedProducts = [];
let currentResults = null;
let currentViewMode = 'unit';
let currentSalesMode = 'direct';

// =============================================
// MARKETPLACE LOGIC
// =============================================
// Function getMarketplaces -> Forced to calculator-core.js

function renderMarketplaceToggles() {
    const container = document.getElementById('marketplaceToggles');
    if (!container) return;
    const mkts = getMarketplaces();
    container.innerHTML = '';
    
    mkts.forEach(mkt => {
        const btn = document.createElement('button');
        btn.className = 'toggle-btn';
        if (currentSalesMode === mkt.id) {
            btn.classList.add('active');
        }
        btn.dataset.sales = mkt.id;
        btn.textContent = mkt.name;
        
        btn.addEventListener('click', (e) => {
            container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSalesMode = mkt.id;
            calculateRealtime();
        });
        
        container.appendChild(btn);
    });
}

function init() {
    loadTheme();
    loadDefaults();
    initFilaments();
    populateMachineSelect();
    renderMarketplaceToggles(); // new line
    attachEventListeners();
    loadHistory();
    loadSavedProducts();
    initCharts();
    updateHistoryBadge();
    renderSavedProducts();
    updateDefaultButtons();
}

// =============================================
// THEME & FILAMENTS
// =============================================

function populateMachineSelect() {
    if (!DOM.machineIdSelect) return;
    const machines = JSON.parse(localStorage.getItem('meus3d_machines_v1') || '[]');
    const firstOption = DOM.machineIdSelect.options[0];
    DOM.machineIdSelect.innerHTML = '';
    if (firstOption) DOM.machineIdSelect.appendChild(firstOption);
    
    machines.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        DOM.machineIdSelect.appendChild(opt);
    });
}


// =============================================
// FILAMENT ROWS LOGIC
// =============================================
let filamentRowCounter = 0;

// Function escapeHTML -> Moved to calculator-core.js

// Function initFilaments -> Forced to calculator-core.js


// Function escapeHTML -> Moved to calculator-core.js

// Function addAuxiliaryRow -> Forced to calculator-core.js

function loadFilaments() {
    if (!DOM.filamentSelect) return;
    
    const savedFilaments = JSON.parse(localStorage.getItem('meus3d_filaments')) || [];
    
    DOM.filamentSelect.innerHTML = '<option value="">Preço Manual (Abaixo)</option>';
    
    savedFilaments.forEach(fil => {
        const pricePerKg = (fil.price / fil.weight) * 1000;
        const option = document.createElement('option');
        option.value = pricePerKg;
        option.dataset.id = fil.id;
        option.textContent = `${fil.brand} ${fil.material} - ${fil.colorName} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pricePerKg)}/kg)`;
        DOM.filamentSelect.appendChild(option);
    });
}

// Function escapeHTML -> Moved to calculator-core.js

// Function clearAllHistory -> Moved to calculator-core.js (normalized)

// =============================================
// EVENT LISTENERS
// =============================================
function attachEventListeners() {
    // Buttons
    if (DOM.calculateBtn) DOM.calculateBtn.addEventListener('click', calculate);
    if (DOM.clearBtn) DOM.clearBtn.addEventListener('click', clearForm);
    if (DOM.exportBtn) DOM.exportBtn.addEventListener('click', exportPDF);
    if (DOM.saveBtn) DOM.saveBtn.addEventListener('click', saveProduct);
    if (DOM.themeToggle) DOM.themeToggle.addEventListener('click', toggleTheme);
    if (DOM.historyToggle) DOM.historyToggle.addEventListener('click', toggleHistorySidebar);
    if (DOM.closeSidebar) DOM.closeSidebar.addEventListener('click', closeHistorySidebar);
    if (DOM.sidebarOverlay) DOM.sidebarOverlay.addEventListener('click', closeHistorySidebar);
    if (DOM.clearHistoryBtn) DOM.clearHistoryBtn.addEventListener('click', clearAllHistory);

    // Defaults button
    if (DOM.saveAllDefaults) DOM.saveAllDefaults.addEventListener('click', saveAllDefaults);
    
    // Marketplace
    if (DOM.marketplaceSelect) DOM.marketplaceSelect.addEventListener('change', onMarketplaceChange);
    
    if (DOM.packagingIdSelect) {
        DOM.packagingIdSelect.addEventListener('change', (e) => {
            const selectedOpt = e.target.options[e.target.selectedIndex];
            if (selectedOpt.value) {
                const cost = parseFloat(selectedOpt.dataset.cost || 0);
                DOM.packagingCost.value = cost.toFixed(2);
                calculate();
            }
        });
    }

    if (DOM.machineIdSelect) {
        DOM.machineIdSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                try {
                    const machines = JSON.parse(localStorage.getItem('meus3d_machines_v1') || '[]');
                    const m = machines.find(mac => String(mac.id) === String(val));
                    if (m) {
                        if (DOM.powerConsumption && m.power !== undefined) DOM.powerConsumption.value = m.power;
                        if (DOM.kwhCost && m.kwhCost !== undefined) DOM.kwhCost.value = m.kwhCost;
                        if (DOM.machineHourCost && m.hourlyRate !== undefined) DOM.machineHourCost.value = m.hourlyRate;
                    }
                } catch (err) {
                    console.error("Erro ao puxar dados da máquina:", err);
                }
            }
            calculateRealtime();
        });
    }

    // Real-time calculation on all inputs
    const inputs = [
        DOM.productName, DOM.printTime, DOM.printTimeMinutes, DOM.powerConsumption,
        DOM.kwhCost, DOM.quantity, DOM.packagingCost, DOM.shippingCost,
        DOM.platformFee, DOM.otherCosts, DOM.machineHourCost, DOM.postProcessing,
        DOM.designCost, DOM.failureRate, DOM.salePrice
    ];

    inputs.forEach(input => {
        if(input) input.addEventListener('input', calculateRealtime);
    });

    if (DOM.filamentSelect) {
        DOM.filamentSelect.addEventListener('change', (e) => {
            const selectedPrice = e.target.value;
            if (selectedPrice) {
                DOM.filamentCost.value = parseFloat(selectedPrice).toFixed(2);
            }
            calculateRealtime();
        });
    }

    const sendProdBtn = document.getElementById('sendProdBtn');
    if (sendProdBtn) {
        sendProdBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const vals = getInputValues();
            const results = computeResults(vals);
            const url = new URL('producao.html', window.location.href);
            url.searchParams.set('add', 'true');
            url.searchParams.set('name', vals.productName);
            url.searchParams.set('cost', results.unitCostProduction.toFixed(2));
            url.searchParams.set('sale', vals.salePrice > 0 ? vals.salePrice.toFixed(2) : results.unitCostProduction.toFixed(2));
            url.searchParams.set('salemkt', vals.salePriceMarketplace > 0 ? vals.salePriceMarketplace.toFixed(2) : results.unitCostTotalMarketplace.toFixed(2));
            url.searchParams.set('time', vals.printTime);
            url.searchParams.set('weight', vals.weight);
            url.searchParams.set('qty', vals.quantity || 1);
            window.location.href = url.toString();
        });
    }

    // Toggles do Resultado
    document.querySelectorAll('#viewModeToggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#viewModeToggle .toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentViewMode = e.target.dataset.mode;
            if (currentResults) updateResultsUI(currentResults);
        });
    });
}

// =============================================
// CALCULATIONS
// =============================================
function getInputValues() {
    const mkts = getMarketplaces();
    const activeMkt = mkts.find(m => m.id === currentSalesMode) || mkts[0];
    const filamentRows = Array.from(DOM.filamentsContainer.querySelectorAll('.filament-row'));
    const filaments = filamentRows.map(row => {
        const select = row.querySelector('.row-filament-select');
        return {
            id: (select.selectedIndex > 0) ? select.options[select.selectedIndex].dataset.id : null,
            name: (select.selectedIndex > 0) ? select.options[select.selectedIndex].text.split('(')[0].trim() : 'Manual',
            costKg: parseFloat(row.querySelector('.row-cost').value) || 0,
            weight: parseFloat(row.querySelector('.row-weight').value) || 0
        };
    });

    const totalWeight = filaments.reduce((sum, f) => sum + f.weight, 0);
    
    const auxRows = Array.from(DOM.auxiliariesContainer.querySelectorAll('.filament-row'));
    const auxiliaries = auxRows.map(row => {
        const select = row.querySelector('.row-aux-select');
        const qty = parseFloat(row.querySelector('.row-aux-qty').value) || 0;
        return {
            id: (select.selectedIndex > 0) ? select.options[select.selectedIndex].dataset.id : null,
            name: (select.selectedIndex > 0) ? select.options[select.selectedIndex].text.split(' (')[0] : '',
            unitCost: (select.selectedIndex > 0) ? parseFloat(select.value) : 0,
            qty: qty,
            totalCost: ((select.selectedIndex > 0) ? parseFloat(select.value) : 0) * qty
        };
    }).filter(a => a.id && a.qty > 0);
    const totalAuxiliaryCost = auxiliaries.reduce((sum, a) => sum + a.totalCost, 0);

    const totalFilamentCost = filaments.reduce((sum, f) => sum + (f.weight * (f.costKg / 1000)), 0);

    return {
        filaments: filaments,
        auxiliaries: auxiliaries,
        totalAuxiliaryCost: totalAuxiliaryCost,
        totalFilamentCost: totalFilamentCost,
        productName: DOM.productName.value.trim() || 'Produto sem nome',
        filamentId: filaments.length === 1 ? filaments[0].id : 'Múltiplos',
        filamentName: filaments.length === 1 ? filaments[0].name : 'Múltiplos Filamentos',
        weight: totalWeight,
        filamentCostKg: filaments.length > 0 ? filaments[0].costKg : 0,
        printTime: (parseInt(DOM.printTime.value) || 0) + ((parseInt(DOM.printTimeMinutes.value) || 0) / 60),
        powerWatts: parseFloat(DOM.powerConsumption.value) || 0,
        kwhCost: parseFloat(DOM.kwhCost.value) || 0,
        quantity: parseInt(DOM.quantity.value) || 1,
        packagingCost: parseFloat(DOM.packagingCost.value) || 0,
        shippingCost: activeMkt.defaultShipping || 0,
        platformFee: activeMkt.commissionRate || 0,
        otherCosts: parseFloat(DOM.otherCosts.value) || 0,
        machineHourCost: parseFloat(DOM.machineHourCost.value) || 0,
        postProcessing: parseFloat(DOM.postProcessing.value) || 0,
        designCost: parseFloat(DOM.designCost.value) || 0,
        failureRate: parseFloat(DOM.failureRate.value) || 0,
        salePrice: parseFloat(DOM.salePrice.value) || 0,
        salePriceMarketplace: parseFloat(DOM.salePriceMarketplace.value) || 0,
        machineId: DOM.machineIdSelect ? DOM.machineIdSelect.value : '',
    };
}

function computeResults(values) {
    const {
        weight, filamentCostKg, printTime, powerWatts,
        kwhCost, quantity, packagingCost, shippingCost,
        platformFee, otherCosts, machineHourCost,
        postProcessing, designCost, failureRate, salePrice, salePriceMarketplace
    } = values;

    // Potência em kW = watts / 1000
    const powerKw = powerWatts / 1000;

    // Custo do filamento (lote inteiro)
    const filamentCost = (weight / 1000) * filamentCostKg;
    const totalAuxiliaryCost = (values.totalAuxiliaryCost || 0);

    // Custo de energia (lote inteiro)
    const energyCost = printTime * powerKw * kwhCost;

    // Custo da máquina (lote inteiro) = custo_hora * tempo
    const machineCost = machineHourCost * printTime;

    // Custo total de produção (lote inteiro, antes da falha)
    const totalPrintCost = filamentCost + energyCost + machineCost + totalAuxiliaryCost;

    // Multiplicador de falha: reserva para reimpressões
    const failureMultiplier = 1 + (failureRate / 100);

    // Custo de falha total (adicional devido à taxa de falha)
    const totalFailureCost = totalPrintCost * (failureRate / 100);

    // Custos de produção por unidade (por peça individual)
    const productionCostPerUnit = (totalPrintCost / quantity) * failureMultiplier;

    // Custos operacionais e extras totais
    const totalPackagingCost = packagingCost * quantity;
    const totalShippingCost = shippingCost * quantity;
    const totalPostProcessing = postProcessing * quantity;
    const totalDesignCost = designCost * quantity;
    const totalOtherCosts = otherCosts;

    // Custos fixos por unidade (não afetados pela falha)
    const fixedCostPerUnit = packagingCost + shippingCost + (otherCosts / quantity) + postProcessing + designCost;

    // Custo de produção puro (sem embalagem e frete - usado para venda direta)
    const unitCostProduction = productionCostPerUnit + (otherCosts / quantity) + postProcessing + designCost;
    
    // Custo total por unidade (inclui embalagem e frete)
    const unitCost = productionCostPerUnit + fixedCostPerUnit;

    // Direto
    const unitProfitDirect = salePrice - unitCostProduction;
    const totalProfitDirect = unitProfitDirect * quantity;
    const profitMarginDirect = salePrice > 0 ? (unitProfitDirect / salePrice) * 100 : 0;
    const totalRevenueDirect = salePrice * quantity;

    // Valor da taxa da plataforma por unidade
    const platformFeeValue = salePriceMarketplace * (platformFee / 100);
    const totalPlatformFee = platformFeeValue * quantity;

    // Custo total final (incluindo embalagem, frete e taxa da plataforma)
    const unitCostTotalFull = unitCost + platformFeeValue;

    // Marketplace
    const unitProfitMarketplace = salePriceMarketplace - unitCostTotalFull;
    const totalProfitMarketplace = unitProfitMarketplace * quantity;
    const profitMarginMarketplace = salePriceMarketplace > 0 ? (unitProfitMarketplace / salePriceMarketplace) * 100 : 0;
    const totalRevenueMarketplace = salePriceMarketplace * quantity;

    return {
        quantity,
        filamentCost,
        auxiliaryCost: totalAuxiliaryCost,
        energyCost,
        machineCost,
        totalPrintCost,
        unitCost,
        unitCostProduction,
        unitCostTotalFull,
        platformFeeValue,
        totalPlatformFee,
        totalPackagingCost,
        totalShippingCost,
        totalPostProcessing,
        totalDesignCost,
        totalOtherCosts,
        totalFailureCost,
        unitProfitDirect,
        totalProfitDirect,
        profitMarginDirect,
        totalRevenueDirect,
        unitProfitMarketplace,
        totalProfitMarketplace,
        profitMarginMarketplace,
        totalRevenueMarketplace
    };
}

// Function clearAllHistory -> Moved to calculator-core.js (normalized)

function calculateRealtime() {
    const values = getInputValues();
    const results = computeResults(values);
    currentResults = { ...results, ...values };

    updateResultsUI(results);
    updateCharts(results);
}

// =============================================
// UI UPDATE
// =============================================
// Function escapeHTML -> Moved to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

function updateResultsUI(results) {
    const qty = results.quantity || 1;
    
    // Save current results for toggle updates
    currentResults = results;

    if (DOM.inlineFilamentCost) DOM.inlineFilamentCost.textContent = 'R$ ' + results.filamentCost.toFixed(2).replace('.', ',');
    if (DOM.inlineEnergyCost) DOM.inlineEnergyCost.textContent = 'R$ ' + results.energyCost.toFixed(2).replace('.', ',');
    if (DOM.inlineMachineCost) DOM.inlineMachineCost.textContent = 'R$ ' + results.machineCost.toFixed(2).replace('.', ',');
    if (document.getElementById('inlineAuxiliaryCost')) document.getElementById('inlineAuxiliaryCost').textContent = 'R$ ' + results.auxiliaryCost.toFixed(2).replace('.', ',');
    //  DOM.inlineMachineCost.textContent = 'R$ ' + results.machineCost.toFixed(2).replace('.', ',');
    if (DOM.inlinePostProcessing) DOM.inlinePostProcessing.textContent = 'R$ ' + results.totalPostProcessing.toFixed(2).replace('.', ',');
    if (DOM.inlineDesignCost) DOM.inlineDesignCost.textContent = 'R$ ' + results.totalDesignCost.toFixed(2).replace('.', ',');
    if (DOM.inlineFailureCost) DOM.inlineFailureCost.textContent = 'R$ ' + results.totalFailureCost.toFixed(2).replace('.', ',');
    if (DOM.inlineUnitCostProduction) DOM.inlineUnitCostProduction.textContent = 'R$ ' + results.unitCostProduction.toFixed(2).replace('.', ',');

    // Preview in sale price inputs
    const prevDir = document.getElementById('previewDirect');
    if (prevDir) {
        if (results.totalRevenueDirect > 0) {
            const color = results.totalProfitDirect >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
            prevDir.innerHTML = `Lucro: <strong style="color:${color}">R$ ${results.totalProfitDirect.toFixed(2).replace('.',',')}</strong> | Margem: <strong style="color:${color}">${results.profitMarginDirect.toFixed(1).replace('.',',')}%</strong>`;
        } else {
            prevDir.innerHTML = '';
        }
    }
    const prevMkt = document.getElementById('previewMarketplace');
    if (prevMkt) {
        if (results.totalRevenueMarketplace > 0) {
            const color = results.totalProfitMarketplace >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
            prevMkt.innerHTML = `Lucro: <strong style="color:${color}">R$ ${results.totalProfitMarketplace.toFixed(2).replace('.',',')}</strong> | Margem: <strong style="color:${color}">${results.profitMarginMarketplace.toFixed(1).replace('.',',')}%</strong>`;
        } else {
            prevMkt.innerHTML = '';
        }
    }

    // Determine multipliers based on viewMode
    const mult = currentViewMode === 'batch' ? qty : 1;
    
    // Determine sales specific data based on salesMode
    const isMkt = currentSalesMode !== 'direct';
    
    // DRE Values
    const grossRev = (isMkt ? results.totalRevenueMarketplace : results.totalRevenueDirect) / qty * mult;
    const platFee = isMkt ? (results.totalPlatformFee / qty * mult) : 0;
    const netRev = grossRev - platFee;
    
    const filaWeight = (results.weight || 0) * (1 + results.failureRate / 100) * mult;
    const filaCost = results.filamentCost / qty * mult;
    const energyCost = results.energyCost / qty * mult;
    const machineCost = results.machineCost / qty * mult;
    const failCost = results.totalFailureCost / qty * mult;
    const auxTotalCost = results.auxiliaryCost / qty * mult;
    const prodTotal = filaCost + energyCost + machineCost + failCost + auxTotalCost;
    
    const grossProfit = netRev - prodTotal;
    const grossMargin = grossRev > 0 ? (grossProfit / grossRev) * 100 : 0;
    
    const packCost = isMkt ? (results.totalPackagingCost / qty * mult) : 0;
    const shipCost = isMkt ? (results.totalShippingCost / qty * mult) : 0;
    const postCost = results.totalPostProcessing / qty * mult;
    const designCost = results.totalDesignCost / qty * mult;
    const otherCost = results.totalOtherCosts / qty * mult;
    const operTotal = packCost + shipCost + postCost + designCost + otherCost;
    
    const netProfit = grossProfit - operTotal;
    const netMargin = grossRev > 0 ? (netProfit / grossRev) * 100 : 0;

    // Helper
    const rvSet = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
    const rvBar = (id, pct) => { const el = document.getElementById(id); if(el) el.style.width = Math.min(Math.max(pct, 0), 100) + '%'; };

    const totalCost = prodTotal + operTotal + platFee;

    // Hero section
    rvSet('rvRevenue', formatCurrency(grossRev));
    rvSet('rvTotalCost', formatCurrency(totalCost));
    rvSet('rvProfit', formatCurrency(netProfit));
    rvSet('rvMargin', formatPercent(netMargin));

    // Margin bar fill (clamp 0-100)
    const marginClamped = Math.min(Math.max(netMargin, 0), 100);
    rvBar('rvMarginFill', marginClamped);

    // Hero positive/negative state
    const hero = document.getElementById('rvHero');
    if(hero) hero.classList.toggle('rv-negative', netProfit < 0);

    // Waterfall bars — each bar width = (cost / revenue) * 100
    const barPct = (val) => grossRev > 0 ? (val / grossRev) * 100 : 0;
    const fmtVal = (val) => `${formatCurrency(val)} (${barPct(val).toFixed(1).replace('.', ',')}%)`;

    rvSet('rvFilaCost', fmtVal(filaCost));
    rvBar('rvBarFila', barPct(filaCost));
    rvSet('rvFilaWeight', filaWeight > 0 ? `(${filaWeight.toFixed(1).replace('.',',')}g)` : '');

    rvSet('rvEnergyCost', fmtVal(energyCost));
    rvBar('rvBarEnergy', barPct(energyCost));

    rvSet('rvAuxCost', fmtVal(auxTotalCost));
    rvBar('rvBarAux', barPct(auxTotalCost));

    rvSet('rvMachineCost', fmtVal(machineCost));
    rvBar('rvBarMachine', barPct(machineCost));

    rvSet('rvFailCost', fmtVal(failCost));
    rvBar('rvBarFail', barPct(failCost));

    rvSet('rvPostCost', fmtVal(postCost));
    rvBar('rvBarPost', barPct(postCost));

    rvSet('rvDesignCost', fmtVal(designCost));
    rvBar('rvBarDesign', barPct(designCost));

    rvSet('rvPackCost', fmtVal(packCost));
    rvBar('rvBarPack', barPct(packCost));

    rvSet('rvShipCost', fmtVal(shipCost));
    rvBar('rvBarShip', barPct(shipCost));

    rvSet('rvPlatCost', fmtVal(platFee));
    rvBar('rvBarPlat', barPct(platFee));

    rvSet('rvOtherCost', fmtVal(otherCost));
    rvBar('rvBarOther', barPct(otherCost));

    // Profit bar
    rvSet('rvProfitBar', `${formatCurrency(netProfit)} (${barPct(netProfit).toFixed(1).replace('.', ',')}%)`);
    rvBar('rvBarProfit', Math.abs(barPct(netProfit)));

    // Profit bar loss state
    const profitRow = document.querySelector('.rv-bar-profit');
    if(profitRow) profitRow.classList.toggle('rv-bar-loss', netProfit < 0);
}

// Function escapeHTML -> Moved to calculator-core.js

// =============================================
// CHARTS
// =============================================
// Function escapeHTML -> Moved to calculator-core.js

// Function initCharts -> Forced to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// Function updateCharts -> Forced to calculator-core.js

// =============================================
// HISTORY
// =============================================
// Function loadHistory -> Forced to calculator-core.js

// Function saveHistory -> Forced to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// Function renderHistoryList -> Forced to calculator-core.js

// Function loadFromHistory -> Forced to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// Function clearAllHistory -> Moved to calculator-core.js (normalized)

// Function escapeHTML -> Moved to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// =============================================
// SAVED PRODUCTS (LocalStorage)
// =============================================
// Function loadSavedProducts -> Forced to calculator-core.js

// Function saveSavedProducts -> Forced to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// Function renderSavedProducts -> Forced to calculator-core.js

// Function loadSavedProduct -> Forced to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// =============================================
// CLEAR FORM
// =============================================
// Function clearForm -> Forced to calculator-core.js

// =============================================
// DEFAULTS (LocalStorage)
// =============================================
// Function saveAllDefaults -> Forced to calculator-core.js

// Function loadDefaults -> Forced to calculator-core.js

// Function updateDefaultButtons -> Forced to calculator-core.js

// Function escapeHTML -> Moved to calculator-core.js

// =============================================
// PDF EXPORT
// =============================================
// Function exportPDF -> Forced to calculator-core.js

// =============================================
// TOAST NOTIFICATIONS
// =============================================
/* showToast removed -> using shared.js */

// =============================================
// UTILITY
// =============================================
// Function escapeHTML -> Moved to calculator-core.js

// =============================================
// START
// =============================================
document.addEventListener('DOMContentLoaded', init);
