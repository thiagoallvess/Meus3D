"use client";

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Activity, DollarSign, Package, Scale, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import Link from 'next/link';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const CRITERIA = {
  revenue: { label: 'Faturamento (Receita Bruta)', icon: DollarSign },
  profit: { label: 'Lucro (Margem Bruta)', icon: Activity },
  volume: { label: 'Quantidade Vendida (Volume)', icon: Package },
  inventory_value: { label: 'Valor Retido em Estoque', icon: DollarSign },
  raw_material: { label: 'Consumo de Matéria Prima (Filamento)', icon: Scale },
  turnover: { label: 'Giro de Estoque', icon: RefreshCw },
};

type CriteriaKey = keyof typeof CRITERIA;

type SaleItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  channel: string;
  costs?: any;
};

type AggregatedProduct = {
  id: string;
  name: string;
  qtySold: number;
  revenue: number;
  profit: number;
  stockQty: number;
  unitCost: number;
  weight: number;
  inventory_value: number;
  raw_material: number;
  turnover: number;
};

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const fCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fNum = (val: number) => val.toLocaleString('pt-BR');
const fPct = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const fGram = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + 'g';
const fFloat = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatByCriteria = (val: number, criteria: string) => {
  if (criteria === 'revenue' || criteria === 'profit' || criteria === 'inventory_value') return fCurrency(val);
  if (criteria === 'volume') return fNum(val);
  if (criteria === 'raw_material') return fGram(val);
  if (criteria === 'turnover') return fFloat(val) + 'x';
  return String(val);
};

export default function CurvaABCPage() {
  const [criteria, setCriteria] = useState<CriteriaKey>('revenue');
  const [rawData, setRawData] = useState<AggregatedProduct[] | null>(null);

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch products
        const { data: dbProducts } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id);
          
        const products = (dbProducts || []).map(p => ({
          ...p,
          _type: p.type
        }));

        // Fetch sales
        const [
          { data: dbSales },
          { data: dbConsigSales },
          { data: dbConsigInv }
        ] = await Promise.all([
          supabase.from('sales').select('*').eq('user_id', user.id),
          supabase.from('consignment_sales').select('*').eq('user_id', user.id),
          supabase.from('consignment_inventory').select('*').eq('user_id', user.id),
        ]);

        const flatSales: SaleItem[] = [];
        
        (dbSales || []).forEach((sale: any) => {
          flatSales.push({
            id: sale.product_id,
            name: products.find(p => p.id === sale.product_id)?.name || 'Desconhecido',
            qty: sale.quantity || 1,
            price: sale.custom_price || (sale.total_revenue / (sale.quantity || 1)) || 0,
            channel: sale.marketplace_id ? 'marketplace' : 'direct',
            costs: sale.cost_snapshot
          });
        });

        (dbConsigSales || []).forEach((sale: any) => {
          const invItem = (dbConsigInv || []).find((e: any) => String(e.id) === String(sale.inventoryId || sale.inventory_id));
          const prodByName = products.find(p => p.name === (sale.productName || sale.product_name));
          const prodId = (invItem ? (invItem.productId || invItem.product_id) : null) || (prodByName ? prodByName.id : null);
          const name = sale.productName || sale.product_name || (prodByName ? prodByName.name : 'Consignado');
          const qty = parseInt(sale.qty !== undefined ? sale.qty : sale.quantity) || 1;
          const gross = parseFloat(sale.grossValue !== undefined ? sale.grossValue : sale.gross_value) || 0;
          flatSales.push({
            id: prodId || 'unknown',
            name: name,
            qty: qty,
            price: qty > 0 ? gross / qty : 0,
            channel: 'consignado',
            costs: null
          });
        });

        const pMap: Record<string, any> = {};
        products.forEach(p => { pMap[p.id] = p; });
        
        const productAgg: Record<string, AggregatedProduct> = {};
        
        products.forEach(p => {
          const r = p.results || {};
          let unitCost = p._type === 'single' ? (r.unitCostProduction || r.unitCost || 0) : (r.unitCostTotalFull || r.unitCost || 0);
          let weight = r.totalWeight || r.filamentWeight || 0;
          
          productAgg[p.id] = {
            id: p.id,
            name: p.name,
            qtySold: 0,
            revenue: 0,
            profit: 0,
            stockQty: p.stock || 0,
            unitCost: unitCost,
            weight: weight,
            inventory_value: 0,
            raw_material: 0,
            turnover: 0
          };
        });
        
        flatSales.forEach(sale => {
          const isMkt = (sale.channel === 'marketplace');
          let unitCost = 0;
          
          if (sale.costs) {
            unitCost = isMkt ? (sale.costs.unitCostTotalFull || 0) : (sale.costs.unitCostProduction || sale.costs.unitCostTotalFull || 0);
          } else if (sale.id && pMap[sale.id] && pMap[sale.id].results) {
            const r = pMap[sale.id].results;
            unitCost = isMkt ? (r.unitCostTotalFull || r.unitCost || 0) : (r.unitCostProduction || r.unitCostTotalFull || r.unitCost || 0);
          }
          
          const rev = sale.price * sale.qty;
          const cost = unitCost * sale.qty;
          const prof = rev - cost;
          
          const key = sale.id || sale.name; // Fallback
          
          if (!productAgg[key]) {
            productAgg[key] = {
              id: key, name: sale.name, qtySold: 0, revenue: 0, profit: 0,
              stockQty: 0, unitCost: unitCost, weight: 0, inventory_value: 0, raw_material: 0, turnover: 0
            };
          }
          
          productAgg[key].qtySold += sale.qty;
          productAgg[key].revenue += rev;
          productAgg[key].profit += prof;
        });
        
        const dataList = Object.values(productAgg).map(p => ({
          ...p,
          inventory_value: p.stockQty * p.unitCost,
          raw_material: p.qtySold * p.weight,
          turnover: p.qtySold / (p.stockQty + 1)
        }));
        
        setRawData(dataList);
      } catch (err) {
        console.error('Error loading ABC data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const analyzedData = useMemo(() => {
    if (!rawData) return { list: [], total: 0, kpis: { total: 0, a: 0, b: 0, c: 0 } };
    
    const sorted = [...rawData].sort((a, b) => (b as any)[criteria] - (a as any)[criteria]);
    
    let totalMetric = 0;
    sorted.forEach(p => { totalMetric += Math.max(0, (p as any)[criteria]); });
    
    let accumulated = 0;
    let countA = 0, countB = 0, countC = 0;
    
    const processedList = sorted.map(prod => {
      const val = Math.max(0, (prod as any)[criteria]);
      accumulated += val;
      
      const pctRef = totalMetric > 0 ? (val / totalMetric) * 100 : 0;
      const pctAcum = totalMetric > 0 ? (accumulated / totalMetric) * 100 : 0;
      
      let abcClass = 'C';
      
      if (pctAcum <= 80 || (pctAcum > 80 && countA === 0 && val > 0)) {
        abcClass = 'A';
        countA++;
      } else if (pctAcum <= 95 || (pctAcum > 95 && countB === 0 && pctAcum < 100 && val > 0)) {
        abcClass = 'B';
        countB++;
      } else {
        abcClass = 'C';
        countC++;
      }
      
      return { ...prod, val, pctRef, pctAcum, abcClass };
    }).filter(p => p.val > 0 || p.qtySold > 0 || p.stockQty > 0); // Omit absolutely inactive
    
    return {
      list: processedList,
      total: totalMetric,
      kpis: { total: totalMetric, a: countA, b: countB, c: countC }
    };
  }, [rawData, criteria]);

  const chartData = useMemo(() => {
    // Show top 50 items at most in chart to avoid clutter
    const displayList = analyzedData.list.slice(0, 50);
    const labels = displayList.map(p => p.name);
    const dataValues = displayList.map(p => p.val);
    const dataPct = displayList.map(p => p.pctAcum);
    const colors = displayList.map(p => 
      p.abcClass === 'A' ? 'rgba(34, 197, 94, 0.7)' : 
      p.abcClass === 'B' ? 'rgba(234, 179, 8, 0.7)' : 
      'rgba(239, 68, 68, 0.7)'
    );

    return {
      labels,
      datasets: [
        {
          type: 'line' as const,
          label: '% Acumulado',
          data: dataPct,
          borderColor: '#6366f1',
          borderWidth: 2,
          pointBackgroundColor: '#6366f1',
          yAxisID: 'y1',
          tension: 0.1,
          fill: false,
        },
        {
          type: 'bar' as const,
          label: CRITERIA[criteria].label,
          data: dataValues,
          backgroundColor: colors,
          yAxisID: 'y',
        }
      ]
    };
  }, [analyzedData, criteria]);

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)', maxRotation: 45, minRotation: 0 }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        min: 0,
        max: 100,
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          callback: function(value: any) { return value + '%'; }
        }
      },
    },
    plugins: {
      legend: {
        labels: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.datasetIndex === 0) {
              label += fPct(context.parsed.y);
            } else {
              label += formatByCriteria(context.parsed.y, criteria);
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <AppLayout title="Curva ABC (Produtos)" subtitle="Análise de Pareto para otimização do seu estoque e vendas">
      <div className="dashboard-grid">
        
        {/* Controls Row */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
              <div className="toggle-group">
                <Link href="/curva_abc" className="toggle-btn active">
                  Curva ABC (Produtos)
                </Link>
                <Link href="/curva_abc_filamentos" className="toggle-btn">
                  Curva ABC (Filamentos)
                </Link>
              </div>

              <div className="input-group" style={{ flexDirection: "row", alignItems: "center", margin: 0, gap: "1rem" }}>
                <label htmlFor="abcCriteria" style={{ margin: 0, whiteSpace: "nowrap" }}>Critério de Análise:</label>
                <div className="input-wrapper">
                  <select 
                    id="abcCriteria"
                    value={criteria}
                    onChange={(e) => setCriteria(e.target.value as CriteriaKey)}
                  >
                    {Object.entries(CRITERIA).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-md)" }}>
          <div className="card">
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                {CRITERIA[criteria].label} Total
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--text-light)", marginTop: "0.5rem" }}>
                {formatByCriteria(analyzedData.kpis.total, criteria)}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(34, 197, 94, 0.4)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Itens Classe A (80%)
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#4ade80", marginTop: "0.5rem" }}>
                {analyzedData.kpis.a}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(234, 179, 8, 0.4)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Itens Classe B (15%)
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#facc15", marginTop: "0.5rem" }}>
                {analyzedData.kpis.b}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Itens Classe C (5%)
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#f87171", marginTop: "0.5rem" }}>
                {analyzedData.kpis.c}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        {analyzedData.list.length > 0 && (
          <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
            <div className="card">
              <div className="card-header">
                <h2>Gráfico de Pareto</h2>
              </div>
              <div className="card-body" style={{ height: "400px" }}>
                <Chart type="bar" data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div className="card">
            <div className="card-header">
              <h2>Classificação de Produtos</h2>
            </div>
            <div className="card-body" style={{ overflowX: "auto", padding: 0 }}>
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Produto</th>
                    <th className="text-center">Classe</th>
                    <th className="text-right">Qtd. Vendida</th>
                    <th className="text-right">{CRITERIA[criteria].label}</th>
                    <th className="text-right">% Ref.</th>
                    <th className="text-right">% Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {analyzedData.list.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        Nenhum dado encontrado para gerar a curva ABC.
                      </td>
                    </tr>
                  )}
                  {analyzedData.list.map((p, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{p.name}</td>
                      <td className="text-center">
                        <span className="badge" style={{
                          backgroundColor: p.abcClass === 'A' ? 'rgba(34, 197, 94, 0.15)' : p.abcClass === 'B' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: p.abcClass === 'A' ? '#4ade80' : p.abcClass === 'B' ? '#facc15' : '#f87171',
                          border: `1px solid ${p.abcClass === 'A' ? 'rgba(34, 197, 94, 0.3)' : p.abcClass === 'B' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.375rem',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>
                          {p.abcClass}
                        </span>
                      </td>
                      <td className="text-right font-mono">{fNum(p.qtySold)}</td>
                      <td className="text-right font-mono">{formatByCriteria(p.val, criteria)}</td>
                      <td className="text-right font-mono" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                        <span>{fPct(p.pctRef)}</span>
                        <div style={{ width: "80px", height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            backgroundColor: p.abcClass === 'A' ? '#4ade80' : p.abcClass === 'B' ? '#facc15' : '#f87171',
                            width: `${Math.min(p.pctRef, 100)}%`
                          }} />
                        </div>
                      </td>
                      <td className="text-right font-mono">{fPct(p.pctAcum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
