// =============================================
// Canais de Venda (Marketplaces) - Script
// =============================================

const MP_STORAGE_KEY = 'meus3d_marketplaces';

// Default "Venda Direta" entry
const DIRECT_SALE = {
    id: 'direct',
    name: 'Venda Direta',
    commissionRate: 0,
    defaultShipping: 0,
    removable: false
};

// ── Formatters ──────────────────────────────
const fCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fPercent = (val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

// ── Data Access ─────────────────────────────
function loadMarketplaces() {
    let data;
    try {
        data = JSON.parse(localStorage.getItem(MP_STORAGE_KEY));
    } catch (e) {
        data = null;
    }

    if (!Array.isArray(data)) {
        data = [{ ...DIRECT_SALE }];
        saveMarketplaces(data);
        return data;
    }

    // Ensure "Venda Direta" always exists
    const hasDirectSale = data.some(mp => mp.id === 'direct');
    if (!hasDirectSale) {
        data.unshift({ ...DIRECT_SALE });
    } else {
        // Make sure the direct sale entry has removable: false
        const directEntry = data.find(mp => mp.id === 'direct');
        if (directEntry) {
            directEntry.removable = false;
        }
    }

    saveMarketplaces(data);
    return data;
}

function saveMarketplaces(data) {
    localStorage.setItem(MP_STORAGE_KEY, JSON.stringify(data));
}

// ── Unique ID Generator ─────────────────────
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ── Render Marketplaces ─────────────────────
function renderMarketplaces() {
    const container = document.getElementById('marketplaceList');
    const marketplaces = loadMarketplaces();

    container.innerHTML = '';

    // Render each marketplace card
    marketplaces.forEach(mp => {
        const card = document.createElement('div');
        card.className = 'marketplace-item' + (mp.id === 'direct' ? ' direct-sale' : '');

        let actionsHTML = '';
        if (mp.id === 'direct') {
            actionsHTML = `
                <div class="marketplace-item-actions">
                    <button class="marketplace-btn-edit" onclick="editMarketplace('${mp.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                    </button>
                </div>
            `;
        } else {
            actionsHTML = `
                <div class="marketplace-item-actions">
                    <button class="marketplace-btn-edit" onclick="editMarketplace('${mp.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                    </button>
                    <button class="marketplace-btn-delete" onclick="deleteMarketplace('${mp.id}')" title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Excluir
                    </button>
                </div>
            `;
        }

        const badgeHTML = mp.id === 'direct'
            ? '<span class="marketplace-item-badge">Padrão</span>'
            : '';

        card.innerHTML = `
            <div class="marketplace-item-header">
                <span class="marketplace-item-name">${escapeHTML(mp.name)}</span>
                ${badgeHTML}
            </div>
            <div class="marketplace-item-stats">
                <div class="marketplace-stat">
                    <span class="marketplace-stat-label">Comissão</span>
                    <span class="marketplace-stat-value">${fPercent(mp.commissionRate)}</span>
                </div>
                <div class="marketplace-stat">
                    <span class="marketplace-stat-label">Frete Padrão</span>
                    <span class="marketplace-stat-value">${fCurrency(mp.defaultShipping)}</span>
                </div>
            </div>
            ${actionsHTML}
        `;

        container.appendChild(card);
    });

    // Empty state (only if there are no user-added channels, i.e., only "Venda Direta")
    const userChannels = marketplaces.filter(mp => mp.id !== 'direct');
    if (userChannels.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'marketplace-empty-state';
        emptyDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <p>Nenhum canal de venda adicional cadastrado.<br>
            Cadastre marketplaces como Shopee, Mercado Livre, Elo7, etc.</p>
        `;
        container.appendChild(emptyDiv);
    }
}

// ── Add Marketplace ─────────────────────────
function addMarketplace(e) {
    e.preventDefault();

    const nameInput = document.getElementById('mpName');
    const commissionInput = document.getElementById('mpCommission');
    const shippingInput = document.getElementById('mpShipping');

    const name = nameInput.value.trim();
    const commissionRate = parseFloat(commissionInput.value);
    const defaultShipping = parseFloat(shippingInput.value) || 0;

    // Validation
    if (!name) {
        showToast('Informe o nome do canal de venda.', 'error');
        nameInput.focus();
        return;
    }

    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        showToast('A taxa de comissão deve ser entre 0% e 100%.', 'error');
        commissionInput.focus();
        return;
    }

    if (defaultShipping < 0) {
        showToast('O frete padrão não pode ser negativo.', 'error');
        shippingInput.focus();
        return;
    }

    // Check for duplicate names
    const marketplaces = loadMarketplaces();
    const duplicate = marketplaces.find(mp => mp.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        showToast('Já existe um canal com este nome.', 'error');
        nameInput.focus();
        return;
    }

    const newMarketplace = {
        id: generateId(),
        name: name,
        commissionRate: commissionRate,
        defaultShipping: defaultShipping,
        removable: true
    };

    marketplaces.push(newMarketplace);
    saveMarketplaces(marketplaces);
    renderMarketplaces();

    // Reset form
    document.getElementById('marketplaceForm').reset();
    nameInput.focus();

    showToast(`Canal "${name}" cadastrado com sucesso!`, 'success');
}

// ── Edit Marketplace ────────────────────────
window.editMarketplace = function (id) {
    const marketplaces = loadMarketplaces();
    const mp = marketplaces.find(m => m.id === id);
    if (!mp) return;

    document.getElementById('editId').value = mp.id;
    document.getElementById('editName').value = mp.name;
    document.getElementById('editCommission').value = mp.commissionRate;
    document.getElementById('editShipping').value = mp.defaultShipping;

    // If it's the direct sale, disable the name field
    const editNameField = document.getElementById('editName');
    if (mp.id === 'direct') {
        editNameField.disabled = true;
        editNameField.style.opacity = '0.5';
    } else {
        editNameField.disabled = false;
        editNameField.style.opacity = '1';
    }

    document.getElementById('editOverlay').classList.add('active');
    setTimeout(() => {
        document.getElementById('editCommission').focus();
    }, 100);
};

function saveEdit(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const commissionRate = parseFloat(document.getElementById('editCommission').value);
    const defaultShipping = parseFloat(document.getElementById('editShipping').value) || 0;

    if (!name) {
        showToast('Informe o nome do canal.', 'error');
        return;
    }

    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        showToast('A taxa de comissão deve ser entre 0% e 100%.', 'error');
        return;
    }

    if (defaultShipping < 0) {
        showToast('O frete padrão não pode ser negativo.', 'error');
        return;
    }

    const marketplaces = loadMarketplaces();
    const index = marketplaces.findIndex(m => m.id === id);
    if (index === -1) return;

    // Check for duplicate names (excluding current)
    const duplicate = marketplaces.find(mp => mp.name.toLowerCase() === name.toLowerCase() && mp.id !== id);
    if (duplicate) {
        showToast('Já existe outro canal com este nome.', 'error');
        return;
    }

    marketplaces[index].name = id === 'direct' ? marketplaces[index].name : name;
    marketplaces[index].commissionRate = commissionRate;
    marketplaces[index].defaultShipping = defaultShipping;

    saveMarketplaces(marketplaces);
    closeEditModal();
    renderMarketplaces();

    showToast(`Canal "${marketplaces[index].name}" atualizado com sucesso!`, 'success');
}

function closeEditModal() {
    document.getElementById('editOverlay').classList.remove('active');
}

// ── Delete Marketplace ──────────────────────
window.deleteMarketplace = function (id) {
    if (id === 'direct') {
        showToast('O canal "Venda Direta" não pode ser removido.', 'error');
        return;
    }

    const marketplaces = loadMarketplaces();
    const mp = marketplaces.find(m => m.id === id);
    if (!mp) return;

    if (!confirm(`Deseja realmente excluir o canal "${mp.name}"?`)) return;

    const filtered = marketplaces.filter(m => m.id !== id);
    saveMarketplaces(filtered);
    renderMarketplaces();

    showToast(`Canal "${mp.name}" removido.`, 'error');
};

// ── Toast Notifications ─────────────────────
/* showToast removed -> using shared.js */

// ── Utility ─────────────────────────────────
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Theme Toggle ────────────────────────────
const savedTheme = localStorage.getItem('meus3d_theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('meus3d_theme', newTheme);
    });
}

// ── Init ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Load and render
    renderMarketplaces();

    // Form submit
    document.getElementById('marketplaceForm').addEventListener('submit', addMarketplace);

    // Edit form submit
    document.getElementById('editForm').addEventListener('submit', saveEdit);

    // Edit modal close
    document.getElementById('editModalClose').addEventListener('click', closeEditModal);
    document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);
    document.getElementById('editOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('editOverlay')) {
            closeEditModal();
        }
    });

    // Close edit modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('editOverlay').classList.contains('active')) {
            closeEditModal();
        }
    });
});
