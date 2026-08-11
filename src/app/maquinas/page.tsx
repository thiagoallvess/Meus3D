"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2 } from "lucide-react";

type Machine = {
  id: string;
  name: string;
  purchase_price: number;
  power_watts: number;
  depreciation_rate: number;
  kwh_cost: number;
};

export default function MaquinasPage() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [powerWatts, setPowerWatts] = useState<number | "">("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [depreciationRate, setDepreciationRate] = useState<number | "">("");
  const [kwhCost, setKwhCost] = useState<number | "">("");

  const fetchMachines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar máquinas:", error);
    } else {
      setMachines(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchMachines();
    }
  }, [user]);

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newMachine = {
      user_id: user.id,
      name,
      power_watts: Number(powerWatts) || 0,
      purchase_price: Number(purchasePrice) || 0,
      depreciation_rate: Number(depreciationRate) || 0,
      kwh_cost: Number(kwhCost) || 0,
    };

    const { error } = await supabase.from("machines").insert([newMachine]);

    if (error) {
      alert("Erro ao adicionar máquina.");
      console.error(error);
    } else {
      // Reset form
      setName("");
      setPowerWatts("");
      setPurchasePrice("");
      setDepreciationRate("");
      setKwhCost("");
      fetchMachines();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta máquina?")) return;

    const { error } = await supabase.from("machines").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir.");
    } else {
      fetchMachines();
    }
  };

  return (
    <AppLayout title="Máquinas & Manutenção" subtitle="Controle de Ativos e Custos">
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <div className="card">
            <h2>Nova Máquina</h2>
            <form onSubmit={handleAddMachine} className="space-y-4 mt-4">
              <div className="input-group">
                <label htmlFor="name">Nome da Impressora</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ender 3 V3 KE"
                  className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="purchasePrice">Valor Pago (R$)</label>
                  <input
                    type="number"
                    id="purchasePrice"
                    min="0"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)]"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="powerWatts">Potência (W)</label>
                  <input
                    type="number"
                    id="powerWatts"
                    min="0"
                    step="1"
                    required
                    value={powerWatts}
                    onChange={(e) => setPowerWatts(Number(e.target.value))}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="depreciationRate">Desgaste (R$/hora)</label>
                  <input
                    type="number"
                    id="depreciationRate"
                    min="0"
                    step="0.01"
                    required
                    value={depreciationRate}
                    onChange={(e) => setDepreciationRate(Number(e.target.value))}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)]"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="kwhCost">Energia (R$/kWh)</label>
                  <input
                    type="number"
                    id="kwhCost"
                    min="0"
                    step="0.01"
                    required
                    value={kwhCost}
                    onChange={(e) => setKwhCost(Number(e.target.value))}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl w-full flex justify-center items-center gap-2 mt-4 transition-colors">
                <Plus size={20} />
                Adicionar Máquina
              </button>
            </form>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="card h-full">
            <h2>Máquinas Cadastradas</h2>
            
            {loading ? (
              <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
            ) : machines.length === 0 ? (
              <p className="text-[var(--text-muted)] mt-4">Nenhuma máquina cadastrada.</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {machines.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 border border-[var(--border-card)] rounded-xl bg-[var(--bg-body)]/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{m.name}</div>
                        <div className="text-sm text-[var(--text-secondary)] mt-1">
                          R$ {Number(m.purchase_price).toFixed(2)} • {m.power_watts}W
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1 flex gap-3">
                          <span>Desgaste: R$ {Number(m.depreciation_rate).toFixed(2)}/h</span>
                          <span>Energia: R$ {Number(m.kwh_cost).toFixed(2)}/kWh</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors">
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
