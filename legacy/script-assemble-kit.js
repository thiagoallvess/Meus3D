function openAssembleKitModal() {
    document.getElementById('assembleKitModal').style.display = 'flex';
    document.getElementById('assembleKitModal').classList.add('visible');
    
    document.getElementById('kitName').value = '';
    document.getElementById('kitSalePrice').value = '';
    document.getElementById('kitSalePriceMkt').value = '';
    document.getElementById('kitPlatformFee').value = '';
    document.getElementById('kitShipping').value = '';
    document.getElementById('kitPackaging').value = '';
    document.getElementById('kitComponentsList').innerHTML = '';
    
    addKitComponentRow();
    calculateKitTotals();
}

function closeAssembleKitModal() {
    const modal = document.getElementById('assembleKitModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('visible');
    }
}

function addKitComponentRow() {
    const list = document.getElementById('kitComponentsList');
    const empty = document.getElementById('kitComponentsEmpty');
    if (empty) empty.style.display = 'none';

    // load products to populate select
    const all = loadAllProductsForKit();

    const row = document.createElement('div');
    row.className = 'kit-comp-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center;';
    
    let options = '<option value="">Selecione uma peça...</option>';
    all.forEach(p => {
        options += `<option value="${p.id}">${p.name}</option>`;
    });

    row.innerHTML = `
        <select class="custom-select kit-comp-select" onchange="calculateKitTotals()" style="padding: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-card); color: var(--text-primary); border-radius: 6px;">
            ${options}
        </select>
        <div class="input-wrapper">
            <input type="number" class="kit-comp-qty" value="1" min="1" step="1" oninput="calculateKitTotals()" style="padding: 8px; text-align: center;">
        </div>
        <button class="btn" onclick="this.parentElement.remove(); calculateKitTotals();" style="padding: 8px; background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2);">X</button>
    `;
    list.appendChild(row);
}

function loadAllProductsForKit() {
    const single = (JSON.parse(localStorage.getItem('savedProducts3d') || '[]')).map(p => ({ ...p, _type: 'single' }));
    const kits   = (JSON.parse(localStorage.getItem('savedProducts3d_kit') || '[]')).map(p => ({ ...p, _type: 'kit' }));
    return [...single, ...kits].sort((a, b) => b.id - a.id);
}

function calculateKitTotals() {
    const rows = document.querySelectorAll('.kit-comp-row');
    const all = loadAllProductsForKit();
    
    let tMat=0, tEne=0, tMac=0, tAux=0, tPos=0, tDes=0, tPac=0, tShi=0, tExt=0, tFai=0, tPla=0;
    
    rows.forEach(row => {
        const select = row.querySelector('.kit-comp-select');
        const qtyInp = row.querySelector('.kit-comp-qty');
        const id = select.value;
        const n = parseInt(qtyInp.value) || 1;
        
        if (!id) return;
        
        const p = all.find(x => String(x.id) === String(id));
        if (p && p.results) {
            const r = p.results;
            const q = r.quantity || p.values?.quantity || 1;
            
            // Extract single unit costs from the component
            const fallbackFail = (r.totalFailureCost !== undefined) ? r.totalFailureCost : ( (parseFloat(r.filamentCost)||0) + (parseFloat(r.energyCost)||0) + (parseFloat(r.machineCost)||0) ) * ((parseFloat(p.values?.failureRate)||0)/100);
            
            tMat += ((parseFloat(r.filamentCost) || 0) / q) * n;
            tEne += ((parseFloat(r.energyCost) || 0) / q) * n;
            tMac += ((parseFloat(r.machineCost) || 0) / q) * n;
            tAux += ((parseFloat(r.auxiliaryCost || r.totalAuxiliaryCost) || 0) / q) * n;
            
            tPos += ((parseFloat(r.totalPostProcessing) || 0) / q) * n;
            tDes += ((parseFloat(r.totalDesignCost) || 0) / q) * n;
            tExt += ((parseFloat(r.totalOtherCosts || p.values?.otherCosts) || 0) / q) * n;
            tFai += ((parseFloat(fallbackFail) || 0) / q) * n;
        }
    });

    const prodTotal = tMat + tEne + tMac + tAux + tFai;
    const opTotal = tPos + tDes + tExt;
    
    // In the summary, we only sum up production and operational costs (excluding shipping/packaging which are now set for the whole kit)
    const fullTotal = prodTotal + opTotal;

    document.getElementById('kitSumProdCost').textContent = 'R$ ' + prodTotal.toFixed(2).replace('.', ',');
    document.getElementById('kitSumOpCost').textContent = 'R$ ' + opTotal.toFixed(2).replace('.', ',');
    document.getElementById('kitSumTotalCost').textContent = 'R$ ' + fullTotal.toFixed(2).replace('.', ',');
    
    return { tMat, tEne, tMac, tAux, tPos, tDes, tExt, tFai, prodTotal, fullTotal };
}

function saveAssembledKit() {
    const name = document.getElementById('kitName').value.trim();
    if (!name) {
        showToast('Digite um nome para o kit', 'error');
        return;
    }
    
    const rows = document.querySelectorAll('.kit-comp-row');
    let hasItems = false;
    rows.forEach(r => { if(r.querySelector('.kit-comp-select').value) hasItems = true; });
    
    if (!hasItems) {
        showToast('Adicione pelo menos uma peça ao kit', 'error');
        return;
    }
    
    const saleDir = parseFloat(document.getElementById('kitSalePrice').value) || 0;
    const saleMkt = parseFloat(document.getElementById('kitSalePriceMkt').value) || saleDir;
    
    const totals = calculateKitTotals();
    
    const all = loadAllProductsForKit();
    let totalWeight = 0;
    let totalTime = 0;
    let components = [];
    
    rows.forEach(row => {
        const id = row.querySelector('.kit-comp-select').value;
        const n = parseInt(row.querySelector('.kit-comp-qty').value) || 1;
        if (!id) return;
        const p = all.find(x => String(x.id) === String(id));
        if (p) {
            const q = p.values?.quantity || 1;
            totalWeight += ((parseFloat(p.values?.weight) || 0) / q) * n;
            totalTime += ((parseFloat(p.values?.printTime) || 0) / q) * n;
            components.push({ id: p.id, name: p.name, qty: n });
        }
    });
    
    const platformFeePct = parseFloat(document.getElementById('kitPlatformFee').value) || 0;
    const kitPackaging = parseFloat(document.getElementById('kitPackaging').value) || 0;
    const kitShipping = parseFloat(document.getElementById('kitShipping').value) || 0;
    
    const platformFeeValue = saleMkt * (platformFeePct / 100);

    const newKit = {
        id: Date.now(),
        name: name,
        _type: 'kit',
        components: components,
        values: {
            salePrice: saleDir,
            salePriceMarketplace: saleMkt,
            weight: totalWeight,
            printTime: totalTime,
            quantity: 1, 
            piecesPerKit: 1,
            packagingCost: kitPackaging,
            shippingCost: kitShipping,
            platformFee: platformFeePct
        },
        results: {
            quantity: 1,
            filamentCost: totals.tMat,
            energyCost: totals.tEne,
            machineCost: totals.tMac,
            totalAuxiliaryCost: totals.tAux,
            totalPostProcessing: totals.tPos,
            totalDesignCost: totals.tDes,
            totalPackagingCost: kitPackaging,
            totalShippingCost: kitShipping,
            totalOtherCosts: totals.tExt,
            totalFailureCost: totals.tFai,
            unitCostProduction: totals.prodTotal + totals.tPos + totals.tDes + totals.tExt,
            unitCostTotalFull: totals.fullTotal + kitPackaging + kitShipping + platformFeeValue,
            unitCost: totals.fullTotal + kitPackaging + kitShipping, 
            platformFeeValue: platformFeeValue,
            totalPlatformFee: platformFeeValue
        }
    };
    
    let kits = JSON.parse(localStorage.getItem('savedProducts3d_kit') || '[]');
    kits.push(newKit);
    localStorage.setItem('savedProducts3d_kit', JSON.stringify(kits));
    
    showToast('Kit Montado com sucesso!', 'success');
    closeAssembleKitModal();
    
    if (typeof renderProducts === 'function') {
        renderProducts(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '');
    }
}
