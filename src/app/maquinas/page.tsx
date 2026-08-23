"use client";

import AppLayout from "@/components/AppLayout";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Plus, Trash2, Clock, Wrench, Zap, Package, Activity,
  ChevronDown, ChevronUp, X, CheckCircle2, AlertTriangle,
  Gauge, CircleDot, PauseCircle, Settings2, TrendingUp,
  Play, Square, Timer
} from "lucide-react";

type Machine = {
  id: string;
  name: string;
  purchase_price: number;
  power_watts: number;
  depreciation_rate: number;
  kwh_cost: number;
  status: string;
  acquisition_date: string | null;
  estimated_lifespan_hours: number;
  total_hours: number;
  productive_hours: number;
  idle_hours: number;
  maintenance_hours: number;
  maintenance_cost: number;
  pieces_produced: number;
  active_product_name: string | null;
  active_start_time: string | null;
  active_estimated_hours: number | null;
  active_notes: string | null;
};

type MachineLog = {
  id: string;
  machine_id: string;
  log_type: string;
  hours: number;
  cost: number;
  pieces: number;
  description: string;
  date: string;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  disponivel: { label: "Disponível", color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  produzindo: { label: "Produzindo", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)", icon: <Activity className="w-3.5 h-3.5" /> },
  parada: { label: "Parada", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", icon: <PauseCircle className="w-3.5 h-3.5" /> },
  manutencao: { label: "Manutenção", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", icon: <Wrench className="w-3.5 h-3.5" /> },
};

export default function MaquinasPage() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<MachineLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Form states
  const [name, setName] = useState("");
  const [powerWatts, setPowerWatts] = useState<number | "">("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [depreciationRate, setDepreciationRate] = useState<number | "">("");
  const [kwhCost, setKwhCost] = useState<number | "">("");
  const [lifespanHours, setLifespanHours] = useState<number | "">(10000);
  const [acquisitionDate, setAcquisitionDate] = useState("");

  // Log Modal
  const [logModal, setLogModal] = useState<{ machineId: string; machineName: string } | null>(null);
  const [logType, setLogType] = useState("production");
  const [logHours, setLogHours] = useState<number | "">("");
  const [logCost, setLogCost] = useState<number | "">(0);
  const [logPieces, setLogPieces] = useState<number | "">(0);
  const [logDesc, setLogDesc] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);

  // Status Modal
  const [statusModal, setStatusModal] = useState<{ machineId: string; current: string } | null>(null);

  // Start Production Modal
  const [startProdModal, setStartProdModal] = useState<{ machineId: string; machineName: string } | null>(null);
  const [spProductName, setSpProductName] = useState("");
  const [spEstimatedHours, setSpEstimatedHours] = useState<number | "">("");
  const [spEstimatedMinutes, setSpEstimatedMinutes] = useState<number | "">(0);
  const [spNotes, setSpNotes] = useState("");
  const [spPieces, setSpPieces] = useState<number | "">(1);

  // Finish Production Modal
  const [finishModal, setFinishModal] = useState<Machine | null>(null);
  const [finishPieces, setFinishPieces] = useState<number | "">(0);
  const [finishNotes, setFinishNotes] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fmtMoney = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v);

  // Live timer tick
  useEffect(() => {
    const hasActive = machines.some(m => m.status === "produzindo" && m.active_start_time);
    if (!hasActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [machines]);

  const fetchMachines = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("machines")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setMachines(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchMachines();
  }, [user, fetchMachines]);

  const fetchLogs = async (machineId: string) => {
    if (!user) return;
    setLogsLoading(true);
    const { data } = await supabase
      .from("machine_logs")
      .select("*")
      .eq("machine_id", machineId)
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(20);
    setLogs(data || []);
    setLogsLoading(false);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchLogs(id);
    }
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("machines").insert([{
      user_id: user.id,
      name,
      power_watts: Number(powerWatts) || 0,
      purchase_price: Number(purchasePrice) || 0,
      depreciation_rate: Number(depreciationRate) || 0,
      kwh_cost: Number(kwhCost) || 0,
      estimated_lifespan_hours: Number(lifespanHours) || 10000,
      acquisition_date: acquisitionDate || null,
      status: "disponivel",
    }]);

    if (error) {
      showToast("Erro ao adicionar máquina.", "error");
    } else {
      setName(""); setPowerWatts(""); setPurchasePrice(""); setDepreciationRate("");
      setKwhCost(""); setLifespanHours(10000); setAcquisitionDate("");
      setShowForm(false);
      fetchMachines();
      showToast("Máquina adicionada!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta máquina e todo seu histórico?")) return;
    await supabase.from("machines").delete().eq("id", id);
    fetchMachines();
    showToast("Máquina excluída.", "error");
  };

  const handleChangeStatus = async (machineId: string, newStatus: string) => {
    if (newStatus === "produzindo") {
      // Open the "Start Production" modal instead
      const machine = machines.find(m => m.id === machineId);
      setStatusModal(null);
      setStartProdModal({ machineId, machineName: machine?.name || "" });
      setSpProductName("");
      setSpEstimatedHours("");
      setSpEstimatedMinutes(0);
      setSpNotes("");
      setSpPieces(1);
      return;
    }
    // For other statuses, also clear active session fields
    await supabase.from("machines").update({
      status: newStatus,
      active_product_name: null,
      active_start_time: null,
      active_estimated_hours: null,
      active_notes: null,
    }).eq("id", machineId);
    setStatusModal(null);
    fetchMachines();
    showToast(`Status alterado para ${STATUS_MAP[newStatus]?.label || newStatus}`);
  };

  // Start Production Session
  const handleStartProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startProdModal || !user) return;
    const totalEstH = (Number(spEstimatedHours) || 0) + (Number(spEstimatedMinutes) || 0) / 60;

    await supabase.from("machines").update({
      status: "produzindo",
      active_product_name: spProductName || "Sem nome",
      active_start_time: new Date().toISOString(),
      active_estimated_hours: totalEstH > 0 ? totalEstH : null,
      active_notes: spNotes || null,
    }).eq("id", startProdModal.machineId);

    setStartProdModal(null);
    fetchMachines();
    showToast("Produção iniciada! ⏱️");
  };

  // Finish Production Session
  const openFinishModal = (m: Machine) => {
    setFinishModal(m);
    setFinishPieces(1);
    setFinishNotes("");
  };

  const handleFinishProduction = async () => {
    if (!finishModal || !user) return;
    const m = finishModal;
    const startTime = m.active_start_time ? new Date(m.active_start_time).getTime() : Date.now();
    const rawElapsedMs = Date.now() - startTime;
    const rawElapsedH = rawElapsedMs / (1000 * 60 * 60);
    const estH = m.active_estimated_hours || 0;

    let productionH = rawElapsedH;
    let idleH = 0;

    if (estH > 0 && rawElapsedH > estH) {
      productionH = estH;
      idleH = rawElapsedH - estH;
    }

    const pieces = Number(finishPieces) || 0;

    const logsToInsert = [];
    
    // Log de produção
    logsToInsert.push({
      user_id: user.id,
      machine_id: m.id,
      log_type: "production",
      hours: Math.round(productionH * 100) / 100,
      cost: 0,
      pieces,
      description: `${m.active_product_name || "Produção"}${finishNotes ? ` — ${finishNotes}` : ""}`,
      date: new Date().toISOString(),
    });

    // Log de ociosidade (se passou do tempo)
    if (idleH > 0) {
      logsToInsert.push({
        user_id: user.id,
        machine_id: m.id,
        log_type: "idle",
        hours: Math.round(idleH * 100) / 100,
        cost: 0,
        pieces: 0,
        description: "Tempo Ocioso (Aguardando Retirada)",
        date: new Date().toISOString(),
      });
    }

    await supabase.from("machine_logs").insert(logsToInsert);

    // Update counters and clear session
    await supabase.from("machines").update({
      status: "disponivel",
      total_hours: (m.total_hours || 0) + rawElapsedH,
      productive_hours: (m.productive_hours || 0) + productionH,
      pieces_produced: (m.pieces_produced || 0) + pieces,
      active_product_name: null,
      active_start_time: null,
      active_estimated_hours: null,
      active_notes: null,
    }).eq("id", m.id);

    setFinishModal(null);
    fetchMachines();
    if (expandedId === m.id) fetchLogs(m.id);
    
    if (idleH > 0) {
      showToast(`Finalizado! ${fmtNum(productionH)}h impressão, ${fmtNum(idleH)}h ociosa.`);
    } else {
      showToast(`Produção finalizada! ${fmtNum(productionH)}h registradas.`);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !logModal) return;
    const hours = Number(logHours) || 0;
    const cost = Number(logCost) || 0;
    const pieces = Number(logPieces) || 0;
    if (hours <= 0) return showToast("Informe as horas.", "error");

    const { error } = await supabase.from("machine_logs").insert([{
      user_id: user.id,
      machine_id: logModal.machineId,
      log_type: logType,
      hours, cost, pieces,
      description: logDesc,
      date: logDate,
    }]);
    if (error) return showToast("Erro ao registrar.", "error");

    const machine = machines.find(m => m.id === logModal.machineId);
    if (machine) {
      const updates: Record<string, number> = {
        total_hours: (machine.total_hours || 0) + hours,
      };
      if (logType === "production") {
        updates.productive_hours = (machine.productive_hours || 0) + hours;
        updates.pieces_produced = (machine.pieces_produced || 0) + pieces;
      } else if (logType === "maintenance") {
        updates.maintenance_hours = (machine.maintenance_hours || 0) + hours;
        updates.maintenance_cost = (machine.maintenance_cost || 0) + cost;
      } else {
        updates.idle_hours = (machine.idle_hours || 0) + hours;
      }
      await supabase.from("machines").update(updates).eq("id", logModal.machineId);
    }

    setLogModal(null);
    setLogHours(""); setLogCost(0); setLogPieces(0); setLogDesc(""); setLogType("production");
    setLogDate(new Date().toISOString().split("T")[0]);
    fetchMachines();
    if (expandedId === logModal.machineId) fetchLogs(logModal.machineId);
    showToast("Registro adicionado!");
  };

  const handleDeleteLog = async (log: MachineLog) => {
    if (!user || !confirm("Excluir este registro? Os contadores serão revertidos.")) return;

    const machine = machines.find(m => m.id === log.machine_id);
    if (machine) {
      const updates: Record<string, number> = {
        total_hours: Math.max(0, (machine.total_hours || 0) - log.hours),
      };
      if (log.log_type === "production") {
        updates.productive_hours = Math.max(0, (machine.productive_hours || 0) - log.hours);
        updates.pieces_produced = Math.max(0, (machine.pieces_produced || 0) - (log.pieces || 0));
      } else if (log.log_type === "maintenance") {
        updates.maintenance_hours = Math.max(0, (machine.maintenance_hours || 0) - log.hours);
        updates.maintenance_cost = Math.max(0, (machine.maintenance_cost || 0) - (log.cost || 0));
      } else {
        updates.idle_hours = Math.max(0, (machine.idle_hours || 0) - log.hours);
      }
      await supabase.from("machines").update(updates).eq("id", log.machine_id);
    }

    await supabase.from("machine_logs").delete().eq("id", log.id);
    fetchMachines();
    fetchLogs(log.machine_id);
    showToast("Registro removido.", "error");
  };

  // --- TIME HELPERS ---
  const formatElapsed = (startIso: string, estH: number = 0) => {
    const elapsed = now - new Date(startIso).getTime();
    let printingElapsed = elapsed;
    if (estH > 0) {
      const maxElapsed = estH * 3600 * 1000;
      if (elapsed > maxElapsed) {
        printingElapsed = maxElapsed;
      }
    }
    const totalSec = Math.max(0, Math.floor(printingElapsed / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatIdle = (startIso: string, estH: number) => {
    const elapsed = now - new Date(startIso).getTime();
    const maxElapsed = estH * 3600 * 1000;
    if (elapsed <= maxElapsed) return "00:00:00";
    const idleElapsed = elapsed - maxElapsed;
    const totalSec = Math.max(0, Math.floor(idleElapsed / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatRemaining = (startIso: string, estH: number) => {
    const elapsed = now - new Date(startIso).getTime();
    const remaining = (estH * 3600 * 1000) - elapsed;
    if (remaining <= 0) return "Concluído!";
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getProgressPct = (startIso: string, estH: number) => {
    const elapsed = now - new Date(startIso).getTime();
    const total = estH * 3600 * 1000;
    return Math.min(100, (elapsed / total) * 100);
  };

  // --- RENDER HELPERS ---
  const renderGauge = (m: Machine) => {
    const lifespan = m.estimated_lifespan_hours || 10000;
    const used = m.total_hours || 0;
    const pct = Math.min((used / lifespan) * 100, 100);
    const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f97316" : "#818cf8";

    return (
      <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${pct * 2.64} 264`}
            style={{ transition: "stroke-dasharray 0.6s ease", filter: `drop-shadow(0 0 4px ${color}55)` }}
          />
        </svg>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-mono, monospace)", color, lineHeight: 1 }}>
            {pct.toFixed(0)}%
          </span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginTop: 2 }}>vida útil</span>
        </div>
      </div>
    );
  };

  const renderStatPill = (label: string, value: string, color: string, bgColor: string) => (
    <div style={{
      background: bgColor, borderRadius: 12, padding: "8px 6px", textAlign: "center",
      border: `1px solid ${color}22`, minWidth: 0
    }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 3, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );

  const logTypeLabel = (t: string) => t === "production" ? "Produção" : t === "maintenance" ? "Manutenção" : t === "idle" ? "Ociosa" : "Parada";
  const logTypeColor = (t: string) => t === "production" ? "#4ade80" : t === "maintenance" ? "#fbbf24" : t === "idle" ? "#94a3b8" : "#f87171";

  // --- LIVE PRODUCTION BANNER ---
  const renderLiveBanner = (m: Machine) => {
    if (m.status !== "produzindo" || !m.active_start_time) return null;
    const estH = m.active_estimated_hours || 0;
    const progressPct = estH > 0 ? getProgressPct(m.active_start_time, estH) : 0;
    const isOvertime = estH > 0 && progressPct >= 100;

    return (
      <div style={{
        margin: "0 20px 16px", padding: "14px 16px", borderRadius: 14,
        background: isOvertime
          ? "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.08))"
          : "linear-gradient(135deg, rgba(96,165,250,0.1), rgba(99,102,241,0.08))",
        border: `1px solid ${isOvertime ? "rgba(239,68,68,0.2)" : "rgba(96,165,250,0.2)"}`,
        position: "relative", overflow: "hidden"
      }}>
        {/* Progress bar behind content */}
        {estH > 0 && (
          <div style={{
            position: "absolute", top: 0, left: 0, bottom: 0,
            width: `${Math.min(100, progressPct)}%`,
            background: isOvertime
              ? "rgba(239,68,68,0.06)"
              : "rgba(96,165,250,0.06)",
            transition: "width 1s linear"
          }} />
        )}

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Top row: Product + animated dot */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: isOvertime ? "#ef4444" : "#60a5fa",
                animation: "pulse 2s ease-in-out infinite", display: "inline-block"
              }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-light)" }}>
                {m.active_product_name || "Produção em andamento"}
              </span>
            </div>
            <button
              onClick={() => openFinishModal(m)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 14px",
                borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: isOvertime ? "rgba(239,68,68,0.12)" : "rgba(74,222,128,0.12)",
                border: `1px solid ${isOvertime ? "rgba(239,68,68,0.25)" : "rgba(74,222,128,0.25)"}`,
                color: isOvertime ? "#fca5a5" : "#4ade80", transition: "all 0.2s"
              }}
            >
              <Square size={12} /> Finalizar
            </button>
          </div>

          {/* Timer row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Tempo de Impressão</div>
              <div style={{
                fontSize: 28, fontWeight: 900, fontFamily: "var(--font-mono, monospace)",
                color: "#93c5fd", letterSpacing: "-1px", lineHeight: 1
              }}>
                {formatElapsed(m.active_start_time, estH)}
              </div>
            </div>

            {estH > 0 && !isOvertime && (
              <div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                  Falta
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 900, fontFamily: "var(--font-mono, monospace)",
                  color: "#6ee7b7", letterSpacing: "-1px", lineHeight: 1
                }}>
                  {formatRemaining(m.active_start_time, estH)}
                </div>
              </div>
            )}

            {isOvertime && (
              <div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                  Máquina Parada
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 900, fontFamily: "var(--font-mono, monospace)",
                  color: "#fca5a5", letterSpacing: "-1px", lineHeight: 1
                }}>
                  {formatIdle(m.active_start_time, estH)}
                </div>
              </div>
            )}

            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Início</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                {new Date(m.active_start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {estH > 0 && (
                  <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>
                    → {new Date(new Date(m.active_start_time).getTime() + estH * 3600000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {m.active_notes && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>
              📝 {m.active_notes}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Máquinas & Manutenção" subtitle="Gestão de Ativos, Horas e Custos">
      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="card-icon card-icon-blue"><Settings2 className="w-6 h-6" /></div>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-light)", margin: 0 }}>Minhas Máquinas</h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                {machines.length} cadastrada{machines.length !== 1 ? "s" : ""}
                {machines.filter(m => m.status === "produzindo").length > 0 && (
                  <span style={{ color: "#60a5fa", marginLeft: 8 }}>
                    • {machines.filter(m => m.status === "produzindo").length} produzindo agora
                  </span>
                )}
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ gap: 6 }}>
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Fechar" : "Nova Máquina"}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div className="card-icon card-icon-green"><Plus className="w-5 h-5" /></div>
              <h2>Cadastrar Nova Máquina</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddMachine}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                    <label>Nome da Impressora</label>
                    <div className="input-wrapper">
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Bambu Lab A1 Mini" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Valor Pago (R$)</label>
                    <div className="input-wrapper">
                      <input type="number" required min="0" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(Number(e.target.value))} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Potência (W)</label>
                    <div className="input-wrapper">
                      <input type="number" required min="0" step="1" value={powerWatts} onChange={e => setPowerWatts(Number(e.target.value))} placeholder="350" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Vida Útil Estimada (h)</label>
                    <div className="input-wrapper">
                      <input type="number" min="100" step="100" value={lifespanHours} onChange={e => setLifespanHours(Number(e.target.value))} placeholder="10000" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Data de Aquisição</label>
                    <div className="input-wrapper">
                      <input type="date" value={acquisitionDate} onChange={e => setAcquisitionDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Desgaste (R$/hora)</label>
                    <div className="input-wrapper">
                      <input type="number" required min="0" step="0.01" value={depreciationRate} onChange={e => setDepreciationRate(Number(e.target.value))} placeholder="0.50" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Energia (R$/kWh)</label>
                    <div className="input-wrapper">
                      <input type="number" required min="0" step="0.01" value={kwhCost} onChange={e => setKwhCost(Number(e.target.value))} placeholder="0.85" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 16 }}>
                  <Plus size={18} /> Cadastrar Máquina
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Machine Cards */}
        {loading ? (
          <div className="card"><div className="card-body" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Carregando...</div></div>
        ) : machines.length === 0 ? (
          <div className="card"><div className="card-body" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <Settings2 className="w-12 h-12" style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p>Nenhuma máquina cadastrada.</p>
          </div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {machines.map(m => {
              const st = STATUS_MAP[m.status] || STATUS_MAP.disponivel;
              const totalH = m.total_hours || 0;
              const prodH = m.productive_hours || 0;
              const idleH = m.idle_hours || 0;
              const maintH = m.maintenance_hours || 0;
              const utilization = totalH > 0 ? (prodH / totalH) * 100 : 0;
              const availability = totalH > 0 ? ((prodH + idleH) / totalH) * 100 : 0;
              const depCostH = m.depreciation_rate || 0;
              const energyCostH = ((m.power_watts || 0) / 1000) * (m.kwh_cost || 0);
              const maintCostH = totalH > 0 ? (m.maintenance_cost || 0) / totalH : 0;
              const realCostH = depCostH + energyCostH + maintCostH;
              const isExpanded = expandedId === m.id;
              const isProducing = m.status === "produzindo" && m.active_start_time;

              return (
                <div key={m.id} className="card" style={{ overflow: "hidden" }}>
                  {/* Color bar */}
                  <div style={{
                    height: 3,
                    background: isProducing
                      ? "linear-gradient(90deg, #3b82f6, #818cf8, #3b82f6)"
                      : `linear-gradient(90deg, ${st.color}, ${st.color}88)`,
                    backgroundSize: isProducing ? "200% 100%" : "100% 100%",
                    animation: isProducing ? "shimmer 2s linear infinite" : "none"
                  }} />
                  <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

                  {/* Main Row */}
                  <div style={{ padding: "16px 20px", display: "flex", gap: 20, alignItems: "center" }}>
                    {renderGauge(m)}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-light)", margin: 0 }}>{m.name}</h3>
                        <button
                          onClick={() => setStatusModal({ machineId: m.id, current: m.status })}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
                            borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: st.bg, border: `1px solid ${st.border}`, color: st.color,
                          }}
                        >
                          {st.icon} {st.label}
                        </button>
                        {isProducing && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono, monospace)",
                            color: "#93c5fd", background: "rgba(96,165,250,0.1)",
                            padding: "2px 8px", borderRadius: 8
                          }}>
                            <Timer size={12} style={{ display: "inline", marginRight: 3, verticalAlign: "-2px" }} />
                            {formatElapsed(m.active_start_time!)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                        {renderStatPill("🕐 Total", `${fmtNum(totalH)}h`, "#c7d2fe", "rgba(99,102,241,0.08)")}
                        {renderStatPill("🟢 Produzindo", `${fmtNum(prodH)}h`, "#86efac", "rgba(74,222,128,0.08)")}
                        {renderStatPill("🔴 Parada", `${fmtNum(idleH)}h`, "#fca5a5", "rgba(248,113,113,0.08)")}
                        {renderStatPill("🔧 Manutenção", `${fmtNum(maintH)}h`, "#fde68a", "rgba(251,191,36,0.08)")}
                      </div>

                      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                          <Gauge className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                          <span style={{ color: "rgba(255,255,255,0.45)" }}>Utilização</span>
                          <span style={{ fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "#a5b4fc" }}>{utilization.toFixed(1)}%</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                          <TrendingUp className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />
                          <span style={{ color: "rgba(255,255,255,0.45)" }}>Disponib.</span>
                          <span style={{ fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "#86efac" }}>{availability.toFixed(1)}%</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                          <Zap className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                          <span style={{ color: "rgba(255,255,255,0.45)" }}>Custo/h</span>
                          <span style={{ fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "#fde68a" }}>{fmtMoney(realCostH)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                          <Package className="w-3.5 h-3.5" style={{ color: "#c084fc" }} />
                          <span style={{ color: "rgba(255,255,255,0.45)" }}>Peças</span>
                          <span style={{ fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "#d8b4fe" }}>{fmtNum(m.pieces_produced || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      {isProducing ? (
                        <button onClick={() => openFinishModal(m)} className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px", gap: 4, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                          <Square size={14} /> Finalizar
                        </button>
                      ) : (
                        <button onClick={() => { setStartProdModal({ machineId: m.id, machineName: m.name }); setSpProductName(""); setSpEstimatedHours(""); setSpEstimatedMinutes(0); setSpNotes(""); setSpPieces(1); }}
                          className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px", gap: 4 }}>
                          <Play size={14} /> Iniciar
                        </button>
                      )}
                      <button onClick={() => setLogModal({ machineId: m.id, machineName: m.name })}
                        style={{ fontSize: 12, padding: "6px 12px", gap: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Clock size={14} /> Registrar
                      </button>
                      <button onClick={() => toggleExpand(m.id)}
                        style={{ fontSize: 12, padding: "6px 12px", gap: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Histórico
                      </button>
                      <button onClick={() => handleDelete(m.id)}
                        style={{ fontSize: 12, padding: "6px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </div>

                  {/* Live Production Banner */}
                  {renderLiveBanner(m)}

                  {/* Expanded Logs */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px", background: "rgba(0,0,0,0.15)" }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Últimos Registros</h4>
                      {logsLoading ? (
                        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Carregando...</p>
                      ) : logs.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Nenhum registro encontrado.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {logs.map(log => (
                            <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: logTypeColor(log.log_type), flexShrink: 0 }} />
                                <div>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-light)" }}>{logTypeLabel(log.log_type)}</span>
                                  {log.description && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>— {log.description}</span>}
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                    {new Date(log.date).toLocaleDateString("pt-BR")}
                                    {log.pieces > 0 && <span> • {log.pieces} peças</span>}
                                    {log.cost > 0 && <span> • {fmtMoney(log.cost)}</span>}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 14, color: logTypeColor(log.log_type) }}>{fmtNum(log.hours)}h</span>
                                <button onClick={() => handleDeleteLog(log)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === START PRODUCTION MODAL === */}
      {startProdModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 480, width: "100%" }}>
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Play size={18} style={{ color: "#60a5fa" }} />
                <h2 style={{ fontSize: 16 }}>Iniciar Produção — {startProdModal.machineName}</h2>
              </div>
              <button onClick={() => setStartProdModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="card-body">
              <form onSubmit={handleStartProduction}>
                <div className="input-group">
                  <label>O que está imprimindo? *</label>
                  <div className="input-wrapper">
                    <input type="text" required value={spProductName} onChange={e => setSpProductName(e.target.value)} placeholder="Ex: Lote de 4 Vasos Geométricos" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div className="input-group">
                    <label>Tempo Estimado (horas)</label>
                    <div className="input-wrapper">
                      <input type="number" min="0" step="1" value={spEstimatedHours} onChange={e => setSpEstimatedHours(Number(e.target.value))} placeholder="6" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Minutos</label>
                    <div className="input-wrapper">
                      <input type="number" min="0" max="59" step="1" value={spEstimatedMinutes} onChange={e => setSpEstimatedMinutes(Number(e.target.value))} placeholder="30" />
                    </div>
                  </div>
                </div>
                <div className="input-group" style={{ marginTop: 12 }}>
                  <label>Observações (opcional)</label>
                  <div className="input-wrapper">
                    <input type="text" value={spNotes} onChange={e => setSpNotes(e.target.value)} placeholder="Material, cor, cliente..." />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStartProdModal(null)} style={{ flex: 1 }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    <Play size={16} /> Iniciar Produção
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* === FINISH PRODUCTION MODAL === */}
      {finishModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 420, width: "100%" }}>
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 16 }}>Finalizar Produção — {finishModal.name}</h2>
              <button onClick={() => setFinishModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="card-body">
              {/* Summary */}
              <div style={{
                background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 16
              }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                  <strong style={{ color: "var(--text-light)" }}>{finishModal.active_product_name}</strong>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>
                    Tempo: <strong style={{ color: "#93c5fd", fontFamily: "var(--font-mono, monospace)" }}>
                      {finishModal.active_start_time ? formatElapsed(finishModal.active_start_time) : "--:--:--"}
                    </strong>
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>
                    Início: <strong style={{ color: "var(--text-secondary)" }}>
                      {finishModal.active_start_time ? new Date(finishModal.active_start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}
                    </strong>
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label>Peças Produzidas</label>
                  <div className="input-wrapper">
                    <input type="number" min="0" step="1" value={finishPieces} onChange={e => setFinishPieces(Number(e.target.value))} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Observação (opcional)</label>
                  <div className="input-wrapper">
                    <input type="text" value={finishNotes} onChange={e => setFinishNotes(e.target.value)} placeholder="Resultado..." />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setFinishModal(null)} style={{ flex: 1 }}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleFinishProduction} style={{ flex: 1 }}>
                  <CheckCircle2 size={16} /> Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === LOG MODAL === */}
      {logModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 480, width: "100%" }}>
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 16 }}>Registrar — {logModal.machineName}</h2>
              <button onClick={() => setLogModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddLog}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[
                    { val: "production", label: "Produção", icon: <CircleDot size={14} />, color: "#4ade80" },
                    { val: "maintenance", label: "Manutenção", icon: <Wrench size={14} />, color: "#fbbf24" },
                    { val: "idle", label: "Parada", icon: <PauseCircle size={14} />, color: "#f87171" },
                  ].map(opt => (
                    <button key={opt.val} type="button" onClick={() => setLogType(opt.val)} style={{
                      flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      background: logType === opt.val ? `${opt.color}18` : "rgba(255,255,255,0.03)",
                      border: logType === opt.val ? `2px solid ${opt.color}55` : "1px solid rgba(255,255,255,0.08)",
                      color: logType === opt.val ? opt.color : "var(--text-muted)",
                    }}>
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="input-group">
                    <label>Horas *</label>
                    <div className="input-wrapper">
                      <input type="number" required min="0.1" step="0.1" value={logHours} onChange={e => setLogHours(Number(e.target.value))} placeholder="6" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Data</label>
                    <div className="input-wrapper">
                      <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
                    </div>
                  </div>
                  {logType === "production" && (
                    <div className="input-group">
                      <label>Peças Produzidas</label>
                      <div className="input-wrapper">
                        <input type="number" min="0" step="1" value={logPieces} onChange={e => setLogPieces(Number(e.target.value))} placeholder="0" />
                      </div>
                    </div>
                  )}
                  {logType === "maintenance" && (
                    <div className="input-group">
                      <label>Custo (R$)</label>
                      <div className="input-wrapper">
                        <input type="number" min="0" step="0.01" value={logCost} onChange={e => setLogCost(Number(e.target.value))} placeholder="0.00" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="input-group" style={{ marginTop: 12 }}>
                  <label>Descrição (opcional)</label>
                  <div className="input-wrapper">
                    <input type="text" value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="Ex: Impressão lote de vasos..." />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setLogModal(null)} style={{ flex: 1 }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}><CheckCircle2 size={16} /> Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* === STATUS MODAL === */}
      {statusModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 360, width: "100%" }}>
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 16 }}>Alterar Status</h2>
              <button onClick={() => setStatusModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(STATUS_MAP).map(([key, val]) => (
                  <button key={key} onClick={() => handleChangeStatus(statusModal.machineId, key)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                    borderRadius: 12, cursor: "pointer",
                    background: statusModal.current === key ? val.bg : "rgba(255,255,255,0.03)",
                    border: statusModal.current === key ? `2px solid ${val.border}` : "1px solid rgba(255,255,255,0.06)",
                    color: val.color
                  }}>
                    {val.icon}
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{val.label}</span>
                    {key === "produzindo" && <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>Abre modal de início</span>}
                    {statusModal.current === key && key !== "produzindo" && <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.6 }}>Atual</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600,
          background: toast.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: toast.type === "success" ? "#6ee7b7" : "#fca5a5",
          backdropFilter: "blur(8px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
        }}>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
