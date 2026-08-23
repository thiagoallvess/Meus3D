// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, DollarSign, RotateCcw, X, TrendingUp, History } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function PartnerEstoquePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id;

  const [activeTab, setActiveTab] = useState("estoque");

  const [partnerName, setPartnerName] = useState("Carregando...");
  const [inventory, setInventory] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [acertos, setAcertos] = useState<any[]>([]);
  const [recolhidos, setRecolhidos] = useState<any[]>([]);

  const [productsList, setProductsList] = useState<any[]>([]);
  const [stock3d, setStock3d] = useState({});

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    productName: "",
    quantity: 1,
    commission: 20,
    salePrice: "",
  });

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellForm, setSellForm] = useState({ id: null, qty: 1, maxQty: 0 });

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({ id: null, qty: 1, maxQty: 0 });

  const loadData = async () => {
    if (!user) return;
    try {
      const pId = String(partnerId);

      const [
        { data: partnerData },
        { data: invData },
        { data: salesData },
        { data: acertosData },
        { data: recolhidosData },
      ] = await Promise.all([
        supabase.from("consignment_partners").select("*").eq("id", pId).eq("user_id", user.id).single(),
        supabase.from("consignment_inventory").select("*").eq("user_id", user.id),
        supabase.from("consignment_sales").select("*").eq("user_id", user.id),
        supabase.from("consignment_settlements").select("*").eq("user_id", user.id),
        supabase.from("consignment_returns").select("*").eq("user_id", user.id),
      ]);

      if (!partnerData) {
        alert("Parceiro não encontrado!");
        router.push("/consignados");
        return;
      }
      setPartnerName(partnerData.locationName || partnerData.name || "Parceiro");

      const filteredInv = (invData || [])
        .filter((i) => String(i.partnerId || i.partner_id) === pId)
        .map((i) => ({
          ...i,
          partnerId: i.partnerId || i.partner_id,
          productId: i.productId || i.product_id,
          productName: i.productName || i.product_name,
          quantityLeft: i.quantityLeft !== undefined ? i.quantityLeft : (i.quantity !== undefined ? i.quantity : 0),
          quantitySold: i.quantitySold !== undefined ? i.quantitySold : (i.quantity_sold !== undefined ? i.quantity_sold : 0),
          salePrice: i.salePrice !== undefined ? i.salePrice : (i.sale_price !== undefined ? i.sale_price : 0),
          commission: i.commission !== undefined ? i.commission : (i.commission_rate !== undefined ? i.commission_rate : 0),
          dateAdded: i.dateAdded || i.sent_date || i.created_at,
        }));

      const filteredSales = (salesData || [])
        .filter((s) => String(s.partnerId || s.partner_id) === pId)
        .map((s) => ({
          ...s,
          partnerId: s.partnerId || s.partner_id,
          productName: s.productName || s.product_name,
          qty: s.qty !== undefined ? s.qty : (s.quantity !== undefined ? s.quantity : 1),
          netValue: s.netValue !== undefined ? s.netValue : (s.net_value !== undefined ? s.net_value : 0),
          grossValue: s.grossValue !== undefined ? s.grossValue : (s.gross_value !== undefined ? s.gross_value : 0),
          status: s.status || "pendente",
          date: s.date || s.sale_date || s.created_at,
        }));

      const filteredAcertos = (acertosData || [])
        .filter((a) => String(a.partnerId || a.partner_id) === pId)
        .map((a) => ({
          ...a,
          partnerId: a.partnerId || a.partner_id,
          amount: a.amount !== undefined ? a.amount : 0,
          itemsCount: a.itemsCount !== undefined ? a.itemsCount : (a.items_count !== undefined ? a.items_count : 0),
          date: a.date || a.settlement_date || a.created_at,
        }));

      const filteredRecolhidos = (recolhidosData || [])
        .filter((r) => String(r.partnerId || r.partner_id) === pId)
        .map((r) => ({
          ...r,
          partnerId: r.partnerId || r.partner_id,
          productName: r.productName || r.product_name,
          qty: r.qty !== undefined ? r.qty : (r.quantity !== undefined ? r.quantity : 1),
          date: r.date || r.return_date || r.created_at,
        }));

      setInventory(filteredInv);
      setSales(filteredSales);
      setAcertos(filteredAcertos);
      setRecolhidos(filteredRecolhidos);

      const { data: prodData } = await supabase.from("products").select("*").eq("user_id", user.id);
      const allProducts = (prodData || []).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setProductsList(allProducts);

      const stockMap = {};
      (prodData || []).forEach(p => {
        stockMap[p.id] = p.stock || 0;
      });
      setStock3d(stockMap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user && partnerId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, partnerId]);

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format;

  // Render variables
  const partnerInv = inventory;
  const activeItems = partnerInv.filter((x) => (parseInt(x.quantityLeft) || 0) > 0);
  
  let totalQty = 0;
  let totalSold = 0;
  let expectedProfit = 0;

  partnerInv.forEach((item) => {
    totalQty += parseInt(item.quantityLeft) || 0;
    totalSold += parseInt(item.quantitySold) || 0;
    
    const qtyL = parseInt(item.quantityLeft) || 0;
    if (qtyL > 0) {
      const p = parseFloat(item.salePrice) || 0;
      const c = parseFloat(item.commission) || 0;
      const net = p * (1 - c / 100);
      expectedProfit += net * qtyL;
    }
  });

  const pendentes = sales.filter((x) => x.status === "pendente");
  let totalPendente = 0;
  pendentes.forEach((v) => { totalPendente += v.netValue; });

  const partnerAcertos = [...acertos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let totalSettled = 0;
  partnerAcertos.forEach((a) => { totalSettled += a.amount; });

  const partnerRecolhidos = [...recolhidos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Handlers ---

  const handleProductSelect = (e) => {
    const name = e.target.value;
    const prod = productsList.find(p => p.name === name);
    let newPrice = itemForm.salePrice;
    
    if (prod) {
      const basePrice = prod.values?.salePriceMarketplace > 0 ? prod.values?.salePriceMarketplace : (prod.values?.salePrice || 0);
      if (basePrice > 0 && !itemForm.salePrice) {
        newPrice = basePrice;
      }
    }
    
    setItemForm({ ...itemForm, productName: name, salePrice: newPrice });
  };

  const saveItem = async () => {
    if (!user) return;
    const { productName, quantity, commission, salePrice } = itemForm;
    if (!productName || !quantity || !salePrice) {
      alert("Preencha os campos corretamente.");
      return;
    }

    const prod = productsList.find(p => p.name === productName);
    const productId = prod ? prod.id : null;
    const parsedQty = parseInt(quantity) || 0;
    const parsedPrice = parseFloat(salePrice) || 0;
    const parsedComm = parseFloat(commission) || 0;

    if (parsedQty <= 0 || parsedPrice <= 0) {
      alert("Quantidade e preço devem ser maiores que zero.");
      return;
    }

    const existingItem = inventory.find(
      (x) => x.productName === productName && parseFloat(x.salePrice) === parsedPrice && parseFloat(x.commission) === parsedComm
    );

    if (existingItem) {
      const newQtyLeft = (parseInt(existingItem.quantityLeft) || 0) + parsedQty;
      const updateData: any = {
        quantityLeft: newQtyLeft,
      };
      if (productId) {
        updateData.productId = productId;
      }

      const { data, error } = await supabase
        .from("consignment_inventory")
        .update(updateData)
        .eq("id", existingItem.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar estoque:", error);
        alert("Erro ao atualizar estoque: " + (error.message || JSON.stringify(error)));
        return;
      }
      if (data) {
        setInventory(inventory.map(i => i.id === existingItem.id ? data : i));
      }
    } else {
      const insertPayload = {
        user_id: user.id,
        partnerId: String(partnerId),
        productId: productId,
        productName: productName,
        quantityLeft: parsedQty,
        quantitySold: 0,
        salePrice: parsedPrice,
        commission: parsedComm,
        dateAdded: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("consignment_inventory")
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        console.error("Erro ao salvar produto no parceiro:", error);
        alert("Erro ao salvar produto: " + (error.message || JSON.stringify(error)));
        return;
      }
      if (data) {
        setInventory([...inventory, data]);
      }
    }

    if (productId) {
      const currentStock = (parseInt(stock3d[productId]) || 0) - parsedQty;
      await supabase.from("products").update({ stock: currentStock }).eq("id", productId);
      setStock3d({ ...stock3d, [productId]: currentStock });
    }

    setIsItemModalOpen(false);
  };

  const confirmSale = async () => {
    if (!user) return;
    const { id, qty, maxQty } = sellForm;
    if (!qty || qty <= 0 || qty > maxQty) {
      alert("Quantidade inválida.");
      return;
    }

    const item = inventory.find((x) => x.id === id);

    if (item && item.quantityLeft >= qty) {
      const newQtyLeft = item.quantityLeft - qty;
      const newQtySold = (parseInt(item.quantitySold) || 0) + qty;

      const p = parseFloat(item.salePrice);
      const c = parseFloat(item.commission);
      const gross = p * qty;
      const net = gross * (1 - c / 100);

      const [invResponse, saleResponse] = await Promise.all([
        supabase.from("consignment_inventory").update({
          quantityLeft: newQtyLeft,
          quantitySold: newQtySold,
        }).eq("id", id).eq("user_id", user.id).select().single(),
        supabase.from("consignment_sales").insert([{
          user_id: user.id,
          partnerId: String(partnerId),
          inventoryId: id,
          productName: item.productName,
          qty: qty,
          netValue: net,
          grossValue: gross,
          date: new Date().toISOString(),
          status: "pendente"
        }]).select().single()
      ]);

      if (invResponse.error) {
        console.error("Erro ao atualizar estoque na venda:", invResponse.error);
        alert("Erro na venda: " + (invResponse.error.message || JSON.stringify(invResponse.error)));
        return;
      }
      if (saleResponse.error) {
        console.error("Erro ao registrar venda:", saleResponse.error);
        alert("Erro ao registrar venda: " + (saleResponse.error.message || JSON.stringify(saleResponse.error)));
        return;
      }

      if (invResponse.data) {
        setInventory(inventory.map(i => i.id === id ? invResponse.data : i));
      }
      if (saleResponse.data) {
        setSales([...sales, saleResponse.data]);
      }

      setIsSellModalOpen(false);
    }
  };

  const confirmReturn = async () => {
    if (!user) return;
    const { id, qty, maxQty } = returnForm;
    if (!qty || qty <= 0 || qty > maxQty) {
      alert("Quantidade inválida.");
      return;
    }

    const item = inventory.find((x) => x.id === id);

    if (item && item.quantityLeft >= qty) {
      const newQtyLeft = item.quantityLeft - qty;

      const [invResponse, returnResponse] = await Promise.all([
        supabase.from("consignment_inventory").update({
          quantityLeft: newQtyLeft,
        }).eq("id", id).eq("user_id", user.id).select().single(),
        supabase.from("consignment_returns").insert([{
          user_id: user.id,
          partnerId: String(partnerId),
          productName: item.productName,
          qty: qty,
          date: new Date().toISOString()
        }]).select().single()
      ]);

      if (invResponse.error) {
        console.error("Erro ao atualizar estoque no recolhimento:", invResponse.error);
        alert("Erro no recolhimento: " + (invResponse.error.message || JSON.stringify(invResponse.error)));
        return;
      }
      if (returnResponse.error) {
        console.error("Erro ao registrar recolhimento:", returnResponse.error);
        alert("Erro no recolhimento: " + (returnResponse.error.message || JSON.stringify(returnResponse.error)));
        return;
      }

      if (invResponse.data) {
        setInventory(inventory.map(i => i.id === id ? invResponse.data : i));
      }
      if (returnResponse.data) {
        setRecolhidos([...recolhidos, returnResponse.data]);
      }

      const productId = item.productId;
      if (productId) {
        const currentStock = (parseInt(stock3d[productId]) || 0) + qty;
        await supabase.from("products").update({ stock: currentStock }).eq("id", productId);
        setStock3d({ ...stock3d, [productId]: currentStock });
      }

      setIsReturnModalOpen(false);
    }
  };

  const realizarFechamento = async () => {
    if (!user) return;
    if (pendentes.length === 0) return;

    let totalValue = 0;
    let totalItems = 0;
    const pendingIds = [];

    pendentes.forEach((v) => {
      totalValue += v.netValue;
      totalItems += v.qty;
      pendingIds.push(v.id);
    });

    if (!window.confirm(`Confirma que recebeu o valor de ${fmt(totalValue)} do parceiro?`)) return;

    const [salesResponse, settlementResponse] = await Promise.all([
      supabase.from("consignment_sales").update({ status: "fechado" }).in("id", pendingIds).eq("user_id", user.id),
      supabase.from("consignment_settlements").insert([{
        user_id: user.id,
        partnerId: String(partnerId),
        date: new Date().toISOString(),
        amount: totalValue,
        itemsCount: totalItems,
      }]).select().single()
    ]);

    if (salesResponse.error) {
      console.error("Erro ao fechar vendas:", salesResponse.error);
      alert("Erro ao fechar acerto: " + (salesResponse.error.message || JSON.stringify(salesResponse.error)));
      return;
    }
    if (settlementResponse.error) {
      console.error("Erro ao salvar fechamento:", settlementResponse.error);
      alert("Erro ao salvar acerto: " + (settlementResponse.error.message || JSON.stringify(settlementResponse.error)));
      return;
    }

    setSales(sales.map(s => pendingIds.includes(s.id) ? { ...s, status: "fechado" } : s));
    if (settlementResponse.data) {
      setAcertos([...acertos, settlementResponse.data]);
    }
    
    alert("Acerto realizado com sucesso!");
  };

  // Preview Logic
  const selectedProdObj = productsList.find(p => p.name === itemForm.productName);
  const unitCost = selectedProdObj ? ((selectedProdObj.results && (selectedProdObj.results.unitCostProduction || selectedProdObj.results.unitCostTotalFull || selectedProdObj.results.unitCost)) || 0) : 0;
  const prevPrice = parseFloat(itemForm.salePrice) || 0;
  const prevComm = parseFloat(itemForm.commission) || 0;
  
  const partnerCut = prevPrice * (prevComm / 100);
  const netRevenue = prevPrice - partnerCut;
  const profit = netRevenue - unitCost;
  const margin = prevPrice > 0 ? (profit / prevPrice) * 100 : 0;

  return (
    <AppLayout title={`Gestão: ${partnerName}`} subtitle="Controle de estoque, vendas e acertos financeiros deste parceiro.">
      <div className="dashboard-grid">
        {/* Back button */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
          <Link href="/consignados" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', width: 'fit-content' }}>
            <ArrowLeft size={16} />
            Voltar para Consignados
          </Link>
        </div>

        {/* Tabs */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--bg-card)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '6px',
            width: 'fit-content',
          }}>
            {[
              { key: "estoque", label: "Estoque Atual", icon: <Package size={16} /> },
              { key: "acertos", label: "Acertos & Vendas", icon: <DollarSign size={16} /> },
              { key: "historico", label: "Histórico de Recolhimento", icon: <History size={16} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeTab === tab.key ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab.key ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== TAB: ESTOQUE ===== */}
        {activeTab === "estoque" && (
          <>
            {/* Action button */}
            <div className="dashboard-column" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setItemForm({ productName: "", quantity: 1, commission: 20, salePrice: "" });
                  setIsItemModalOpen(true);
                }}
                className="btn btn-primary"
              >
                + Deixar Produto
              </button>
            </div>

            {/* KPI Cards */}
            <div className="dashboard-column" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
              <div className="card">
                <div className="card-body" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <div className="card-icon card-icon-blue"><Package size={18} /></div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Peças Disponíveis</h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{totalQty}</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <div className="card-icon card-icon-amber"><TrendingUp size={18} /></div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Vendido</h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{totalSold}</div>
                </div>
              </div>
              <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                <div className="card-body" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <div className="card-icon card-icon-green"><DollarSign size={18} /></div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lucro Limpo Esperado</h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-green)' }}>{fmt(expectedProfit)}</div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Se o restante for vendido.</p>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-icon card-icon-blue"><Package size={18} /></div>
                  <h2>Estoque no Parceiro</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)' }}>
                        {['Produto', 'Em Estoque', 'Preço (Venda)', 'Comissão (%)', 'Seu Lucro (Un)', 'Ações'].map((h, i) => (
                          <th key={h} style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 5 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Package size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                            <p>Nenhum produto em estoque neste local.</p>
                          </td>
                        </tr>
                      ) : (
                        activeItems.map((item) => {
                          const p = parseFloat(item.salePrice) || 0;
                          const c = parseFloat(item.commission) || 0;
                          const net = p * (1 - c / 100);
                          const isLowStock = item.quantityLeft <= 2;
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</td>
                              <td style={{ padding: '14px 20px' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '20px',
                                  fontSize: '12px', fontWeight: 700,
                                  background: isLowStock ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                  color: isLowStock ? 'var(--accent-amber-light)' : 'var(--accent-green-light)',
                                }}>
                                  {item.quantityLeft} un.
                                </span>
                              </td>
                              <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{fmt(p)}</td>
                              <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{c}%</td>
                              <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-green)' }}>{fmt(net)}</td>
                              <td style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <button
                                  onClick={() => { setSellForm({ id: item.id, qty: 1, maxQty: item.quantityLeft }); setIsSellModalOpen(true); }}
                                  className="btn"
                                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', border: '1px solid rgba(16, 185, 129, 0.2)', marginRight: '8px', fontSize: '13px', padding: '6px 14px' }}
                                >
                                  💰 Vender
                                </button>
                                <button
                                  onClick={() => { setReturnForm({ id: item.id, qty: 1, maxQty: item.quantityLeft }); setIsReturnModalOpen(true); }}
                                  className="btn"
                                  style={{ fontSize: '13px', padding: '6px 14px' }}
                                >
                                  🔙 Recolher
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
            </div>
          </>
        )}

        {/* ===== TAB: ACERTOS ===== */}
        {activeTab === "acertos" && (
          <>
            {/* Acertos KPIs */}
            <div className="dashboard-column" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
              <div className="card" style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                <div className="card-body" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <div className="card-icon card-icon-blue"><DollarSign size={18} /></div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor Pendente a Receber</h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-blue-light)' }}>{fmt(totalPendente)}</div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Dinheiro de vendas ainda não acertadas.</p>
                  <button
                    onClick={realizarFechamento}
                    disabled={pendentes.length === 0}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 'var(--space-md)', opacity: pendentes.length === 0 ? 0.4 : 1, cursor: pendentes.length === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    Realizar Fechamento
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="card-body" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <div className="card-icon card-icon-green"><TrendingUp size={18} /></div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Já Recebido</h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{fmt(totalSettled)}</div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Soma de todos os acertos já feitos.</p>
                </div>
              </div>
            </div>

            {/* Pending Sales Table */}
            <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-icon card-icon-amber"><DollarSign size={18} /></div>
                  <h2>Vendas Pendentes (Aguardando Acerto)</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)' }}>
                        {['Data da Venda', 'Produto', 'Qtd', 'Valor a Receber'].map((h) => (
                          <th key={h} style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendentes.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nenhuma venda aguardando acerto.
                          </td>
                        </tr>
                      ) : (
                        pendentes.map((v) => (
                          <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{new Date(v.date).toLocaleDateString()}</td>
                            <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{v.productName}</td>
                            <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{v.qty} un.</td>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-green)' }}>{fmt(v.netValue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Settlements History Table */}
            <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-icon card-icon-green"><History size={18} /></div>
                  <h2>Histórico de Fechamentos</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)' }}>
                        {['Data do Acerto', 'Qtd Itens Acertados', 'Valor Recebido'].map((h) => (
                          <th key={h} style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {partnerAcertos.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nenhum acerto realizado ainda.
                          </td>
                        </tr>
                      ) : (
                        partnerAcertos.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                              {new Date(a.date).toLocaleDateString()} às {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{a.itemsCount}</td>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-green)' }}>{fmt(a.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== TAB: HISTORICO ===== */}
        {activeTab === "historico" && (
          <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-icon card-icon-amber"><RotateCcw size={18} /></div>
                <h2>Peças Recolhidas Deste Local</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-card)' }}>
                      {['Data do Recolhimento', 'Produto', 'Quantidade Recolhida'].map((h) => (
                        <th key={h} style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {partnerRecolhidos.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <RotateCcw size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                          <p>Nenhuma peça foi recolhida deste local.</p>
                        </td>
                      </tr>
                    ) : (
                      partnerRecolhidos.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{new Date(r.date).toLocaleDateString()}</td>
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.productName}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '20px',
                              fontSize: '12px', fontWeight: 700,
                              background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber-light)',
                            }}>
                              {r.qty} un.
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL: Deixar Produto ===== */}
      {isItemModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{
            width: '100%', maxWidth: '480px',
            background: 'linear-gradient(145deg, rgba(30, 32, 48, 0.95), rgba(17, 19, 33, 0.98))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99, 102, 241, 0.08)',
          }}>
            <button
              onClick={() => setIsItemModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px' }}>
              Deixar Produto no Parceiro
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Produto</label>
                <select
                  value={itemForm.productName}
                  onChange={handleProductSelect}
                  style={{
                    width: '100%', backgroundColor: 'rgba(10, 12, 25, 0.7)',
                    border: '1px solid rgba(75, 85, 99, 0.5)', borderRadius: 'var(--radius-md)',
                    padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px',
                    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)'}
                >
                  <option value="">Selecione um produto salvo...</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} (Estoque: {stock3d[p.id] || 0} un.)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Qtd. Entregue</label>
                  <input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} min="1"
                    style={{ width: '100%', backgroundColor: 'rgba(10, 12, 25, 0.7)', border: '1px solid rgba(75, 85, 99, 0.5)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Comissão (%)</label>
                  <input type="number" value={itemForm.commission} onChange={(e) => setItemForm({ ...itemForm, commission: e.target.value })} min="0" max="100"
                    style={{ width: '100%', backgroundColor: 'rgba(10, 12, 25, 0.7)', border: '1px solid rgba(75, 85, 99, 0.5)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)'}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Preço de Venda Final (R$)</label>
                <input type="number" step="0.01" value={itemForm.salePrice} onChange={(e) => setItemForm({ ...itemForm, salePrice: e.target.value })} placeholder="Ex: 35.00"
                  style={{ width: '100%', backgroundColor: 'rgba(10, 12, 25, 0.7)', border: '1px solid rgba(75, 85, 99, 0.5)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)'}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>O valor que o cliente final vai pagar na loja.</p>
              </div>

              {itemForm.productName && (
                <div style={{
                  background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-md)', padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Custo de Produção (un):</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{fmt(unitCost)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Parceiro Recebe (un):</span>
                    <strong style={{ color: 'var(--accent-amber-light)' }}>{fmt(partnerCut)}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Seu Lucro Limpo (un):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                        background: margin >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: margin >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                        fontWeight: 700,
                      }}>
                        {margin.toFixed(1)}%
                      </span>
                      <strong style={{ color: 'var(--accent-green)' }}>{fmt(profit)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(75, 85, 99, 0.3)' }}>
              <button onClick={() => setIsItemModalOpen(false)} className="btn">Cancelar</button>
              <button onClick={saveItem} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Salvar no Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Registrar Venda ===== */}
      {isSellModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{
            width: '100%', maxWidth: '400px',
            background: 'linear-gradient(145deg, rgba(30, 32, 48, 0.95), rgba(17, 19, 33, 0.98))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99, 102, 241, 0.08)',
          }}>
            <button onClick={() => setIsSellModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px' }}>Registrar Venda</h2>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Quantidade Vendida</label>
              <input type="number" value={sellForm.qty} onChange={(e) => setSellForm({ ...sellForm, qty: parseInt(e.target.value) || 0 })} min="1" max={sellForm.maxQty}
                style={{ width: '100%', backgroundColor: 'rgba(10, 12, 25, 0.7)', border: '1px solid rgba(75, 85, 99, 0.5)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)'}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Máximo disponível: {sellForm.maxQty}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(75, 85, 99, 0.3)' }}>
              <button onClick={() => setIsSellModalOpen(false)} className="btn">Cancelar</button>
              <button onClick={confirmSale} style={{
                padding: '10px 24px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px',
                color: 'white', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
              }}>
                💰 Confirmar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Recolher Peças ===== */}
      {isReturnModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{
            width: '100%', maxWidth: '400px',
            background: 'linear-gradient(145deg, rgba(30, 32, 48, 0.95), rgba(17, 19, 33, 0.98))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99, 102, 241, 0.08)',
          }}>
            <button onClick={() => setIsReturnModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px' }}>Recolher Peças</h2>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Quantidade a Recolher</label>
              <input type="number" value={returnForm.qty} onChange={(e) => setReturnForm({ ...returnForm, qty: parseInt(e.target.value) || 0 })} min="1" max={returnForm.maxQty}
                style={{ width: '100%', backgroundColor: 'rgba(10, 12, 25, 0.7)', border: '1px solid rgba(75, 85, 99, 0.5)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)'}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Máximo disponível: {returnForm.maxQty}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(75, 85, 99, 0.3)' }}>
              <button onClick={() => setIsReturnModalOpen(false)} className="btn">Cancelar</button>
              <button onClick={confirmReturn} className="btn btn-primary">
                Confirmar Recolhimento
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
