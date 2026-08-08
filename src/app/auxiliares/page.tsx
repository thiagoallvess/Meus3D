"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2 } from "lucide-react";

type Auxiliary = {
  id: string;
  name: string;
  cost: number;
  unit: string;
  unit_size: number;
};

export default function AuxiliaresPage() {
  const { user } = useAuth();
  const [auxiliaries, setAuxiliaries] = useState<Auxiliary[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [cost, setCost] = useState(0);
  const [unit, setUnit] = useState("unidade");
  const [unitSize, setUnitSize] = useState(1);

  useEffect(() => {
    if (user) {
      fetchAuxiliaries();
    }
  }, [user]);

  const fetchAuxiliaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("auxiliaries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar auxiliares:", error);
    } else {
      setAuxiliaries(data || []);
    }
    setLoading(false);
  };

  const handleAddAuxiliary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newAux = {
      user_id: user.id,
      name,
      cost,
      unit,
      unit_size: unitSize,
    };

    const { error } = await supabase.from("auxiliaries").insert([newAux]);

    if (error) {
      alert("Erro ao adicionar auxiliar.");
      console.error(error);
    } else {
      // Reset form
      setName("");
      setCost(0);
      setUnitSize(1);
      fetchAuxiliaries();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este insumo?")) return;

    const { error } = await supabase.from("auxiliaries").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir.");
    } else {
      fetchAuxiliaries();
    }
  };

  return (
    <AppLayout title="Insumos Auxiliares" subtitle="Gestão de parafusos, tintas, resinas, etc.">
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <div className="card">
            <h2>Novo Insumo</h2>
            <form onSubmit={handleAddAuxiliary} className="space-y-4 mt-4">
              <div className="input-group">
                <label>Nome do Insumo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Parafuso M3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="input-group">
                  <label>Tipo de Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="unidade">Unidade(s) / Pç</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="g">Gramas (g)</option>
                    <option value="cm">Centímetros (cm)</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Rendimento (Quantas unidades vêm?)</label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  required
                  value={unitSize}
                  onChange={(e) => setUnitSize(Number(e.target.value))}
                  placeholder="Ex: 100 (para um pacote com 100)"
                />
              </div>

              <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2 mt-4">
                <Plus size={20} />
                Adicionar Insumo
              </button>
            </form>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="card h-full">
            <h2>Insumos Cadastrados</h2>
            
            {loading ? (
              <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
            ) : auxiliaries.length === 0 ? (
              <p className="text-[var(--text-muted)] mt-4">Nenhum insumo cadastrado.</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {auxiliaries.map((a) => {
                  const unitCost = a.cost / a.unit_size;
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-md bg-[var(--bg-color)]">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-[var(--text-color)]">{a.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            R$ {a.cost.toFixed(2)} por {a.unit_size} {a.unit} • Custo unitário: R$ {unitCost.toFixed(4)}/{a.unit === 'unidade' ? 'un' : a.unit}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-400 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
