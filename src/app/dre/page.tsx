"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Percent, FileText, BarChart3 } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SaleItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  channel: string;
  costs?: any;
}

interface Sale {
  id: string;
  timestamp: string;
  client: string;
  items: SaleItem[];
  shipping?: number;
  taxes?: number;
}

interface ConsignedSale {
  id: string;
  date: string;
  productName: string;
  grossValue: number;
  netValue: number;
  quantity: number;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  value: number;
}

export default function DREPage() {
  const { user } = useAuth();
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [consignedSales, setConsignedSales] = useState<ConsignedSale[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expDate, setExpDate] = useState("");
  const [expValue, setExpValue] = useState("");

  useEffect(() => {
    setIsClient(true);
    
    const d = new Date();
    setMonthFilter(d.getMonth().toString());
    setYearFilter(d.getFullYear().toString());
  }, []);

  const [productsList, setProductsList] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [salesRes, expensesRes, consignedRes, productsRes] = await Promise.all([
        supabase.from('sales').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id),
        supabase.from('consignment_sales').select('*').eq('user_id', user.id),
        supabase.from('products').select('*').eq('user_id', user.id)
      ]);
      if (!salesRes.error && salesRes.data) {
        setSales(salesRes.data);
      }
      if (!expensesRes.error && expensesRes.data) {
        setExpenses(expensesRes.data);
      }
      if (!productsRes.error && productsRes.data) {
        setProductsList(productsRes.data);
      }
      if (!consignedRes.error && consignedRes.data) {
        setConsignedSales(consignedRes.data.map((s: any) => ({
          id: s.id,
          date: s.date || s.sale_date || s.created_at || new Date().toISOString(),
          productName: s.productName || s.product_name || "Consignado",
          grossValue: parseFloat(s.grossValue !== undefined ? s.grossValue : s.gross_value) || 0,
          netValue: parseFloat(s.netValue !== undefined ? s.netValue : s.net_value) || 0,
          quantity: parseInt(s.qty !== undefined ? s.qty : s.quantity) || 1
        })));
      }
    };
    fetchData();
  }, [user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc || !expDate || !expValue || !user) return;

    const newExp = {
      description: expDesc,
      date: expDate,
      value: parseFloat(expValue),
      user_id: user.id
    };
    
    const { data, error } = await supabase.from('expenses').insert([newExp]).select();
    
    if (!error && data) {
      setExpenses([...expenses, data[0]]);
    }
    
    setIsExpenseModalOpen(false);
    setExpDesc("");
    setExpDate("");
    setExpValue("");
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    if (confirm("Excluir esta despesa?")) {
      setExpenses(expenses.filter(e => e.id !== id));
      await supabase.from('expenses').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  const filteredData = useMemo(() => {
    const filterByDate = (dateStr: string) => {
      if (monthFilter === "all" && yearFilter === "all") return true;
      const d = new Date(dateStr);
      if (yearFilter !== "all" && d.getFullYear().toString() !== yearFilter) return false;
      if (monthFilter !== "all" && d.getMonth().toString() !== monthFilter) return false;
      return true;
    };

    return {
      sales: sales.filter(s => filterByDate(s.timestamp)),
      expenses: expenses.filter(e => filterByDate(e.date)),
      consigned: consignedSales.filter(c => filterByDate(c.date))
    };
  }, [sales, expenses, consignedSales, monthFilter, yearFilter]);

  const dre = useMemo(() => {
    let recDireta = 0;
    let recMkt = 0;
    let recConsig = 0;
    let cpv = 0;
    let cpvFilamento = 0;
    let cpvEnergia = 0;
    let cpvMaquina = 0;
    let cpvPos = 0;
    let cpvDesign = 0;
    let cpvFalha = 0;
    let cpvEmbalagem = 0;
    let cpvOutros = 0;
    let taxasMkt = 0;
    let comissaoConsig = 0;
    let totalFrete = 0;

    const getItemCosts = (item: any) => {
      let c = item.costs || item.results;
      let prod: any = null;

      if (!c) {
        prod = productsList.find((p: any) => 
          (item.id && String(p.id) === String(item.id)) || 
          (item.productId && String(p.id) === String(item.productId)) || 
          (item.name && p.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()) || 
          (item.productName && p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase())
        );
        if (prod) {
          c = prod.results || prod.costs;
        }
      }

      if (c) {
        const batchSize = parseFloat(c.quantity) || parseFloat(prod?.values?.quantity) || 1;
        const filament = parseFloat(c.filamentCost) || 0;
        const energy = parseFloat(c.energyCost) || 0;
        const machine = parseFloat(c.machineCost) || 0;
        const printCost = filament + energy + machine;
        const failRate = parseFloat(prod?.values?.failureRate) || 0;
        const totalFail = c.totalFailureCost !== undefined ? parseFloat(c.totalFailureCost) : (printCost * (failRate / 100));

        const uFilament = filament / batchSize;
        const uEnergy = energy / batchSize;
        const uMachine = machine / batchSize;
        const piecesPerKit = prod?.values?.piecesPerKit || 1;
        const totalPostFallback = (parseFloat(prod?.values?.postProcessing) || 0) * piecesPerKit * batchSize;
        const totalDesignFallback = (parseFloat(prod?.values?.designCost) || 0) * piecesPerKit * batchSize;
        const uPost = (c.totalPostProcessing !== undefined ? parseFloat(c.totalPostProcessing) : totalPostFallback) / batchSize;
        const uDesign = (c.totalDesignCost !== undefined ? parseFloat(c.totalDesignCost) : totalDesignFallback) / batchSize;
        const uFailure = (totalFail || 0) / batchSize;
        const uPackaging = (parseFloat(c.totalPackagingCost || prod?.values?.packaging) || 0) / batchSize;
        const uOther = (parseFloat(c.totalOtherCosts || prod?.values?.otherCosts) || 0) / batchSize;
        const uProd = parseFloat(c.unitCostProduction) || (uFilament + uEnergy + uMachine + uFailure + uPost + uDesign + uPackaging + uOther);

        return {
          unitFilament: uFilament,
          unitEnergy: uEnergy,
          unitMachine: uMachine,
          unitPost: uPost,
          unitDesign: uDesign,
          unitFailure: uFailure,
          unitPackaging: uPackaging,
          unitOther: uOther,
          unitProduction: uProd,
          platformFeeValue: parseFloat(c.platformFeeValue) || 0,
          totalShippingCost: parseFloat(c.totalShippingCost) || 0,
          batchSize
        };
      }

      // If kit without saved results, calculate from components
      if (prod && prod._type === 'kit' && prod.values?.components) {
        let uMat = 0, uEne = 0, uMac = 0, uPos = 0, uDes = 0, uFai = 0, uEmb = 0, uExt = 0;
        prod.values.components.forEach((comp: any) => {
          const cp = productsList.find((p: any) => String(p.id) === String(comp.id));
          if (cp && cp.results) {
            const cq = parseFloat(cp.results.quantity) || parseFloat(cp.values?.quantity) || 1;
            const n = parseInt(comp.qty) || 1;
            uMat += ((parseFloat(cp.results.filamentCost) || 0) / cq) * n;
            uEne += ((parseFloat(cp.results.energyCost) || 0) / cq) * n;
            uMac += ((parseFloat(cp.results.machineCost) || 0) / cq) * n;
            uPos += ((parseFloat(cp.results.totalPostProcessing) || 0) / cq) * n;
            uDes += ((parseFloat(cp.results.totalDesignCost) || 0) / cq) * n;
            uEmb += ((parseFloat(cp.results.totalPackagingCost) || 0) / cq) * n;
            uExt += ((parseFloat(cp.results.totalOtherCosts) || 0) / cq) * n;
            const cPrint = (parseFloat(cp.results.filamentCost) || 0) + (parseFloat(cp.results.energyCost) || 0) + (parseFloat(cp.results.machineCost) || 0);
            const cFail = cp.results.totalFailureCost !== undefined ? parseFloat(cp.results.totalFailureCost) : cPrint * ((parseFloat(cp.values?.failureRate) || 0) / 100);
            uFai += (cFail / cq) * n;
          }
        });
        const uProd = uMat + uEne + uMac + uFai + uPos + uDes + uEmb + uExt;
        return {
          unitFilament: uMat,
          unitEnergy: uEne,
          unitMachine: uMac,
          unitPost: uPos,
          unitDesign: uDes,
          unitFailure: uFai,
          unitPackaging: uEmb,
          unitOther: uExt,
          unitProduction: uProd,
          platformFeeValue: 0,
          totalShippingCost: 0,
          batchSize: 1
        };
      }

      return null;
    };

    filteredData.sales.forEach(sale => {
      if (sale.shipping !== undefined) totalFrete += sale.shipping;
      if (sale.taxes !== undefined) taxasMkt += sale.taxes;

      (sale.items || []).forEach(item => {
        const qty = item.qty || 1;
        const rev = (item.price || 0) * qty;
        const costs = getItemCosts(item);

        if (item.channel === 'marketplace') {
          recMkt += rev;
          if (sale.taxes === undefined) taxasMkt += (costs?.platformFeeValue ? costs.platformFeeValue * qty : rev * 0.15);
          if (sale.shipping === undefined && costs?.totalShippingCost) totalFrete += (costs.totalShippingCost / (costs.batchSize || 1)) * qty;
        } else if (item.channel === 'consignado') {
          recConsig += rev;
          comissaoConsig += rev * 0.2;
        } else {
          recDireta += rev;
        }

        if (costs) {
          const itemCpv = costs.unitProduction * qty;
          cpv += itemCpv;
          cpvFilamento += costs.unitFilament * qty;
          cpvEnergia += costs.unitEnergy * qty;
          cpvMaquina += costs.unitMachine * qty;
          cpvPos += costs.unitPost * qty;
          cpvDesign += costs.unitDesign * qty;
          cpvFalha += costs.unitFailure * qty;
          cpvEmbalagem += costs.unitPackaging * qty;
          cpvOutros += costs.unitOther * qty;
        } else {
          const estCpv = rev * 0.25;
          cpv += estCpv;
          cpvFilamento += estCpv * 0.55;
          cpvEnergia += estCpv * 0.15;
          cpvMaquina += estCpv * 0.15;
          cpvFalha += estCpv * 0.15;
        }
      });
    });

    filteredData.consigned.forEach(v => {
      const gross = v.grossValue || 0;
      const net = v.netValue || 0;
      const qty = v.quantity || 1;
      recConsig += gross;
      comissaoConsig += Math.max(0, gross - net);

      const costs = getItemCosts({ productName: v.productName, name: v.productName });
      if (costs) {
        const itemCpv = costs.unitProduction * qty;
        cpv += itemCpv;
        cpvFilamento += costs.unitFilament * qty;
        cpvEnergia += costs.unitEnergy * qty;
        cpvMaquina += costs.unitMachine * qty;
        cpvPos += costs.unitPost * qty;
        cpvDesign += costs.unitDesign * qty;
        cpvFalha += costs.unitFailure * qty;
        cpvEmbalagem += costs.unitPackaging * qty;
        cpvOutros += costs.unitOther * qty;
      } else {
        const estCpv = gross * 0.25;
        cpv += estCpv;
        cpvFilamento += estCpv * 0.55;
        cpvEnergia += estCpv * 0.15;
        cpvMaquina += estCpv * 0.15;
        cpvFalha += estCpv * 0.15;
      }
    });

    const recBruta = recDireta + recMkt + recConsig;
    const dedusoes = taxasMkt + totalFrete + comissaoConsig;
    const recLiquida = recBruta - dedusoes;
    const lucroBruto = recLiquida - cpv;
    const despOp = filteredData.expenses.reduce((s, e) => s + e.value, 0);
    const lucroLiquido = lucroBruto - despOp;
    const margem = recBruta > 0 ? (lucroLiquido / recBruta) * 100 : 0;

    return {
      recDireta, recMkt, recConsig, recBruta,
      dedusoes, taxasMkt, totalFrete, comissaoConsig,
      recLiquida,
      cpv, cpvFilamento, cpvEnergia, cpvMaquina, cpvPos, cpvDesign, cpvFalha, cpvEmbalagem, cpvOutros,
      lucroBruto, despOp, lucroLiquido, margem
    };
  }, [filteredData, productsList]);

  const chartData = useMemo(() => {
    return {
      labels: ['Receita Bruta', 'Deduções', 'CPV', 'Lucro Bruto', 'Despesas Op.', 'Lucro Líquido'],
      datasets: [
        {
          label: 'Valor (R$)',
          data: [
            dre.recBruta,
            -dre.dedusoes,
            -dre.cpv,
            dre.lucroBruto,
            -dre.despOp,
            dre.lucroLiquido
          ],
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)', // Indigo (Receita Bruta)
            'rgba(239, 68, 68, 0.8)', // Red (Deduções)
            'rgba(239, 68, 68, 0.8)', // Red (CPV)
            'rgba(168, 85, 247, 0.8)', // Purple (Lucro Bruto)
            'rgba(239, 68, 68, 0.8)', // Red (Despesas)
            'rgba(16, 185, 129, 0.8)' // Green (Lucro Liquido)
          ],
          borderRadius: 6,
        }
      ]
    };
  }, [dre]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#9ca3af' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } }
      }
    }
  };

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const pct = (val: number) => dre.recBruta > 0 ? ((val / dre.recBruta) * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';

  if (!isClient) return null;

  return (
    <AppLayout title="DRE & Financeiro" subtitle="Demonstração do Resultado do Exercício">
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="input-wrapper" style={{ width: 200, marginBottom: 0 }}>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="all">Todo o Período</option>
            <option value="0">Janeiro</option><option value="1">Fevereiro</option>
            <option value="2">Março</option><option value="3">Abril</option>
            <option value="4">Maio</option><option value="5">Junho</option>
            <option value="6">Julho</option><option value="7">Agosto</option>
            <option value="8">Setembro</option><option value="9">Outubro</option>
            <option value="10">Novembro</option><option value="11">Dezembro</option>
          </select>
        </div>
        <div className="input-wrapper" style={{ width: 150, marginBottom: 0 }}>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">Todos os Anos</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <div className="card-body text-center p-6">
            <h3 className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
              <DollarSign size={16} /> Receita Bruta
            </h3>
            <div className="text-3xl font-black font-mono text-[var(--accent-blue)]">
              {fmt(dre.recBruta)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center p-6">
            <h3 className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
              <TrendingDown size={16} /> Custos Variáveis
            </h3>
            <div className="text-3xl font-black font-mono text-red-400">
              -{fmt(dre.cpv + dre.dedusoes)}
            </div>
          </div>
        </div>
        <div className="card" style={{ borderColor: dre.lucroLiquido >= 0 ? 'var(--accent-green)' : 'var(--danger)' }}>
          <div className="card-body text-center p-6">
            <h3 className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
              <TrendingUp size={16} /> Lucro Líquido
            </h3>
            <div className={`text-3xl font-black font-mono ${dre.lucroLiquido >= 0 ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>
              {fmt(dre.lucroLiquido)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center p-6">
            <h3 className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
              <Percent size={16} /> Margem
            </h3>
            <div className={`text-3xl font-black font-mono ${dre.margem >= 0 ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>
              {dre.margem.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid mt-6">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <div className="card-icon card-icon-blue">
              <BarChart3 size={20} />
            </div>
            <h2>Visão Geral do Período</h2>
          </div>
          <div className="card-body" style={{ height: "300px" }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <div className="card-icon card-icon-purple">
              <FileText size={20} />
            </div>
            <h2>Detalhamento DRE</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-input)]">
                    <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold">Descrição</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold text-right">Valor</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold text-right">% Receita</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-card)]/50">
                    <td className="p-4 font-bold text-[var(--text-primary)]">1. Receita Bruta de Vendas</td>
                    <td className="p-4 font-bold text-[var(--text-primary)] text-right font-mono">{fmt(dre.recBruta)}</td>
                    <td className="p-4 font-bold text-[var(--text-primary)] text-right font-mono">100,00%</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Venda Direta</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{fmt(dre.recDireta)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.recDireta)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Venda Marketplace</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{fmt(dre.recMkt)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.recMkt)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)]">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Venda Consignado</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{fmt(dre.recConsig)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.recConsig)}</td>
                  </tr>

                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-card)]/50">
                    <td className="p-4 font-bold text-[var(--text-primary)]">2. Deduções da Receita</td>
                    <td className="p-4 font-bold text-red-400 text-right font-mono">-{fmt(dre.dedusoes)}</td>
                    <td className="p-4 font-bold text-red-400 text-right font-mono">{pct(dre.dedusoes)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Taxas Marketplace</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.taxasMkt)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.taxasMkt)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Comissão Consignado</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.comissaoConsig)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.comissaoConsig)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)]">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Fretes (Pagos pela loja)</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.totalFrete)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.totalFrete)}</td>
                  </tr>

                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-input)]">
                    <td className="p-4 font-bold text-[var(--text-primary)]">3. Receita Líquida</td>
                    <td className="p-4 font-bold text-[var(--accent-blue)] text-right font-mono">{fmt(dre.recLiquida)}</td>
                    <td className="p-4 font-bold text-[var(--accent-blue)] text-right font-mono">{pct(dre.recLiquida)}</td>
                  </tr>

                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-card)]/50">
                    <td className="p-4 font-bold text-[var(--text-primary)]">4. Custos Variáveis / CPV</td>
                    <td className="p-4 font-bold text-red-400 text-right font-mono">-{fmt(dre.cpv)}</td>
                    <td className="p-4 font-bold text-red-400 text-right font-mono">{pct(dre.cpv)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Filamento</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.cpvFilamento)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.cpvFilamento)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Energia Elétrica</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.cpvEnergia)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.cpvEnergia)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Desgaste Máquina</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.cpvMaquina)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.cpvMaquina)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Pós-Processamento</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.cpvPos)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.cpvPos)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Design / Modelagem</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.cpvDesign)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.cpvDesign)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Embalagens</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.cpvEmbalagem)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.cpvEmbalagem)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)] border-dashed">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Reserva p/ Falhas</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(dre.cpvFalha)}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(dre.cpvFalha)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-card)]">
                    <td className="p-3 pl-8 text-sm text-[var(--text-secondary)]">Outros Custos / Genérico</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">-{fmt(Math.max(0, dre.cpv - (dre.cpvFilamento + dre.cpvEnergia + dre.cpvMaquina + dre.cpvPos + dre.cpvDesign + dre.cpvEmbalagem + dre.cpvFalha)))}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)] text-right font-mono">{pct(Math.max(0, dre.cpv - (dre.cpvFilamento + dre.cpvEnergia + dre.cpvMaquina + dre.cpvPos + dre.cpvDesign + dre.cpvEmbalagem + dre.cpvFalha)))}</td>
                  </tr>

                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-input)]">
                    <td className="p-4 font-bold text-[var(--text-primary)]">5. Lucro Bruto</td>
                    <td className="p-4 font-bold text-[var(--accent-green)] text-right font-mono">{fmt(dre.lucroBruto)}</td>
                    <td className="p-4 font-bold text-[var(--accent-green)] text-right font-mono">{pct(dre.lucroBruto)}</td>
                  </tr>

                  <tr className="border-b border-[var(--border-card)] bg-[var(--bg-card)]/50">
                    <td className="p-4 font-bold text-[var(--text-primary)]">6. Despesas Operacionais</td>
                    <td className="p-4 font-bold text-red-400 text-right font-mono">-{fmt(dre.despOp)}</td>
                    <td className="p-4 font-bold text-red-400 text-right font-mono">{pct(dre.despOp)}</td>
                  </tr>

                  <tr className="border-b-4 border-b-[var(--accent-green)] bg-[var(--bg-input)]">
                    <td className="p-4 font-bold text-lg text-[var(--text-primary)]">7. Lucro Líquido</td>
                    <td className={`p-4 font-bold text-lg text-right font-mono ${dre.lucroLiquido >= 0 ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>{fmt(dre.lucroLiquido)}</td>
                    <td className={`p-4 font-bold text-lg text-right font-mono ${dre.lucroLiquido >= 0 ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>{pct(dre.lucroLiquido)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div className="card-icon card-icon-amber">
                <DollarSign size={20} />
              </div>
              <h2 className="m-0">Despesas Adicionais</h2>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setIsExpenseModalOpen(true)}
              style={{ padding: "8px 16px", height: "auto" }}
            >
              <Plus size={16} /> Lançar Despesa
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {filteredData.expenses.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                Nenhuma despesa lançada neste período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="border-b border-[var(--border-card)] bg-[var(--bg-input)]">
                      <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold">Data</th>
                      <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold">Descrição</th>
                      <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold text-right">Valor</th>
                      <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.expenses.map(e => (
                      <tr key={e.id} className="border-b border-[var(--border-card)]">
                        <td className="p-4 text-sm font-mono">{new Date(e.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                        <td className="p-4 text-sm font-bold">{e.description}</td>
                        <td className="p-4 text-sm font-mono text-right text-red-400">-{fmt(e.value)}</td>
                        <td className="p-4 text-center">
                          <button 
                            className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors"
                            onClick={() => handleDeleteExpense(e.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpenseModalOpen && (
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setIsExpenseModalOpen(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(30,30,50,0.98) 100%)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '440px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div style={{
              background: 'var(--gradient-primary)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
              }}>
                <DollarSign size={20} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: 0 }}>
                  Lançar Nova Despesa
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>
                  Registre custos fixos e variáveis
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddExpense} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Descrição */}
                <div className="input-group">
                  <label style={{ color: 'var(--accent-indigo)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Descrição
                  </label>
                  <div className="input-wrapper">
                    <input 
                      type="text" 
                      required 
                      placeholder="Ex: Aluguel, Tráfego Pago, Internet..."
                      value={expDesc}
                      onChange={e => setExpDesc(e.target.value)}
                      style={{ fontSize: '14px' }}
                    />
                  </div>
                </div>

                {/* Data & Valor side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="input-group">
                    <label style={{ color: 'var(--accent-indigo)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Data
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="date" 
                        required 
                        value={expDate}
                        onChange={e => setExpDate(e.target.value)}
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label style={{ color: 'var(--accent-indigo)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Valor (R$)
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="number" 
                        required 
                        step="0.01"
                        min="0.01"
                        placeholder="0,00"
                        value={expValue}
                        onChange={e => setExpValue(e.target.value)}
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                justifyContent: 'flex-end', 
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-card)'
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsExpenseModalOpen(false)}
                  style={{ minWidth: '100px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-save"
                  style={{ minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
