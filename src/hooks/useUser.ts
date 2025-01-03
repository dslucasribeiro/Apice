import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  tipo: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      try {
        const supabase = createSupabaseClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        console.log('Auth User:', authUser);

        if (authUser) {
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('id, email, tipo')
            .eq('user_id', authUser.id)
            .single();

          console.log('User Data:', userData);
          console.log('Error:', error);

          if (userData) {
            const userInfo = {
              id: userData.id,
              email: userData.email,
              tipo: userData.tipo
            };
            console.log('Setting user:', userInfo);
            setUser(userInfo);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    getUser();
  }, []);

  return { user, loading };
}
