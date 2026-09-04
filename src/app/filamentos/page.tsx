"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2 } from "lucide-react";

type Filament = {
  id: string;
  brand: string;
  material: string;
  color_name: string;
  color_hex: string;
  weight: number;
  price: number;
};

export default function FilamentosPage() {
  const { user } = useAuth();
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock addition state
  const [stockToAdd, setStockToAdd] = useState<string | null>(null);
  const [addWeight, setAddWeight] = useState(1000);
  const [addPrice, setAddPrice] = useState(0);

  // Form states
  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("PLA");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#ffffff");
  const [weight, setWeight] = useState(1000);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (user) {
      fetchFilaments();
    }
  }, [user]);

  const fetchFilaments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("filaments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar filamentos:", error);
    } else {
      setFilaments(data || []);
    }
    setLoading(false);
  };

  const handleAddFilament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newFilament = {
      user_id: user.id,
      brand,
      material,
      color_name: colorName,
      color_hex: colorHex,
      weight,
      price,
    };

    const { error } = await supabase.from("filaments").insert([newFilament]);

    if (error) {
      alert("Erro ao adicionar filamento.");
      console.error(error);
    } else {
      // Reset form
      setBrand("");
      setColorName("");
      setPrice(0);
      fetchFilaments();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este filamento?")) return;

    const { error } = await supabase.from("filaments").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir.");
    } else {
      fetchFilaments();
    }
  };

  const handleAddStock = async (e: React.FormEvent, filament: Filament) => {
    e.preventDefault();
    if (!user) return;

    const newWeight = filament.weight + addWeight;
    const newPrice = filament.price + addPrice;

    const { error } = await supabase
      .from("filaments")
      .update({ weight: newWeight, price: newPrice })
      .eq("id", filament.id);

    if (error) {
      alert("Erro ao adicionar estoque.");
      console.error(error);
    } else {
      setStockToAdd(null);
      setAddWeight(1000);
      setAddPrice(0);
      fetchFilaments();
    }
  };

  return (
    <AppLayout title="Cadastro de Filamentos" subtitle="Gerencie seu estoque de materiais">
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <div className="card">
            <div className="card-header">
              <h2>Novo Filamento</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddFilament} className="space-y-4 mt-4">
                <div className="input-group">
                  <label>Marca</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      required
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ex: 3D Fila"
                    />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>Material</label>
                  <div className="input-wrapper">
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                    >
                      <option value="PLA">PLA</option>
                      <option value="PETG">PETG</option>
                      <option value="ABS">ABS</option>
                      <option value="TPU">TPU</option>
                      <option value="Resina">Resina</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label>Cor (Nome)</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        required
                        value={colorName}
                        onChange={(e) => setColorName(e.target.value)}
                        placeholder="Ex: Preto"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Cor (Visual)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div
                          style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            backgroundColor: colorHex,
                            border: '2px solid rgba(99,102,241,0.3)',
                            boxShadow: `0 0 12px ${colorHex}40`,
                            cursor: 'pointer',
                          }}
                          onClick={() => document.getElementById('color-picker-hidden')?.click()}
                        />
                        <input
                          id="color-picker-hidden"
                          type="color"
                          value={colorHex}
                          onChange={(e) => setColorHex(e.target.value)}
                          style={{ position: 'absolute', top: 0, left: 0, width: '44px', height: '44px', opacity: 0, cursor: 'pointer' }}
                        />
                      </div>
                      <div className="input-wrapper" style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={colorHex}
                          onChange={(e) => {
                            let v = e.target.value;
                            if (!v.startsWith('#')) v = '#' + v;
                            setColorHex(v);
                          }}
                          placeholder="#ffffff"
                          style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label>Peso (g)</label>
                    <div className="input-wrapper">
                      <input
                        type="number"
                        min="1"
                        required
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Preço (R$)</label>
                    <div className="input-wrapper">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4">
                  <Plus size={20} />
                  Adicionar Filamento
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="card h-full">
            <div className="card-header">
              <h2>Estoque Atual</h2>
            </div>
            <div className="card-body">
              {loading ? (
                <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
              ) : filaments.length === 0 ? (
                <p className="text-[var(--text-muted)] mt-4">Nenhum filamento cadastrado.</p>
              ) : (
                <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {filaments.map((f) => (
                    <div key={f.id} className="flex flex-col p-4 border border-[var(--border-card)] rounded-xl bg-[var(--bg-body)]/50 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border border-[var(--border-card)] shadow-sm" style={{ backgroundColor: f.color_hex }}></div>
                          <div>
                            <div className="font-bold text-[var(--text-primary)]">{f.brand} - {f.material}</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-1">{f.color_name} • {f.weight}g • R$ {f.price.toFixed(2)}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Custo Médio: R$ {(f.price / f.weight).toFixed(4)}/g</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setStockToAdd(stockToAdd === f.id ? null : f.id)} 
                            className="text-[var(--accent-blue)] hover:text-blue-300 p-2 bg-[var(--accent-blue)]/10 rounded-lg hover:bg-[var(--accent-blue)]/20 transition-colors"
                            title="Adicionar Estoque"
                          >
                            <Plus size={18} />
                          </button>
                          <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors" title="Excluir">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {stockToAdd === f.id && (
                        <form onSubmit={(e) => handleAddStock(e, f)} className="mt-4 pt-4 border-t border-[var(--border-card)]">
                          <h4 className="text-sm font-bold mb-3 text-[var(--text-primary)]">Nova Entrada de Estoque</h4>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="input-group mb-0">
                              <label className="text-xs">Peso adicional (g)</label>
                              <div className="input-wrapper">
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={addWeight} 
                                  onChange={e => setAddWeight(Number(e.target.value))} 
                                  required 
                                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }} 
                                />
                              </div>
                            </div>
                            <div className="input-group mb-0">
                              <label className="text-xs">Custo total (R$)</label>
                              <div className="input-wrapper">
                                <input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  value={addPrice} 
                                  onChange={e => setAddPrice(Number(e.target.value))} 
                                  required 
                                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }} 
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end mt-2">
                            <button type="button" onClick={() => setStockToAdd(null)} className="btn btn-secondary py-1 px-3" style={{ fontSize: '13px', height: 'auto' }}>Cancelar</button>
                            <button type="submit" className="btn btn-primary py-1 px-3" style={{ fontSize: '13px', height: 'auto' }}>Salvar Entrada</button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
