// Keys
const PACK_INV_KEY = 'meus3d_embalagens_v1';
const PACK_HIST_KEY = 'meus3d_embalagens_hist_v1';
const PACK_ASY_KEY = 'meus3d_embalagens_montadas_v1';

// DOM Elements - Insumos
const form = document.getElementById('auxForm');
const auxName = document.getElementById('auxName');
const auxDate = document.getElementById('auxDate');
const auxQty = document.getElementById('auxQty');
const auxCost = document.getElementById('auxCost');
const auxUnitCostPrev = document.getElementById('auxUnitCostPrev');
const tbody = document.getElementById('auxTableBody');
const datalist = document.getElementById('auxNamesList');

// DOM Elements - Embalagens Montadas
const packModal = document.getElementById('packModal');
const packForm = document.getElementById('packForm');
const packName = document.getElementById('packName');
const packItemsContainer = document.getElementById('packItemsContainer');
const packTotalCost = document.getElementById('packTotalCost');
const packTableBody = document.getElementById('packTableBody');
const btnAddPackItem = document.getElementById('btnAddPackItem');
const btnNewPack = document.getElementById('btnNewPack');
const btnClosePackModal = document.getElementById('btnClosePackModal');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Formatters
const fCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fCurrency4 = (val) => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fNum = (val) => val.toLocaleString('pt-BR');

let currentPackItems = [];

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (auxDate) auxDate.valueAsDate = new Date();
    
    // Tab Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.style.display = 'block';
                targetEl.classList.add('active');
            }
        });
    });

    renderInsumos();
    renderAssembled();
    
    if (auxQty && auxCost) {
        [auxQty, auxCost].forEach(el => el.addEventListener('input', updatePreview));
    }
    
    // Assembled Packagings Modal
    if (btnNewPack && packModal) {
        btnNewPack.addEventListener('click', () => {
            packModal.classList.add('active');
            packForm.reset();
            currentPackItems = [];
            renderPackItemsForm();
            setTimeout(() => { if (packName) packName.focus(); }, 100);
        });
    }
    if (btnClosePackModal && packModal) {
        btnClosePackModal.addEventListener('click', () => {
            packModal.classList.remove('active');
        });
    }
    if (btnAddPackItem) {
        btnAddPackItem.addEventListener('click', addPackItemRow);
    }
    if (packForm) {
        packForm.addEventListener('submit', handlePackSubmit);
    }
});

function updatePreview() {
    const q = parseFloat(auxQty.value) || 0;
    const c = parseFloat(auxCost.value) || 0;
    if (q > 0) {
        auxUnitCostPrev.textContent = fCurrency4(c / q);
    } else {
        auxUnitCostPrev.textContent = 'R$ 0,0000';
    }
}

// Data Access
function loadInventory() {
    try { return JSON.parse(localStorage.getItem(PACK_INV_KEY)) || {}; } 
    catch(e) { return {}; }
}
function saveInventory(inv) {
    localStorage.setItem(PACK_INV_KEY, JSON.stringify(inv));
}
function loadHistory() {
    try { return JSON.parse(localStorage.getItem(PACK_HIST_KEY)) || []; } 
    catch(e) { return []; }
}
function saveHistory(hist) {
    localStorage.setItem(PACK_HIST_KEY, JSON.stringify(hist));
}
function loadAssembled() {
    try { return JSON.parse(localStorage.getItem(PACK_ASY_KEY)) || []; } 
    catch(e) { return []; }
}
function saveAssembled(asy) {
    localStorage.setItem(PACK_ASY_KEY, JSON.stringify(asy));
}

// INSUMOS LOGIC (Raw Materials)
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nameStr = auxName.value.trim();
        if (!nameStr) {
            if (window.showToast) window.showToast('Informe o nome do material.', 'error');
            return;
        }
        
        const q = parseFloat(auxQty.value);
        const c = parseFloat(auxCost.value);

        if (isNaN(q) || q <= 0) {
            if (window.showToast) window.showToast('A quantidade deve ser maior que zero.', 'error');
            return;
        }
        if (isNaN(c) || c < 0) {
            if (window.showToast) window.showToast('O custo não pode ser negativo.', 'error');
            return;
        }

        const id = nameStr.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const d = auxDate.value;
        const unitCost = c / q;
        
        const hist = loadHistory();
        hist.push({ id, name: nameStr, date: d, qty: q, totalCost: c, unitCost });
        saveHistory(hist);
        
        const inv = loadInventory();
        if (!inv[id]) {
            inv[id] = { id, name: nameStr, qty: q, totalValue: c };
        } else {
            inv[id].qty += q;
            inv[id].totalValue += c;
        }
        saveInventory(inv);
        
        if (window.showToast) showToast('Insumo de embalagem registrado com sucesso!', 'success');
        const auxModal = document.getElementById('auxModal');
        if (auxModal) auxModal.classList.remove('active');
        form.reset();
        auxDate.valueAsDate = new Date();
        updatePreview();
        renderInsumos();
    });
}

function renderInsumos() {
    if (!tbody) return;
    const inv = loadInventory();
    const items = Object.values(inv).sort((a,b) => a.name.localeCompare(b.name));
    
    tbody.innerHTML = '';
    if (datalist) datalist.innerHTML = '';
    
    let totalInvested = 0;
    let totalVolume = 0;
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum insumo de embalagem cadastrado.</td></tr>`;
    }
    
    items.forEach(item => {
        if(item.qty <= 0) return;
        
        totalInvested += item.totalValue;
        totalVolume += item.qty;
        const avgUnitCost = item.totalValue / item.qty;
        
        if (datalist) {
            const opt = document.createElement('option');
            opt.value = item.name;
            datalist.appendChild(opt);
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${item.name}</td>
            <td class="col-num">${fNum(item.qty)}</td>
            <td class="col-num" style="color: var(--text-secondary);">${fCurrency4(avgUnitCost)}</td>
            <td class="col-num" style="color: var(--accent-blue);">${fCurrency(item.totalValue)}</td>
            <td style="text-align: right;">
                <button class="btn-icon" onclick="deleteInsumo('${item.id}')" title="Zerar Estoque">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    const kUnique = document.getElementById('kpiUnique');
    const kVol = document.getElementById('kpiVolume');
    const kInv = document.getElementById('kpiInvested');
    
    if (kUnique) kUnique.textContent = items.length;
    if (kVol) kVol.textContent = fNum(totalVolume);
    if (kInv) kInv.textContent = fCurrency(totalInvested);
}

window.deleteInsumo = function(id) {
    if(!confirm('Zerar o estoque deste insumo? (O histórico será mantido)')) return;
    
    const inv = loadInventory();
    if(inv[id]) {
        inv[id].qty = 0;
        inv[id].totalValue = 0;
        saveInventory(inv);
        renderInsumos();
        if (window.showToast) showToast('Estoque zerado.', 'error');
    }
}

// MODAL DE CADASTRO ORIGINAL (Insumos)
try {
    const auxModal = document.getElementById('auxModal');
    const btnNewAux = document.getElementById('btnNewAux');
    const btnCloseModal = document.getElementById('btnCloseModal');

    if (btnNewAux && auxModal) {
        btnNewAux.addEventListener('click', () => {
            auxModal.classList.add('active');
            setTimeout(() => { if(auxName) auxName.focus(); }, 100);
        });
    }
    if (btnCloseModal && auxModal) {
        btnCloseModal.addEventListener('click', () => auxModal.classList.remove('active'));
    }
} catch(e) {}


// ASSEMBLED PACKAGING LOGIC (Embalagens Montadas)

function addPackItemRow() {
    currentPackItems.push({ insumoId: '', qty: 1 });
    renderPackItemsForm();
}

function removePackItemRow(index) {
    currentPackItems.splice(index, 1);
    renderPackItemsForm();
}

function updatePackItemRow(index, field, value) {
    currentPackItems[index][field] = value;
    renderPackItemsForm();
}

function calculateTotalPackCost() {
    const inv = loadInventory();
    let total = 0;
    currentPackItems.forEach(item => {
        if (item.insumoId && inv[item.insumoId]) {
            const insumo = inv[item.insumoId];
            const avgUnitCost = insumo.totalValue / insumo.qty;
            const q = parseFloat(item.qty) || 0;
            total += (avgUnitCost * q);
        }
    });
    return total;
}

function renderPackItemsForm() {
    if (!packItemsContainer) return;
    const inv = loadInventory();
    const items = Object.values(inv).sort((a,b) => a.name.localeCompare(b.name)).filter(i => i.qty > 0);
    
    let html = '';
    
    if (items.length === 0) {
        packItemsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Você precisa cadastrar insumos (caixas, plásticos) primeiro.</p>';
        packTotalCost.textContent = 'R$ 0,00';
        return;
    }
    
    if (currentPackItems.length === 0) {
        addPackItemRow(); // start with one empty row
        return;
    }
    
    currentPackItems.forEach((pItem, index) => {
        let options = '<option value="">-- Selecione um Insumo --</option>';
        items.forEach(i => {
            const avgCost = i.totalValue / i.qty;
            const sel = pItem.insumoId === i.id ? 'selected' : '';
            options += `<option value="${i.id}" ${sel}>${i.name} (${fCurrency4(avgCost)} / un)</option>`;
        });
        
        html += `
            <div style="display: flex; gap: 10px; align-items: flex-end;">
                <div class="input-group" style="flex: 1; margin-bottom: 0;">
                    <select onchange="updatePackItemRow(${index}, 'insumoId', this.value)" required>
                        ${options}
                    </select>
                </div>
                <div class="input-group" style="width: 80px; margin-bottom: 0;">
                    <input type="number" step="0.01" min="0.01" value="${pItem.qty}" oninput="updatePackItemRow(${index}, 'qty', this.value)" required>
                </div>
                <button type="button" class="btn-icon" onclick="removePackItemRow(${index})" style="color: #ef4444;" title="Remover Insumo">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    });
    
    packItemsContainer.innerHTML = html;
    
    const total = calculateTotalPackCost();
    packTotalCost.textContent = fCurrency(total);
}

function handlePackSubmit(e) {
    e.preventDefault();
    const nameStr = packName.value.trim();
    if (!nameStr) {
        if (window.showToast) window.showToast('Informe o nome da embalagem.', 'error');
        return;
    }
    
    if (currentPackItems.length === 0 || currentPackItems.some(i => !i.insumoId)) {
        if (window.showToast) window.showToast('Selecione todos os insumos para a embalagem.', 'error');
        return;
    }
    
    const totalCost = calculateTotalPackCost();
    if (totalCost <= 0) {
        if (window.showToast) window.showToast('A embalagem deve ter um custo maior que zero.', 'error');
        return;
    }
    
    const id = Date.now().toString(); // unique ID for assembled pack
    
    const assembledList = loadAssembled();
    assembledList.push({
        id,
        name: nameStr,
        items: [...currentPackItems],
        totalCost
    });
    
    saveAssembled(assembledList);
    
    if (window.showToast) showToast('Embalagem montada salva com sucesso!', 'success');
    packModal.classList.remove('active');
    renderAssembled();
}

function renderAssembled() {
    if (!packTableBody) return;
    const assembledList = loadAssembled();
    
    packTableBody.innerHTML = '';
    
    if (assembledList.length === 0) {
        packTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhuma embalagem pronta criada. Vá em "Nova Embalagem" para montar.</td></tr>`;
        return;
    }
    
    const inv = loadInventory();
    
    assembledList.forEach(pack => {
        // Calculate items string
        const itemStrs = pack.items.map(pItem => {
            const insumo = inv[pItem.insumoId];
            const name = insumo ? insumo.name : 'Insumo Excluído';
            return `${pItem.qty}x ${name}`;
        });
        const itemsDesc = itemStrs.join('<br>');
        
        // Dynamic re-calculation in case raw material cost changed
        let dynTotal = 0;
        pack.items.forEach(pItem => {
            if (inv[pItem.insumoId]) {
                const ins = inv[pItem.insumoId];
                dynTotal += (ins.totalValue / ins.qty) * pItem.qty;
            }
        });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${pack.name}</td>
            <td style="color: var(--text-secondary); font-size: 0.9rem;">${itemsDesc}</td>
            <td class="col-num" style="color: var(--accent-blue); font-weight: 600;">${fCurrency(dynTotal || pack.totalCost)}</td>
            <td style="text-align: right;">
                <button class="btn-icon" onclick="deleteAssembled('${pack.id}')" title="Excluir Embalagem">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;
        packTableBody.appendChild(tr);
    });
}

window.deleteAssembled = function(id) {
    if(!confirm('Deseja excluir esta embalagem pronta? (Isso pode afetar kits antigos se estiverem referenciando)')) return;
    const list = loadAssembled();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
        list.splice(idx, 1);
        saveAssembled(list);
        renderAssembled();
        if (window.showToast) showToast('Embalagem excluída.', 'success');
    }
}
