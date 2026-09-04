"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  Search, Rocket, Edit, Trash2, X, Plus, Package, CheckCircle2, 
  AlertTriangle, Grid, Layers, XCircle 
} from 'lucide-react';

interface Product {
  id: string | number;
  name: string;
  color?: string;
  _type: 'single' | 'kit';
  values: any;
  results: any;
}

const LOW_THRESHOLD = 5;

export default function ProdutosPage() {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [marketplaces, setMarketplaces] = useState<any[]>([]);
  const [filaments, setFilaments] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'unit'|'batch'>('unit');
  const [salesMode, setSalesMode] = useState('direct');

  // Prod Modal
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [prodModalData, setProdModalData] = useState<any>(null);
  
  // Kit Modal
  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [kitData, setKitData] = useState<any>({
    name: '',
    color: '#25f4f4',
    components: [],
    salePrice: '',
    salePriceMkt: '',
    platformFee: '',
    shipping: '',
    packaging: ''
  });

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setIsLoaded(true);
    }
    const onStorage = (e: StorageEvent) => {
      if (['meus3d_production_update'].includes(e.key || '')) {
         if (user) loadData();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      let loadedProducts: any[] = [];
      let stockMap: Record<string, number> = {};

      if (data && !error) {
        loadedProducts = data.map(p => ({ ...p, _type: p.type }));
        loadedProducts.forEach(p => {
          stockMap[p.id] = p.stock || 0;
        });
      }

      setProducts(loadedProducts);
      setStock(stockMap);
      // Load marketplaces, filaments, and machines from Supabase
      const [mktRes, filRes, machRes] = await Promise.all([
        supabase.from('marketplaces').select('*').eq('user_id', user.id),
        supabase.from('filaments').select('*').eq('user_id', user.id),
        supabase.from('machines').select('*').eq('user_id', user.id),
      ]);
      setMarketplaces(mktRes.data || []);
      setFilaments(filRes.data || []);
      setMachines(machRes.data || []);
      
      const raw = localStorage.getItem('meus3d_production_update');
      if (raw) {
        const update = JSON.parse(raw);
        if (update && update.items && update.items.length > 0) {
           await applyProductionUpdate(update);
           localStorage.removeItem('meus3d_production_update');
           
           const { data: newData } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
           
           if (newData) {
             loadedProducts = newData.map(p => ({ ...p, _type: p.type }));
             stockMap = {};
             loadedProducts.forEach(p => { stockMap[p.id] = p.stock || 0; });
             setProducts(loadedProducts);
             setStock(stockMap);
           }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoaded(true);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const applyProductionUpdate = async (update: any) => {
    if (!update || !update.items) return;
    for (const item of update.items) {
      if (!item.qty || item.qty <= 0) continue;
      const { data } = await supabase.from('products').select('stock').eq('id', item.id).single();
      if (data) {
        await supabase.from('products').update({ stock: (data.stock || 0) + item.qty }).eq('id', item.id);
      }
    }
    showToast('Estoque atualizado pela produção!', 'success');
  };

  const adjustStock = async (id: string, name: string, delta: number) => {
    const currentQty = stock[id] || 0;
    const newStockQty = Math.max(0, currentQty + delta);
    
    const newStockMap = { ...stock };
    newStockMap[id] = newStockQty;
    setStock(newStockMap);

    const { error } = await supabase.from('products').update({ stock: newStockQty }).eq('id', id);
    if (error) {
      showToast('Erro ao atualizar estoque', 'error');
      loadData();
    } else {
      showToast(delta > 0 ? `+1 adicionado ao estoque de "${name}"` : `-1 removido do estoque de "${name}"`, 'success');
    }
  };

  const deleteProduct = async (id: string, type: string, name: string) => {
    if (!window.confirm(`Excluir "${name}"?\n\nEsta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir produto', 'error');
    } else {
      const newStockMap = { ...stock };
      delete newStockMap[id];
      setStock(newStockMap);
      loadData();
      showToast(`"${name}" excluído com sucesso.`, 'error');
    }
  };

  const editProduct = (id: string, type: string) => {
    localStorage.setItem('meus3d_edit_id', id);
    localStorage.setItem('meus3d_edit_type', type);
    window.location.href = type === 'kit' ? '/kit' : '/';
  };

  // --- Prod Modal ---
  const openProductionModal = (id: string) => {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    
    const v = p.values || {};
    let matchedFilId = '';
    if (v.filamentId) {
      matchedFilId = v.filamentId;
    } else if (v.filamentName && v.filamentName !== 'Manual') {
      const nameToMatch = String(v.filamentName).toLowerCase();
      const matchedFil = filaments.find((f: any) => {
          const cName = f.colorName ? String(f.colorName).toLowerCase() : '';
          const fullName = `${f.brand || ''} ${f.material || ''} - ${cName}`.toLowerCase();
          return fullName.includes(nameToMatch) || (cName && nameToMatch.includes(cName));
      });
      if (matchedFil) matchedFilId = matchedFil.id;
    }

    setProdModalData({
      id: p.id,
      name: p.name,
      batchSize: (v.quantity || 1) * (v.piecesPerKit || 1),
      qtyPlates: 1,
      filamentId: matchedFilId,
      machineId: v.machineId || ''
    });
    setProdModalOpen(true);
  };

  const confirmProduction = async () => {
    if (!prodModalData) return;
    const p = products.find(x => String(x.id) === String(prodModalData.id));
    if (!p) return;

    const plates = parseInt(prodModalData.qtyPlates) || 0;
    if (plates <= 0) return showToast('Quantidade inválida', 'error');

    const qty = plates * prodModalData.batchSize;
    const v = p.values || {};
    const r = p.results || {};

    const newStockQty = (stock[p.id] || 0) + qty;
    await supabase.from('products').update({ stock: newStockQty }).eq('id', p.id);

    if (prodModalData.filamentId) {
       const filStock = JSON.parse(localStorage.getItem('meus3d_filament_stock') || '{}');
       const totalGramsNeeded = plates * (v.weight || 0);
       filStock[prodModalData.filamentId] = Math.max(0, (filStock[prodModalData.filamentId] || 0) - totalGramsNeeded);
       localStorage.setItem('meus3d_filament_stock', JSON.stringify(filStock));
    }

    if (prodModalData.machineId && user) {
      const timeH = v.printTime || 0;
      const estimatedHours = plates * timeH;

      // Set machine to "produzindo" with live timer
      await supabase.from('machines').update({
        status: 'produzindo',
        active_product_name: `${p.name} (${plates}x rodada, ${qty} pç)`,
        active_start_time: new Date().toISOString(),
        active_estimated_hours: estimatedHours > 0 ? estimatedHours : null,
        active_notes: null,
      }).eq('id', prodModalData.machineId);
    }

    const failureLog = JSON.parse(localStorage.getItem('meus3d_failures_v1') || '[]');
    let failureReserve = 0;
    if (p.results) {
       const q = v.quantity || 1;
       let totalFail = r.totalFailureCost;
       if (totalFail === undefined) {
           const failRate = parseFloat(v.failureRate) || 0;
           const printCost = (parseFloat(r.filamentCost)||0) + (parseFloat(r.energyCost)||0) + (parseFloat(r.machineCost)||0);
           totalFail = printCost * (failRate / 100);
       }
       failureReserve = (totalFail / q) * qty;
    }
    if (failureReserve > 0) {
       failureLog.push({
           id: Date.now() + '-res',
           timestamp: new Date().toISOString(),
           type: 'reserve',
           productId: p.id,
           productName: p.name,
           qty,
           cost: failureReserve
       });
       localStorage.setItem('meus3d_failures_v1', JSON.stringify(failureLog));
    }

    const ppCost = parseFloat(v.postProcessing) || 0;
    const designCost = parseFloat(v.designCost) || 0;
    const laborUnitCost = ppCost + designCost;
    if (laborUnitCost > 0) {
       const laborTasks = JSON.parse(localStorage.getItem('meus3d_labor_tasks_v1') || '[]');
       laborTasks.push({
           id: 'L' + Date.now(),
           date: new Date().toISOString(),
           productId: p.id,
           productName: p.name,
           qty,
           unitValue: laborUnitCost,
           totalValue: laborUnitCost * qty,
           status: 'pendente'
       });
       localStorage.setItem('meus3d_labor_tasks_v1', JSON.stringify(laborTasks));
    }

    setProdModalOpen(false);
    loadData();
    showToast(`+${qty} ${p.name} produzido(s)!`, 'success');
  };

  // --- Kit Modal ---
  const openKitModal = () => {
    setKitData({
      name: '',
      components: [{ id: '', qty: 1 }],
      salePrice: '',
      salePriceMkt: '',
      platformFee: '',
      shipping: '',
      packaging: ''
    });
    setKitModalOpen(true);
  };

  const calculateKitTotals = () => {
    let tMat=0, tEne=0, tMac=0, tAux=0, tPos=0, tDes=0, tExt=0, tFai=0;
    
    kitData.components.forEach((comp: any) => {
        if (!comp.id) return;
        const p = products.find(x => String(x.id) === String(comp.id));
        if (p && p.results) {
            const r = p.results;
            const q = r.quantity || p.values?.quantity || 1;
            const n = parseInt(comp.qty) || 1;
            
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
    const fullTotal = prodTotal + opTotal;

    return { tMat, tEne, tMac, tAux, tPos, tDes, tExt, tFai, prodTotal, opTotal, fullTotal };
  };

  const saveKit = async () => {
    if (!kitData.name.trim()) return showToast('Digite um nome para o kit', 'error');
    
    let hasItems = kitData.components.some((c: any) => c.id);
    if (!hasItems) return showToast('Adicione pelo menos uma peça ao kit', 'error');
    
    const saleDir = parseFloat(kitData.salePrice) || 0;
    const saleMkt = parseFloat(kitData.salePriceMkt) || saleDir;
    
    const totals = calculateKitTotals();
    
    let totalWeight = 0;
    let totalTime = 0;
    let finalComponents: any[] = [];
    
    kitData.components.forEach((comp: any) => {
        if (!comp.id) return;
        const p = products.find(x => String(x.id) === String(comp.id));
        if (p) {
            const n = parseInt(comp.qty) || 1;
            const q = p.values?.quantity || 1;
            totalWeight += ((parseFloat(p.values?.weight) || 0) / q) * n;
            totalTime += ((parseFloat(p.values?.printTime) || 0) / q) * n;
            finalComponents.push({ id: p.id, name: p.name, qty: n });
        }
    });

    const platformFeePct = parseFloat(kitData.platformFee) || 0;
    const kitPackaging = parseFloat(kitData.packaging) || 0;
    const kitShipping = parseFloat(kitData.shipping) || 0;
    const platformFeeValue = saleMkt * (platformFeePct / 100);

    const newKit = {
        user_id: user?.id,
        name: kitData.name.trim(),
        color: kitData.color || '#25f4f4',
        type: 'kit',
        stock: 0,
        values: {
            salePrice: saleDir,
            salePriceMarketplace: saleMkt,
            weight: totalWeight,
            printTime: totalTime,
            quantity: 1, 
            piecesPerKit: 1,
            packagingCost: kitPackaging,
            shippingCost: kitShipping,
            platformFee: platformFeePct,
            components: finalComponents
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
    
    const { error } = await supabase.from('products').insert(newKit);
    if (error) {
      showToast('Erro ao criar kit', 'error');
      return;
    }
    
    setKitModalOpen(false);
    loadData();
    showToast('Kit Montado com sucesso!', 'success');
  };

  // --- Renders ---
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const inStock = products.filter(p => (stock[p.id] || 0) > LOW_THRESHOLD).length;
  const lowStockCount = products.filter(p => { const s = stock[p.id] || 0; return s > 0 && s <= LOW_THRESHOLD; }).length;
  const outStockCount = products.filter(p => (stock[p.id] || 0) === 0).length;
  const totalUnits = products.reduce((acc, p) => acc + (stock[p.id] || 0), 0);

  const fmtMoney = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const renderProductCard = (p: Product) => {
    const id = String(p.id);
    const qty = stock[id] || 0;
    const isKit = p._type === 'kit' || (p.values.piecesPerKit || 1) > 1;
    const timeH = p.values.printTime || 0;
    const wG = p.values.weight || 0;
    
    const qty_batch = p.values.quantity || 1;
    const isBatch = viewMode === 'batch';
    const mult = isBatch ? qty_batch : 1;
    
    const isMkt = salesMode !== 'direct';
    let platPercent = 0;
    let mktShip = 0;
    let mktFixed = 0;
    if (isMkt) {
        const mkt = marketplaces.find(m => String(m.id) === String(salesMode));
        if (mkt) {
            platPercent = parseFloat(mkt.fee_percentage ?? mkt.commissionRate) || 0;
            mktShip = parseFloat(mkt.free_shipping_cost ?? mkt.defaultShipping) || 0;
            mktFixed = parseFloat(mkt.fixed_fee) || 0;
        } else {
            platPercent = parseFloat(p.values.platformFee) || 0;
            mktShip = parseFloat(p.values.shippingCost) || 0;
        }
    }

    const r = p.results || {};
    const cMat = (parseFloat(r.filamentCost) || 0) / qty_batch * mult;
    const cAux = (parseFloat(r.auxiliaryCost || r.totalAuxiliaryCost) || 0) / qty_batch * mult;
    const cEne = (parseFloat(r.energyCost) || 0) / qty_batch * mult;
    const cMac = (parseFloat(r.machineCost) || 0) / qty_batch * mult;
    const failRate = parseFloat(p.values.failureRate) || 0;
    const rawPrintCost = cMat + cEne + cMac;
    const cFail = r.totalFailureCost !== undefined ? (parseFloat(r.totalFailureCost) / qty_batch * mult) : (rawPrintCost * (failRate / 100));

    const piecesPerKit = p.values.piecesPerKit || 1;
    const cPost = (parseFloat(r.totalPostProcessing) || ((parseFloat(p.values.postProcessing) || 0) * piecesPerKit * qty_batch)) / qty_batch * mult;
    const cDes = (parseFloat(r.totalDesignCost) || ((parseFloat(p.values.designCost) || 0) * piecesPerKit * qty_batch)) / qty_batch * mult;
    const packUnit = parseFloat(p.values.packagingCost) || 0;
    const fallbackPack = packUnit * qty_batch;
    const cPack = ((parseFloat(r.totalPackagingCost) || fallbackPack) / qty_batch) * mult;
    
    // Frete e Taxa apenas em Marketplace
    const shipUnit = isMkt ? (mktShip || parseFloat(p.values.shippingCost) || 0) : 0;
    const cShip = shipUnit * mult;
    
    const saleDir = parseFloat(p.values.salePrice) || parseFloat(r.unitCost) || 0;
    const saleMkt = parseFloat(p.values.salePriceMarketplace) || parseFloat(p.values.salePrice) || parseFloat(r.unitCost) || 0;
    const cPlat = isMkt 
        ? ((saleMkt * (platPercent / 100)) + mktFixed) * mult 
        : 0;

    const cExt = (parseFloat(r.totalOtherCosts || p.values.otherCosts) || 0) / qty_batch * mult;

    const prodTotal = cMat + cEne + cMac + cAux + cFail;
    const operTotal = cPack + cShip + cPost + cDes + cExt;
    const totalCostFinal = prodTotal + operTotal + cPlat;

    const grossRev = (isMkt ? saleMkt : saleDir) * mult;
    
    const netRev = grossRev - cPlat;
    const grossProfit = netRev - prodTotal;
    const netProfit = grossProfit - operTotal;
    const netMargin = grossRev > 0 ? (netProfit / grossRev) * 100 : 0;

    let badgeClass = 'bg-red-500/15 text-red-400';
    let badgeText = 'Sem estoque';
    if (qty > LOW_THRESHOLD) { badgeClass = 'bg-emerald-500/15 text-emerald-400'; badgeText = 'Estoque OK'; }
    else if (qty > 0) { badgeClass = 'bg-orange-500/15 text-orange-400'; badgeText = 'Estoque Baixo'; }

    let cardClass = 'card hover:-translate-y-1 hover:shadow-xl flex flex-col transition-all duration-300';
    let borderColor = 'var(--border-card)';
    if (qty === 0) borderColor = 'rgba(239, 68, 68, 0.4)';
    else if (qty <= LOW_THRESHOLD) borderColor = 'rgba(249, 115, 22, 0.4)';

    const renderBar = (val: number, colorClass: string, label: string) => {
        const w = grossRev > 0 ? Math.min(100, Math.max(0, (val / grossRev) * 100)) : 0;
        const pctStr = grossRev > 0 ? ` (${w.toFixed(1)}%)` : '';
        const isProfit = label === 'LUCRO' || label === 'Lucro Líquido';
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 80, flexShrink: 0, fontSize: 11, color: isProfit ? '#4ade80' : 'rgba(255,255,255,0.45)', fontWeight: isProfit ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                    <div className={colorClass} style={{ width: `${w}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 11, fontFamily: 'var(--font-mono, monospace)', fontWeight: isProfit ? 700 : 500, color: isProfit ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>
                    {fmtMoney(val)}<span style={{ fontSize: '0.85em', opacity: 0.7, marginLeft: 3 }}>{pctStr}</span>
                </div>
            </div>
        );
    };

    return (
        <div key={id} className={cardClass} style={{ borderColor, padding: 0, minWidth: 0 }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-light)', lineHeight: 1.3, marginBottom: 8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: p.color || '#25f4f4', flexShrink: 0 }}></span>
                    {p.name}
                </h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${isKit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                        {isKit ? `Kit com ${p.values.piecesPerKit || 1}` : 'Peça Única'}
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${badgeClass}`}>
                        {badgeText}
                    </span>
                </div>
            </div>

            {/* Info pills */}
            <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ⏱ <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{timeH.toFixed(1)}h</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    🧵 <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{(wG / qty_batch * mult).toFixed(0)}g</span>
                </div>
                {p.values.filamentName && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                        {p.values.filamentName}
                    </div>
                )}
            </div>

            {/* Summary Grid (2x2) */}
            <div style={{ margin: '10px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 2 }}>Receita</div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{fmtMoney(grossRev)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 2 }}>Custo</div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#fca5a5' }}>{fmtMoney(totalCostFinal)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 2 }}>Lucro</div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: netProfit >= 0 ? '#86efac' : '#fca5a5' }}>{fmtMoney(netProfit)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 2 }}>Margem</div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: netMargin >= 20 ? '#86efac' : netMargin >= 10 ? '#fde68a' : '#fca5a5' }}>
                        {netMargin.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Cost Breakdown */}
            <div style={{ margin: '12px 16px 0', padding: 12, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                    Composição • {isBatch ? `Lote de ${qty_batch}` : '1 Peça'} • {isMkt ? 'Marketplace' : 'Venda Direta'}
                </div>
                {renderBar(cMat, 'bg-indigo-400', 'Filamento')}
                {renderBar(cAux, 'bg-lime-400', 'Auxiliares')}
                {renderBar(cEne, 'bg-cyan-400', 'Energia')}
                {renderBar(cMac, 'bg-purple-400', 'Máquina')}
                {renderBar(cFail, 'bg-red-400', `Falhas (${failRate}%)`)}
                {renderBar(cPost, 'bg-orange-400', 'Pós-proc.')}
                {renderBar(cDes, 'bg-teal-400', 'Design')}
                {renderBar(cPack, 'bg-amber-400', 'Embalagem')}
                {isMkt && renderBar(cShip, 'bg-blue-400', 'Frete')}
                {isMkt && renderBar(cPlat, 'bg-pink-400', 'Taxa')}
                {renderBar(cExt, 'bg-gray-400', 'Outros')}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
                {renderBar(netProfit, 'bg-emerald-400', 'LUCRO')}
            </div>

            {/* Footer: Stock + Actions */}
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '0 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Estoque Atual</div>
                        <strong style={{ fontSize: 22, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-light)', lineHeight: 1 }}>{qty}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Patrimônio</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                            {qty > 0 ? fmtMoney(qty * (isMkt ? saleMkt : saleDir)) : '---'}
                        </span>
                    </div>
                </div>

                <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <button 
                        onClick={() => openProductionModal(id)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, padding: '10px 0' }}
                    >
                        <Rocket className="w-4 h-4" /> Produzido
                    </button>
                    <button 
                        onClick={() => adjustStock(id, p.name, -1)}
                        style={{
                            padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px dashed rgba(239,68,68,0.3)',
                            borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#f87171', cursor: 'pointer'
                        }}
                        title="Remover 1 (venda/perda)"
                    >
                        −1
                    </button>
                </div>

                <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
                    <button 
                        onClick={() => editProduct(id, p._type)}
                        className="btn"
                        style={{ flex: 1, fontSize: 11, padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                        <Edit className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button 
                        onClick={() => deleteProduct(id, p._type, p.name)}
                        style={{
                            padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                            borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#f87171', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                        }}
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                </div>
            </div>
        </div>
    );
  };

  if (!isLoaded) return <AppLayout><div className="p-8 text-center text-gray-400">Carregando...</div></AppLayout>;

  const { tMat, tEne, tMac, tAux, tPos, tDes, tExt, tFai, prodTotal, opTotal, fullTotal } = calculateKitTotals();

  return (
    <AppLayout>
      <div className="dashboard-grid">
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div className="card-icon card-icon-blue">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-light)', margin: 0 }}>Estoque de Produtos</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Gestão centralizada de inventário e produção</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-md)" }}>
          <div className="card">
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Total de produtos
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--text-light)", marginTop: "0.5rem" }}>
                {products.length}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(52, 211, 153, 0.4)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Unidades em estoque
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#34d399", marginTop: "0.5rem" }}>
                {totalUnits}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: lowStockCount > 0 ? "rgba(251, 146, 60, 0.4)" : "var(--border-card)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Estoque baixo (≤{LOW_THRESHOLD})
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: lowStockCount > 0 ? "#fb923c" : "var(--text-light)", marginTop: "0.5rem" }}>
                {lowStockCount}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: outStockCount > 0 ? "rgba(248, 113, 113, 0.4)" : "var(--border-card)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Sem estoque
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: outStockCount > 0 ? "#f87171" : "var(--text-light)", marginTop: "0.5rem" }}>
                {outStockCount}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
              <div className="input-group" style={{ flex: 1, minWidth: '250px', margin: 0 }}>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <Search className="w-4 h-4 text-gray-500" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar produto..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={openKitModal}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Grid className="w-4 h-4" /> Montar Kit
                </button>
                
                <div className="toggle-group">
                  <button 
                    onClick={() => setViewMode('unit')}
                    className={`toggle-btn ${viewMode === 'unit' ? 'active' : ''}`}
                  >
                    1 Peça/Kit
                  </button>
                  <button 
                    onClick={() => setViewMode('batch')}
                    className={`toggle-btn ${viewMode === 'batch' ? 'active' : ''}`}
                  >
                    Lote (Mesa)
                  </button>
                </div>
                
                <div className="toggle-group" style={{ overflowX: 'auto' }}>
                  <button 
                    onClick={() => setSalesMode('direct')}
                    className={`toggle-btn ${salesMode === 'direct' ? 'active' : ''}`}
                  >
                    Venda Direta
                  </button>
                  {marketplaces.filter(m => m.id !== 'direct').map(m => (
                    <button 
                      key={m.id}
                      onClick={() => setSalesMode(m.id)}
                      className={`toggle-btn ${salesMode === m.id ? 'active' : ''}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div style={{ gridColumn: '1 / -1', width: '100%' }}>
        {products.length === 0 ? (
             <div className="card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', borderStyle: 'dashed' }}>
                <Package className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p>Nenhum produto cadastrado ainda.</p>
                <p className="text-sm mt-2">Salve produtos na Calculadora para vê-los aqui.</p>
             </div>
        ) : filteredProducts.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Nenhum produto encontrado para &quot;{searchTerm}&quot;
            </div>
        ) : (
            <div className="products-grid">
                {filteredProducts.map(renderProductCard)}
            </div>
        )}
        </div>

        {/* Modals */}
        {/* Production Modal */}
        {prodModalOpen && prodModalData && (
            <>
                <div className="drawer-overlay" style={{ display: 'block', zIndex: 50 }}></div>
                <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, width: '90%', maxWidth: 400, margin: 0 }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="card-icon card-icon-blue"><Package size={20} /></div>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-light)' }}>Registrar Produção</h2>
                                <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-muted)' }}>{prodModalData.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setProdModalOpen(false)} className="btn-icon">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="card-body">
                        <div className="input-group">
                            <label>Quantidade de Mesas Produzidas</label>
                            <div className="input-wrapper">
                                <input 
                                    type="number" 
                                    min="1"
                                    value={prodModalData.qtyPlates}
                                    onChange={e => setProdModalData({ ...prodModalData, qtyPlates: Math.max(1, parseInt(e.target.value) || 1) })}
                                />
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6, fontWeight: 600 }}>
                                Total: {(prodModalData.qtyPlates || 1) * prodModalData.batchSize} unidades
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Filamento Utilizado</label>
                            <div className="input-wrapper">
                                <select 
                                    value={prodModalData.filamentId}
                                    onChange={e => setProdModalData({ ...prodModalData, filamentId: e.target.value })}
                                >
                                    <option value="">(Nenhum - Não descontar)</option>
                                    {filaments.map(f => (
                                        <option key={f.id} value={f.id}>{f.brand} {f.material} - {f.colorName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Máquina (Para Payback)</label>
                            <div className="input-wrapper">
                                <select 
                                    value={prodModalData.machineId}
                                    onChange={e => setProdModalData({ ...prodModalData, machineId: e.target.value })}
                                >
                                    <option value="">Nenhuma (Não contabilizar)</option>
                                    {machines.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={confirmProduction}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                        >
                            <CheckCircle2 size={18} /> Confirmar Produção
                        </button>
                    </div>
                </div>
            </>
        )}

        {/* Kit Modal */}
        {kitModalOpen && (
            <>
                <div className="drawer-overlay" style={{ display: 'block', zIndex: 50 }}></div>
                <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 51, width: '90%', maxWidth: 600, maxHeight: '90vh', margin: 0, display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="card-icon card-icon-amber"><Package size={20} /></div>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-light)' }}>Montar Novo Kit</h2>
                                <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-muted)' }}>Crie um kit agrupando produtos individuais</p>
                            </div>
                        </div>
                        <button onClick={() => setKitModalOpen(false)} className="btn-icon">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="card-body" style={{ overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>Nome do Kit</label>
                                <div className="input-wrapper">
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Vaso Completo (Base + Topo)"
                                        value={kitData.name}
                                        onChange={e => setKitData({...kitData, name: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="input-group" style={{ width: '80px', marginBottom: 0 }}>
                                <label>Cor</label>
                                <input 
                                    type="color" 
                                    value={kitData.color || '#25f4f4'}
                                    onChange={e => setKitData({...kitData, color: e.target.value})}
                                    style={{ width: '100%', height: '42px', padding: '2px', cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Peças do Kit</label>
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                                {kitData.components.map((comp: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <div className="input-wrapper" style={{ flex: 1, marginBottom: 0 }}>
                                            <select 
                                                value={comp.id}
                                                onChange={e => {
                                                    const newC = [...kitData.components];
                                                    newC[idx].id = e.target.value;
                                                    setKitData({...kitData, components: newC});
                                                }}
                                            >
                                                <option value="">Selecione uma peça...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="input-wrapper" style={{ width: 80, marginBottom: 0 }}>
                                            <input 
                                                type="number"
                                                min="1"
                                                value={comp.qty}
                                                onChange={e => {
                                                    const newC = [...kitData.components];
                                                    newC[idx].qty = Math.max(1, parseInt(e.target.value)||1);
                                                    setKitData({...kitData, components: newC});
                                                }}
                                                style={{ textAlign: 'center' }}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newC = kitData.components.filter((_:any, i:number) => i !== idx);
                                                setKitData({...kitData, components: newC});
                                            }}
                                            className="btn-icon"
                                            style={{ color: 'var(--danger)', height: 42, width: 42 }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                                {kitData.components.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Nenhuma peça adicionada</div>}
                            </div>
                            <button 
                                onClick={() => setKitData({...kitData, components: [...kitData.components, {id:'', qty:1}]})}
                                className="btn btn-secondary"
                                style={{ width: '100%', gap: 6, justifyContent: 'center' }}
                            >
                                <Plus size={16} /> Adicionar Peça
                            </button>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                                <span>Custo de Produção (Filamento + Energia + etc):</span>
                                <strong style={{ color: 'var(--text-light)' }}>{fmtMoney(prodTotal)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                <span>Custo Operacional (Pós-proc + Design + Extra):</span>
                                <strong style={{ color: 'var(--text-light)' }}>{fmtMoney(opTotal)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', fontWeight: 700 }}>
                                <span style={{ color: 'var(--text-light)' }}>Custo Total Base:</span>
                                <strong style={{ color: 'var(--primary)' }}>{fmtMoney(fullTotal)}</strong>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="input-group">
                                <label>Venda Direta</label>
                                <div className="input-wrapper">
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>R$</span>
                                    <input type="number" min="0" step="0.01" value={kitData.salePrice} onChange={e=>setKitData({...kitData, salePrice: e.target.value})} style={{ paddingLeft: 36 }} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Marketplace</label>
                                <div className="input-wrapper">
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>R$</span>
                                    <input type="number" min="0" step="0.01" value={kitData.salePriceMarketplace} onChange={e=>setKitData({...kitData, salePriceMarketplace: e.target.value})} style={{ paddingLeft: 36 }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                            <div className="input-group">
                                <label>Taxa MKT (%)</label>
                                <div className="input-wrapper">
                                    <input type="number" min="0" step="0.1" value={kitData.platformFee} onChange={e=>setKitData({...kitData, platformFee: e.target.value})} style={{ textAlign: 'center' }} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Frete do Kit</label>
                                <div className="input-wrapper">
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>R$</span>
                                    <input type="number" min="0" step="0.01" value={kitData.shipping} onChange={e=>setKitData({...kitData, shipping: e.target.value})} style={{ paddingLeft: 36 }} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Embalagem Kit</label>
                                <div className="input-wrapper">
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>R$</span>
                                    <input type="number" min="0" step="0.01" value={kitData.packaging} onChange={e=>setKitData({...kitData, packaging: e.target.value})} style={{ paddingLeft: 36 }} />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={saveKit}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                        >
                            <Package size={18} /> Salvar Kit Completo
                        </button>
                    </div>
                </div>
            </>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5
            ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'} backdrop-blur-sm`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-medium">{toast.msg}</span>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
