// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { X, MapPin, Phone, User, ShoppingBag, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function ConsignadosPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    locationName: "",
    responsibleName: "",
    phone: "",
    address: "",
  });

  const loadData = async () => {
    if (!user) return;
    try {
      const [
        { data: pData },
        { data: iData },
        { data: sData }
      ] = await Promise.all([
        supabase.from("consignment_partners").select("*").eq("user_id", user.id),
        supabase.from("consignment_inventory").select("*").eq("user_id", user.id),
        supabase.from("consignment_sales").select("*").eq("user_id", user.id)
      ]);
      setPartners(pData || []);
      setInventory(iData || []);
      setSales(sData || []);
    } catch (err) {
      console.error("Error loading consignados data:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openModal = (partner = null) => {
    if (partner) {
      setEditingId(partner.id);
      setFormData({
        locationName: partner.locationName || partner.name || "",
        responsibleName: partner.responsibleName || "",
        phone: partner.phone || "",
        address: partner.address || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        locationName: "",
        responsibleName: "",
        phone: "",
        address: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const savePartner = async () => {
    if (!user) return;
    if (!formData.locationName.trim()) {
      alert("Por favor, informe o Nome do Local!");
      return;
    }

    if (editingId) {
      const { data, error } = await supabase
        .from("consignment_partners")
        .update({
          name: formData.locationName,
          locationName: formData.locationName,
          responsibleName: formData.responsibleName,
          phone: formData.phone,
          address: formData.address,
        })
        .eq("id", editingId)
        .eq("user_id", user.id)
        .select()
        .single();
        
      if (!error && data) {
        setPartners(partners.map((p) => (p.id === editingId ? data : p)));
      } else if (error) {
        console.error(error);
        alert("Erro ao salvar parceiro: " + (error.message || JSON.stringify(error)));
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("consignment_partners")
        .insert([{
          user_id: user.id,
          name: formData.locationName,
          commission_rate: 0,
          locationName: formData.locationName,
          responsibleName: formData.responsibleName,
          phone: formData.phone,
          address: formData.address,
          dateAdded: new Date().toISOString(),
        }])
        .select()
        .single();
        
      if (!error && data) {
        setPartners([...partners, data]);
      } else if (error) {
        console.error(error);
        alert("Erro ao cadastrar parceiro: " + (error.message || JSON.stringify(error)));
        return;
      }
    }

    closeModal();
  };

  const deletePartner = async (id) => {
    if (!user) return;
    if (window.confirm("Tem certeza que deseja remover este local consignado?")) {
      const { error } = await supabase
        .from("consignment_partners")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
        
      if (!error) {
        setPartners(partners.filter((p) => p.id !== id));
      } else {
        console.error(error);
      }
    }
  };

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format;

  // Calculate stats
  let totalItems = 0;
  let expectedValue = 0;
  
  inventory.forEach((item) => {
    const qty = parseInt(item.quantityLeft !== undefined ? item.quantityLeft : item.quantity) || 0;
    totalItems += qty;
    
    const price = parseFloat(item.salePrice !== undefined ? item.salePrice : item.sale_price) || 0;
    const commission = parseFloat(item.commission !== undefined ? item.commission : item.commission_rate) || 0;
    const netPrice = price * (1 - commission / 100);
    expectedValue += netPrice * qty;
  });

  let soldGross = 0;
  let soldNet = 0;
  sales.forEach((v) => {
    const net = v.netValue !== undefined ? v.netValue : (v.net_value || 0);
    let gross = v.grossValue !== undefined ? v.grossValue : v.gross_value;
    if (!gross) {
      const est = inventory.find((e) => String(e.id) === String(v.inventoryId || v.inventory_id) || (e.productName || e.product_name) === (v.productName || v.product_name));
      const c = est ? parseFloat(est.commission !== undefined ? est.commission : est.commission_rate || 0) : 0;
      if (c > 0) {
        gross = net / (1 - c / 100);
      } else {
        gross = net;
      }
    }
    soldGross += gross;
    soldNet += net;
  });

  return (
    <AppLayout title="Locais Consignados" subtitle="Parceiros e pontos de venda físicos">
      <div className="dashboard-grid">
        
        {/* Actions Row */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => openModal()}
            className="btn btn-primary"
          >
            + Adicionar Parceiro
          </button>
        </div>

        {/* KPIs */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Locais Parceiros</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{partners.length}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Total de pontos de venda.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Em Consignação</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{totalItems}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Peças nas lojas.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Valor no Estoque</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{fmt(expectedValue)}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Lucro das peças nas lojas.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Faturamento Total</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{fmt(soldGross)}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Venda bruta (preço cheio).</p>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(16, 185, 129, 0.4)" }}>
            <div className="card-body">
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Lucro das Vendas</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>{fmt(soldNet)}</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Seu lucro (já sem comissão).</p>
            </div>
          </div>
        </div>

        {/* Partners List */}
        <div className="dashboard-column" style={{ gridColumn: '1 / -1' }}>
          <div className="card" style={{ backgroundColor: 'transparent', border: 'none' }}>
            <div className="card-header" style={{ padding: '0 0 var(--space-md) 0' }}>
              <h2>Lojas e Parceiros Cadastrados</h2>
            </div>
            {partners.length === 0 ? (
              <div className="card">
                <div className="card-body" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  <ShoppingBag size={48} style={{ opacity: 0.5, margin: "0 auto var(--space-md)" }} />
                  <p>Nenhum local consignado cadastrado.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-md)" }}>
                {partners.map((p) => {
                  const partnerInventory = inventory.filter((item) => String(item.partnerId || item.partner_id) === String(p.id));
                  const availablePieces = partnerInventory.reduce((acc, item) => acc + (parseInt(item.quantityLeft !== undefined ? item.quantityLeft : item.quantity) || 0), 0);

                  return (
                    <div key={p.id} className="card">
                      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-md)' }}>
                        <div>
                          <div style={{ display: "flex", justifyItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-md)", gap: "var(--space-sm)" }}>
                            <h3 style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{p.locationName || p.name}</h3>
                            <span className="badge" style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                              {availablePieces} peças no local
                            </span>
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <User size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span><strong style={{ color: "var(--text-light)" }}>Responsável:</strong> {p.responsibleName || "-"}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <Phone size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span><strong style={{ color: "var(--text-light)" }}>Telefone:</strong> {p.phone || "-"}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <MapPin size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span><strong style={{ color: "var(--text-light)" }}>Endereço:</strong> {p.address || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "var(--space-md)", borderTop: "1px solid var(--border-color)" }}>
                          <Link href={`/consignados/${p.id}`} className="btn btn-primary" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                            Gerenciar
                          </Link>
                          <button onClick={() => openModal(p)} className="btn">
                            Editar
                          </button>
                          <button onClick={() => deletePartner(p.id)} className="btn" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: 'linear-gradient(145deg, rgba(30, 32, 48, 0.95), rgba(17, 19, 33, 0.98))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '20px',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99, 102, 241, 0.08)',
          }}>
            <button
              onClick={closeModal}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '24px' }}>
              {editingId ? "Editar Local" : "Cadastrar Novo Local"}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { label: 'Nome do Local', placeholder: 'Ex: Loja Centro, Clínica Y', key: 'locationName' as const },
                { label: 'Responsável (Contato)', placeholder: 'Nome de quem cuida', key: 'responsibleName' as const },
                { label: 'Telefone / WhatsApp', placeholder: '(XX) XXXXX-XXXX', key: 'phone' as const },
                { label: 'Endereço', placeholder: 'Rua, Número, Bairro', key: 'address' as const },
              ].map((field) => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={formData[field.key]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 12, 25, 0.7)',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#f3f4f6',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)'}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(75, 85, 99, 0.3)' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#d1d5db',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={savePartner}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'white',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <CheckCircle2 size={18} /> {editingId ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
