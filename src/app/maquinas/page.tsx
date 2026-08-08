"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2 } from "lucide-react";

type Machine = {
  id: string;
  name: string;
  power_watts: number;
  life_hours: number;
  maintenance_cost_year: number;
  value: number;
};

export default function MaquinasPage() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [powerWatts, setPowerWatts] = useState(350);
  const [lifeHours, setLifeHours] = useState(10000);
  const [maintenanceCostYear, setMaintenanceCostYear] = useState(0);
  const [value, setValue] = useState(0);

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
      power_watts: powerWatts,
      life_hours: lifeHours,
      maintenance_cost_year: maintenanceCostYear,
      value,
    };

    const { error } = await supabase.from("machines").insert([newMachine]);

    if (error) {
      alert("Erro ao adicionar máquina.");
      console.error(error);
    } else {
      // Reset form
      setName("");
      setPowerWatts(350);
      setLifeHours(10000);
      setMaintenanceCostYear(0);
      setValue(0);
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
    <AppLayout title="Máquinas & Manutenção" subtitle="Controle de Ativos e Payback">
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <div className="card">
            <h2>Nova Máquina</h2>
            <form onSubmit={handleAddMachine} className="space-y-4 mt-4">
              <div className="input-group">
                <label htmlFor="name">Nome / Apelido</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ender 3 V2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="value">Valor da Máquina (R$)</label>
                  <input
                    type="number"
                    id="value"
                    min="0"
                    step="0.01"
                    required
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="lifeHours">Vida Útil (Horas)</label>
                  <input
                    type="number"
                    id="lifeHours"
                    min="1"
                    step="1"
                    required
                    value={lifeHours}
                    onChange={(e) => setLifeHours(Number(e.target.value))}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="maintenanceCostYear">Manutenção Anual (R$)</label>
                  <input
                    type="number"
                    id="maintenanceCostYear"
                    min="0"
                    step="0.01"
                    required
                    value={maintenanceCostYear}
                    onChange={(e) => setMaintenanceCostYear(Number(e.target.value))}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
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
                  <div key={m.id} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-md bg-[var(--bg-color)]">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-[var(--text-color)]">{m.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          R$ {m.value.toFixed(2)} • {m.power_watts}W • {m.life_hours}h • R$ {m.maintenance_cost_year.toFixed(2)}/ano
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-400 p-2">
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
