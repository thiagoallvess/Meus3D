"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useCalculatorData } from "@/lib/useCalculatorData";
import { computeResults, CalculatorValues } from "@/lib/calculator";
import { 
  Package, Box, Trash2,
  DollarSign, Calculator as CalcIcon, 
  Droplet, Layers, Zap, TrendingUp,
  Save, Download, ArrowRight
} from "lucide-react";

export default function Calculator({ isKit = false }: { isKit?: boolean }) {
  const { machines, filaments, auxiliaries, packaging, marketplaces, loading } = useCalculatorData();
  
  const [productName, setProductName] = useState("");
  
  // Impressao
  const [printTimeHours, setPrintTimeHours] = useState<number | "">("");
  const [printTimeMinutes, setPrintTimeMinutes] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [piecesPerKit, setPiecesPerKit] = useState<number | "">(1);
  
  const [activeFilaments, setActiveFilaments] = useState([{ id: Date.now(), filamentId: "", weight: "" as number | "" }]);
  const [activeAuxiliaries, setActiveAuxiliaries] = useState<{id: number, auxiliaryId: string, quantity: number | ""}[]>([]);
  
  // Operacional
  const [packagingId, setPackagingId] = useState("");
  const [packagingCost, setPackagingCost] = useState<number | "">("");
  const [otherCosts, setOtherCosts] = useState<number | "">("");
  
  // Maquina
  const [machineId, setMachineId] = useState("");
  const [powerWatts, setPowerWatts] = useState<number | "">("");
  const [kwhCost, setKwhCost] = useState<number | "">("");
  const [machineHourCost, setMachineHourCost] = useState<number | "">(1.7);
  const [postProcessing, setPostProcessing] = useState<number | "">("");
  const [designCost, setDesignCost] = useState<number | "">("");
  const [failureRate, setFailureRate] = useState<number | "">("");
  
  // Venda
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [salePriceMarketplace, setSalePriceMarketplace] = useState<number | "">("");
  
  // View mode
  const [viewMode, setViewMode] = useState<"unit" | "batch">("unit");
  const [activeMarketplaceId, setActiveMarketplaceId] = useState<string | null>(null);

  // Auto-fill packaging cost
  useEffect(() => {
    if (packagingId) {
      const pkg = packaging.find(p => p.id === packagingId);
      if (pkg) setPackagingCost(pkg.cost);
    } else {
      setPackagingCost("");
    }
  }, [packagingId, packaging]);

  // Auto-fill machine data
  useEffect(() => {
    if (machineId) {
      const mac = machines.find(m => m.id === machineId);
      if (mac) {
        setPowerWatts(mac.power_watts);
      }
    } else {
      setPowerWatts("");
    }
  }, [machineId, machines]);

  // Handlers for dynamic lists
  const addFilament = () => {
    setActiveFilaments([...activeFilaments, { id: Date.now(), filamentId: "", weight: "" }]);
  };
  
  const removeFilament = (id: number) => {
    setActiveFilaments(activeFilaments.filter(f => f.id !== id));
  };
  
  const updateFilament = (id: number, field: string, value: string | number) => {
    setActiveFilaments(activeFilaments.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const addAuxiliary = () => {
    setActiveAuxiliaries([...activeAuxiliaries, { id: Date.now(), auxiliaryId: "", quantity: "" }]);
  };
  
  const removeAuxiliary = (id: number) => {
    setActiveAuxiliaries(activeAuxiliaries.filter(a => a.id !== id));
  };
  
  const updateAuxiliary = (id: number, field: string, value: string | number) => {
    setActiveAuxiliaries(activeAuxiliaries.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Calculate results
  const results = useMemo(() => {
    const totalWeight = activeFilaments.reduce((acc, f) => acc + (Number(f.weight) || 0), 0);
    
    // Average filament cost per kg based on weights
    let avgFilamentCostKg = 0;
    if (totalWeight > 0) {
      const totalCost = activeFilaments.reduce((acc, f) => {
        const fil = filaments.find(x => x.id === f.filamentId);
        const costKg = fil ? fil.cost_kg : 0;
        return acc + ((Number(f.weight) || 0) / 1000) * costKg;
      }, 0);
      avgFilamentCostKg = (totalCost / (totalWeight / 1000));
    }

    const totalAuxCost = activeAuxiliaries.reduce((acc, a) => {
      const aux = auxiliaries.find(x => x.id === a.auxiliaryId);
      const costPerUnit = aux ? aux.cost : 0;
      return acc + (Number(a.quantity) || 0) * costPerUnit;
    }, 0);

    const timeHours = (Number(printTimeHours) || 0) + (Number(printTimeMinutes) || 0) / 60;
    const effectiveQuantity = Number(quantity) || 1; 

    // Find marketplace fee
    let platformFee = 0;
    if (activeMarketplaceId) {
      const mkt = marketplaces.find(m => m.id === activeMarketplaceId);
      if (mkt) platformFee = mkt.fee_percentage;
    }

    const values: CalculatorValues = {
      weight: totalWeight,
      filamentCostKg: avgFilamentCostKg,
      totalAuxiliaryCost: totalAuxCost,
      printTime: timeHours,
      powerWatts: Number(powerWatts) || 0,
      kwhCost: Number(kwhCost) || 0,
      quantity: effectiveQuantity,
      packagingCost: Number(packagingCost) || 0,
      shippingCost: 0,
      platformFee: platformFee,
      otherCosts: Number(otherCosts) || 0,
      machineHourCost: Number(machineHourCost) || 0,
      postProcessing: Number(postProcessing) || 0,
      designCost: Number(designCost) || 0,
      failureRate: Number(failureRate) || 0,
      salePrice: Number(salePrice) || 0,
      salePriceMarketplace: Number(salePriceMarketplace) || 0,
    };

    return computeResults(values);
  }, [
    activeFilaments, activeAuxiliaries, filaments, auxiliaries,
    printTimeHours, printTimeMinutes, quantity, piecesPerKit,
    powerWatts, kwhCost, packagingCost, otherCosts,
    machineHourCost, postProcessing, designCost, failureRate,
    salePrice, salePriceMarketplace, activeMarketplaceId, marketplaces
  ]);

  const multiplier = viewMode === "unit" ? 1 / (Number(quantity) || 1) : 1;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <>
      {/* Product Name */}
      <div className="product-name-bar">
        <div className="input-group">
          <label htmlFor="productName">
            <Package size={16} />
            Nome do Produto {isKit ? "(Kit)" : ""}
          </label>
          <input 
            type="text" 
            id="productName" 
            placeholder={isKit ? "Ex: Kit 3 Vasos Decorativos..." : "Ex: Suporte para celular, Vaso decorativo..."} 
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            autoComplete="off" 
          />
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Custos da Impressão Card */}
        <section className="card card-costs">
          <div className="card-header">
            <div className="card-icon card-icon-blue">
              <Droplet size={20} />
            </div>
            <h2>Custos da Impressão</h2>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border-card)" }}>
              <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={16} />
                Cores da Impressão
              </h3>
              <button type="button" className="btn-secondary" onClick={addFilament} style={{ padding: "6px 12px", fontSize: 12, height: "auto" }}>
                + Adicionar Cor
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {activeFilaments.map((af, idx) => (
                <div key={af.id} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                    {idx === 0 && <label>Filamento</label>}
                    <div className="input-wrapper">
                      <select 
                        value={af.filamentId} 
                        onChange={(e) => updateFilament(af.id, "filamentId", e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {filaments.map(f => (
                          <option key={f.id} value={f.id}>{f.name} - {f.brand}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    {idx === 0 && <label>Peso (g)</label>}
                    <div className="input-wrapper">
                      <input 
                        type="number" 
                        placeholder="0" 
                        min="0" 
                        value={af.weight} 
                        onChange={(e) => updateFilament(af.id, "weight", e.target.value !== "" ? parseFloat(e.target.value) : "")}
                      />
                      <span className="input-suffix">g</span>
                    </div>
                  </div>
                  {activeFilaments.length > 1 && (
                    <button 
                      type="button" 
                      className="btn-icon" 
                      style={{ height: 42, width: 42, color: "var(--danger)" }}
                      onClick={() => removeFilament(af.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="section-header" style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <Package size={20} />
                Materiais Auxiliares (Opcional)
              </h3>
              <button type="button" className="btn-secondary" onClick={addAuxiliary} style={{ padding: "6px 12px", fontSize: 12, height: "auto" }}>
                + Adicionar Insumo
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {activeAuxiliaries.map((aa, idx) => (
                <div key={aa.id} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                    {idx === 0 && <label>Insumo</label>}
                    <div className="input-wrapper">
                      <select 
                        value={aa.auxiliaryId} 
                        onChange={(e) => updateAuxiliary(aa.id, "auxiliaryId", e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {auxiliaries.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    {idx === 0 && <label>Qtd.</label>}
                    <div className="input-wrapper">
                      <input 
                        type="number" 
                        placeholder="0" 
                        min="0" 
                        value={aa.quantity} 
                        onChange={(e) => updateAuxiliary(aa.id, "quantity", e.target.value !== "" ? parseFloat(e.target.value) : "")}
                      />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-icon" 
                    style={{ height: 42, width: 42, color: "var(--danger)" }}
                    onClick={() => removeAuxiliary(aa.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Tempo de impressão (h : m)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <input 
                      type="number" 
                      placeholder="0" 
                      min="0" 
                      value={printTimeHours} 
                      onChange={(e) => setPrintTimeHours(e.target.value !== "" ? parseInt(e.target.value) : "")}
                    />
                    <span className="input-suffix">h</span>
                  </div>
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <input 
                      type="number" 
                      placeholder="0" 
                      min="0" 
                      max="59" 
                      value={printTimeMinutes} 
                      onChange={(e) => setPrintTimeMinutes(e.target.value !== "" ? parseInt(e.target.value) : "")}
                    />
                    <span className="input-suffix">m</span>
                  </div>
                </div>
              </div>
              
              <div className="input-group">
                <label>{isKit ? "Quantidade de kits" : "Quantidade de peças"}</label>
                <div className="input-wrapper">
                  <input 
                    type="number" 
                    placeholder="1" 
                    min="1" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value !== "" ? parseInt(e.target.value) : "")}
                  />
                  <span className="input-suffix">{isKit ? "kits" : "un."}</span>
                </div>
              </div>
            </div>

            {isKit && (
              <div className="input-row" style={{ marginTop: 16 }}>
                <div className="input-group">
                  <label>Peças por Kit</label>
                  <div className="input-wrapper">
                    <input 
                      type="number" 
                      placeholder="1" 
                      min="1" 
                      value={piecesPerKit} 
                      onChange={(e) => setPiecesPerKit(e.target.value !== "" ? parseInt(e.target.value) : "")}
                    />
                    <span className="input-suffix">un.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Custos Operacionais Card */}
        <section className="card card-operational">
          <div className="card-header">
            <div className="card-icon card-icon-amber">
              <Box size={20} />
            </div>
            <h2>Custos Operacionais</h2>
          </div>
          <div className="card-body">
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="packagingIdSelect">Embalagem Salva</label>
                <div className="input-wrapper">
                  <select 
                    id="packagingIdSelect"
                    value={packagingId}
                    onChange={(e) => setPackagingId(e.target.value)}
                  >
                    <option value="">Customizado...</option>
                    {packaging.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="packagingCost">Custo/unidade (R$)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">R$</span>
                  <input 
                    type="number" 
                    id="packagingCost" 
                    placeholder="0,00" 
                    min="0" 
                    step="0.01" 
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                </div>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="otherCosts">Outros custos (R$)</label>
              <div className="input-wrapper">
                <span className="input-prefix">R$</span>
                <input 
                  type="number" 
                  id="otherCosts" 
                  placeholder="0,00" 
                  min="0" 
                  step="0.01"
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Máquina & Extras Card */}
        <section className="card card-machine">
          <div className="card-header">
            <div className="card-icon card-icon-cyan">
              <Zap size={20} />
            </div>
            <h2>Máquina & Extras</h2>
          </div>
          <div className="card-body">
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label htmlFor="machineIdSelect">Máquina Destinada</label>
              <div className="input-wrapper">
                <select 
                  id="machineIdSelect"
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                >
                  <option value="">Sem máquina específica</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="powerConsumption">Potência (W)</label>
                <div className="input-wrapper">
                  <input 
                    type="number" 
                    id="powerConsumption" 
                    placeholder="Ex: 350" 
                    min="0" 
                    value={powerWatts}
                    onChange={(e) => setPowerWatts(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                  <span className="input-suffix">W</span>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="kwhCost">Valor kWh (R$)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">R$</span>
                  <input 
                    type="number" 
                    id="kwhCost" 
                    placeholder="0,00" 
                    min="0" 
                    step="0.01"
                    value={kwhCost}
                    onChange={(e) => setKwhCost(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                </div>
                <span className="input-hint" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                    {formatCurrency(results.energyCost)} total
                  </span>
                </span>
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="machineHourCost">Custo hora (R$/h)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">R$</span>
                  <input 
                    type="number" 
                    id="machineHourCost" 
                    placeholder="1,70" 
                    min="0" 
                    step="0.01"
                    value={machineHourCost}
                    onChange={(e) => setMachineHourCost(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                  <span className="input-suffix">/h</span>
                </div>
                <span className="input-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>deprec. + man.</span>
                  <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                    {formatCurrency(results.machineCost)} total
                  </span>
                </span>
              </div>
              <div className="input-group">
                <label htmlFor="postProcessing">Pós-proc. (R$/peça)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">R$</span>
                  <input 
                    type="number" 
                    id="postProcessing" 
                    placeholder="0,00" 
                    min="0" 
                    step="0.01"
                    value={postProcessing}
                    onChange={(e) => setPostProcessing(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                </div>
                <span className="input-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>lixar, pintar</span>
                  <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                    {formatCurrency(results.totalPostProcessing)} total
                  </span>
                </span>
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="designCost">Design (R$/peça)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">R$</span>
                  <input 
                    type="number" 
                    id="designCost" 
                    placeholder="0,00" 
                    min="0" 
                    step="0.01"
                    value={designCost}
                    onChange={(e) => setDesignCost(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                </div>
                <span className="input-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>rateio</span>
                  <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                    {formatCurrency(results.totalDesignCost)} total
                  </span>
                </span>
              </div>
              <div className="input-group">
                <label htmlFor="failureRate">Taxa de falha (%)</label>
                <div className="input-wrapper">
                  <input 
                    type="number" 
                    id="failureRate" 
                    placeholder="0" 
                    min="0" 
                    max="100" 
                    value={failureRate}
                    onChange={(e) => setFailureRate(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                  <span className="input-suffix">%</span>
                </div>
                <span className="input-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>reserva falhas</span>
                  <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                    {formatCurrency(results.totalFailureCost)} total
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Venda Card */}
        <section className="card card-sale">
          <div className="card-header">
            <div className="card-icon card-icon-green">
              <DollarSign size={20} />
            </div>
            <h2>Venda</h2>
          </div>
          <div className="card-body">
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="salePrice">Venda Direta (R$)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">R$</span>
                  <input 
                    type="number" 
                    id="salePrice" 
                    placeholder="0,00" 
                    min="0" 
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                </div>
                <span className="input-hint" style={{ fontSize: 11 }}>
                  Margem: {results.profitMarginDirect.toFixed(1)}% | Lucro: {formatCurrency(results.unitProfitDirect)}/un.
                </span>
              </div>
              <div className="input-group">
                <label htmlFor="salePriceMarketplace">Venda Marketplace (R$)</label>
                <div className="input-wrapper">
                  <span className="input-prefix">R$</span>
                  <input 
                    type="number" 
                    id="salePriceMarketplace" 
                    placeholder="0,00" 
                    min="0" 
                    step="0.01"
                    value={salePriceMarketplace}
                    onChange={(e) => setSalePriceMarketplace(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  />
                </div>
                <span className="input-hint" style={{ fontSize: 11 }}>
                  Margem: {results.profitMarginMarketplace.toFixed(1)}% | Lucro: {formatCurrency(results.unitProfitMarketplace)}/un.
                </span>
              </div>
            </div>
            <div className="action-buttons">
              <button className="btn btn-primary" title="Calcular">
                <CalcIcon size={18} /> Calcular
              </button>
              <button className="btn btn-secondary" title="Limpar">
                <Trash2 size={18} /> Limpar
              </button>
              <button className="btn btn-accent" title="Exportar PDF">
                <Download size={18} /> Exportar PDF
              </button>
              <button className="btn btn-save" title="Salvar produto">
                <Save size={18} /> Salvar
              </button>
              <button className="btn" title="Enviar para Produção" style={{ backgroundColor: "var(--accent-purple)", color: "white", border: "none", padding: "var(--space-sm) var(--space-md)" }}>
                <ArrowRight size={18} /> + Produção
              </button>
            </div>
          </div>
        </section>

        {/* Resultados Card */}
        <section className="card card-results">
          <div className="card-header">
            <div className="card-icon card-icon-purple">
              <TrendingUp size={20} />
            </div>
            <h2>Resultados</h2>
          </div>
          <div className="card-body">
            <div className="results-controls">
              <div className="toggle-group">
                <button 
                  className={`toggle-btn ${viewMode === "unit" ? "active" : ""}`}
                  onClick={() => setViewMode("unit")}
                >
                  {isKit ? "1 Kit" : "1 Peça"}
                </button>
                <button 
                  className={`toggle-btn ${viewMode === "batch" ? "active" : ""}`}
                  onClick={() => setViewMode("batch")}
                >
                  Lote (Mesa)
                </button>
              </div>
              <div className="toggle-group" style={{ overflowX: "auto", whiteSpace: "nowrap", maxWidth: "100%" }}>
                <button 
                  className={`toggle-btn ${activeMarketplaceId === null ? "active" : ""}`}
                  onClick={() => setActiveMarketplaceId(null)}
                >
                  Venda Direta
                </button>
                {marketplaces.map(m => (
                  <button 
                    key={m.id}
                    className={`toggle-btn ${activeMarketplaceId === m.id ? "active" : ""}`}
                    onClick={() => setActiveMarketplaceId(m.id)}
                  >
                    {m.name} ({m.fee_percentage}%)
                  </button>
                ))}
              </div>
            </div>

            <div className="rv">
              {/* Hero: Lucro */}
              <div className="rv-hero">
                <div className="rv-hero-glow"></div>
                <div className="rv-hero-content">
                  <div className="rv-hero-top">
                    <div className="rv-stat">
                      <span className="rv-stat-label">Receita</span>
                      <span className="rv-stat-val">
                        {formatCurrency((activeMarketplaceId ? results.totalRevenueMarketplace : results.totalRevenueDirect) * multiplier)}
                      </span>
                    </div>
                    <div className="rv-stat">
                      <span className="rv-stat-label">Custo Total</span>
                      <span className="rv-stat-val">
                        {formatCurrency((activeMarketplaceId ? results.unitCostTotalFull * (Number(quantity) || 1) : results.unitCost * (Number(quantity) || 1)) * multiplier)}
                      </span>
                    </div>
                  </div>
                  <div className="rv-hero-profit">
                    <span className="rv-hero-profit-label">Lucro Líquido</span>
                    <span className="rv-hero-profit-value">
                      {formatCurrency((activeMarketplaceId ? results.totalProfitMarketplace : results.totalProfitDirect) * multiplier)}
                    </span>
                  </div>
                  <div className="rv-margin-track">
                    <div className="rv-margin-fill" style={{ width: `${Math.max(0, Math.min(100, activeMarketplaceId ? results.profitMarginMarketplace : results.profitMarginDirect))}%` }}></div>
                  </div>
                  <div className="rv-margin-text">Margem: <strong>{(activeMarketplaceId ? results.profitMarginMarketplace : results.profitMarginDirect).toFixed(1)}%</strong></div>
                </div>
              </div>

              {/* Waterfall: Composição do Custo */}
              <div className="rv-waterfall">
                <div className="rv-wf-title">Composição dos Custos {viewMode === "unit" ? (isKit ? "(por Kit)" : "(por Peça)") : "(Lote Total)"}</div>

                <div className="rv-bar-row" data-color="indigo">
                  <span className="rv-bar-name">Filamento</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.filamentCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="emerald">
                  <span className="rv-bar-name">Auxiliares</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.auxiliaryCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="cyan">
                  <span className="rv-bar-name">Energia</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.energyCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="purple">
                  <span className="rv-bar-name">Máquina</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.machineCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="rose">
                  <span className="rv-bar-name">Falha</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.totalFailureCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="amber">
                  <span className="rv-bar-name">Pós-proc.</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.totalPostProcessing * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="orange">
                  <span className="rv-bar-name">Design</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.totalDesignCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="teal">
                  <span className="rv-bar-name">Embalagem</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.totalPackagingCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="blue">
                  <span className="rv-bar-name">Frete</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.totalShippingCost * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="red">
                  <span className="rv-bar-name">Plataforma</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency((activeMarketplaceId ? results.totalPlatformFee : 0) * multiplier)}</span>
                </div>
                
                <div className="rv-bar-row" data-color="gray">
                  <span className="rv-bar-name">Outros</span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">{formatCurrency(results.totalOtherCosts * multiplier)}</span>
                </div>

                <div className="rv-bar-row rv-bar-profit" data-color="green">
                  <span className="rv-bar-name"><strong>LUCRO</strong></span>
                  <div className="rv-bar-track"><div className="rv-bar-fill" style={{ width: "100%" }}></div></div>
                  <span className="rv-bar-val">
                    {formatCurrency((activeMarketplaceId ? results.totalProfitMarketplace : results.totalProfitDirect) * multiplier)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
