"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Trash2, X, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const PRODUCTS_KEY = 'savedProducts3d';
const KITS_KEY = 'savedProducts3d_kit';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'reserve' | 'failure';
  productId?: string;
  productName: string;
  qty: number;
  cost: number;
}

interface ProductResult {
  totalFailureCost?: number;
  filamentCost?: number;
  energyCost?: number;
  machineCost?: number;
}

interface ProductValues {
  quantity?: number;
  failureRate?: number;
}

interface Product {
  id: string;
  name: string;
  values: ProductValues;
  results: ProductResult;
}

export default function FalhasPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [failQty, setFailQty] = useState(1);
  const [selectedCostPreview, setSelectedCostPreview] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    setIsMounted(true);
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    // Load logs
    try {
      const { data, error } = await supabase
        .from('failures')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      const mappedLogs: LogEntry[] = data.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at || row.timestamp,
        type: row.type,
        productId: row.product_id,
        productName: row.product_name,
        qty: row.qty,
        cost: row.cost
      }));
      setLogs(mappedLogs);
    } catch (e) {
      console.error('Error loading logs', e);
    }

    // Load products
    try {
      const single = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
      const kits = JSON.parse(localStorage.getItem(KITS_KEY) || '[]');
      setProducts([...single, ...kits]);
    } catch (e) {
      console.error('Error loading products', e);
    }
  };

  const handleSaveFailure = async () => {
    if (!selectedProductId || !user) {
      alert('Selecione um produto!');
      return;
    }
    if (failQty < 1) {
      alert('Quantidade inválida!');
      return;
    }
    
    const prod = products.find(p => String(p.id) === String(selectedProductId));
    if (!prod) return;

    try {
      const { data, error } = await supabase
        .from('failures')
        .insert({
          user_id: user.id,
          type: 'failure',
          product_id: prod.id,
          product_name: prod.name,
          qty: failQty,
          cost: selectedCostPreview
        })
        .select()
        .single();

      if (error) throw error;

      const newLog: LogEntry = {
        id: data.id,
        timestamp: data.created_at || new Date().toISOString(),
        type: data.type,
        productId: data.product_id,
        productName: data.product_name,
        qty: data.qty,
        cost: data.cost
      };

      setLogs([...logs, newLog]);
      setIsModalOpen(false);
      setSelectedProductId('');
      setFailQty(1);
    } catch (error) {
      console.error('Error saving failure', error);
      alert('Erro ao salvar falha');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Deseja excluir este registro? Isso alterará o saldo da reserva.')) return;
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('failures')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const newLogs = logs.filter(l => String(l.id) !== String(id));
      setLogs(newLogs);
    } catch (error) {
      console.error('Error deleting log', error);
      alert('Erro ao excluir registro');
    }
  };

  const fmt = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Stats
  let totalReserve = 0;
  let totalSpent = 0;

  logs.forEach(log => {
    if (log.type === 'reserve') {
      totalReserve += (log.cost || 0);
    } else if (log.type === 'failure') {
      totalSpent += (log.cost || 0);
    }
  });

  const balance = totalReserve - totalSpent;

  useEffect(() => {
    if (!selectedProductId) {
      setSelectedCostPreview(0);
      return;
    }
    const prod = products.find(p => String(p.id) === String(selectedProductId));
    if (prod && prod.results) {
      const r = prod.results;
      const baseQ = parseFloat(String(prod.values?.quantity || 1)) || 1;
      
      let totalFail = r.totalFailureCost;
      if (totalFail === undefined) {
        const failRate = parseFloat(String(prod.values?.failureRate || 0)) || 0;
        const printCost = (parseFloat(String(r.filamentCost || 0)) || 0) + 
                          (parseFloat(String(r.energyCost || 0)) || 0) + 
                          (parseFloat(String(r.machineCost || 0)) || 0);
        totalFail = printCost * (failRate / 100);
      }
      
      const unitCost = (parseFloat(String(totalFail)) || 0) / baseQ;
      setSelectedCostPreview(unitCost * failQty);
    } else {
      setSelectedCostPreview(0);
    }
  }, [selectedProductId, failQty, products]);



  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (!isMounted) return null;

  return (
    <AppLayout title="Gestão de Falhas" subtitle="Monitore prejuízos reais e taxas de falhas">
      <div className="dashboard-grid">
        
        {/* Actions Row */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn"
            style={{ backgroundColor: "var(--accent-emerald)", color: "white", border: "none", padding: "var(--space-sm) var(--space-md)" }}
          >
            <Plus size={18} style={{ marginRight: '8px', display: 'inline' }} /> Registrar Falha
          </button>
        </div>

        {/* KPIs */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          <div className="card" style={{ borderColor: "rgba(16, 185, 129, 0.4)" }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>FUNDO DE RESERVA</span>
                <TrendingUp size={18} style={{ color: '#10b981' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{fmt(totalReserve)}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Soma das Reservas de Seguro de todas as peças.</p>
            </div>
          </div>

          <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>PREJUÍZOS REAIS</span>
                <TrendingDown size={18} style={{ color: '#ef4444' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{fmt(totalSpent)}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Custo de Produção das peças que falharam.</p>
            </div>
          </div>

          <div className="card" style={{ borderColor: balance >= 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)" }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>SALDO DA RESERVA</span>
                <DollarSign size={18} style={{ color: balance >= 0 ? '#10b981' : '#ef4444' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', color: balance >= 0 ? '#10b981' : '#ef4444' }}>{fmt(balance)}</div>
              <p style={{ fontSize: '11px', color: balance >= 0 ? '#10b981' : '#ef4444', marginTop: '8px', opacity: 0.8 }}>
                {balance >= 0 ? 'As taxas embutidas estão cobrindo as falhas.' : 'Atenção! Falhas maiores que a reserva.'}
              </p>
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
          <div className="card">
            <div className="card-header">
              <h2>Histórico de Registros</h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-md)", padding: "var(--space-md)" }}>
                {sortedLogs.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    Nenhum registro de falha ou reserva ainda.
                  </div>
                ) : (
                  sortedLogs.map(log => {
                    const isRes = log.type === 'reserve';
                    const dateObj = new Date(log.timestamp);
                    const dateStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
                    
                    return (
                      <div key={log.id} className="card" style={{ backgroundColor: "rgba(0,0,0,0.2)", position: "relative" }}>
                        <div className="card-body" style={{ padding: "1rem" }}>
                          <button 
                            onClick={() => handleDeleteLog(log.id)}
                            style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>{dateStr}</div>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", paddingRight: "24px" }}>
                            <div style={{ fontWeight: "bold" }}>{log.productName}</div>
                            {isRes ? (
                              <span className="badge" style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>FUNDO (+)</span>
                            ) : (
                              <span className="badge" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>FALHA (-)</span>
                            )}
                          </div>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                              Qtd: <strong style={{ color: "var(--text-light)" }}>{log.qty}x</strong>
                            </div>
                            <div style={{ fontFamily: "monospace", fontSize: "1.2rem", fontWeight: "bold", color: isRes ? "#10b981" : "#ef4444" }}>
                              {isRes ? `+ ${fmt(log.cost)}` : `- ${fmt(log.cost)}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card" style={{ width: "100%", maxWidth: "450px", backgroundColor: "var(--bg-card)", margin: 0 }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Registrar Falha</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={24} /></button>
            </div>
            
            <div className="card-body">
              <div className="input-group">
                <label>Qual produto falhou?</label>
                <div className="input-wrapper">
                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Selecione um produto</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Quantidade falha:</label>
                <div className="input-wrapper">
                  <input 
                    type="number" 
                    value={failQty}
                    onChange={(e) => setFailQty(parseInt(e.target.value) || 1)}
                    min="1" step="1"
                  />
                </div>
              </div>

              <div style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px", marginTop: "24px" }}>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <AlertCircle size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                    O Custo de Produção desta peça será deduzido da sua reserva.
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>Custo a Deduzir:</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace", color: "#ef4444" }}>
                    {fmt(selectedCostPreview)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ backgroundColor: "var(--accent-emerald)" }} onClick={handleSaveFailure}>
                  Salvar Falha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
