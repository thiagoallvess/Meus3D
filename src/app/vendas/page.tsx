"use client";

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  TrendingUp, Trophy, PieChart, Activity, Trash2, Download,
  ClipboardList, DollarSign, ShoppingCart, BarChart3, CalendarDays,
  ArrowUpRight, ArrowDownRight, Hash, Package, Banknote
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

interface SaleItem {
  orderId: string | number;
  itemId: string;
  productId: string;
  productName: string;
  type: string;
  qty: number;
  price: number;
  channel: string;
  date: string;
  unitCost: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  note?: string;
}

export default function VendasPage() {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'direct' | 'marketplace' | 'consignado'>('all');
  const { user } = useAuth();

  useEffect(() => { 
    if (user) {
      loadSales(); 
    }
  }, [user]);

  const loadSales = async () => {
    if (!user) return;
    try {
      const [
        { data: salesData, error: salesError },
        { data: productsData, error: productsError },
        { data: consigSalesData },
        { data: consigInvData }
      ] = await Promise.all([
        supabase.from('sales').select('*').eq('user_id', user.id),
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('consignment_sales').select('*').eq('user_id', user.id),
        supabase.from('consignment_inventory').select('*').eq('user_id', user.id),
      ]);
      if (salesError) throw salesError;
      if (productsError) throw productsError;

      const raw = salesData || [];
      const flat: SaleItem[] = [];
      const products = productsData || [];
      const pMap: Record<string, any> = {};
      products.forEach((p: any) => { pMap[p.id] = p; });

      raw.forEach((order: any) => {
        const orderDate = order.timestamp ? order.timestamp.split('T')[0] : (order.date ? order.date.split('T')[0] : new Date().toISOString().split('T')[0]);
        (order.items || []).forEach((item: any, idx: number) => {
          const qty = item.qty || 1;
          const price = item.price || 0;
          const revenue = price * qty;
          const isMkt = (item.channel === 'marketplace');
          let unitCost = 0;
          if (item.costs) { unitCost = isMkt ? (item.costs.unitCostTotalFull || 0) : (item.costs.unitCostProduction || item.costs.unitCostTotalFull || 0); }
          if (unitCost === 0 && pMap[item.id] && pMap[item.id].results) {
            const r = pMap[item.id].results;
            unitCost = isMkt ? (r.unitCostTotalFull || r.unitCost || 0) : (r.unitCostProduction || r.unitCostTotalFull || r.unitCost || 0);
          }
          const cost = unitCost * qty;
          const profit = revenue - cost;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
          flat.push({ orderId: order.id, itemId: `${order.id}_${idx}`, productId: item.id, productName: item.name || 'Produto', type: item.type || 'single', qty, price, channel: item.channel || 'direct', date: orderDate, unitCost, revenue, cost, profit, margin, note: order.note || item.note });
        });
      });

      // Process consignment sales from Supabase
      (consigSalesData || []).forEach((v: any, idx: number) => {
        const invItem = (consigInvData || []).find((e: any) => String(e.id) === String(v.inventoryId || v.inventory_id) || (e.productName || e.product_name) === (v.productName || v.product_name));
        const pId = invItem ? (invItem.productId || invItem.product_id) : null;
        let unitCost = 0;
        if (pId && pMap[pId] && pMap[pId].results) {
          unitCost = pMap[pId].results.unitCostProduction || pMap[pId].results.unitCostTotalFull || pMap[pId].results.unitCost || 0;
        } else {
          const prodByName = products.find((p: any) => p.name === (v.productName || v.product_name));
          if (prodByName && prodByName.results) {
            unitCost = prodByName.results.unitCostProduction || prodByName.results.unitCostTotalFull || prodByName.results.unitCost || 0;
          }
        }
        const qty = parseInt(v.qty !== undefined ? v.qty : v.quantity) || 1;
        const revenue = parseFloat(v.grossValue !== undefined ? v.grossValue : v.gross_value) || 0;
        const netValue = parseFloat(v.netValue !== undefined ? v.netValue : v.net_value) || (revenue * 0.8);
        const price = qty > 0 ? (revenue / qty) : 0;
        const commissionCost = Math.max(0, revenue - netValue);
        const cost = (unitCost * qty) + commissionCost;
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const rawDate = v.date || v.sale_date || v.created_at || new Date().toISOString();
        const orderDate = rawDate.split('T')[0];
        flat.push({
          orderId: v.id,
          itemId: `csg_${v.id}_${idx}`,
          productId: pId,
          productName: v.productName || v.product_name || 'Produto Consignado',
          type: 'single',
          qty,
          price,
          channel: 'consignado',
          date: orderDate,
          unitCost,
          revenue,
          cost,
          profit,
          margin,
          note: v.status ? `Consignado (${v.status})` : 'Consignado'
        });
      });

      setSales(flat);
    } catch (e) { console.error('Error loading sales:', e); }
  };

  const deleteSale = async (orderId: string | number, channel: string) => {
    if (channel === 'consignado') { alert('Vendas consignadas devem ser removidas na página de consignados.'); return; }
    if (!confirm('Remover esta ordem de venda do histórico?')) return;
    if (!user) return;
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', orderId)
        .eq('user_id', user.id);
      if (error) throw error;
      loadSales();
    } catch (e) { console.error(e); }
  };

  const filteredSales = useMemo(() => filter === 'all' ? sales : sales.filter(s => s.channel === filter), [sales, filter]);

  const totalRevenue = sales.reduce((a, s) => a + s.revenue, 0);
  const totalProfit = sales.reduce((a, s) => a + s.profit, 0);
  const totalUnits = sales.reduce((a, s) => a + s.qty, 0);
  const avgMargin = sales.length > 0 ? sales.reduce((a, s) => a + s.margin, 0) / sales.length : 0;
  const ticket = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthSales = sales.filter(s => s.date.startsWith(monthStr));
  const monthRevenue = monthSales.reduce((a, s) => a + s.revenue, 0);
  const monthProfit = monthSales.reduce((a, s) => a + s.profit, 0);

  const top10 = useMemo(() => {
    const map: Record<string, { name: string, type: string, qty: number, revenue: number, profit: number }> = {};
    sales.forEach(s => {
      if (!map[s.productId]) map[s.productId] = { name: s.productName, type: s.type, qty: 0, revenue: 0, profit: 0 };
      map[s.productId].qty += s.qty;
      map[s.productId].revenue += s.revenue;
      map[s.productId].profit += s.profit;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [sales]);
  const maxTopQty = top10.length > 0 ? top10[0].qty : 1;

  const revenueChartData = useMemo(() => {
    const days = 30; const labels: string[] = []; const dataR: number[] = []; const dataP: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      labels.push(i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
      const daySales = sales.filter(s => s.date === key);
      dataR.push(daySales.reduce((a, s) => a + s.revenue, 0));
      dataP.push(daySales.reduce((a, s) => a + s.profit, 0));
    }
    return {
      labels,
      datasets: [
        { label: 'Receita', data: dataR, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 6, borderWidth: 2 },
        { label: 'Lucro', data: dataP, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)', fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 6, borderWidth: 2 },
      ]
    };
  }, [sales]);

  const channelChartData = useMemo(() => {
    const chData: Record<string, number> = {};
    sales.forEach(s => { chData[s.channel] = (chData[s.channel] || 0) + s.revenue; });
    const labelsMap: Record<string, string> = { direct: 'Venda Direta', marketplace: 'Marketplace', consignado: 'Consignado' };
    return {
      labels: Object.keys(chData).map(k => labelsMap[k] || k),
      datasets: [{ data: Object.values(chData), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'], borderWidth: 0 }]
    };
  }, [sales]);

  const exportCSV = () => {
    const headers = ['Data', 'Produto', 'Qtd', 'Preço Unit.', 'Receita', 'Lucro', 'Margem (%)', 'Canal'];
    const rows = filteredSales.map(s => [s.date, s.productName, s.qty, s.price.toFixed(2), s.revenue.toFixed(2), s.profit.toFixed(2), s.margin.toFixed(2), s.channel]);
    const csv = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vendas.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fmtR = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const chLabels: Record<string, string> = { direct: 'Direta', marketplace: 'Marketplace', consignado: 'Consignado' };

  /* ── STYLES ── */
  const kpiCard = (gradient: string, border: string): React.CSSProperties => ({
    background: gradient,
    border: `1px solid ${border}`,
    borderRadius: '20px',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  });

  const kpiIcon = (bg: string, color: string): React.CSSProperties => ({
    padding: '10px', borderRadius: '14px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  const kpiLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' };
  const kpiValue = (color: string): React.CSSProperties => ({ fontSize: '1.6rem', fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.02em' });
  const kpiSub: React.CSSProperties = { fontSize: '11px', color: '#6b7280', marginTop: '4px' };

  const sectionCard: React.CSSProperties = {
    background: 'rgba(15,17,35,0.7)',
    border: '1px solid rgba(55,65,81,0.4)',
    borderRadius: '20px',
    padding: '28px',
  };

  const sectionTitle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '15px', fontWeight: 700, color: '#f3f4f6', marginBottom: '24px',
  };

  return (
    <AppLayout title="Registro de Vendas" subtitle="Histórico, análise e top produtos">

      {/* ═══ KPI CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>

        <div style={kpiCard('linear-gradient(135deg, rgba(16,185,129,0.12), rgba(20,184,166,0.05))', 'rgba(16,185,129,0.25)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={kpiIcon('rgba(16,185,129,0.15)', '#34d399')}><Banknote size={18} /></div>
            <span style={kpiLabel}>Receita Total</span>
          </div>
          <div style={kpiValue('#34d399')}>{fmtR(totalRevenue)}</div>
          <div style={kpiSub}>{sales.length} venda{sales.length !== 1 ? 's' : ''} registrada{sales.length !== 1 ? 's' : ''}</div>
        </div>

        <div style={kpiCard('linear-gradient(135deg, rgba(99,102,241,0.12), rgba(129,140,248,0.05))', 'rgba(99,102,241,0.25)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={kpiIcon('rgba(99,102,241,0.15)', '#818cf8')}><TrendingUp size={18} /></div>
            <span style={kpiLabel}>Lucro Total</span>
          </div>
          <div style={kpiValue(totalProfit >= 0 ? '#818cf8' : '#f87171')}>{fmtR(totalProfit)}</div>
          <div style={kpiSub}>Margem média: {avgMargin.toFixed(1).replace('.', ',')}%</div>
        </div>

        <div style={kpiCard('linear-gradient(135deg, rgba(251,146,60,0.12), rgba(249,115,22,0.05))', 'rgba(251,146,60,0.25)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={kpiIcon('rgba(251,146,60,0.15)', '#fb923c')}><ShoppingCart size={18} /></div>
            <span style={kpiLabel}>Unidades Vendidas</span>
          </div>
          <div style={kpiValue('#fb923c')}>{totalUnits}</div>
          <div style={kpiSub}>Ticket médio: {fmtR(ticket)}</div>
        </div>

        <div style={kpiCard('linear-gradient(135deg, rgba(168,85,247,0.12), rgba(192,132,252,0.05))', 'rgba(168,85,247,0.25)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={kpiIcon('rgba(168,85,247,0.15)', '#c084fc')}><CalendarDays size={18} /></div>
            <span style={kpiLabel}>Mês Atual</span>
          </div>
          <div style={kpiValue('#c084fc')}>{fmtR(monthRevenue)}</div>
          <div style={kpiSub}>{monthSales.length} venda{monthSales.length !== 1 ? 's' : ''} • Lucro: {fmtR(monthProfit)}</div>
        </div>
      </div>

      {/* ═══ TOP 10 ═══ */}
      <div style={{ ...sectionCard, marginBottom: '28px' }}>
        <div style={sectionTitle}>
          <div style={kpiIcon('rgba(251,191,36,0.15)', '#fbbf24')}><Trophy size={18} /></div>
          Top 10 Mais Vendidos
        </div>
        {top10.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
            <Package size={40} style={{ color: '#374151', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#9ca3af' }}>Nenhuma venda registrada ainda</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {top10.map((item, i) => {
              const rank = i + 1;
              const barW = (item.qty / maxTopQty) * 100;
              const medalColors = ['linear-gradient(135deg, #f59e0b, #fbbf24)', 'linear-gradient(135deg, #94a3b8, #cbd5e1)', 'linear-gradient(135deg, #ea580c, #f97316)'];
              const medalStyle: React.CSSProperties = rank <= 3
                ? { background: medalColors[rank-1], color: rank === 2 ? '#1e293b' : '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#6b7280' };

              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px', borderRadius: '14px',
                  background: rank <= 3 ? 'rgba(99,102,241,0.04)' : 'transparent',
                  border: rank <= 3 ? '1px solid rgba(99,102,241,0.1)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    minWidth: '32px', height: '32px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 900, fontFamily: 'monospace',
                    ...medalStyle,
                  }}>
                    {rank}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
                      {item.type === 'kit' ? 'Kit' : 'Peça Única'}
                    </div>
                  </div>

                  {/* bar */}
                  <div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barW}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>

                  <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 800, color: '#e5e7eb', minWidth: '36px', textAlign: 'right' }}>
                    {item.qty}
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', minWidth: '90px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {fmtR(item.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CHARTS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={sectionCard}>
          <div style={sectionTitle}>
            <div style={kpiIcon('rgba(99,102,241,0.15)', '#818cf8')}><BarChart3 size={18} /></div>
            Receita & Lucro — Últimos 30 Dias
          </div>
          <div style={{ height: '220px', position: 'relative' }}>
            <Line data={revenueChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { position: 'top', labels: { color: '#9ca3af', font: { size: 11 }, usePointStyle: true, pointStyle: 'circle', padding: 16 } } },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 9 }, maxRotation: 0, maxTicksLimit: 8 } }
              }
            }} />
          </div>
        </div>

        <div style={sectionCard}>
          <div style={sectionTitle}>
            <div style={kpiIcon('rgba(168,85,247,0.15)', '#c084fc')}><PieChart size={18} /></div>
            Vendas por Canal
          </div>
          <div style={{ height: '220px', position: 'relative', display: 'flex', justifyContent: 'center' }}>
            {sales.length > 0 ? (
              <Doughnut data={channelChartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 11 }, usePointStyle: true, pointStyle: 'circle', padding: 14 } } },
                cutout: '72%'
              }} />
            ) : (
              <div style={{ alignSelf: 'center', color: '#6b7280', fontSize: '13px' }}>Sem dados de canais</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ HISTORY TABLE ═══ */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={sectionTitle as any}>
            <div style={kpiIcon('rgba(99,102,241,0.15)', '#818cf8')}><ClipboardList size={18} /></div>
            <span>Histórico de Vendas</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            {(['all', 'direct', 'marketplace', 'consignado'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '7px 16px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 700, transition: 'all 0.2s',
                  background: filter === f ? '#6366f1' : 'rgba(255,255,255,0.05)',
                  color: filter === f ? 'white' : '#9ca3af',
                  boxShadow: filter === f ? '0 3px 12px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                {f === 'all' ? 'Todos' : f === 'direct' ? 'Direta' : f === 'marketplace' ? 'Marketplace' : 'Consignado'}
              </button>
            ))}

            <button onClick={exportCSV} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '10px', cursor: 'pointer',
              border: '1px solid rgba(75,85,99,0.4)', background: 'rgba(255,255,255,0.04)',
              color: '#9ca3af', fontSize: '11px', fontWeight: 600, transition: 'all 0.2s',
            }}>
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(55,65,81,0.5)' }}>
                {['Data', 'Produto', 'Qtd', 'Preço', 'Receita', 'Lucro', 'Margem', 'Canal', 'Obs.', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center', color: '#6b7280' }}>
                    <ClipboardList size={36} style={{ color: '#374151', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600, color: '#9ca3af' }}>Nenhuma venda encontrada</div>
                  </td>
                </tr>
              ) : (
                [...filteredSales].sort((a, b) => {
                  const diff = Number(b.orderId) - Number(a.orderId);
                  return Number.isNaN(diff) ? String(b.orderId).localeCompare(String(a.orderId)) : diff;
                }).map(s => {
                  const profitColor = s.profit >= 0 ? '#34d399' : '#f87171';
                  const chColor = s.channel === 'marketplace' ? { bg: 'rgba(251,146,60,0.15)', fg: '#fb923c' }
                    : s.channel === 'consignado' ? { bg: 'rgba(168,85,247,0.15)', fg: '#c084fc' }
                    : { bg: 'rgba(16,185,129,0.15)', fg: '#34d399' };
                  const dateObj = new Date(s.date + 'T12:00:00');

                  return (
                    <tr key={s.itemId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{dateObj.toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f3f4f6', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.productName}>{s.productName}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#e5e7eb' }}>{s.qty}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#9ca3af' }}>{fmtR(s.price)}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#e5e7eb' }}>{fmtR(s.revenue)}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: profitColor }}>{fmtR(s.profit)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: profitColor }}>{(s.margin||0).toFixed(1).replace('.', ',')}%</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: chColor.bg, color: chColor.fg }}>
                          {chLabels[s.channel] || s.channel}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: '#6b7280', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.note}>{s.note || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => deleteSale(s.orderId, s.channel)} title="Remover" style={{
                          padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: 'rgba(239,68,68,0.08)', color: '#f87171', transition: 'all 0.15s',
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </AppLayout>
  );
}
