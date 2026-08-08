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
            <h2>Novo Filamento</h2>
            <form onSubmit={handleAddFilament} className="space-y-4 mt-4">
              <div className="input-group">
                <label>Marca</label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: 3D Fila"

                />
              </div>
              
              <div className="input-group">
                <label>Material</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Cor (Nome)</label>
                  <input
                    type="text"
                    required
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    placeholder="Ex: Preto"
  
                  />
                </div>
                <div className="input-group">
                  <label>Cor (Visual)</label>
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-full h-[42px] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Peso (g)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}

                  />
                </div>
                <div className="input-group">
                  <label>Preço (R$)</label>
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

              <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
                <Plus size={20} />
                Adicionar Filamento
              </button>
            </form>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="card h-full">
            <h2>Estoque Atual</h2>
            
            {loading ? (
              <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
            ) : filaments.length === 0 ? (
              <p className="text-[var(--text-muted)] mt-4">Nenhum filamento cadastrado.</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filaments.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-md bg-[var(--bg-color)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-gray-600" style={{ backgroundColor: f.color_hex }}></div>
                      <div>
                        <div className="font-medium text-[var(--text-color)]">{f.brand} - {f.material}</div>
                        <div className="text-xs text-[var(--text-muted)]">{f.color_name} • {f.weight}g • R$ {f.price.toFixed(2)}</div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-400 p-2">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
