"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";
import { usePathname } from "next/navigation";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Product {
  id: string;
  name?: string;
  _type: "single" | "kit";
  values?: {
    filaments?: { id: string; weight: number }[];
    items?: { productId: string; quantity: number }[];
  };
  results?: {
    unitCostTotalFull?: number;
    unitCost?: number;
    unitCostProduction?: number;
  };
}

interface Sale {
  id: string;
  qty: number;
  price: number;
  channel: string;
  costs?: {
    unitCostTotalFull?: number;
    unitCostProduction?: number;
  };
}

interface FilamentAgg {
  id: string;
  name: string;
  pricePerGram: number;
  stockQty: number;
  consumption: number;
  revenue: number;
  profit: number;
  inventory_value?: number;
  turnover?: number;
  criticality?: number;
}

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const CRITERIA = [
  { value: "revenue", label: "Faturamento Relativo" },
  { value: "profit", label: "Lucro Relativo" },
  { value: "consumption", label: "Gramas Consumidas" },
  { value: "inventory_value", label: "Valor em Estoque" },
  { value: "turnover", label: "Giro (Saída)" },
  { value: "criticality", label: "Score de Criticidade" },
];

const formatters: Record<string, (v: number) => string> = {
  inventory_value: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  consumption: (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "g",
  revenue: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  profit: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  turnover: (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "x",
  criticality: (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " pts",
};

export default function CurvaABCFilamentosPage() {
  const [criteria, setCriteria] = useState("inventory_value");
  const [data, setData] = useState<{
    list: (FilamentAgg & { abcClass: string; val: number; pctRef: number; pctAcum: number })[];
    total: number;
    countA: number;
    countB: number;
    countC: number;
  }>({
    list: [],
    total: 0,
    countA: 0,
    countB: 0,
    countC: 0,
  });

  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const { data: dbProducts } = await supabase.from('products').select('*').eq('user_id', user.id);
        const products: Product[] = (dbProducts || []).map((p: any) => ({ ...p, _type: p.type }));
        
        const pMap: Record<string, Product> = {};
        products.forEach((p) => (pMap[p.id] = p));

        const { data: dbFilaments } = await supabase.from('filaments').select('*').eq('user_id', user.id);
        const filaments = dbFilaments || [];
        
        const { data: dbSales } = await supabase.from('sales').select('*').eq('user_id', user.id);
        const sales: Sale[] = [];
        
        (dbSales || []).forEach((sale: any) => {
          sales.push({
            id: sale.product_id,
            qty: sale.quantity || 1,
            price: sale.custom_price || (sale.total_revenue / sale.quantity) || 0,
            channel: sale.marketplace_id ? 'marketplace' : 'direct',
            costs: sale.cost_snapshot
          });
        });

        const [
          { data: dbConsigSales },
          { data: dbConsigInv }
        ] = await Promise.all([
          supabase.from('consignment_sales').select('*').eq('user_id', user.id),
          supabase.from('consignment_inventory').select('*').eq('user_id', user.id),
        ]);
          
        (dbConsigSales || []).forEach((sale: any) => {
          const invItem = (dbConsigInv || []).find((e: any) => String(e.id) === String(sale.inventoryId || sale.inventory_id));
          const prodByName = products.find(p => p.name === (sale.productName || sale.product_name));
          const prodId = (invItem ? (invItem.productId || invItem.product_id) : null) || (prodByName ? prodByName.id : null);
          const qty = parseInt(sale.qty !== undefined ? sale.qty : sale.quantity) || 1;
          const gross = parseFloat(sale.grossValue !== undefined ? sale.grossValue : sale.gross_value) || 0;
          if (prodId) {
            sales.push({
              id: prodId,
              qty: qty,
              price: qty > 0 ? gross / qty : 0,
              channel: 'consignado'
            });
          }
        });

        const getProductFilaments = (productId: string, qtyMultiplier: number): { id: string; weight: number }[] => {
          const p = pMap[productId];
          if (!p) return [];

          if (p._type === "single") {
            const fils = p.values?.filaments || [];
            return fils.map((f: any) => ({ id: f.id, weight: (f.weight || 0) * qtyMultiplier }));
          } else if (p._type === "kit") {
            let kitFils: { id: string; weight: number }[] = [];
            const items = p.values?.items || [];
            items.forEach((item: any) => {
              const childFils = getProductFilaments(item.productId, item.quantity * qtyMultiplier);
              kitFils = kitFils.concat(childFils);
            });
            return kitFils;
          }
          return [];
        };

        const filAgg: Record<string, FilamentAgg> = {};
        filaments.forEach((f: any) => {
          filAgg[f.id] = {
            id: f.id,
            name: `${f.brand} ${f.material} - ${f.color_name}`,
            pricePerGram: (f.price || 0) / (f.weight || 1000),
            stockQty: 0, // Not explicitly available in schema
            consumption: 0,
            revenue: 0,
            profit: 0,
          };
        });

        sales.forEach((sale) => {
          const isMkt = sale.channel === "marketplace";
          let unitCost = 0;

          if (sale.costs) {
            unitCost = isMkt ? sale.costs.unitCostTotalFull || 0 : sale.costs.unitCostProduction || sale.costs.unitCostTotalFull || 0;
          } else if (sale.id && pMap[sale.id] && pMap[sale.id].results) {
            const r = pMap[sale.id].results!;
            unitCost = isMkt ? r.unitCostTotalFull || r.unitCost || 0 : r.unitCostProduction || r.unitCostTotalFull || r.unitCost || 0;
          }

          const rev = sale.price * sale.qty;
          const prof = rev - unitCost * sale.qty;

          const usedFilaments = getProductFilaments(sale.id, sale.qty);
          const totalWeightInSale = usedFilaments.reduce((sum, f) => sum + f.weight, 0);

          usedFilaments.forEach((uf) => {
            if (filAgg[uf.id]) {
              const proportion = totalWeightInSale > 0 ? uf.weight / totalWeightInSale : 0;
              filAgg[uf.id].consumption += uf.weight;
              filAgg[uf.id].revenue += rev * proportion;
              filAgg[uf.id].profit += prof * proportion;
            }
          });
        });

        let dataList = Object.values(filAgg).map((f) => {
          const turnoverVal = f.consumption / (f.stockQty + 1);
          const criticalityVal = turnoverVal * Math.max(0, f.profit);
          return {
            ...f,
            inventory_value: f.stockQty * f.pricePerGram,
            turnover: turnoverVal,
            criticality: criticalityVal,
          };
        });

        dataList.sort((a, b) => (b[criteria as keyof FilamentAgg] as number) - (a[criteria as keyof FilamentAgg] as number));

        let totalMetric = 0;
        dataList.forEach((f) => {
          totalMetric += Math.max(0, f[criteria as keyof FilamentAgg] as number);
        });

        let accumulated = 0;
        let countA = 0, countB = 0, countC = 0;
        const finalData: any[] = [];

        dataList.forEach((f) => {
          const val = Math.max(0, f[criteria as keyof FilamentAgg] as number);
          accumulated += val;
          const pctRef = totalMetric > 0 ? (val / totalMetric) * 100 : 0;
          const pctAcum = totalMetric > 0 ? (accumulated / totalMetric) * 100 : 0;

          let abcClass = "C";
          if (pctAcum <= 80 || (pctAcum > 80 && countA === 0 && val > 0)) {
            abcClass = "A";
            countA++;
          } else if (pctAcum <= 95 || (pctAcum > 95 && countB === 0 && pctAcum < 100 && val > 0)) {
            abcClass = "B";
            countB++;
          } else {
            abcClass = "C";
            countC++;
          }

          if (val === 0 && f.stockQty === 0 && f.consumption === 0) return;

          finalData.push({ ...f, abcClass, val, pctRef, pctAcum });
        });

        setData({
          list: finalData,
          total: totalMetric,
          countA,
          countB,
          countC,
        });
      } catch (err) {
        console.error(err);
      }
    };
    
    loadData();
  }, [criteria, user]);

  const activeLabel = CRITERIA.find((c) => c.value === criteria)?.label || "";
  const formatter = formatters[criteria] || ((v: number) => v.toString());

  const chartData = useMemo(() => {
    const topItems = data.list.slice(0, 10);
    return {
      labels: topItems.map((item) => item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name),
      datasets: [
        {
          label: activeLabel,
          data: topItems.map((item) => item.val),
          backgroundColor: topItems.map((item) => {
            if (item.abcClass === "A") return "rgba(74, 222, 128, 0.8)";
            if (item.abcClass === "B") return "rgba(250, 204, 21, 0.8)";
            return "rgba(248, 113, 113, 0.8)";
          }),
          borderColor: topItems.map((item) => {
            if (item.abcClass === "A") return "#4ade80";
            if (item.abcClass === "B") return "#facc15";
            return "#f87171";
          }),
          borderWidth: 1,
        },
      ],
    };
  }, [data.list, activeLabel]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += formatter(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          callback: function (value: any) {
            return formatter(value);
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
    },
  };
  return (
    <AppLayout title="Curva ABC (Filamentos)" subtitle="Análise de Pareto para o seu consumo de material e estoque">
      <div className="dashboard-grid">
        
        {/* Controls Row */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
              <div className="toggle-group">
                <Link href="/curva_abc" className="toggle-btn">
                  Curva ABC (Produtos)
                </Link>
                <Link href="/curva_abc_filamentos" className="toggle-btn active">
                  Curva ABC (Filamentos)
                </Link>
              </div>

              <div className="input-group" style={{ flexDirection: "row", alignItems: "center", margin: 0, gap: "1rem" }}>
                <label htmlFor="abcCriteria" style={{ margin: 0, whiteSpace: "nowrap" }}>Critério de Análise:</label>
                <div className="input-wrapper">
                  <select
                    id="abcCriteria"
                    value={criteria}
                    onChange={(e) => setCriteria(e.target.value)}
                  >
                    {CRITERIA.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
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
                {activeLabel} Total
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--text-light)", marginTop: "0.5rem" }} title={formatter(data.total)}>
                {formatter(data.total)}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(34, 197, 94, 0.4)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Itens Classe A (80%)
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#4ade80", marginTop: "0.5rem" }}>
                {data.countA}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(234, 179, 8, 0.4)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Itens Classe B (15%)
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#facc15", marginTop: "0.5rem" }}>
                {data.countB}
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}>
            <div className="card-body text-center" style={{ padding: "var(--space-md)" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
                Itens Classe C (5%)
              </span>
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#f87171", marginTop: "0.5rem" }}>
                {data.countC}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        {data.list.length > 0 && (
          <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
            <div className="card">
              <div className="card-header">
                <h2>Top 10 Filamentos - {activeLabel}</h2>
              </div>
              <div className="card-body" style={{ height: "400px" }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="dashboard-column" style={{ gridColumn: "1 / -1" }}>
          <div className="card">
            <div className="card-header">
              <h2>Classificação de Filamentos</h2>
            </div>
            <div className="card-body" style={{ overflowX: "auto", padding: 0 }}>
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Filamento</th>
                    <th className="text-center">Classe</th>
                    <th className="text-right">Qtd. Vendida</th>
                    <th className="text-right">{activeLabel}</th>
                    <th className="text-right">% Ref.</th>
                    <th className="text-right">% Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.list.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        Nenhum dado encontrado para gerar a curva ABC.
                      </td>
                    </tr>
                  ) : (
                    data.list.map((item, i) => (
                      <tr key={i}>
                        <td className="font-semibold">{item.name}</td>
                        <td className="text-center">
                          <span className="badge" style={{
                            backgroundColor: item.abcClass === 'A' ? 'rgba(34, 197, 94, 0.15)' : item.abcClass === 'B' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: item.abcClass === 'A' ? '#4ade80' : item.abcClass === 'B' ? '#facc15' : '#f87171',
                            border: `1px solid ${item.abcClass === 'A' ? 'rgba(34, 197, 94, 0.3)' : item.abcClass === 'B' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                          }}>
                            {item.abcClass}
                          </span>
                        </td>
                        <td className="text-right font-mono">{fGram(item.stockQty)}</td>
                        <td className="text-right font-mono">{formatter(item.val)}</td>
                        <td className="text-right font-mono" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <span>{item.pctRef.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                          <div style={{ width: "80px", height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              backgroundColor: item.abcClass === 'A' ? '#4ade80' : item.abcClass === 'B' ? '#facc15' : '#f87171',
                              width: `${Math.min(item.pctRef, 100)}%`
                            }} />
                          </div>
                        </td>
                        <td className="text-right font-mono">{item.pctAcum.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

const fGram = (val: number) => val.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "g";
