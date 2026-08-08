"use client";

import AppLayout from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2 } from "lucide-react";

type Marketplace = {
  id: string;
  name: string;
  fee_percentage: number;
  fixed_fee: number;
  free_shipping_cost: number;
};

export default function MarketplacesPage() {
  const { user } = useAuth();
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [feePercentage, setFeePercentage] = useState<number | "">("");
  const [fixedFee, setFixedFee] = useState<number | "">("");
  const [freeShippingCost, setFreeShippingCost] = useState<number | "">("");

  useEffect(() => {
    if (user) {
      fetchMarketplaces();
    }
  }, [user]);

  const fetchMarketplaces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar marketplaces:", error);
    } else {
      setMarketplaces(data || []);
    }
    setLoading(false);
  };

  const handleAddMarketplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newMarketplace = {
      user_id: user.id,
      name,
      fee_percentage: Number(feePercentage) || 0,
      fixed_fee: Number(fixedFee) || 0,
      free_shipping_cost: Number(freeShippingCost) || 0,
    };

    const { error } = await supabase.from("marketplaces").insert([newMarketplace]);

    if (error) {
      alert("Erro ao adicionar canal de venda.");
      console.error(error);
    } else {
      // Reset form
      setName("");
      setFeePercentage("");
      setFixedFee("");
      setFreeShippingCost("");
      fetchMarketplaces();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este canal de venda?")) return;

    const { error } = await supabase.from("marketplaces").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir.");
    } else {
      fetchMarketplaces();
    }
  };

  return (
    <AppLayout title="Canais de Venda" subtitle="Marketplaces & Comissões">
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <div className="card">
            <h2>Cadastrar Canal de Venda</h2>
            <form onSubmit={handleAddMarketplace} className="space-y-4 mt-4">
              <div className="input-group">
                <label htmlFor="name">Nome do Canal</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Shopee, Mercado Livre, Elo7..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="feePercentage">Taxa de Comissão (%)</label>
                  <input
                    type="number"
                    id="feePercentage"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={feePercentage}
                    onChange={(e) => setFeePercentage(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="fixedFee">Taxa Fixa (R$)</label>
                  <input
                    type="number"
                    id="fixedFee"
                    min="0"
                    step="0.01"
                    required
                    value={fixedFee}
                    onChange={(e) => setFixedFee(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="freeShippingCost">Frete Padrão (R$)</label>
                <input
                  type="number"
                  id="freeShippingCost"
                  min="0"
                  step="0.01"
                  required
                  value={freeShippingCost}
                  onChange={(e) => setFreeShippingCost(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
                <Plus size={20} />
                Cadastrar Canal
              </button>
            </form>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="card h-full">
            <h2>Canais Cadastrados</h2>
            
            {loading ? (
              <p className="text-[var(--text-muted)] mt-4">Carregando...</p>
            ) : marketplaces.length === 0 ? (
              <p className="text-[var(--text-muted)] mt-4">Nenhum canal cadastrado.</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {marketplaces.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-md bg-[var(--bg-color)]">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-[var(--text-color)]">{m.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Comissão: {m.fee_percentage}% • Taxa: R$ {m.fixed_fee.toFixed(2)} • Frete: R$ {m.free_shipping_cost.toFixed(2)}
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
