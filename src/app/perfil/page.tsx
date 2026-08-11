"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
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

  return (
    <AppLayout title="Meu Perfil" subtitle="Configurações da Conta">
      <ToastContainer />
      
      {loading ? (
        <div className="flex justify-center p-10 text-[var(--text-secondary)]">Carregando perfil...</div>
      ) : (
        <div className="max-w-2xl mx-auto p-4 md:p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-3xl p-6 md:p-8 shadow-xl">
            
            <div className="flex items-center gap-6 mb-8 border-b border-[var(--border-card)] pb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-5xl shadow-lg border-4 border-[var(--bg-card)]">
                {avatarEmoji}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{storeName || 'Sua Loja'}</h2>
                <p className="text-[var(--text-secondary)]">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Avatar Emoji</label>
                <div className="flex flex-wrap gap-3">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        avatarEmoji === emoji 
                          ? 'bg-indigo-500/20 border-2 border-indigo-500' 
                          : 'bg-[var(--bg-input)] border border-[var(--border-input)] hover:border-indigo-400'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Nome da Loja / Impressão 3D</label>
                  <input 
                    type="text" 
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="Ex: PrintLabs 3D"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Seu Nome (Vendedor)</label>
                  <input 
                    type="text" 
                    value={sellerName}
                    onChange={e => setSellerName(e.target.value)}
                    placeholder="Ex: Thiago"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Tema Principal</label>
                <select 
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  className="w-full md:w-1/2 bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="dark">🌙 Dark Mode (Padrão)</option>
                  <option value="light">☀️ Light Mode (Em breve)</option>
                </select>
              </div>

              <div className="pt-6 border-t border-[var(--border-card)] flex justify-end">
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
