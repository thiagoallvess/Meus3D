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
                    <div className="input-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="w-full h-[42px] cursor-pointer"
                        style={{ padding: 0, border: 'none', minHeight: '48px' }}
                      />
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
                    <div key={f.id} className="flex items-center justify-between p-4 border border-[var(--border-card)] rounded-xl bg-[var(--bg-body)]/50 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-[var(--border-card)] shadow-sm" style={{ backgroundColor: f.color_hex }}></div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{f.brand} - {f.material}</div>
                          <div className="text-sm text-[var(--text-secondary)] mt-1">{f.color_name} • {f.weight}g • R$ {f.price.toFixed(2)}</div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors">
                        <Trash2 size={18} />
                      </button>
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
