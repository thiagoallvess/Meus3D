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
            <div className="card-header">
              <h2>Nova Compra / Insumo</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddPackaging} className="space-y-4 mt-4">
                <div className="input-group">
                  <label>Nome da Embalagem (Ex: Argola 25mm, Ímã 10x2mm)</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Digite o nome..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label>Unidade</label>
                    <div className="input-wrapper">
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
                  </div>
                  <div className="input-group">
                    <label>Tamanho da Unidade / Qtd</label>
                    <div className="input-wrapper">
                      <input
                        type="number"
                        min="1"
                        required
                        value={unitSize}
                        onChange={(e) => setUnitSize(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label>Custo Total (R$)</label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={cost}
                      onChange={(e) => setCost(Number(e.target.value))}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4">
                  <Plus size={20} />
                  Adicionar Embalagem
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="card h-full">
            <div className="card-header">
              <h2>Estoque de Insumos</h2>
            </div>
            <div className="card-body">
              {loading ? (
                <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
              ) : packagings.length === 0 ? (
                <p className="text-[var(--text-muted)] mt-4">Nenhuma embalagem cadastrada.</p>
              ) : (
                <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {packagings.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 border border-[var(--border-card)] rounded-xl bg-[var(--bg-body)]/50 backdrop-blur-sm">
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{p.name}</div>
                        <div className="text-sm text-[var(--text-secondary)] mt-1">
                          {p.unit_size} {p.unit} • Custo: R$ {p.cost.toFixed(2)}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors">
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
