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
    <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-4 overflow-hidden relative">
      <ToastContainer />
      
      <div className="w-full max-w-[600px] bg-[var(--bg-card)] border border-[var(--border-card)] rounded-3xl p-10 shadow-2xl relative overflow-hidden z-10">
        <div className="w-full h-2 bg-[var(--bg-input)] rounded-full mb-10 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-in-out" 
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="animate-fade-in-up">
            <div className="text-6xl text-center mb-6 animate-bounce">👋 🏭</div>
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300 text-center flex items-center justify-center gap-3">
              Bem-vindo ao Meus 3D!
            </h1>
            <p className="text-[var(--text-secondary)] text-center text-lg mb-8 leading-relaxed">
              Chega de planilhas confusas! Vamos configurar a sua fábrica de impressão 3D em <strong className="text-white">menos de 2 minutos</strong>.
            </p>
            <div className="flex justify-center mt-10">
              <button 
                onClick={nextStep}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/30 transition-all"
              >
                Começar Aventura 🚀
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              🧵 Seu Primeiro Filamento
            </h1>
            <p className="text-[var(--text-secondary)] text-base mb-6">
              Qual é o rolo que você mais usa? Vamos cadastrá-lo e simular sua primeira compra.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Marca (Ex: Voolt, Esun)</label>
                <input 
                  type="text" 
                  value={filBrand}
                  onChange={e => setFilBrand(e.target.value)}
                  placeholder="Marca" 
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Material</label>
                <select 
                  value={filMaterial}
                  onChange={e => setFilMaterial(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="PLA">PLA</option>
                  <option value="PETG">PETG</option>
                  <option value="ABS">ABS</option>
                  <option value="TPU">TPU</option>
                  <option value="Tritan">Tritan (HT)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Cor do Rolo</label>
                <input 
                  type="text" 
                  value={filColorName}
                  onChange={e => setFilColorName(e.target.value)}
                  placeholder="Ex: Preto Galáxia" 
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Cor (Visual)</label>
                <input 
                  type="color" 
                  value={filColorHex}
                  onChange={e => setFilColorHex(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl h-12 p-1 cursor-pointer outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Quantos rolos você tem?</label>
                <input 
                  type="number" 
                  min="1"
                  value={filQty}
                  onChange={e => setFilQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Preço Total (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 89.90"
                  value={filPrice}
                  onChange={e => setFilPrice(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between mt-10">
              <button 
                onClick={prevStep}
                className="bg-transparent border border-[var(--border-card)] text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all"
              >
                Voltar
              </button>
              <button 
                onClick={() => { if (validateStep2()) nextStep(); }}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                Próximo ➡️
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              📦 Materiais Auxiliares
            </h1>
            <p className="text-[var(--text-secondary)] text-base mb-6">
              O que mais você gasta? Caixas de papelão? Ímãs? Plástico bolha?
            </p>
            
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-sm font-semibold text-[var(--text-secondary)]">Nome do Material (Ex: Caixa 16x11x6)</label>
              <input 
                type="text" 
                placeholder="Nome"
                value={auxName}
                onChange={e => setAuxName(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Quantidade Comprada</label>
                <input 
                  type="number" 
                  min="1"
                  value={auxQty}
                  onChange={e => setAuxQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Custo Total (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 45.00"
                  value={auxPrice}
                  onChange={e => setAuxPrice(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between mt-10">
              <button 
                onClick={prevStep}
                className="bg-transparent border border-[var(--border-card)] text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all"
              >
                Voltar
              </button>
              <div className="flex gap-4 items-center">
                <button onClick={nextStep} className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-primary)] transition-colors">
                  Pular este
                </button>
                <button 
                  onClick={() => { if (validateStep3()) nextStep(); }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  Próximo ➡️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {currentStep === 4 && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              🛒 Onde você vende?
            </h1>
            <p className="text-[var(--text-secondary)] text-base mb-6">
              Cadastre o seu principal marketplace ou loja para calcularmos a comissão automaticamente.
            </p>
            
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-sm font-semibold text-[var(--text-secondary)]">Nome do Canal (Ex: Shopee)</label>
              <input 
                type="text" 
                placeholder="Nome"
                value={mpName}
                onChange={e => setMpName(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Comissão (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="Ex: 14"
                  value={mpFee}
                  onChange={e => setMpFee(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Frete Fixo (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 3.00"
                  value={mpShipping}
                  onChange={e => setMpShipping(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between mt-10">
              <button 
                onClick={prevStep}
                className="bg-transparent border border-[var(--border-card)] text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all"
              >
                Voltar
              </button>
              <div className="flex gap-4 items-center">
                <button onClick={nextStep} className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-primary)] transition-colors">
                  Pular este
                </button>
                <button 
                  onClick={() => { if (validateStep4()) nextStep(); }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  Próximo ➡️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {currentStep === 5 && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">
              🖨️ A Estrela do Show
            </h1>
            <p className="text-[var(--text-secondary)] text-base mb-6">
              Cadastre sua impressora para calcularmos a energia e o desgaste perfeitamente.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Nome da Impressora</label>
                <input 
                  type="text" 
                  placeholder="Ex: Ender 3 V2"
                  value={macName}
                  onChange={e => setMacName(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 1500.00"
                  value={macPrice}
                  onChange={e => setMacPrice(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Potência (Watts)</label>
                <input 
                  type="number" 
                  value={macWatts}
                  onChange={e => setMacWatts(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Desgaste (R$/h)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={macDep}
                  onChange={e => setMacDep(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            
            <div className="w-1/2 pr-2 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">Valor do kWh (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={macKwh}
                  onChange={e => setMacKwh(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between mt-10">
              <button 
                onClick={prevStep}
                className="bg-transparent border border-[var(--border-card)] text-[var(--text-secondary)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all"
                disabled={loading}
              >
                Voltar
              </button>
              <button 
                onClick={finishOnboarding}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Tudo Pronto! ✨'}
              </button>
            </div>
          </div>
        )}

        {/* Step 6 */}
        {currentStep === 6 && (
          <div className="animate-fade-in-up">
            <div className="text-6xl text-center mb-6">🎉 🏆</div>
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300 text-center">
              Fábrica Configurada!
            </h1>
            <p className="text-[var(--text-secondary)] text-center text-lg mb-8">
              Tudo foi salvo no seu banco de dados. Você está pronto para precificar peças com lucro máximo!
            </p>
            <div className="flex justify-center mt-10">
              <button 
                onClick={() => router.push('/')}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/30 transition-all"
              >
                Ir para a Calculadora 🚀
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
        @keyframes fall {
          to { transform: translateY(100vh) rotate(720deg); }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
