"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  onboardingDone: boolean;
  signOut: () => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  onboardingDone: false,
  signOut: async () => {},
  checkOnboardingStatus: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const fetchSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user ?? null;
    setUser((prev) => prev?.id === currentUser?.id ? prev : currentUser);
    
    if (currentUser) {
      await fetchOnboardingStatus(currentUser.id);
    } else {
      setLoading(false);
    }
  };

  const fetchOnboardingStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_done')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setOnboardingDone(data.onboarding_done || false);
      }
    } catch (err) {
      console.error("Error fetching onboarding status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      
      setUser((prevUser) => {
        // Apenas recarrega o status se for um usuário diferente (ex: SIGNED_IN)
        if (prevUser?.id !== currentUser?.id) {
          if (currentUser) {
            setLoading(true);
            fetchOnboardingStatus(currentUser.id);
          } else {
            setOnboardingDone(false);
            setLoading(false);
          }
          return currentUser;
        }
        // Se for o mesmo usuário (ex: TOKEN_REFRESHED), mantemos a referência anterior
        // para não disparar re-renders em todo o app que dependem de [user]
        return prevUser;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async () => {
    if (user) {
      await fetchOnboardingStatus(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, onboardingDone, signOut, checkOnboardingStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
