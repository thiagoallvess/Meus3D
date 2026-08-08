// Keys
const AUX_INV_KEY = 'meus3d_aux_inventory';
const AUX_HIST_KEY = 'meus3d_aux_history';

// DOM
const form = document.getElementById('auxForm');
const auxName = document.getElementById('auxName');
const auxDate = document.getElementById('auxDate');
const auxQty = document.getElementById('auxQty');
const auxCost = document.getElementById('auxCost');
const auxUnitCostPrev = document.getElementById('auxUnitCostPrev');
const tbody = document.getElementById('auxTableBody');
const datalist = document.getElementById('auxNamesList');

// Formatters
const fCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fCurrency4 = (val) => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fNum = (val) => val.toLocaleString('pt-BR');

// Init
document.addEventListener('DOMContentLoaded', () => {
    auxDate.valueAsDate = new Date();
    renderAll();
    
    [auxQty, auxCost].forEach(el => el.addEventListener('input', updatePreview));

    // Drawer logic handled by shared.js

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Init theme from localStorage
        const savedTheme = localStorage.getItem('meus3d_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('meus3d_theme', next);
        });
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
    try { return JSON.parse(localStorage.getItem(AUX_INV_KEY)) || {}; } 
    catch(e) { return {}; }
}
function saveInventory(inv) {
    localStorage.setItem(AUX_INV_KEY, JSON.stringify(inv));
}
function loadHistory() {
    try { return JSON.parse(localStorage.getItem(AUX_HIST_KEY)) || []; } 
    catch(e) { return []; }
}
function saveHistory(hist) {
    localStorage.setItem(AUX_HIST_KEY, JSON.stringify(hist));
}

// Form Submit
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

    // Normalize ID
    const id = nameStr.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const d = auxDate.value;
    
    const unitCost = c / q;
    
    // Add to history
    const hist = loadHistory();
    hist.push({ id, name: nameStr, date: d, qty: q, totalCost: c, unitCost });
    saveHistory(hist);
    
    // Update Inventory (Average Costing)
    const inv = loadInventory();
    if (!inv[id]) {
        inv[id] = { id, name: nameStr, qty: q, totalValue: c };
    } else {
        inv[id].qty += q;
        inv[id].totalValue += c;
        // The average unit cost is just totalValue / qty
    }
    saveInventory(inv);
    
    showToast('Insumo registrado com sucesso!', 'success');
    auxModal.classList.remove('active');
    form.reset();
    auxDate.valueAsDate = new Date();
    updatePreview();
    renderAll();
});

function renderAll() {
    const inv = loadInventory();
    const items = Object.values(inv).sort((a,b) => a.name.localeCompare(b.name));
    
    tbody.innerHTML = '';
    datalist.innerHTML = '';
    
    let totalInvested = 0;
    let totalVolume = 0;
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum material auxiliar cadastrado.</td></tr>`;
    }
    
    items.forEach(item => {
        if(item.qty <= 0) return; // Hide empty stock
        
        totalInvested += item.totalValue;
        totalVolume += item.qty;
        const avgUnitCost = item.totalValue / item.qty;
        
        // Add to datalist for autocomplete
        const opt = document.createElement('option');
        opt.value = item.name;
        datalist.appendChild(opt);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${item.name}</td>
            <td class="col-num">${fNum(item.qty)}</td>
            <td class="col-num" style="color: var(--text-secondary);">${fCurrency4(avgUnitCost)}</td>
            <td class="col-num" style="color: var(--accent-blue);">${fCurrency(item.totalValue)}</td>
            <td style="text-align: right;">
                <button class="btn-icon" onclick="deleteItem('${item.id}')" title="Zerar Estoque">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('kpiUnique').textContent = items.length;
    document.getElementById('kpiVolume').textContent = fNum(totalVolume);
    document.getElementById('kpiInvested').textContent = fCurrency(totalInvested);
}

window.deleteItem = function(id) {
    if(!confirm('Zerar o estoque deste material? (O histórico de compras será mantido)')) return;
    
    const inv = loadInventory();
    if(inv[id]) {
        inv[id].qty = 0;
        inv[id].totalValue = 0;
        saveInventory(inv);
        renderAll();
        showToast('Estoque zerado.', 'error');
    }
}

// Toast
/* showToast removed -> using shared.js */

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('meus3d_theme', isDark ? 'light' : 'dark');
    });
}
const savedTheme = localStorage.getItem('meus3d_theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);


// Modal Logic
try {
    const auxModal = document.getElementById('auxModal');
    const btnNewAux = document.getElementById('btnNewAux');
    const btnCloseModal = document.getElementById('btnCloseModal');

    if (!auxModal) alert("Erro: Elemento auxModal não encontrado no HTML!");
    if (!btnNewAux) alert("Erro: Elemento btnNewAux não encontrado no HTML!");

    if (btnNewAux) {
        btnNewAux.addEventListener('click', () => {
            try {
                auxModal.classList.add('active');
                setTimeout(() => {
                    if(typeof auxName !== 'undefined' && auxName) auxName.focus();
                }, 100);
            } catch(e) {
                alert("Erro ao abrir modal: " + e.message);
            }
        });
    }
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            auxModal.classList.remove('active');
        });
    }
    if (auxModal) {
        auxModal.addEventListener('click', (e) => {
            if(e.target === auxModal) auxModal.classList.remove('active');
        });
    }
} catch (e) {
    alert("Erro na inicialização do modal: " + e.message);
}
