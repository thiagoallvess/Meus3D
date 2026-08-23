"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import { 
  Sparkles, Printer, Layers, Package, ShoppingBag, 
  CheckCircle2, ArrowRight, ArrowLeft, Zap, Gauge, 
  ShieldCheck, Rocket
} from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

/* ── shared inline style objects ── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'rgba(15, 17, 35, 0.85)',
  border: '1px solid rgba(99, 102, 241, 0.25)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: '#e5e7eb',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#818cf8',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: '10px',
};

export default function OnboardingPage() {
  const { user, checkOnboardingStatus } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  /* state ── step 2 filament */
  const [filBrand, setFilBrand] = useState('Esun');
  const [filMaterial, setFilMaterial] = useState('PLA');
  const [filColorName, setFilColorName] = useState('Preto');
  const [filColorHex, setFilColorHex] = useState('#18181b');
  const [filQty, setFilQty] = useState(1);
  const [filPrice, setFilPrice] = useState('95.00');

  /* state ── step 3 auxiliary */
  const [auxName, setAuxName] = useState('Caixa 16x11x6 cm');
  const [auxQty, setAuxQty] = useState(50);
  const [auxPrice, setAuxPrice] = useState('45.00');

  /* state ── step 4 marketplace */
  const [mpName, setMpName] = useState('Shopee');
  const [mpFee, setMpFee] = useState('20.0');
  const [mpShipping, setMpShipping] = useState('4.00');

  /* state ── step 5 machine */
  const [macName, setMacName] = useState('Bambu Lab P1S');
  const [macPrice, setMacPrice] = useState('4800.00');
  const [macWatts, setMacWatts] = useState(350);
  const [macDep, setMacDep] = useState(0.25);
  const [macKwh, setMacKwh] = useState(0.95);

  const totalSteps = 6;
  const pct = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

  const steps = [
    { n: 1, t: 'Início', I: Sparkles },
    { n: 2, t: 'Filamento', I: Layers },
    { n: 3, t: 'Embalagem', I: Package },
    { n: 4, t: 'Canais', I: ShoppingBag },
    { n: 5, t: 'Máquina', I: Printer },
    { n: 6, t: 'Pronto', I: CheckCircle2 },
  ];

  const colorPresets = [
    { name: 'Preto', hex: '#18181b' }, { name: 'Branco', hex: '#f4f4f5' },
    { name: 'Cinza', hex: '#71717a' }, { name: 'Vermelho', hex: '#ef4444' },
    { name: 'Azul', hex: '#3b82f6' }, { name: 'Verde', hex: '#10b981' },
    { name: 'Dourado', hex: '#eab308' }, { name: 'Roxo', hex: '#a855f7' },
  ];

  const auxPresets = [
    { name: 'Caixa 16x11x6 cm', qty: 50, price: '45.00' },
    { name: 'Plástico Bolha 50 m', qty: 1, price: '38.00' },
    { name: 'Ímãs 6x2 mm (100 un)', qty: 100, price: '25.00' },
    { name: 'Fita Adesiva 45 mm', qty: 5, price: '30.00' },
  ];

  const mpPresets = [
    { name: 'Shopee', fee: '20.0', ship: '4.00' },
    { name: 'Mercado Livre', fee: '16.5', ship: '6.00' },
    { name: 'Amazon', fee: '15.0', ship: '4.00' },
    { name: 'Elo7', fee: '12.0', ship: '0.00' },
  ];

  const macPresets = [
    { name: 'Bambu Lab P1S', price: '4800.00', watts: 350, dep: 0.25 },
    { name: 'Bambu Lab A1 Mini', price: '2400.00', watts: 150, dep: 0.15 },
    { name: 'Ender 3 V3 KE', price: '2200.00', watts: 350, dep: 0.20 },
    { name: 'Creality K1', price: '3900.00', watts: 350, dep: 0.25 },
    { name: 'Elegoo Neptune 4', price: '2100.00', watts: 300, dep: 0.18 },
  ];

  const next = () => setCurrentStep(p => Math.min(p + 1, totalSteps));
  const prev = () => setCurrentStep(p => Math.max(p - 1, 1));

  /* validators */
  const v2 = () => { if (!filBrand || !filColorName || filQty <= 0 || !filPrice || +filPrice < 0) { toast.error('Preencha os dados do filamento.', { theme: 'dark' }); return false; } return true; };
  const v3 = () => { if (!auxName || auxQty <= 0 || !auxPrice || +auxPrice < 0) { toast.error('Preencha os campos auxiliares.', { theme: 'dark' }); return false; } return true; };
  const v4 = () => { if (!mpName || !mpFee || +mpFee < 0 || +mpFee > 100 || !mpShipping || +mpShipping < 0) { toast.error('Preencha comissão e frete.', { theme: 'dark' }); return false; } return true; };
  const v5 = () => { if (!macName || !macPrice || +macPrice < 0) { toast.error('Preencha os dados da máquina.', { theme: 'dark' }); return false; } return true; };

  const finish = async () => {
    if (!v5() || !user) return;
    setLoading(true);
    try {
      const p = parseFloat(filPrice);
      if (filBrand && p > 0) await supabase.from('filaments').insert({ user_id: user.id, brand: filBrand, material: filMaterial, color_name: filColorName, color_hex: filColorHex, weight: 1000, price: p / filQty });
      const ap = parseFloat(auxPrice);
      if (auxName && ap > 0) await supabase.from('auxiliaries').insert({ user_id: user.id, name: auxName, quantity: auxQty, total_cost: ap, unit_cost: ap / auxQty });
      const rows: any[] = [{ user_id: user.id, name: 'Venda Direta', commission_rate: 0, default_shipping: 0, is_direct: true }];
      if (mpName) rows.push({ user_id: user.id, name: mpName, commission_rate: parseFloat(mpFee), default_shipping: parseFloat(mpShipping), is_direct: false });
      await supabase.from('marketplaces').insert(rows);
      if (macName) await supabase.from('machines').insert({ user_id: user.id, name: macName, purchase_price: parseFloat(macPrice), power_watts: macWatts, depreciation_rate: macDep, kwh_cost: macKwh });
      await supabase.from('user_profiles').upsert({ id: user.id, onboarding_done: true });
      await checkOnboardingStatus();
      confetti();
      next();
    } catch (e: any) { toast.error('Erro: ' + (e.message || ''), { theme: 'dark' }); }
    finally { setLoading(false); }
  };

  const confetti = () => {
    const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    for (let i = 0; i < 60; i++) {
      const d = document.createElement('div');
      Object.assign(d.style, { position: 'fixed', width: '10px', height: '10px', borderRadius: '50%', left: Math.random()*100+'vw', top: '-20px', backgroundColor: colors[Math.floor(Math.random()*6)], zIndex: '9999', pointerEvents: 'none', animation: `confetti-fall ${2+Math.random()*2.5}s linear forwards` });
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 4500);
    }
  };

  /* ── chip button helper ── */
  const Chip = ({ active, onClick, children, color = 'indigo' }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: active ? `2px solid var(--chip-border)` : '1px solid rgba(75, 85, 99, 0.5)',
        background: active ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 17, 35, 0.6)',
        color: active ? '#e0e7ff' : '#9ca3af',
        // @ts-ignore
        '--chip-border': color === 'purple' ? '#a855f7' : color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#6366f1',
      }}
    >
      {children}
    </button>
  );

  /* ── step nav footer ── */
  const StepNav = ({ onNext, color = '#6366f1', finalLabel }: { onNext: () => void; color?: string; finalLabel?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px', paddingTop: '28px', borderTop: '1px solid rgba(75,85,99,0.3)' }}>
      <button onClick={prev} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '14px', border: 'none', background: 'transparent', color: '#9ca3af', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {!finalLabel && <button onClick={next} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', padding: '8px' }}>Pular</button>}
        <button onClick={onNext} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '14px', border: 'none', background: finalLabel ? 'linear-gradient(135deg, #10b981, #14b8a6)' : color, color: 'white', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: `0 6px 24px ${color}40` }}>
          {finalLabel || 'Próximo Passo'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  /* ── step header ── */
  const StepHeader = ({ icon: Icon, title, subtitle, color }: { icon: any; title: string; subtitle: string; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
      <div style={{ padding: '14px', borderRadius: '18px', background: `${color}18`, border: `1px solid ${color}35`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={26} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f3f4f6', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '4px 0 0' }}>{subtitle}</p>
      </div>
    </div>
  );

  /* ── two-column grid ── */
  const Row2 = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
      {children}
    </div>
  );

  /* ── three-column grid ── */
  const Row3 = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
      {children}
    </div>
  );

  /* ── field wrapper ── */
  const Field = ({ label, children, lColor }: { label: string; children: React.ReactNode; lColor?: string }) => (
    <div>
      <label style={{ ...labelStyle, color: lColor || '#818cf8' }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070914', color: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <ToastContainer />

      {/* BG orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-120px', left: '-120px', width: '600px', height: '600px', background: 'rgba(99,102,241,0.12)', borderRadius: '50%', filter: 'blur(150px)' }} />
        <div style={{ position: 'absolute', bottom: '-120px', right: '-120px', width: '650px', height: '650px', background: 'rgba(168,85,247,0.12)', borderRadius: '50%', filter: 'blur(160px)' }} />
      </div>

      {/* ══════ MAIN CARD ══════ */}
      <div style={{
        width: '100%',
        maxWidth: '780px',
        background: 'linear-gradient(165deg, rgba(20,22,42,0.95), rgba(12,14,30,0.98))',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '32px',
        padding: '56px 52px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* ── stepper ── */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '20px' }}>
            {steps.map(s => {
              const Icon = s.I;
              const active = currentStep === s.n;
              const done = currentStep > s.n;
              return (
                <div key={s.n} style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '8px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 700,
                  flexShrink: 0, transition: 'all 0.3s',
                  ...(active ? { background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', boxShadow: '0 4px 18px rgba(99,102,241,0.4)' }
                    : done ? { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }
                    : { background: 'rgba(15,17,35,0.6)', color: '#6b7280', border: '1px solid rgba(55,65,81,0.5)' }),
                }}>
                  <Icon size={14} />
                  <span>{s.t}</span>
                </div>
              );
            })}
          </div>

          {/* progress bar */}
          <div style={{ width: '100%', height: '6px', background: 'rgba(15,17,35,0.8)', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(55,65,81,0.4)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)', borderRadius: '999px', transition: 'width 0.5s ease', boxShadow: '0 0 12px rgba(99,102,241,0.6)' }} />
          </div>
        </div>

        {/* ═══════════ STEP 1 ═══════════ */}
        {currentStep === 1 && (
          <div className="animate-fade-in-up" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '36px' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 48px rgba(99,102,241,0.45)' }}>
                <Rocket size={56} style={{ color: 'white' }} />
              </div>
              <span style={{ position: 'absolute', top: '-10px', right: '-14px', background: '#10b981', color: '#052e16', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: '999px', border: '2px solid #070914' }}>Setup 3D</span>
            </div>

            <h1 style={{ fontSize: '2.6rem', fontWeight: 900, margin: '0 0 16px', background: 'linear-gradient(135deg, #fff, #c7d2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Bem-vindo ao Meus 3D
            </h1>

            <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '480px', lineHeight: 1.7, marginBottom: '40px' }}>
              Esqueça planilhas complexas! Em apenas <strong style={{ color: '#a5b4fc' }}>2 minutos</strong> configuramos sua oficina de impressão 3D para calcular custos com precisão.
            </p>

            {/* feature cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', width: '100%', marginBottom: '44px', textAlign: 'left' }}>
              {[
                { icon: Zap, title: 'Cálculo Rápido', desc: 'Filamento, energia & tempo', c: '#6366f1' },
                { icon: ShieldCheck, title: 'Margem Segura', desc: 'Comissões & despesas', c: '#a855f7' },
                { icon: Gauge, title: 'Visão de Lucro', desc: 'Simulações de venda', c: '#10b981' },
              ].map(f => (
                <div key={f.title} style={{ background: `${f.c}10`, border: `1px solid ${f.c}25`, borderRadius: '18px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '10px', background: `${f.c}15`, borderRadius: '14px', color: f.c }}>
                    <f.icon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb' }}>{f.title}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 40px', borderRadius: '18px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 10px 36px rgba(99,102,241,0.4)', transition: 'all 0.2s' }}>
              Começar Configuração <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* ═══════════ STEP 2: FILAMENTO ═══════════ */}
        {currentStep === 2 && (
          <div className="animate-fade-in-up">
            <StepHeader icon={Layers} title="Seu Primeiro Filamento" subtitle="Qual o rolo que você mais usa na impressora?" color="#6366f1" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* color presets */}
              <div style={{ background: 'rgba(15,17,35,0.5)', border: '1px solid rgba(55,65,81,0.4)', borderRadius: '18px', padding: '20px 22px' }}>
                <label style={{ ...labelStyle, marginBottom: '14px' }}>Cores Populares</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {colorPresets.map(c => (
                    <Chip key={c.name} active={filColorName === c.name} onClick={() => { setFilColorName(c.name); setFilColorHex(c.hex); }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: c.hex, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                      {c.name}
                    </Chip>
                  ))}
                </div>
              </div>

              <Row2>
                <Field label="Marca do Filamento">
                  <input type="text" value={filBrand} onChange={e => setFilBrand(e.target.value)} placeholder="Ex: Esun, Voolt3D" style={inputStyle} />
                </Field>
                <Field label="Tipo de Material">
                  <select value={filMaterial} onChange={e => setFilMaterial(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="PLA">PLA (Mais comum)</option>
                    <option value="PETG">PETG (Resistente)</option>
                    <option value="ABS">ABS (Alta temp)</option>
                    <option value="TPU">TPU (Flexível)</option>
                    <option value="ASA">ASA (Externo)</option>
                  </select>
                </Field>
              </Row2>

              <Row2>
                <Field label="Nome da Cor">
                  <input type="text" value={filColorName} onChange={e => setFilColorName(e.target.value)} placeholder="Ex: Preto Galáxia" style={inputStyle} />
                </Field>
                <Field label="Cor Visual">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="color" value={filColorHex} onChange={e => setFilColorHex(e.target.value)} style={{ width: '52px', height: '52px', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(15,17,35,0.85)', padding: '4px', cursor: 'pointer' }} />
                    <input type="text" value={filColorHex} onChange={e => setFilColorHex(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} />
                  </div>
                </Field>
              </Row2>

              <Row2>
                <Field label="Rolos (1 kg cada)">
                  <input type="number" min="1" value={filQty} onChange={e => setFilQty(parseInt(e.target.value) || 1)} style={inputStyle} />
                </Field>
                <Field label="Preço Total Pago (R$)">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>R$</span>
                    <input type="number" step="0.01" value={filPrice} onChange={e => setFilPrice(e.target.value)} style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </Field>
              </Row2>
            </div>

            <StepNav onNext={() => { if (v2()) next(); }} color="#6366f1" />
          </div>
        )}

        {/* ═══════════ STEP 3: AUXILIAR ═══════════ */}
        {currentStep === 3 && (
          <div className="animate-fade-in-up">
            <StepHeader icon={Package} title="Materiais Auxiliares" subtitle="Caixas, plástico bolha ou insumos adicionais." color="#a855f7" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* presets */}
              <div style={{ background: 'rgba(15,17,35,0.5)', border: '1px solid rgba(55,65,81,0.4)', borderRadius: '18px', padding: '20px 22px' }}>
                <label style={{ ...labelStyle, color: '#c084fc', marginBottom: '14px' }}>Sugestões Rápidas</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {auxPresets.map(p => (
                    <Chip key={p.name} active={auxName === p.name} color="purple" onClick={() => { setAuxName(p.name); setAuxQty(p.qty); setAuxPrice(p.price); }}>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>R$ {p.price}</span>
                    </Chip>
                  ))}
                </div>
              </div>

              <Field label="Nome do Material" lColor="#c084fc">
                <input type="text" value={auxName} onChange={e => setAuxName(e.target.value)} placeholder="Ex: Caixa de Papelão" style={inputStyle} />
              </Field>

              <Row2>
                <Field label="Quantidade do Lote" lColor="#c084fc">
                  <input type="number" min="1" value={auxQty} onChange={e => setAuxQty(parseInt(e.target.value) || 1)} style={inputStyle} />
                </Field>
                <Field label="Custo Total (R$)" lColor="#c084fc">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>R$</span>
                    <input type="number" step="0.01" value={auxPrice} onChange={e => setAuxPrice(e.target.value)} style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </Field>
              </Row2>
            </div>

            <StepNav onNext={() => { if (v3()) next(); }} color="#a855f7" />
          </div>
        )}

        {/* ═══════════ STEP 4: MARKETPLACE ═══════════ */}
        {currentStep === 4 && (
          <div className="animate-fade-in-up">
            <StepHeader icon={ShoppingBag} title="Canais de Venda" subtitle="Onde você pretende vender suas peças 3D?" color="#10b981" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* presets */}
              <div style={{ background: 'rgba(15,17,35,0.5)', border: '1px solid rgba(55,65,81,0.4)', borderRadius: '18px', padding: '20px 22px' }}>
                <label style={{ ...labelStyle, color: '#34d399', marginBottom: '14px' }}>Plataformas Populares</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {mpPresets.map(p => (
                    <Chip key={p.name} active={mpName === p.name} color="emerald" onClick={() => { setMpName(p.name); setMpFee(p.fee); setMpShipping(p.ship); }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>{p.fee}% taxa</span>
                      </div>
                    </Chip>
                  ))}
                </div>
              </div>

              <Field label="Nome do Canal" lColor="#34d399">
                <input type="text" value={mpName} onChange={e => setMpName(e.target.value)} placeholder="Ex: Shopee, Mercado Livre" style={inputStyle} />
              </Field>

              <Row2>
                <Field label="Comissão (%)" lColor="#34d399">
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="0.1" value={mpFee} onChange={e => setMpFee(e.target.value)} style={inputStyle} />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>%</span>
                  </div>
                </Field>
                <Field label="Frete / Taxa Fixa (R$)" lColor="#34d399">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>R$</span>
                    <input type="number" step="0.01" value={mpShipping} onChange={e => setMpShipping(e.target.value)} style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </Field>
              </Row2>
            </div>

            <StepNav onNext={() => { if (v4()) next(); }} color="#10b981" />
          </div>
        )}

        {/* ═══════════ STEP 5: MÁQUINA ═══════════ */}
        {currentStep === 5 && (
          <div className="animate-fade-in-up">
            <StepHeader icon={Printer} title="Sua Impressora 3D" subtitle="Para calcularmos energia e depreciação por hora." color="#3b82f6" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* presets */}
              <div style={{ background: 'rgba(15,17,35,0.5)', border: '1px solid rgba(55,65,81,0.4)', borderRadius: '18px', padding: '20px 22px' }}>
                <label style={{ ...labelStyle, color: '#60a5fa', marginBottom: '14px' }}>Modelos Populares</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  {macPresets.map(p => (
                    <Chip key={p.name} active={macName === p.name} color="blue" onClick={() => { setMacName(p.name); setMacPrice(p.price); setMacWatts(p.watts); setMacDep(p.dep); }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>{p.watts}W • R$ {p.dep}/h</span>
                      </div>
                    </Chip>
                  ))}
                </div>
              </div>

              <Row2>
                <Field label="Nome / Modelo" lColor="#60a5fa">
                  <input type="text" value={macName} onChange={e => setMacName(e.target.value)} placeholder="Ex: Bambu P1S" style={inputStyle} />
                </Field>
                <Field label="Preço de Aquisição (R$)" lColor="#60a5fa">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px', fontWeight: 700 }}>R$</span>
                    <input type="number" step="0.01" value={macPrice} onChange={e => setMacPrice(e.target.value)} style={{ ...inputStyle, paddingLeft: '42px' }} />
                  </div>
                </Field>
              </Row2>

              <Row3>
                <Field label="Potência (Watts)" lColor="#60a5fa">
                  <input type="number" value={macWatts} onChange={e => setMacWatts(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </Field>
                <Field label="Depreciação (R$/h)" lColor="#60a5fa">
                  <input type="number" step="0.01" value={macDep} onChange={e => setMacDep(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </Field>
                <Field label="Energia (R$/kWh)" lColor="#60a5fa">
                  <input type="number" step="0.01" value={macKwh} onChange={e => setMacKwh(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </Field>
              </Row3>
            </div>

            <StepNav onNext={finish} color="#3b82f6" finalLabel={loading ? 'Salvando...' : 'Finalizar Setup ✨'} />
          </div>
        )}

        {/* ═══════════ STEP 6: DONE ═══════════ */}
        {currentStep === 6 && (
          <div className="animate-fade-in-up" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 48px rgba(16,185,129,0.45)', marginBottom: '32px' }}>
              <CheckCircle2 size={60} style={{ color: 'white' }} />
            </div>

            <h1 style={{ fontSize: '2.6rem', fontWeight: 900, margin: '0 0 16px', background: 'linear-gradient(135deg, #fff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Oficina Configurada!
            </h1>

            <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '460px', lineHeight: 1.7, marginBottom: '40px' }}>
              Tudo pronto! Seus dados foram salvos com segurança na nuvem. Crie sua primeira precificação agora.
            </p>

            <button onClick={() => router.push('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 40px', borderRadius: '18px', border: 'none', background: 'linear-gradient(135deg, #10b981, #14b8a6)', color: 'white', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 10px 36px rgba(16,185,129,0.4)' }}>
              Ir para o Dashboard <Rocket size={20} />
            </button>
          </div>
        )}

      </div>

      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); filter: blur(3px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes confetti-fall { to { transform: translateY(110vh) rotate(720deg); } }
      `}</style>
    </div>
  );
}
