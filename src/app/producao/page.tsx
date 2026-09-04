"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  Package, Box, Layers, ArrowUp, ArrowDown, Plus, Minus, Settings, 
  RefreshCw, CheckCircle2, AlertTriangle, Play, Info, Calculator, Tag
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string | number;
  name: string;
  color?: string;
  _type: 'single' | 'kit';
  values: {
    weight?: number;
    printTime?: number;
    salePrice?: number;
    quantity?: number;
    piecesPerKit?: number;
    filamentName?: string;
  };
  results?: {
    unitCost?: number;
    filamentCost?: number;
    energyCost?: number;
    machineCost?: number;
    totalPostProcessing?: number;
    totalDesignCost?: number;
    totalOtherCosts?: number;
  };
}

export default function ProducaoPage() {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [qtyState, setQtyState] = useState<Record<string, number>>({});
  const [queueOrder, setQueueOrder] = useState<string[]>([]);
  
  const [cfg, setCfg] = useState({
    hoursPerDay: 24,
    daysPerMonth: 30,
    failureRate: 10
  });

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoaded(true);
      return;
    }

    const loadAllData = async () => {
      try {
        // Load products from Supabase
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (productsData) {
          const all: Product[] = productsData.map((p: any) => ({
            ...p,
            _type: p.type || 'single',
          }));
          setProducts(all);

          // Build stock map from products
          const stockMap: Record<string, number> = {};
          productsData.forEach((p: any) => {
            stockMap[p.id] = p.stock || 0;
          });
          setStock(stockMap);
        }

        // Load production config
        const { data: cfgData } = await supabase
          .from('production_config')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (cfgData) {
          setCfg({
            hoursPerDay: cfgData.hours_per_day ?? 24,
            daysPerMonth: cfgData.days_per_month ?? 30,
            failureRate: cfgData.failure_rate ?? 10
          });
        }

        // Load production queue
        const { data: queueData } = await supabase
          .from('production_queue')
          .select('*')
          .eq('user_id', user.id)
          .order('queue_order', { ascending: true });

        if (queueData) {
          const loadedQty: Record<string, number> = {};
          const loadedQueue: string[] = [];
          queueData.forEach((q: any) => {
            loadedQty[q.product_id] = q.target_qty;
            loadedQueue.push(q.product_id);
          });
          setQtyState(loadedQty);
          setQueueOrder(loadedQueue);
        }
      } catch (err) {
        console.error('Error loading production data:', err);
      }
      setIsLoaded(true);
    };

    loadAllData();
  }, [user]);

  const saveCfg = async (newCfg: typeof cfg) => {
    setCfg(newCfg);
    if (!user) return;
    await supabase.from('production_config').upsert({
      user_id: user.id,
      hours_per_day: newCfg.hoursPerDay,
      days_per_month: newCfg.daysPerMonth,
      failure_rate: newCfg.failureRate
    }, { onConflict: 'user_id' });
  };

  const saveQtyState = async (newState: Record<string, number>) => {
    setQtyState(newState);
    if (!user) return;
    
    if (Object.keys(newState).length === 0) {
      await supabase.from('production_queue').delete().eq('user_id', user.id);
      return;
    }
    
    const upserts = Object.keys(newState).map(prodId => ({
      user_id: user.id,
      product_id: prodId,
      target_qty: newState[prodId],
      queue_order: queueOrder.indexOf(prodId) !== -1 ? queueOrder.indexOf(prodId) : 0
    }));
    
    if (upserts.length > 0) {
      await supabase.from('production_queue').upsert(upserts, { onConflict: 'user_id,product_id' });
    }
  };

  const saveQueueOrder = async (newOrder: string[]) => {
    setQueueOrder(newOrder);
    if (!user) return;
    
    const upserts = newOrder.map((prodId, idx) => ({
      user_id: user.id,
      product_id: prodId,
      target_qty: qtyState[prodId] || 0,
      queue_order: idx
    }));
    
    if (upserts.length > 0) {
      await supabase.from('production_queue').upsert(upserts, { onConflict: 'user_id,product_id' });
    }
  };

  const handleCfgChange = (field: keyof typeof cfg, value: number) => {
    saveCfg({ ...cfg, [field]: value });
  };

  const handleQtyChange = (id: string, delta: number) => {
    const current = qtyState[id] || 0;
    const next = Math.max(0, current + delta);
    saveQtyState({ ...qtyState, [id]: next });
  };

  const handleQtyInput = (id: string, val: string) => {
    const next = Math.max(0, parseInt(val) || 0);
    saveQtyState({ ...qtyState, [id]: next });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedProducts.map(p => String(p.id))];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    saveQueueOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedProducts.length - 1) return;
    const newOrder = [...orderedProducts.map(p => String(p.id))];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    saveQueueOrder(newOrder);
  };

  const resetAll = () => {
    saveQtyState({});
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const finishProduction = () => {
    const items = orderedProducts
      .filter(p => {
        const id = String(p.id);
        const meta = qtyState[id] || 0;
        const inStock = stock[id] || 0;
        return Math.max(0, meta - inStock) > 0;
      })
      .map(p => {
        const id = String(p.id);
        const meta = qtyState[id] || 0;
        const inStock = stock[id] || 0;
        return {
          id: id,
          name: p.name,
          qty: Math.max(0, meta - inStock)
        };
      });

    if (items.length === 0) return;

    const total = items.reduce((sum, i) => sum + i.qty, 0);
    const confirmMsg = `Confirmar finalização da produção?\n\n` +
      items.map(i => `• ${i.name}: ${i.qty} unid.`).join('\n') +
      `\n\nTotal: ${total} peças serão adicionadas ao estoque.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const currentStock = JSON.parse(localStorage.getItem('meus3d_stock_v1') || '{}');
      const history = JSON.parse(localStorage.getItem('meus3d_stock_history_v1') || '[]');

      items.forEach(item => {
        currentStock[item.id] = (currentStock[item.id] || 0) + item.qty;
        history.unshift({
          productName: item.name,
          delta: item.qty,
          reason: '✅ Produção finalizada',
          ts: Date.now()
        });
      });

      if (history.length > 100) history.length = 100;
      
      localStorage.setItem('meus3d_stock_v1', JSON.stringify(currentStock));
      localStorage.setItem('meus3d_stock_history_v1', JSON.stringify(history));
      setStock(currentStock);
      
      // Keep qtyState the same (Meta is target)
      showToast(`✅ ${total} peças adicionadas ao estoque!`, 'success');
    } catch(e) {
      showToast('Erro ao atualizar estoque', 'error');
    }
  };

  const fmtInt = (n: number) => Math.round(n).toLocaleString('pt-BR');
  const fmtG = (g: number) => g >= 1000 ? (g / 1000).toFixed(2) + ' kg' : Math.round(g) + ' g';
  const fmtH = (h: number) => h.toFixed(1) + ' h';
  const fmtMoney = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  // Process Queue order
  const orderedProducts = [...products].sort((a, b) => {
    const idxA = queueOrder.indexOf(String(a.id));
    const idxB = queueOrder.indexOf(String(b.id));
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    // fallback to default sort b.id - a.id
    return Number(b.id) - Number(a.id);
  });

  // Calculate totals
  let totalPieces = 0;
  let totalHoursNeeded = 0;
  let totalFilamentG = 0;
  
  let cMaterial = 0;
  let cEnergy = 0;
  let cMachine = 0;
  let cLabor = 0;
  let cExtras = 0;
  let cFailures = 0;

  const totalAvailHours = cfg.hoursPerDay * cfg.daysPerMonth;

  orderedProducts.forEach(p => {
    const id = String(p.id);
    const meta = qtyState[id] || 0;
    const inStock = stock[id] || 0;
    const qtyToProduce = Math.max(0, meta - inStock);
    
    if (qtyToProduce === 0) return;

    const wG = p.values.weight || 0;
    const timeH = p.values.printTime || 0;
    const qtyProd = (p.values.quantity || 1) * (p.values.piecesPerKit || 1);
    
    const rounds = Math.ceil(qtyToProduce / qtyProd);
    const hoursForProduct = rounds * timeH;
    const filamentForProduct = rounds * wG * (1 + cfg.failureRate / 100);

    if (p.results) {
      cMaterial += (p.results.filamentCost || 0) * rounds;
      cEnergy += (p.results.energyCost || 0) * rounds;
      cMachine += (p.results.machineCost || 0) * rounds;
      cLabor += ((p.results.totalPostProcessing || 0) + (p.results.totalDesignCost || 0)) * rounds;
      cExtras += (p.results.totalOtherCosts || 0) * rounds;

      const printCost = (p.results.filamentCost || 0) + (p.results.energyCost || 0) + (p.results.machineCost || 0);
      cFailures += printCost * rounds * (cfg.failureRate / 100);
    }

    totalPieces += qtyToProduce;
    totalHoursNeeded += hoursForProduct;
    totalFilamentG += filamentForProduct;
  });

  const usagePct = totalAvailHours > 0 ? (totalHoursNeeded / totalAvailHours) * 100 : 0;
  const totalCpv = cMaterial + cEnergy + cMachine + cLabor + cExtras + cFailures;
  const renderCpvLine = (label: string, value: number, isFailure = false) => {
    const pct = totalCpv > 0 ? (value / totalCpv) * 100 : 0;
    return (
      <div className="flex justify-between text-base" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-gray-400">{label}</span>
        <span className={`font-mono ${isFailure ? 'text-red-400' : 'text-gray-300'}`}>
          {fmtMoney(value)} <small className="opacity-70">({pct.toFixed(2).replace('.', ',')}%)</small>
        </span>
      </div>
    );
  };

  if (!isLoaded) return <AppLayout><div className="p-8 text-center text-gray-400">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="dashboard-grid">
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div className="card-icon card-icon-blue">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-light)', margin: 0 }}>Produção & Projeções</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Planeje e acompanhe sua fila de impressão 3D</p>
            </div>
          </div>
        </div>

        {/* Config Bar */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <Settings className="w-5 h-5 text-gray-400" />
              <div className="input-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Horas/dia disponíveis</label>
                <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    value={cfg.hoursPerDay} 
                    onChange={(e) => handleCfgChange('hoursPerDay', parseFloat(e.target.value) || 0)}
                    className="w-full"
                    min="1" max="24"
                    style={{ flex: 1 }}
                  />
                  <span className="text-gray-500 text-sm ml-2" style={{ paddingRight: '12px' }}>h</span>
                </div>
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Dias no mês</label>
                <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    value={cfg.daysPerMonth} 
                    onChange={(e) => handleCfgChange('daysPerMonth', parseFloat(e.target.value) || 0)}
                    className="w-full"
                    min="1" max="31"
                    style={{ flex: 1 }}
                  />
                  <span className="text-gray-500 text-sm ml-2" style={{ paddingRight: '12px' }}>d</span>
                </div>
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Taxa de falha</label>
                <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    value={cfg.failureRate} 
                    onChange={(e) => handleCfgChange('failureRate', parseFloat(e.target.value) || 0)}
                    className="w-full"
                    min="0" max="100"
                    style={{ flex: 1 }}
                  />
                  <span className="text-gray-500 text-sm ml-2" style={{ paddingRight: '12px' }}>%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* LEFT: Product List */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.12em] mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos Cadastrados - defina a quantidade a produzir (Fila)
            </h2>

            {orderedProducts.length === 0 ? (
              <div className="card" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', borderStyle: 'dashed' }}>
                <Box className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p>Nenhum produto cadastrado ainda.</p>
                <p className="text-sm mt-2">Salve produtos na Calculadora para vê-los aqui.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orderedProducts.map((p, index) => {
                  const id = String(p.id);
                  const inStock = stock[id] || 0;
                  const meta = qtyState[id] || 0;
                  const qtyToProduce = Math.max(0, meta - inStock);
                  
                  const wG = p.values.weight || 0;
                  const timeH = p.values.printTime || 0;
                  const sale = p.values.salePrice || 0;
                  const qtyProd = (p.values.quantity || 1) * (p.values.piecesPerKit || 1);
                  const isKit = p._type === 'kit' || (p.values.piecesPerKit || 1) > 1;
                  
                  const rounds = qtyToProduce > 0 ? Math.ceil(qtyToProduce / qtyProd) : 0;
                  const totalHoursProduct = rounds * timeH;
                  const totalDaysProduct = cfg.hoursPerDay > 0 ? totalHoursProduct / cfg.hoursPerDay : 0;
                  const filNeed = (wG * rounds) * (1 + cfg.failureRate / 100);

                  const isActive = meta > 0;

                  return (
                    <div 
                      key={id} 
                      className={`card flex flex-col sm:flex-row gap-4 justify-between transition-colors`}
                      style={{ 
                        padding: '16px', 
                        borderColor: isActive ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-card)',
                        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)'
                      }}
                    >
                      {/* Controls up/down */}
                      <div className="flex sm:flex-col gap-1 items-center justify-center sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-700/50 pb-3 sm:pb-0">
                         <button 
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1 text-gray-500 hover:text-indigo-400 disabled:opacity-30 transition-colors"
                         >
                           <ArrowUp className="w-5 h-5" />
                         </button>
                         <button 
                            onClick={() => moveDown(index)}
                            disabled={index === orderedProducts.length - 1}
                            className="p-1 text-gray-500 hover:text-indigo-400 disabled:opacity-30 transition-colors"
                         >
                           <ArrowDown className="w-5 h-5" />
                         </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="text-base font-bold text-gray-100 truncate" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: p.color || '#25f4f4', flexShrink: 0 }}></span>
                            {p.name}
                          </h3>
                          {isKit ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/15 text-emerald-400">Kit com {p.values.piecesPerKit || 1}</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-500/15 text-indigo-400">Peça Única</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
                          <span>⏱ <strong className="text-gray-300">{timeH.toFixed(1)}h</strong>/rodada</span>
                          <span>🧵 <strong className="text-gray-300">{wG}g</strong>/lote</span>
                          <span>📦 <strong className="text-gray-300">{qtyProd}</strong> pç/rodada</span>
                          <span className="text-emerald-400">💰 {fmtMoney(sale)} venda</span>
                        </div>

                        <div className="bg-gray-900/40 rounded-lg p-3 text-sm space-y-2">
                          <div className="flex gap-4 items-center flex-wrap">
                            <span className="text-gray-400">Estoque atual: <strong className="text-gray-300">{inStock}</strong></span>
                            {qtyToProduce > 0 ? (
                              <span className="text-gray-400">A produzir (falta): <strong className="text-orange-400">{qtyToProduce}</strong></span>
                            ) : (
                              meta > 0 && <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Estoque OK</span>
                            )}
                          </div>

                          {qtyToProduce > 0 && (
                            <div className="flex gap-4 items-center flex-wrap text-gray-400">
                              <span>🔄 Rodadas: <strong className="text-purple-400">{rounds}</strong></span>
                              <span>⏱ Horas: <strong className="text-indigo-400">{totalHoursProduct.toFixed(1)}h</strong></span>
                              <span>📅 Dias: <strong className="text-amber-400">{totalDaysProduct.toFixed(1)} dias</strong></span>
                            </div>
                          )}

                          <div className="text-gray-400">
                            Filamento: <strong className="text-emerald-400">{fmtG(filNeed)}</strong> <span className="text-[11px] opacity-70">(inclui falha)</span>
                            {p.values.filamentName && <div className="text-xs text-gray-500 mt-0.5">Material: {p.values.filamentName}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end justify-center gap-1 shrink-0 pt-2 sm:pt-0">
                        <div className="text-[11px] font-bold tracking-wider uppercase text-indigo-400">Meta (Qtd. Total)</div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleQtyChange(id, -1)} className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-700 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <input 
                            type="number"
                            value={meta || 0}
                            onChange={(e) => handleQtyInput(id, e.target.value)}
                            min="0"
                            className="w-20 text-center py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 font-mono focus:border-indigo-500 outline-none transition-colors"
                          />
                          <button onClick={() => handleQtyChange(id, 1)} className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-700 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Results */}
          <div className="lg:sticky lg:top-24 space-y-4">
            
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Gradient accent top bar */}
              <div style={{
                height: 3,
                background: usagePct > 100 ? 'linear-gradient(90deg, #ef4444, #f97316)' : usagePct > 80 ? 'linear-gradient(90deg, #f97316, #eab308)' : 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
                borderRadius: '20px 20px 0 0'
              }} />
              <div className="card-header">
                <div className="card-icon card-icon-purple">
                  <Calculator className="w-5 h-5" />
                </div>
                <h2>Capacidade do Mês</h2>
              </div>
              <div className="card-body" style={{ padding: '0 1.25rem 1.25rem' }}>
                
                {/* Radial Gauge */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                  <div style={{ position: 'relative', width: 180, height: 180 }}>
                    <svg viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                      {/* Background track */}
                      <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                      {/* Progress ring */}
                      <circle
                        cx="90" cy="90" r="76"
                        fill="none"
                        stroke={usagePct > 100 ? '#ef4444' : usagePct > 80 ? '#f97316' : '#818cf8'}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.min(usagePct, 100) * 4.78} 478`}
                        style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 6px ${usagePct > 100 ? 'rgba(239,68,68,0.5)' : usagePct > 80 ? 'rgba(249,115,22,0.4)' : 'rgba(129,140,248,0.4)'})` }}
                      />
                    </svg>
                    {/* Center content */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{
                        fontSize: 40, fontWeight: 900, fontFamily: 'var(--font-mono, monospace)',
                        color: usagePct > 100 ? '#ef4444' : usagePct > 80 ? '#f97316' : '#c7d2fe',
                        lineHeight: 1, letterSpacing: '-2px'
                      }}>
                        {usagePct.toFixed(0)}
                      </span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 2 }}>% ocupação</span>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '12px 10px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Peças</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#a5b4fc' }}>{fmtInt(totalPieces)}</div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.06))',
                    border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '12px 10px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Disponível</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#6ee7b7' }}>{fmtH(totalAvailHours)}</div>
                  </div>
                  <div style={{
                    background: `linear-gradient(135deg, ${totalHoursNeeded > totalAvailHours ? 'rgba(239,68,68,0.1), rgba(248,113,113,0.06)' : 'rgba(251,191,36,0.1), rgba(253,224,71,0.06)'})`,
                    border: `1px solid ${totalHoursNeeded > totalAvailHours ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}`, borderRadius: 14, padding: '12px 10px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Necessário</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: totalHoursNeeded > totalAvailHours ? '#fca5a5' : '#fde68a' }}>{fmtH(totalHoursNeeded)}</div>
                  </div>
                </div>

                {/* Status Banner */}
                <div style={{ marginTop: 12 }}>
                  {totalPieces === 0 ? (
                    <div style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13,
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                      color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                      <Info className="w-4 h-4 shrink-0" />
                      Defina as quantidades para calcular
                    </div>
                  ) : usagePct > 100 ? (
                    <div style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13,
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <div>Capacidade insuficiente! Faltam <strong>{fmtH(totalHoursNeeded - totalAvailHours)}</strong> neste mês.</div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13,
                      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
                      color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <div>Cabe no mês! Sobram <strong>{fmtH(totalAvailHours - totalHoursNeeded)}</strong> livres.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon card-icon-amber">
                  <Tag className="w-5 h-5" />
                </div>
                <h2>Custos Estimados (CPV)</h2>
              </div>
              <div className="card-body space-y-5">
                {renderCpvLine('Material', cMaterial)}
                {renderCpvLine('Energia', cEnergy)}
                {renderCpvLine('Máquina (Depr.)', cMachine)}
                {renderCpvLine('Mão de Obra', cLabor)}
                {renderCpvLine('Extras', cExtras)}
                {renderCpvLine('Falhas', cFailures, true)}
                
                <div className="pt-4 border-t border-gray-800 flex justify-between font-bold text-gray-100 items-center">
                  <span>Total Estimado</span>
                  <span className="font-mono text-lg">{fmtMoney(totalCpv)}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={finishProduction}
              disabled={totalPieces === 0}
              className="btn btn-primary w-full mt-4"
              style={{ padding: '16px', fontSize: '1rem' }}
            >
              <Play className="w-5 h-5 fill-current" />
              Finalizar Produção
            </button>

            <button 
              onClick={resetAll}
              className="btn w-full mt-4"
              style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}
            >
              <RefreshCw className="w-4 h-4" />
              Zerar quantidades
            </button>

          </div>
        </div>
        </div>

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
