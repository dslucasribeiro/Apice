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
            updateGlobalUser(null);
            setUser(null);
          }
        } else {
          updateGlobalUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        updateGlobalUser(null);
        setUser(null);
      } finally {
        setLoading(false);
        globalLoading = false;
      }
    }

    // Adiciona listener para atualizações
    listeners.add(setUser);
    
    // Se não tiver usuário em cache, busca
    if (globalLoading) {
      getUser();
    }

    const supabase = createSupabaseClient();
    
    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        updateGlobalUser(null);
      } else if (event === 'SIGNED_IN') {
        getUser();
      }
    });

    return () => {
      listeners.delete(setUser);
      subscription?.unsubscribe();
    };
  }, [user]);

  return { user, loading };
}
