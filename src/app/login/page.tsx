'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { user, loading: userLoading, error: userError } = useUser();
  
  // Verificar se há erros de acesso (usuário inativo)
  useEffect(() => {
    if (userError) {
      setError(userError);
    }
  }, [userError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // console.log('Iniciando login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Espere um pouco para o hook useUser processar a autenticação
      // Isso garante que a verificação de status será realizada
      await new Promise(resolve => setTimeout(resolve, 1000));

      // console.log('Login bem sucedido, dados do auth:', data);

      // Buscar dados do usuário na tabela usuarios
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('user_id', data.user.id)
          .single();

        if (userError) {
          // console.error('Erro ao buscar dados do usuário:', userError);
          setError('Erro ao buscar dados do usuário');
        } else {
          // Verificar se o usuário está inativo
          const { data: statusData, error: statusError } = await supabase
            .from('usuarios')
            .select('status')
            .eq('user_id', data.user.id)
            .single();

          if (statusError) {
            setError('Erro ao verificar status do usuário');
          } else if (statusData.status === 'inativo') {
            // Forçar logout se usuário estiver inativo
            await supabase.auth.signOut();
            setError('Acesso negado. Sua conta está inativa.');
          } else {
            // Redirecionar alunos para Identificação Acadêmica
            if (userData.tipo === 'Aluno') {
              router.push('/perfil');
            } else {
              router.push('/');
            }
          }
        }
      }
    } catch (error: any) {
      // console.error('Erro no login:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-blue-500">
            Ápice
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Entre com sua conta para acessar o sistema
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
