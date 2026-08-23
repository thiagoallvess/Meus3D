// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import { User, Save, Palette } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

export default function PerfilPage() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [storeName, setStoreName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('👤');
  const [theme, setTheme] = useState('dark');

  const emojis = ['👤', '👨‍🏭', '👩‍🏭', '🚀', '⭐', '🏭', '🎨', '✨', '🔥'];

  useEffect(() => {
    if (!user) return;
    
    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user?.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setStoreName(data.store_name || '');
          setSellerName(data.seller_name || '');
          setAvatarEmoji(data.avatar_emoji || '👤');
          setTheme(data.theme || 'dark');
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar perfil', { theme: 'dark' });
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          store_name: storeName,
          seller_name: sellerName,
          avatar_emoji: avatarEmoji,
          theme: theme
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast.success('Perfil salvo com sucesso!', { theme: 'dark' });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar perfil', { theme: 'dark' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'rgba(10, 12, 25, 0.7)',
    border: '1px solid rgba(75, 85, 99, 0.5)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#f3f4f6',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  };

  return (
    <AppLayout title="Meu Perfil" subtitle="Configurações da conta">
      <ToastContainer />
      
      {loading ? (
        <div className="flex justify-center p-12 text-gray-400">Carregando perfil...</div>
      ) : (
        <div className="max-w-3xl mx-auto w-full">

          {/* Profile Card */}
          <div className="card border-indigo-500/20 shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
            <div className="card-header border-b border-gray-700/50 pb-6 mb-6">
              <div className="flex items-center gap-5 w-full">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-4xl shadow-[0_8px_25px_rgba(99,102,241,0.3)] shrink-0">
                  {avatarEmoji}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 m-0">
                    {storeName || 'Sua Loja'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="card-body">

            <form onSubmit={saveProfile}>
              {/* Emoji Picker */}
              <div className="input-group mb-6">
                <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2 block">Avatar Emoji</label>
                <div className="flex flex-wrap gap-2.5">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center cursor-pointer transition-all ${
                        avatarEmoji === emoji
                          ? 'bg-indigo-500/15 border-2 border-indigo-500 scale-110'
                          : 'bg-gray-900/50 border border-gray-600/40 hover:border-indigo-400'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="input-group mb-0">
                  <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2 block">Nome da Loja / Impressão 3D</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      placeholder="Ex: PrintLabs 3D"
                    />
                  </div>
                </div>
                
                <div className="input-group mb-0">
                  <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2 block">Seu Nome (Vendedor)</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      value={sellerName}
                      onChange={e => setSellerName(e.target.value)}
                      placeholder="Ex: Thiago"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="input-group mb-7">
                <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Palette size={14} /> Tema Principal
                </label>
                <div className="input-wrapper max-w-[300px]">
                  <select
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                  >
                    <option value="dark">🌙 Dark Mode (Padrão)</option>
                    <option value="light">☀️ Light Mode (Em breve)</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-5 border-t border-gray-700/30 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className={`btn ${saving ? 'bg-indigo-500/40 cursor-not-allowed opacity-60' : 'bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 shadow-[0_4px_20px_rgba(99,102,241,0.35)]'} text-white border-none px-7 py-3 rounded-xl font-bold flex items-center gap-2`}
                >
                  <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
