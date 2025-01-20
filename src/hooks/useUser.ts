import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  tipo: string;
}

// Cache global para o usuário
let globalUser: User | null = null;
let globalLoading = true;
const listeners = new Set<(user: User | null) => void>();

const updateGlobalUser = (user: User | null) => {
  globalUser = user;
  globalLoading = false;
  listeners.forEach(listener => listener(user));
};

// Função para reiniciar o estado global
const resetGlobalState = () => {
  globalUser = null;
  globalLoading = true;
  listeners.forEach(listener => listener(null));
};

export function useUser() {
  const [user, setUser] = useState<User | null>(globalUser);
  const [loading, setLoading] = useState(globalLoading);

  useEffect(() => {
    async function getUser() {
      if (!globalLoading && globalUser === user) return;

      try {
        const supabase = createSupabaseClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('id, email, tipo')
            .eq('user_id', authUser.id)
            .single();

          if (userData) {
            const userInfo = {
              id: userData.id,
              email: userData.email,
              tipo: userData.tipo
            };
            updateGlobalUser(userInfo);
            setUser(userInfo);
          } else {
            resetGlobalState();
            setUser(null);
          }
        } else {
          resetGlobalState();
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        resetGlobalState();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    listeners.add(setUser);
    
    if (globalLoading) {
      getUser();
    }

    const supabase = createSupabaseClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        resetGlobalState();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        resetGlobalState(); // Reseta o estado antes de buscar o novo usuário
        getUser();
      }
    });

    return () => {
      listeners.delete(setUser);
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
}
