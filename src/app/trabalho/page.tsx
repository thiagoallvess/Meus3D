// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Briefcase, CheckCircle2, Clock, DollarSign, TrendingUp,
  Package, ListFilter, ArrowUpRight, CalendarDays, Hash,
  Banknote, CircleDot, Sparkles, Trash2, Settings, Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface LaborTask {
  id: string;
  status: "pendente" | "pronto";
  productName: string;
  date: string;
  completedDate?: string;
  qty: number;
  totalValue: number;
}

const LABOR_KEY = "meus3d_labor_tasks_v1";

const fmt = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return "-"; }
};

export default function TrabalhoPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<LaborTask[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"pendente" | "pronto" | "config">("pendente");

  // Configurações defaults
  const [cfgPostProcessing, setCfgPostProcessing] = useState<number | "">(0);
  const [cfgDesignCost, setCfgDesignCost] = useState<number | "">(0);
  const [cfgSaving, setCfgSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!user) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('labor_tasks')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data) {
        setTasks(data.map((t: any) => ({
          id: t.id,
          status: t.status,
          productName: t.product_name,
          date: t.date,
          completedDate: t.completed_date,
          qty: t.qty,
          totalValue: t.total_value
        })));
      }
    };
    fetchTasks();

    // Load user_settings defaults
    const fetchDefaults = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setCfgPostProcessing(data.default_post_processing || 0);
        setCfgDesignCost(data.default_design_cost || 0);
      }
    };
    fetchDefaults();
  }, [user]);

  const markAsDone = async (id: string) => {
    if (!user) return;
    const completedDate = new Date().toISOString();
    const { error } = await supabase
      .from('labor_tasks')
      .update({ status: 'pronto', completed_date: completedDate })
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: "pronto" as const, completedDate } : t));
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('labor_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const pending = useMemo(() => tasks.filter(t => t.status === "pendente"), [tasks]);
  const completed = useMemo(() =>
    tasks.filter(t => t.status === "pronto").sort((a, b) =>
      new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime()
    ), [tasks]);

  const totalPending = pending.reduce((s, t) => s + (t.totalValue || 0), 0);
  const totalCompleted = completed.reduce((s, t) => s + (t.totalValue || 0), 0);
  const totalAll = totalPending + totalCompleted;
  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const activeTasks = activeTab === "pendente" ? pending : completed;

  if (!isMounted) return null;

  return (
    <AppLayout title="Gestão de Trabalho" subtitle="Controle de tarefas e salário acumulado">

      {/* ═══ KPI CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>

        {/* Salário Acumulado */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(20,184,166,0.06))',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: '20px', padding: '24px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(16,185,129,0.08)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '8px', background: 'rgba(16,185,129,0.15)', borderRadius: '12px', color: '#34d399' }}>
              <Banknote size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Salário Acumulado</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {fmt(totalCompleted)}
          </div>
        </div>

        {/* A Receber */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(249,115,22,0.06))',
          border: '1px solid rgba(251,146,60,0.25)',
          borderRadius: '20px', padding: '24px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(251,146,60,0.08)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '8px', background: 'rgba(251,146,60,0.15)', borderRadius: '12px', color: '#fb923c' }}>
              <Clock size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>A Receber</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fb923c', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {fmt(totalPending)}
          </div>
        </div>

        {/* Tarefas Pendentes */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(129,140,248,0.06))',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '20px', padding: '24px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(99,102,241,0.08)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '8px', background: 'rgba(99,102,241,0.15)', borderRadius: '12px', color: '#818cf8' }}>
              <ListFilter size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pendentes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: pending.length > 0 ? '#818cf8' : '#4b5563', fontFamily: 'monospace' }}>
              {pending.length}
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>tarefas</span>
          </div>
        </div>

        {/* Taxa de Conclusão */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(192,132,252,0.06))',
          border: '1px solid rgba(168,85,247,0.25)',
          borderRadius: '20px', padding: '24px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(168,85,247,0.08)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '8px', background: 'rgba(168,85,247,0.15)', borderRadius: '12px', color: '#c084fc' }}>
              <TrendingUp size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Conclusão</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c084fc', fontFamily: 'monospace' }}>
              {completionRate}%
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{completed.length}/{tasks.length}</span>
          </div>
          {/* mini bar */}
          <div style={{ marginTop: '12px', height: '4px', background: 'rgba(168,85,247,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${completionRate}%`, background: 'linear-gradient(90deg, #a855f7, #c084fc)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', background: 'rgba(15,17,35,0.6)', border: '1px solid rgba(55,65,81,0.4)', borderRadius: '16px', padding: '5px' }}>
        <button
          onClick={() => setActiveTab("pendente")}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
            background: activeTab === 'pendente' ? 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(249,115,22,0.1))' : 'transparent',
            color: activeTab === 'pendente' ? '#fb923c' : '#6b7280',
            boxShadow: activeTab === 'pendente' ? '0 2px 12px rgba(251,146,60,0.15)' : 'none',
          }}
        >
          <Clock size={16} />
          Pendentes
          {pending.length > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(251,146,60,0.2)', color: '#fb923c', padding: '2px 8px', borderRadius: '99px' }}>
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("pronto")}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
            background: activeTab === 'pronto' ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(20,184,166,0.1))' : 'transparent',
            color: activeTab === 'pronto' ? '#34d399' : '#6b7280',
            boxShadow: activeTab === 'pronto' ? '0 2px 12px rgba(16,185,129,0.15)' : 'none',
          }}
        >
          <CheckCircle2 size={16} />
          Concluídas
          {completed.length > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '99px' }}>
              {completed.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("config")}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
            background: activeTab === 'config' ? 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(99,102,241,0.1))' : 'transparent',
            color: activeTab === 'config' ? '#a5b4fc' : '#6b7280',
            boxShadow: activeTab === 'config' ? '0 2px 12px rgba(129,140,248,0.15)' : 'none',
          }}
        >
          <Settings size={16} />
          Configurações
        </button>
      </div>

      {/* ═══ CONFIG PANEL ═══ */}
      {activeTab === 'config' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-icon card-icon-blue"><Settings className="w-5 h-5" /></div>
            <h2>Valores Padrão do Calculador</h2>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Esses valores serão preenchidos automaticamente nas páginas de cálculo (Index e Kit).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group">
                <label>Pós-processamento (R$/peça)</label>
                <div className="input-wrapper">
                  <input type="number" min="0" step="0.01" value={cfgPostProcessing}
                    onChange={e => setCfgPostProcessing(Number(e.target.value))} placeholder="0.00" />
                </div>
              </div>
              <div className="input-group">
                <label>Design (R$/peça)</label>
                <div className="input-wrapper">
                  <input type="number" min="0" step="0.01" value={cfgDesignCost}
                    onChange={e => setCfgDesignCost(Number(e.target.value))} placeholder="0.00" />
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary"
              disabled={cfgSaving}
              onClick={async () => {
                if (!user) return;
                setCfgSaving(true);
                await supabase.from('user_settings').upsert({
                  user_id: user.id,
                  default_post_processing: Number(cfgPostProcessing) || 0,
                  default_design_cost: Number(cfgDesignCost) || 0,
                }, { onConflict: 'user_id' });
                setCfgSaving(false);
                setToast({ msg: 'Configurações salvas! ✅', type: 'success' });
                setTimeout(() => setToast(null), 3000);
              }}
              style={{ width: '100%', marginTop: 16, gap: 6 }}
            >
              <Save size={16} /> {cfgSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ TASK CARDS ═══ */}
      {activeTab !== 'config' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {activeTasks.length > 0 ? (
          activeTasks.map((t) => {
            const isPending = t.status === "pendente";
            const accentColor = isPending ? '#fb923c' : '#34d399';
            const accentBg = isPending ? 'rgba(251,146,60,' : 'rgba(16,185,129,';

            return (
              <div
                key={t.id}
                style={{
                  background: 'rgba(15,17,35,0.7)',
                  border: `1px solid ${accentBg}0.2)`,
                  borderRadius: '20px',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                }}
              >
                {/* card header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 20px',
                  background: `${accentBg}0.06)`,
                  borderBottom: `1px solid ${accentBg}0.15)`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '6px', background: `${accentBg}0.15)`, borderRadius: '10px', color: accentColor }}>
                      <Package size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>{t.productName}</h3>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '99px',
                    background: `${accentBg}0.15)`, color: accentColor,
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    {isPending ? 'Pendente' : 'Concluído'}
                  </span>
                </div>

                {/* card body */}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={14} style={{ color: '#6b7280' }} />
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {isPending ? 'Data de Produção' : 'Concluído em'}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
                        {isPending ? fmtDate(t.date) : (t.completedDate ? fmtDate(t.completedDate) : "-")}
                      </span>
                    </div>

                    {/* qty */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Hash size={14} style={{ color: '#6b7280' }} />
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Unidades</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{t.qty}</span>
                    </div>

                    {/* divider */}
                    <div style={{ height: '1px', background: 'rgba(55,65,81,0.4)', margin: '4px 0' }} />

                    {/* value */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={14} style={{ color: accentColor }} />
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {isPending ? 'Valor da Mão de Obra' : 'Valor Recebido'}
                        </span>
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: accentColor, fontFamily: 'monospace' }}>
                        {fmt(t.totalValue)}
                      </span>
                    </div>
                  </div>

                  {/* actions */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button
                        onClick={() => markAsDone(t.id)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '11px 16px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                          background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                          color: 'white', fontWeight: 700, fontSize: '13px',
                          boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <CheckCircle2 size={16} /> Marcar como Pronto
                      </button>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{
                          padding: '11px 14px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.25)',
                          background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}

                  {!isPending && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{
                          width: '100%', padding: '10px 16px', borderRadius: '14px',
                          border: '1px solid rgba(75,85,99,0.3)', background: 'rgba(15,17,35,0.5)',
                          color: '#9ca3af', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Trash2 size={14} /> Remover do Histórico
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '64px 24px', textAlign: 'center',
            background: 'rgba(15,17,35,0.5)', border: '2px dashed rgba(55,65,81,0.4)', borderRadius: '24px',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: activeTab === 'pendente' ? 'rgba(251,146,60,0.1)' : 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
            }}>
              {activeTab === 'pendente'
                ? <Sparkles size={32} style={{ color: '#fb923c' }} />
                : <CheckCircle2 size={32} style={{ color: '#34d399' }} />
              }
            </div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e5e7eb' }}>
              {activeTab === 'pendente' ? 'Nenhuma tarefa pendente! 🎉' : 'Nenhuma tarefa concluída ainda'}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#6b7280', maxWidth: '320px' }}>
              {activeTab === 'pendente'
                ? 'As tarefas são criadas automaticamente pela página de Produção quando você registra uma nova leva.'
                : 'Conclua tarefas pendentes para vê-las aqui no histórico.'
              }
            </p>
          </div>
        )}
      </div>
      )}

    </AppLayout>
  );
}
