document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const form = document.getElementById('filamentForm');
    if (!form) return;
    const idInput = document.getElementById('filamentId');
    const brandInput = document.getElementById('filBrand');
    const materialInput = document.getElementById('filMaterial');
    const colorNameInput = document.getElementById('filColorName');
    const colorHexInput = document.getElementById('filColorHex');
    const weightInput = document.getElementById('filWeight');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const filamentList = document.getElementById('filamentList');

    // Modal
    const btnOpenModal = document.getElementById('btnOpenModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const filamentModal = document.getElementById('filamentModal');

    // Purchase Modal
    const purchaseModal = document.getElementById('purchaseModal');
    const btnOpenPurchaseModal = document.getElementById('btnOpenPurchaseModal');
    const btnClosePurchaseModal = document.getElementById('btnClosePurchaseModal');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Estado da Aplicação
    let filaments = JSON.parse(localStorage.getItem('meus3d_filaments')) || [];
    const STOCK_KEY = 'meus3d_filament_stock';
    const HISTORY_KEY = 'meus3d_filament_purchases';

    // Funções de estoque
    function loadFilStock() { try { return JSON.parse(localStorage.getItem(STOCK_KEY)) || {}; } catch(e) { return {}; } }
    function saveFilStock(s) { localStorage.setItem(STOCK_KEY, JSON.stringify(s)); }
    function loadPurchases() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch(e) { return []; } }
    function savePurchases(p) { localStorage.setItem(HISTORY_KEY, JSON.stringify(p)); }

    // Funções Auxiliares
    
    // Top 50 Comprados
    function renderTop50() {
        const top50Container = document.getElementById('top50Container');
        if (!top50Container) return;
        
        const purchases = loadPurchases();
        if (purchases.length === 0) {
            top50Container.innerHTML = `<div class="history-empty" style="background: var(--bg-card); border: 1px dashed var(--border-card); border-radius: 12px; padding: 32px; text-align: center; color: var(--text-secondary);">Nenhuma compra registrada ainda.</div>`;
            return;
        }

        // Group by filId
        const groups = {};
        purchases.forEach(p => {
            const fId = p.filamentId || p.filId; // Handle both just in case
            if (!groups[fId]) {
                groups[fId] = { id: fId, qty: 0, totalSpent: 0 };
            }
            groups[fId].qty += parseFloat(p.qty) || 0;
            groups[fId].totalSpent += parseFloat(p.totalPrice || p.price) || 0;
        });

        // Convert to array and sort descending by qty
        const topList = Object.values(groups)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 50);
            
        let html = `
        <div class="table-container">
            <table class="history-table">
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th>Material/Cor</th>
                        <th>Marca</th>
                        <th style="text-align: right;">Rolos Comprados</th>
                        <th style="text-align: right;">Total Gasto (R$)</th>
                        <th style="text-align: right;">Custo Médio/Rolo</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        topList.forEach((item, index) => {
            const fil = filaments.find(f => String(f.id) === String(item.id));
            const filName = fil ? `${fil.material} - ${fil.colorName}` : 'Filamento Excluído';
            const brand = fil ? fil.brand : '-';
            const colorBlock = fil ? `<div style="width: 16px; height: 16px; border-radius: 50%; background: ${fil.colorHex}; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 0 0 1px rgba(0,0,0,0.5);"></div>` : '';
            
            html += `
                <tr>
                    <td style="color: var(--text-secondary); text-align: center;">${index + 1}</td>
                    <td style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                        ${colorBlock} ${filName}
                    </td>
                    <td>${brand}</td>
                    <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600; text-align: right;">${item.qty} un.</td>
                    <td style="font-family: 'JetBrains Mono', monospace; color: #10b981; text-align: right;">R$ ${(item.totalSpent).toFixed(2).replace('.', ',')}</td>
                    <td style="font-family: 'JetBrains Mono', monospace; text-align: right; color: var(--text-secondary);">R$ ${(item.qty > 0 ? item.totalSpent / item.qty : 0).toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        </div>
        `;
        
        top50Container.innerHTML = html;
    }

    function saveFilaments() {
        localStorage.setItem('meus3d_filaments', JSON.stringify(filaments));
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /* showToast removed -> using shared.js */

    function escH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // Renderização
    function renderList() {
        filamentList.innerHTML = '';
        
        const averageCostDisplay = document.getElementById('averageCostDisplay');
        const filStock = loadFilStock();

        if (filaments.length === 0) {
            filamentList.innerHTML = `
                <div class="empty-state">
                    <p>Você ainda não cadastrou nenhum filamento.</p>
                    <p style="font-size: 0.85em; margin-top: 8px;">Adicione seu primeiro filamento no formulário ao lado.</p>
                </div>
            `;
            if (averageCostDisplay) averageCostDisplay.textContent = formatCurrency(0);
            renderStockSummary();
            renderPurchaseSelect();
            renderPurchaseHistory();
            renderTop50();
            return;
        }

        let totalCostPerKg = 0;

        filaments.forEach(fil => {
            // Calcula o preço por KG (1000g)
            const pricePerKg = (fil.price / fil.weight) * 1000;
            totalCostPerKg += pricePerKg;

            const qtyGrams = filStock[fil.id] || 0;
            const rolos = qtyGrams / fil.weight;
            let badgeCls = 'fil-stock-out', badgeTxt = 'Sem estoque';
            if (rolos > 2) { badgeCls = 'fil-stock-ok'; badgeTxt = `${qtyGrams}g (${rolos.toFixed(1)} rolos)`; }
            else if (rolos > 0) { badgeCls = 'fil-stock-low'; badgeTxt = `${qtyGrams}g (${rolos.toFixed(1)} rolos)`; }

            const card = document.createElement('div');
            card.className = 'filament-card';
            card.innerHTML = `
                <div class="filament-header">
                    <div class="filament-brand">${escH(fil.brand)}</div>
                    <div class="filament-material">${escH(fil.material)}</div>
                </div>
                <div class="filament-color">
                    <div class="color-dot" style="background-color: ${fil.colorHex}"></div>
                    ${escH(fil.colorName)}
                </div>
                <div style="font-size: var(--fs-xs); color: var(--text-muted); margin-top: -4px;">
                    Rolo de ${fil.weight}g
                </div>
                
                <div class="filament-price">
                    <div class="price-paid" style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Último Preço: ${formatCurrency(fil.price || 0)}</span>
                        <span style="font-size: 0.85em; color: var(--text-muted);">Custo Grama: ${formatCurrency((pricePerKg || 0) / 1000)}</span>
                    </div>
                    <div class="price-kg">${formatCurrency(pricePerKg || 0)}<span style="font-size: 0.5em; color: var(--text-muted)"> /kg</span></div>
                </div>

                <div class="fil-stock-row">
                    <span class="fil-stock-label">Estoque:</span>
                    <span class="fil-stock-badge ${badgeCls}">${badgeTxt}</span>
                </div>

                <div class="filament-actions">
                    <button class="btn-edit" data-id="${fil.id}">Editar</button>
                    <button class="btn-delete" data-id="${fil.id}">Excluir</button>
                </div>
            `;
            filamentList.appendChild(card);
        });

        if (averageCostDisplay && filaments.length > 0) {
            averageCostDisplay.textContent = formatCurrency(totalCostPerKg / filaments.length);
        }

        // Eventos dos botões nos cards
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => editFilament(e.target.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => deleteFilament(e.target.dataset.id));
        });

        renderStockSummary();
        renderPurchaseSelect();
        renderPurchaseHistory();
            renderTop50();
    }

    // Stock summary cards
    function renderStockSummary() {
        const el = document.getElementById('filStockSummary');
        if (!el) return;
        const stock = loadFilStock();
        let totalRolos = 0;
        let totalGramas = 0;
        let totalValor = 0;

        filaments.forEach(fil => {
            const qtyGrams = stock[fil.id] || 0;
            const rolos = qtyGrams / fil.weight;
            totalRolos += rolos;
            totalGramas += qtyGrams;
            totalValor += rolos * fil.price;
        });

        el.innerHTML = `
            <div class="stock-summary-card">
                <div class="stock-summary-icon green">🧵</div>
                <div>
                    <div class="stock-summary-label">Total de Rolos</div>
                    <div class="stock-summary-value">${totalRolos.toFixed(1)}</div>
                </div>
            </div>
            <div class="stock-summary-card">
                <div class="stock-summary-icon orange">⚖️</div>
                <div>
                    <div class="stock-summary-label">Peso Total</div>
                    <div class="stock-summary-value">${(totalGramas / 1000).toFixed(2)} kg</div>
                </div>
            </div>
            <div class="stock-summary-card">
                <div class="stock-summary-icon blue">💰</div>
                <div>
                    <div class="stock-summary-label">Valor em Estoque</div>
                    <div class="stock-summary-value">${formatCurrency(totalValor)}</div>
                </div>
            </div>
        `;
    }

    // Purchase select
    function renderPurchaseSelect() {
        const sel = document.getElementById('purchaseFilament');
        if (!sel) return;
        sel.innerHTML = '<option value="">Selecione...</option>';
        filaments.forEach(fil => {
            sel.innerHTML += `<option value="${fil.id}">${escH(fil.brand)} ${escH(fil.material)} - ${escH(fil.colorName)} (${fil.weight}g)</option>`;
        });
    }

    // Purchase form
    const purchaseForm = document.getElementById('purchaseForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const filId = document.getElementById('purchaseFilament').value;
            const qty = parseInt(document.getElementById('purchaseQty').value) || 0;
            const price = parseFloat(document.getElementById('purchasePrice').value) || 0;

            if (!filId || qty <= 0 || price < 0) {
                if (window.showToast) window.showToast('Preencha filamento, quantidade válida e valor >= 0.', 'error');
                return;
            }

            const fil = filaments.find(f => f.id === filId);
            if (!fil) return;

            // Add to stock (store in grams)
            const stock = loadFilStock();
            stock[filId] = (stock[filId] || 0) + (qty * fil.weight);
            saveFilStock(stock);

            // Update filament base price to the newest purchase unit price
            fil.price = price / qty;
            saveFilaments();

            // Record purchase
            const purchases = loadPurchases();
            purchases.unshift({
                id: generateId(),
                filamentId: filId,
                filamentName: `${fil.brand} ${fil.material} - ${fil.colorName}`,
                colorHex: fil.colorHex,
                qty: qty,
                weightPerUnit: fil.weight,
                totalPrice: price,
                unitPrice: price / qty,
                date: new Date().toLocaleString('pt-BR'),
                timestamp: Date.now()
            });
            if (purchases.length > 200) purchases.length = 200;
            savePurchases(purchases);

            // Reset form
            purchaseForm.reset();
            document.getElementById('purchaseQty').value = '1';

            showToast(`✅ ${qty} rolo(s) adicionados ao estoque!`);
            
            // Fechar modal após compra
            purchaseModal.classList.remove('visible');
            setTimeout(() => purchaseModal.style.display = 'none', 300);
            
            renderList();
        });
    }

    // Purchase history
    function renderPurchaseHistory() {
        const el = document.getElementById('purchaseHistory');
        if (!el) return;
        const purchases = loadPurchases();

        if (purchases.length === 0) {
            el.innerHTML = `<div class="history-empty" style="background: var(--bg-card); border: 1px dashed var(--border-card); border-radius: 12px;">Nenhuma compra registrada ainda.</div>`;
            return;
        }

        el.innerHTML = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Filamento</th>
                        <th>Qtd.</th>
                        <th>Peso Total</th>
                        <th>Valor Total</th>
                        <th>Valor/Rolo</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${purchases.map(p => `
                        <tr>
                            <td style="white-space:nowrap;font-size:12px;">${p.date}</td>
                            <td>
                                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.colorHex || '#888'};margin-right:6px;vertical-align:middle;"></span>
                                ${escH(p.filamentName)}
                            </td>
                            <td style="font-family:'JetBrains Mono',monospace;font-weight:700;">${p.qty}</td>
                            <td style="font-family:'JetBrains Mono',monospace;">${((p.qty * (p.weightPerUnit || 1000)) / 1000).toFixed(1)} kg</td>
                            <td style="font-family:'JetBrains Mono',monospace;color:var(--accent-green);font-weight:600;">${formatCurrency(p.totalPrice)}</td>
                            <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${formatCurrency(p.unitPrice)}</td>
                            <td>
                                <button class="history-delete" data-id="${p.id}" title="Excluir registro">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Delete purchase events
        el.querySelectorAll('.history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pid = e.currentTarget.dataset.id;
                if (!confirm('Excluir este registro de compra?')) return;
                const pList = loadPurchases().filter(p => p.id !== pid);
                savePurchases(pList);
                showToast('Registro excluído.');
                renderPurchaseHistory();
            renderTop50();
            });
        });
    }

    // CRUD
    function saveFilament(e) {
        e.preventDefault();

        const editId = idInput.value;
        let finalPrice = 0;

        if (editId) {
            const existing = filaments.find(f => f.id === editId);
            if (existing) finalPrice = existing.price || 0;
        }

        const brandStr = brandInput.value.trim();
        const materialStr = materialInput.value;
        const colorNameStr = colorNameInput.value.trim();
        const weightVal = parseFloat(weightInput.value);

        if (!brandStr || !materialStr || !colorNameStr) {
            if (window.showToast) window.showToast('Preencha Marca, Material e Cor!', 'error');
            return;
        }
        if (isNaN(weightVal) || weightVal <= 0) {
            if (window.showToast) window.showToast('O peso deve ser maior que zero!', 'error');
            return;
        }

        const filamentData = {
            brand: brandStr,
            material: materialStr,
            colorName: colorNameStr,
            colorHex: colorHexInput.value,
            weight: weightVal,
            price: finalPrice
        };

        if (editId) {
            // Atualizar existente
            const index = filaments.findIndex(f => f.id === editId);
            if (index !== -1) {
                filaments[index] = { ...filamentData, id: editId };
                showToast('Filamento atualizado com sucesso!');
            }
        } else {
            // Criar novo
            filamentData.id = generateId();
            filaments.push(filamentData);
            showToast('Filamento adicionado com sucesso!');
        }

        saveFilaments();
        renderList();
        resetForm();
    }

    function editFilament(id) {
        const fil = filaments.find(f => f.id === id);
        if (!fil) return;

        idInput.value = fil.id;
        brandInput.value = fil.brand;
        materialInput.value = fil.material;
        colorNameInput.value = fil.colorName;
        colorHexInput.value = fil.colorHex;
        weightInput.value = fil.weight;

        btnCancelEdit.style.display = 'block';
        
        openModal();
    }

    function deleteFilament(id) {
        if (confirm('Tem certeza que deseja excluir este filamento?')) {
            filaments = filaments.filter(f => f.id !== id);
            saveFilaments();
            renderList();
            showToast('Filamento excluído!');
            
            // Se estiver editando o filamento excluído, reseta o form
            if (idInput.value === id) {
                resetForm();
            }
        }
    }

    function resetForm() {
        form.reset();
        idInput.value = '';
        btnCancelEdit.style.display = 'none';
        colorHexInput.value = '#000000';
        filamentModal.classList.remove('visible');
        setTimeout(() => {
            if (!filamentModal.classList.contains('visible')) {
                filamentModal.style.display = 'none';
            }
        }, 300);
    }

    function openModal() {
        filamentModal.style.display = 'flex';
        setTimeout(() => filamentModal.classList.add('visible'), 10);
    }

    // Event Listeners
    form.addEventListener('submit', saveFilament);
    btnCancelEdit.addEventListener('click', resetForm);

    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            resetForm();
            openModal();
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', resetForm);
    }

    if (filamentModal) {
        filamentModal.addEventListener('click', (e) => {
            if (e.target === filamentModal) resetForm();
        });
    }

    // Purchase Modal Logic
    if (btnOpenPurchaseModal && purchaseModal) {
        btnOpenPurchaseModal.addEventListener('click', () => {
            purchaseModal.style.display = 'flex';
            setTimeout(() => purchaseModal.classList.add('visible'), 10);
        });
    }
    
    if (btnClosePurchaseModal && purchaseModal) {
        btnClosePurchaseModal.addEventListener('click', () => {
            purchaseModal.classList.remove('visible');
            setTimeout(() => purchaseModal.style.display = 'none', 300);
        });
    }
    
    if (purchaseModal) {
        purchaseModal.addEventListener('click', (e) => {
            if (e.target === purchaseModal) {
                purchaseModal.classList.remove('visible');
                setTimeout(() => purchaseModal.style.display = 'none', 300);
            }
        });
    }

    // Tabs Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Dark Mode Toggle Logic (replicado para manter consistência)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        themeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Inicialização
    renderList();
});
