"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function OnboardingPage() {
  const { user, checkOnboardingStatus } = useAuth();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 2: Filament
  const [filBrand, setFilBrand] = useState('');
  const [filMaterial, setFilMaterial] = useState('PLA');
  const [filColorName, setFilColorName] = useState('');
  const [filColorHex, setFilColorHex] = useState('#222222');
  const [filQty, setFilQty] = useState(1);
  const [filPrice, setFilPrice] = useState('');

  // Step 3: Auxiliary
  const [auxName, setAuxName] = useState('');
  const [auxQty, setAuxQty] = useState(50);
  const [auxPrice, setAuxPrice] = useState('');

  // Step 4: Marketplace
  const [mpName, setMpName] = useState('');
  const [mpFee, setMpFee] = useState('');
  const [mpShipping, setMpShipping] = useState('');

  // Step 5: Machine
  const [macName, setMacName] = useState('');
  const [macPrice, setMacPrice] = useState('');
  const [macWatts, setMacWatts] = useState(350);
  const [macDep, setMacDep] = useState(0.20);
  const [macKwh, setMacKwh] = useState(0.95);

  const totalSteps = 6;
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const validateStep2 = () => {
    if (!filBrand || !filColorName || filQty <= 0 || !filPrice || parseFloat(filPrice) < 0) {
      toast.error('Preencha todos os campos do filamento corretamente.', { theme: 'dark' });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!auxName || auxQty <= 0 || !auxPrice || parseFloat(auxPrice) < 0) {
      toast.error('Preencha os campos auxiliares corretamente.', { theme: 'dark' });
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!mpName || !mpFee || parseFloat(mpFee) < 0 || parseFloat(mpFee) > 100 || !mpShipping || parseFloat(mpShipping) < 0) {
      toast.error('Preencha comissão (0-100) e frete válidos.', { theme: 'dark' });
      return false;
    }
    return true;
  };

  const validateStep5 = () => {
    if (!macName || !macPrice || parseFloat(macPrice) < 0 || macWatts < 0 || macDep < 0 || macKwh < 0) {
      toast.error('Preencha os dados da máquina corretamente.', { theme: 'dark' });
      return false;
    }
    return true;
  };

  const finishOnboarding = async () => {
    if (!validateStep5()) return;
    if (!user) return;
    
    setLoading(true);

    try {
      // Salvar Filamento
      const priceNum = parseFloat(filPrice);
      if (filBrand && priceNum > 0) {
        await supabase.from('filaments').insert({
          user_id: user.id,
          brand: filBrand,
          material: filMaterial,
          color_name: filColorName,
          color_hex: filColorHex,
          weight: 1000,
          price: priceNum / filQty
        });
      }

      // Salvar Auxiliar
      const auxPriceNum = parseFloat(auxPrice);
      if (auxName && auxPriceNum > 0) {
        await supabase.from('auxiliaries').insert({
          user_id: user.id,
          name: auxName,
          quantity: auxQty,
          total_cost: auxPriceNum,
          unit_cost: auxPriceNum / auxQty
        });
      }

      // Salvar Marketplace
      const mpFeeNum = parseFloat(mpFee);
      const mpShippingNum = parseFloat(mpShipping);
      if (mpName) {
        // Criar venda direta padrão também
        await supabase.from('marketplaces').insert([
          {
            user_id: user.id,
            name: 'Venda Direta',
            commission_rate: 0,
            default_shipping: 0,
            is_direct: true
          },
          {
            user_id: user.id,
            name: mpName,
            commission_rate: mpFeeNum,
            default_shipping: mpShippingNum,
            is_direct: false
          }
        ]);
      } else {
        await supabase.from('marketplaces').insert({
          user_id: user.id,
          name: 'Venda Direta',
          commission_rate: 0,
          default_shipping: 0,
          is_direct: true
        });
      }

      // Salvar Máquina
      const macPriceNum = parseFloat(macPrice);
      if (macName) {
        await supabase.from('machines').insert({
          user_id: user.id,
          name: macName,
          purchase_price: macPriceNum,
          power_watts: macWatts,
          depreciation_rate: macDep,
          kwh_cost: macKwh
        });
      }

      // Atualizar perfil
      await supabase.from('user_profiles')
        .upsert({ id: user.id, onboarding_done: true });

      await checkOnboardingStatus();
      
      // Shoot Confetti
      shootConfetti();
      nextStep();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações.', { theme: 'dark' });
    } finally {
      setLoading(false);
    }
  };

  const shootConfetti = () => {
    for (let i = 0; i < 50; i++) {
      const conf = document.createElement('div');
      conf.className = 'absolute w-2 h-2 rounded-full animate-fall';
      conf.style.left = Math.random() * 100 + 'vw';
      conf.style.top = -10 + 'px';
      conf.style.backgroundColor = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random()*5)];
      conf.style.animationDuration = (Math.random() * 3 + 2) + 's';
      document.body.appendChild(conf);
      setTimeout(() => conf.remove(), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4 sm:p-8 relative">
      <ToastContainer />
      
      {/* Background Orbs for Premium Feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-[800px] bg-[var(--bg-card)]/80 backdrop-blur-xl border border-[var(--border-card)] rounded-[2rem] p-10 sm:p-14 shadow-2xl relative z-10 my-8">
        
        {/* Progress Header */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              Passo {currentStep} de {totalSteps}
            </span>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {Math.round(percentage)}% Completo
            </span>
          </div>
          <div className="w-full h-2.5 bg-[var(--bg-input)] rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="animate-fade-in-up flex flex-col items-center text-center py-10">
            <div className="text-8xl mb-8 animate-bounce" style={{ animationDuration: '3s' }}>👋 🏭</div>
            <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300 leading-tight">
              Bem-vindo ao Meus 3D!
            </h1>
            <p className="text-[var(--text-secondary)] text-xl mb-12 leading-relaxed max-w-2xl">
              Chega de planilhas confusas e cálculos errados! Vamos configurar a sua fábrica de impressão 3D com precisão em <strong className="text-white font-bold">menos de 2 minutos</strong>.
            </p>
            <button 
              onClick={nextStep}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg py-4 px-12 rounded-2xl shadow-xl shadow-indigo-500/20 hover:-translate-y-1 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300"
            >
              Começar Aventura 🚀
            </button>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="animate-fade-in-up">
            <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              🧵 Seu Primeiro Filamento
            </h1>
            <p className="text-[var(--text-secondary)] text-lg mb-10">
              Qual é o rolo que você mais usa? Vamos cadastrá-lo e simular sua primeira compra no sistema.
            </p>
            
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Marca (Ex: Voolt, Esun)</label>
                  <input 
                    type="text" 
                    value={filBrand}
                    onChange={e => setFilBrand(e.target.value)}
                    placeholder="Nome da Marca" 
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Material</label>
                  <select 
                    value={filMaterial}
                    onChange={e => setFilMaterial(e.target.value)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="TPU">TPU</option>
                    <option value="Tritan">Tritan (HT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Cor do Rolo</label>
                  <input 
                    type="text" 
                    value={filColorName}
                    onChange={e => setFilColorName(e.target.value)}
                    placeholder="Ex: Preto Galáxia" 
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Cor Visual (Opcional)</label>
                  <div className="relative">
                    <input 
                      type="color" 
                      value={filColorHex}
                      onChange={e => setFilColorHex(e.target.value)}
                      className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl h-[60px] p-2 cursor-pointer outline-none focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Quantidade de Rolos</label>
                  <input 
                    type="number" 
                    min="1"
                    value={filQty}
                    onChange={e => setFilQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Preço Total Pago (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 89.90"
                    value={filPrice}
                    onChange={e => setFilPrice(e.target.value)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-8 border-t border-[var(--border-card)]">
              <button 
                onClick={prevStep}
                className="text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-white transition-all"
              >
                ← Voltar
              </button>
              <button 
                onClick={() => { if (validateStep2()) nextStep(); }}
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:-translate-y-1 hover:bg-indigo-500 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                Próximo Passo →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <div className="animate-fade-in-up">
            <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              📦 Materiais Auxiliares
            </h1>
            <p className="text-[var(--text-secondary)] text-lg mb-10">
              Além do filamento, o que mais você gasta? Caixas de papelão? Ímãs? Plástico bolha? Registre o seu principal.
            </p>
            
            <div className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Nome do Material (Ex: Caixa 16x11x6)</label>
                <input 
                  type="text" 
                  placeholder="Nome"
                  value={auxName}
                  onChange={e => setAuxName(e.target.value)}
                  className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Quantidade Comprada</label>
                  <input 
                    type="number" 
                    min="1"
                    value={auxQty}
                    onChange={e => setAuxQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Custo Total (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 45.00"
                    value={auxPrice}
                    onChange={e => setAuxPrice(e.target.value)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-8 border-t border-[var(--border-card)]">
              <button 
                onClick={prevStep}
                className="text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-white transition-all"
              >
                ← Voltar
              </button>
              <div className="flex gap-4 items-center">
                <button onClick={nextStep} className="text-sm font-semibold text-[var(--text-muted)] underline hover:text-[var(--text-primary)] transition-colors">
                  Pular etapa
                </button>
                <button 
                  onClick={() => { if (validateStep3()) nextStep(); }}
                  className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:-translate-y-1 hover:bg-indigo-500 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  Próximo Passo →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {currentStep === 4 && (
          <div className="animate-fade-in-up">
            <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              🛒 Canais de Venda
            </h1>
            <p className="text-[var(--text-secondary)] text-lg mb-10">
              Onde você vende suas peças? Cadastre o seu principal marketplace ou loja para calcularmos a comissão automaticamente.
            </p>
            
            <div className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Nome do Canal (Ex: Shopee, Mercado Livre)</label>
                <input 
                  type="text" 
                  placeholder="Nome do Canal"
                  value={mpName}
                  onChange={e => setMpName(e.target.value)}
                  className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Comissão do Canal (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="Ex: 14"
                    value={mpFee}
                    onChange={e => setMpFee(e.target.value)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Frete Fixo Descontado (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 3.00"
                    value={mpShipping}
                    onChange={e => setMpShipping(e.target.value)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-8 border-t border-[var(--border-card)]">
              <button 
                onClick={prevStep}
                className="text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-white transition-all"
              >
                ← Voltar
              </button>
              <div className="flex gap-4 items-center">
                <button onClick={nextStep} className="text-sm font-semibold text-[var(--text-muted)] underline hover:text-[var(--text-primary)] transition-colors">
                  Pular etapa
                </button>
                <button 
                  onClick={() => { if (validateStep4()) nextStep(); }}
                  className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:-translate-y-1 hover:bg-indigo-500 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  Próximo Passo →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {currentStep === 5 && (
          <div className="animate-fade-in-up">
            <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              🖨️ A Estrela do Show
            </h1>
            <p className="text-[var(--text-secondary)] text-lg mb-10">
              Cadastre sua impressora 3D para calcularmos o consumo de energia e o desgaste da máquina perfeitamente.
            </p>
            
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Nome da Impressora</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Ender 3 V3 KE, Bambu P1S"
                    value={macName}
                    onChange={e => setMacName(e.target.value)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Valor Pago (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 2500.00"
                    value={macPrice}
                    onChange={e => setMacPrice(e.target.value)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Potência Média (Watts)</label>
                  <input 
                    type="number" 
                    value={macWatts}
                    onChange={e => setMacWatts(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Custo de Desgaste (R$/hora)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={macDep}
                    onChange={e => setMacDep(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
              </div>
              
              <div className="w-full sm:w-1/2 pr-0 sm:pr-4">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Custo de Energia Local (R$/kWh)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={macKwh}
                    onChange={e => setMacKwh(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)]/50 border border-[var(--border-input)] rounded-2xl p-4 text-[var(--text-primary)] text-lg outline-none focus:border-indigo-500 focus:bg-[var(--bg-input)] transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-8 border-t border-[var(--border-card)]">
              <button 
                onClick={prevStep}
                className="text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-white transition-all"
                disabled={loading}
              >
                ← Voltar
              </button>
              <button 
                onClick={finishOnboarding}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-4 px-10 rounded-2xl shadow-xl hover:-translate-y-1 hover:shadow-emerald-500/40 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Finalizar Setup ✨'}
              </button>
            </div>
          </div>
        )}

        {/* Step 6 */}
        {currentStep === 6 && (
          <div className="animate-fade-in-up flex flex-col items-center text-center py-10">
            <div className="text-8xl mb-8 animate-bounce" style={{ animationDuration: '2.5s' }}>🎉 🏆</div>
            <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              Fábrica Configurada!
            </h1>
            <p className="text-[var(--text-secondary)] text-xl mb-12 max-w-2xl leading-relaxed">
              Incrível! Todos os dados da sua base foram salvos com sucesso na nuvem. Você está pronto para precificar suas impressões 3D garantindo <strong className="text-white">lucro máximo</strong> em cada peça.
            </p>
            <button 
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg py-4 px-12 rounded-2xl shadow-xl shadow-indigo-500/20 hover:-translate-y-1 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300"
            >
              Ir para o Dashboard 🚀
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0px); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
