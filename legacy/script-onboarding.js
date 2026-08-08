// script-onboarding.js

let currentStep = 1;
const totalSteps = 6;

// Data collector
const onboardingData = {
    filament: null,
    aux: null,
    marketplace: null,
    machine: null
};

function updateProgress() {
    const bar = document.getElementById('progressBar');
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    bar.style.width = percentage + '%';
}

function nextStep(step, validateFn) {
    if (validateFn) {
        if (!validateFn()) return; // Validação falhou
    }
    
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgress();
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgress();
}

// ── Validation Functions ─────────────────────────

function validateStep2() {
    const brand = document.getElementById('filBrand').value.trim();
    const material = document.getElementById('filMaterial').value;
    const colorName = document.getElementById('filColorName').value.trim();
    const colorHex = document.getElementById('filColorHex').value;
    const qty = parseFloat(document.getElementById('filQty').value);
    const price = parseFloat(document.getElementById('filPrice').value);

    if (!brand || !colorName || isNaN(qty) || isNaN(price) || price < 0 || qty <= 0) {
        if(window.showToast) window.showToast('Preencha todos os campos do filamento corretamente.', 'error');
        return false;
    }

    onboardingData.filament = { brand, material, colorName, colorHex, qty, price };
    return true;
}

function validateStep3() {
    const name = document.getElementById('auxName').value.trim();
    const qty = parseFloat(document.getElementById('auxQty').value);
    const price = parseFloat(document.getElementById('auxPrice').value);

    if (!name || isNaN(qty) || isNaN(price) || price < 0 || qty <= 0) {
        if(window.showToast) window.showToast('Preencha os campos auxiliares corretamente.', 'error');
        return false;
    }

    onboardingData.aux = { name, qty, price };
    return true;
}

function validateStep4() {
    const name = document.getElementById('mpName').value.trim();
    const fee = parseFloat(document.getElementById('mpFee').value);
    const shipping = parseFloat(document.getElementById('mpShipping').value);

    if (!name || isNaN(fee) || fee < 0 || fee > 100 || isNaN(shipping) || shipping < 0) {
        if(window.showToast) window.showToast('Preencha comissão (0-100) e frete válidos.', 'error');
        return false;
    }

    onboardingData.marketplace = { name, fee, shipping };
    return true;
}

function validateStep5() {
    const name = document.getElementById('macName').value.trim();
    const price = parseFloat(document.getElementById('macPrice').value);
    const watts = parseFloat(document.getElementById('macWatts').value);
    const dep = parseFloat(document.getElementById('macDep').value);
    const kwh = parseFloat(document.getElementById('macKwh').value);

    if (!name || isNaN(price) || price < 0 || isNaN(watts) || watts < 0 || isNaN(dep) || dep < 0 || isNaN(kwh) || kwh < 0) {
        if(window.showToast) window.showToast('Preencha os dados da máquina corretamente.', 'error');
        return false;
    }

    onboardingData.machine = { name, price, watts, dep, kwh };
    return true;
}

// ── Save Everything to LocalStorage ─────────────────────────

function finishOnboarding(validateFn) {
    if (validateFn && !validateFn()) return;

    // Save Filament
    if (onboardingData.filament) {
        const d = onboardingData.filament;
        const filId = Date.now().toString(36);
        const weight = 1000; // default 1kg
        
        // 1. Filaments array
        let filaments = JSON.parse(localStorage.getItem('meus3d_filaments') || '[]');
        filaments.push({
            id: filId, brand: d.brand, material: d.material, colorName: d.colorName, colorHex: d.colorHex, weight: weight, price: d.price / d.qty
        });
        localStorage.setItem('meus3d_filaments', JSON.stringify(filaments));

        // 2. Stock
        let stock = JSON.parse(localStorage.getItem('meus3d_filament_stock') || '{}');
        stock[filId] = d.qty * weight;
        localStorage.setItem('meus3d_filament_stock', JSON.stringify(stock));

        // 3. Purchase History
        let purchases = JSON.parse(localStorage.getItem('meus3d_filament_purchases') || '[]');
        purchases.unshift({
            id: 'p_'+filId, filamentId: filId, filamentName: `${d.brand} ${d.material} - ${d.colorName}`,
            colorHex: d.colorHex, qty: d.qty, weightPerUnit: weight, totalPrice: d.price, unitPrice: d.price/d.qty,
            date: new Date().toLocaleString('pt-BR'), timestamp: Date.now()
        });
        localStorage.setItem('meus3d_filament_purchases', JSON.stringify(purchases));
    }

    // Save Aux
    if (onboardingData.aux) {
        const d = onboardingData.aux;
        const auxId = d.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Inventory
        let inv = JSON.parse(localStorage.getItem('meus3d_aux_inventory') || '{}');
        inv[auxId] = { id: auxId, name: d.name, qty: d.qty, totalValue: d.price };
        localStorage.setItem('meus3d_aux_inventory', JSON.stringify(inv));

        // History
        let hist = JSON.parse(localStorage.getItem('meus3d_aux_history') || '[]');
        hist.push({ id: auxId, name: d.name, date: new Date().toISOString().split('T')[0], qty: d.qty, totalCost: d.price, unitCost: d.price/d.qty });
        localStorage.setItem('meus3d_aux_history', JSON.stringify(hist));
    }

    // Save Marketplace
    if (onboardingData.marketplace) {
        const d = onboardingData.marketplace;
        let mps = JSON.parse(localStorage.getItem('meus3d_marketplaces') || '[]');
        // ensure direct exists
        if (mps.length === 0) {
            mps.push({ id: 'direct', name: 'Venda Direta', commissionRate: 0, defaultShipping: 0, removable: false });
        }
        mps.push({
            id: 'mp_' + Date.now(), name: d.name, commissionRate: d.fee, defaultShipping: d.shipping, removable: true
        });
        localStorage.setItem('meus3d_marketplaces', JSON.stringify(mps));
    }

    // Save Machine
    if (onboardingData.machine) {
        const d = onboardingData.machine;
        let macs = JSON.parse(localStorage.getItem('meus3d_machines_v1') || '[]');
        macs.push({
            id: 'mac_' + Date.now(), 
            name: d.name, 
            power: d.watts, 
            hourlyRate: d.dep,
            purchaseDate: new Date().toISOString().split('T')[0],
            purchasePrice: d.price,
            kwhCost: d.kwh,
            maints: [],
            hourLogs: []
        });
        localStorage.setItem('meus3d_machines_v1', JSON.stringify(macs));
    }

    // Mark as done
    localStorage.setItem('meus3d_onboarding_done', 'true');

    // Go to step 6
    nextStep(6);
    shootConfetti();
}

function goToApp() {
    window.location.href = 'index.html';
}

function shootConfetti() {
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.top = -10 + 'px';
        conf.style.backgroundColor = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random()*5)];
        conf.style.animationDuration = (Math.random() * 3 + 2) + 's';
        document.body.appendChild(conf);
        
        setTimeout(() => conf.remove(), 5000);
    }
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    updateProgress();
});
