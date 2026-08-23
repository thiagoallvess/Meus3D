"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2, Package, Layers, X } from "lucide-react";

type Packaging = {
  id: string;
  name: string;
  unit: string;
  unit_size: number;
  cost: number;
};

type BuildItem = {
  id: number;
  packagingId: string;
  qty: number;
};

export default function EmbalagensPage() {
  const { user } = useAuth();
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);

  // Form - Nova Compra
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unidade");
  const [unitSize, setUnitSize] = useState(1);
  const [cost, setCost] = useState(0);

  // Form - Montar Embalagem
  const [buildName, setBuildName] = useState("");
  const [buildItems, setBuildItems] = useState<BuildItem[]>([{ id: Date.now(), packagingId: "", qty: 1 }]);

  useEffect(() => {
    if (user) fetchPackagings();
  }, [user]);

  const fetchPackagings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("packaging")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Erro:", error);
    else setPackagings(data || []);
    setLoading(false);
  };

  const handleAddPackaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("packaging").insert([{
      user_id: user.id, name, unit, unit_size: unitSize, cost,
    }]);
    if (error) { alert("Erro ao adicionar."); console.error(error); }
    else { setName(""); setUnit("unidade"); setUnitSize(1); setCost(0); fetchPackagings(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta embalagem?")) return;
    const { error } = await supabase.from("packaging").delete().eq("id", id);
    if (error) alert("Erro ao excluir.");
    else fetchPackagings();
  };

  // Montar Embalagem
  const addBuildItem = () => setBuildItems([...buildItems, { id: Date.now(), packagingId: "", qty: 1 }]);
  const removeBuildItem = (id: number) => setBuildItems(buildItems.filter(b => b.id !== id));
  const updateBuildItem = (id: number, field: string, value: any) => {
    setBuildItems(buildItems.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const buildTotalCost = buildItems.reduce((acc, item) => {
    const pkg = packagings.find(p => p.id === item.packagingId);
    if (!pkg) return acc;
    const unitCost = pkg.cost / pkg.unit_size;
    return acc + (unitCost * item.qty);
  }, 0);

  const handleBuildPackaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !buildName.trim()) return;
    if (buildItems.every(b => !b.packagingId)) { alert("Adicione pelo menos um insumo."); return; }

    const { error } = await supabase.from("packaging").insert([{
      user_id: user.id,
      name: buildName,
      unit: "unidade",
      unit_size: 1,
      cost: parseFloat(buildTotalCost.toFixed(2)),
    }]);

    if (error) { alert("Erro ao salvar."); console.error(error); }
    else {
      setBuildName("");
      setBuildItems([{ id: Date.now(), packagingId: "", qty: 1 }]);
      fetchPackagings();
    }
  };

  const fmtR = (v: number) => `R$ ${v.toFixed(2)}`;

  return (
    <AppLayout title="Embalagens" subtitle="Insumos de embalagem e montagem">

      {/* ═══ TOP: FORMS GRID ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>

        {/* ── CARD: Nova Compra ── */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(99,102,241,0.15)', borderRadius: '12px', color: '#818cf8', display: 'flex' }}>
                <Package size={18} />
              </div>
              <h2 style={{ margin: 0 }}>Nova Compra / Insumo</h2>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddPackaging} className="space-y-4 mt-4">
              <div className="input-group">
                <label>Nome do Insumo</label>
                <div className="input-wrapper">
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Caixa 16x11, Ímã 10x2mm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Unidade</label>
                  <div className="input-wrapper">
                    <select value={unit} onChange={e => setUnit(e.target.value)}>
                      <option value="unidade">Unidade (un)</option>
                      <option value="caixa">Caixa (cx)</option>
                      <option value="pacote">Pacote (pct)</option>
                      <option value="rolo">Rolo</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>Quantidade no Lote</label>
                  <div className="input-wrapper">
                    <input type="number" min="1" required value={unitSize} onChange={e => setUnitSize(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Custo Total (R$)</label>
                <div className="input-wrapper">
                  <input type="number" min="0" step="0.01" required value={cost} onChange={e => setCost(Number(e.target.value))} />
                </div>
              </div>

              {cost > 0 && unitSize > 0 && (
                <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', fontSize: '13px', color: '#a5b4fc' }}>
                  Custo unitário: <strong style={{ color: '#818cf8', fontFamily: 'monospace' }}>{fmtR(cost / unitSize)}</strong>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '20px' }}>
                <Plus size={18} /> Adicionar Insumo
              </button>
            </form>
          </div>
        </div>

        {/* ── CARD: Montar Embalagem ── */}
        <div className="card" style={{ borderColor: 'rgba(168,85,247,0.25)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(168,85,247,0.15)', borderRadius: '12px', color: '#c084fc', display: 'flex' }}>
                <Layers size={18} />
              </div>
              <h2 style={{ margin: 0 }}>Montar Embalagem</h2>
            </div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px', marginBottom: '16px' }}>
              Combine insumos cadastrados para criar uma embalagem composta com custo calculado automaticamente.
            </p>
            <form onSubmit={handleBuildPackaging} className="space-y-4">
              <div className="input-group">
                <label>Nome da Embalagem</label>
                <div className="input-wrapper">
                  <input type="text" required value={buildName} onChange={e => setBuildName(e.target.value)} placeholder="Ex: Embalagem Padrão Média" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Insumos da Embalagem
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {buildItems.map((item, idx) => {
                    const pkg = packagings.find(p => p.id === item.packagingId);
                    const unitCost = pkg ? (pkg.cost / pkg.unit_size) : 0;
                    const lineCost = unitCost * item.qty;

                    return (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px', background: 'rgba(15,17,35,0.5)',
                        border: '1px solid rgba(55,65,81,0.4)', borderRadius: '14px',
                      }}>
                        <div style={{ flex: 2 }}>
                          <div className="input-wrapper" style={{ marginBottom: 0 }}>
                            <select value={item.packagingId} onChange={e => updateBuildItem(item.id, "packagingId", e.target.value)}>
                              <option value="">Selecione...</option>
                              {packagings.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({fmtR(p.cost / p.unit_size)}/un)</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div style={{ width: '70px' }}>
                          <div className="input-wrapper" style={{ marginBottom: 0 }}>
                            <input type="number" min="1" value={item.qty} onChange={e => updateBuildItem(item.id, "qty", parseInt(e.target.value) || 1)} placeholder="Qtd" />
                          </div>
                        </div>
                        <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: lineCost > 0 ? '#a5b4fc' : '#4b5563' }}>
                          {lineCost > 0 ? fmtR(lineCost) : '—'}
                        </div>
                        {buildItems.length > 1 && (
                          <button type="button" onClick={() => removeBuildItem(item.id)} style={{
                            padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: 'rgba(239,68,68,0.1)', color: '#f87171', display: 'flex',
                          }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button type="button" onClick={addBuildItem} style={{
                  marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px', border: '1px dashed rgba(168,85,247,0.4)',
                  background: 'rgba(168,85,247,0.06)', color: '#c084fc', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center',
                }}>
                  <Plus size={14} /> Adicionar Insumo
                </button>
              </div>

              {/* Total */}
              <div style={{
                padding: '16px 20px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.06))',
                border: '1px solid rgba(168,85,247,0.25)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>Custo Total da Embalagem</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: '#c084fc' }}>
                  {fmtR(buildTotalCost)}
                </span>
              </div>

              <button type="submit" className="btn w-full" style={{
                marginTop: '8px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                color: 'white', border: 'none', boxShadow: '0 4px 16px rgba(168,85,247,0.3)',
              }}>
                <Layers size={18} /> Salvar Embalagem Montada
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ═══ ESTOQUE ═══ */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16,185,129,0.15)', borderRadius: '12px', color: '#34d399', display: 'flex' }}>
              <Package size={18} />
            </div>
            <h2 style={{ margin: 0 }}>Estoque de Insumos & Embalagens</h2>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
          ) : packagings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
              <Package size={40} style={{ color: '#374151', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#9ca3af' }}>Nenhuma embalagem cadastrada</p>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6b7280' }}>Use os formulários acima para cadastrar insumos ou montar embalagens.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '16px' }}>
              {packagings.map(p => {
                const unitCost = p.unit_size > 0 ? p.cost / p.unit_size : 0;
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 18px', borderRadius: '16px',
                    background: 'rgba(15,17,35,0.5)',
                    border: '1px solid rgba(55,65,81,0.35)',
                    transition: 'border-color 0.2s',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#f3f4f6' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        {p.unit_size} {p.unit} • Total: <strong style={{ color: '#818cf8', fontFamily: 'monospace' }}>{fmtR(p.cost)}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Custo unitário: <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>{fmtR(unitCost)}</strong>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(p.id)} style={{
                      padding: '8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: 'rgba(239,68,68,0.1)', color: '#f87171', display: 'flex',
                      transition: 'all 0.15s',
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </AppLayout>
  );
}
