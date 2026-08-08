"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2 } from "lucide-react";

type Packaging = {
  id: string;
  name: string;
  unit: string;
  unit_size: number;
  cost: number;
};

export default function EmbalagensPage() {
  const { user } = useAuth();
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unidade");
  const [unitSize, setUnitSize] = useState(1);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    if (user) {
      fetchPackagings();
    }
  }, [user]);

  const fetchPackagings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("packaging")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar embalagens:", error);
    } else {
      setPackagings(data || []);
    }
    setLoading(false);
  };

  const handleAddPackaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newPackaging = {
      user_id: user.id,
      name,
      unit,
      unit_size: unitSize,
      cost,
    };

    const { error } = await supabase.from("packaging").insert([newPackaging]);

    if (error) {
      alert("Erro ao adicionar embalagem.");
      console.error(error);
    } else {
      setName("");
      setUnit("unidade");
      setUnitSize(1);
      setCost(0);
      fetchPackagings();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta embalagem?")) return;

    const { error } = await supabase.from("packaging").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir.");
    } else {
      fetchPackagings();
    }
  };

  return (
    <AppLayout title="Embalagens" subtitle="Controle de Insumos">
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <div className="card">
            <h2>Nova Compra / Insumo</h2>
            <form onSubmit={handleAddPackaging} className="space-y-4 mt-4">
              <div className="input-group">
                <label>Nome da Embalagem (Ex: Argola 25mm, Ímã 10x2mm)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite o nome..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="unidade">Unidade (un)</option>
                    <option value="caixa">Caixa (cx)</option>
                    <option value="pacote">Pacote (pct)</option>
                    <option value="rolo">Rolo</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Tamanho da Unidade / Qtd</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={unitSize}
                    onChange={(e) => setUnitSize(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Custo Total (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                />
              </div>

              <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
                <Plus size={20} />
                Adicionar Embalagem
              </button>
            </form>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="card h-full">
            <h2>Estoque de Insumos</h2>
            
            {loading ? (
              <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
            ) : packagings.length === 0 ? (
              <p className="text-[var(--text-muted)] mt-4">Nenhuma embalagem cadastrada.</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {packagings.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-md bg-[var(--bg-color)]">
                    <div>
                      <div className="font-medium text-[var(--text-color)]">{p.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {p.unit_size} {p.unit} • Custo: R$ {p.cost.toFixed(2)}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-400 p-2">
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
