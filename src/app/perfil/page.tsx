'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import type { User } from '@/types/user';
import Navigation from '@/components/Navigation';
import Image from 'next/image';

interface UserCardProps {
  user: User;
}

export default function Perfil() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const supabase = createSupabaseClient();

  useEffect(() => {
    fetchUsers();
  }, [currentPage]); // Refetch quando a página mudar

  const fetchUsers = async () => {
    try {
      // Primeiro, pegar o usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar tipo do usuário
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('user_id', currentUser.id)
        .single();

      setUserType(userData?.tipo || null);

      // Se for aluno, buscar apenas os próprios dados
      // Se for admin, buscar todos os usuários com paginação e ordenação
      let query = supabase
        .from('usuarios')
        .select('*', { count: 'exact' });

      if (userData?.tipo === 'Aluno') {
        query = query.eq('user_id', currentUser.id);
      } else {
        // Para admin, aplicar ordenação e paginação
        query = query
          .order('nome', { ascending: true })
          .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      if (count !== null) {
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
      
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Users state updated:', users);
  }, [users]);

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'Não informado';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Não informada';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-500';
    
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'bg-green-500';
      case 'inativo':
        return 'bg-red-500';
      case 'pendente':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const UserCard = ({ user }: UserCardProps) => (
    <div className="mt-8 flex justify-center px-4">
      <div className="relative bg-gradient-to-br from-blue-900 to-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-5xl mx-auto overflow-hidden">
        {/* Efeito de brilho */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform rotate-12 translate-y-32"></div>
        
        <div className="relative z-10">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Identificação Acadêmica</h2>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getStatusColor(user.status)}`}>
                {user.status || 'Indefinido'}
              </span>
              <button 
                className="text-blue-400 hover:text-blue-300 transition-colors"
                onClick={() => {/* TODO: Implementar edição */}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Foto e Informações Principais */}
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-700 border-2 border-blue-400">
                {user.foto_perfil ? (
                  <Image
                    src={user.foto_perfil}
                    alt={user.nome || 'Usuário'}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-grow">
              <h3 className="text-xl font-semibold text-white mb-2">{user.nome || 'Nome não informado'}</h3>
              <div className="space-y-1 text-gray-300">
                <p className="text-sm">CPF: {formatCPF(user.cpf)}</p>
                <p className="text-sm">D. Nascimento: {formatDate(user.data_nasc)}</p>
              </div>
            </div>
          </div>

          {/* Informações de Contato e QR Code */}
          <div className="border-t border-blue-800 pt-4">
            <div className="flex justify-between items-start">
              <div className="text-sm text-gray-300">
                <p className="text-blue-400 mb-2">Contato</p>
                <p className="mb-1">{formatPhone(user.celular)}</p>
                <p className="break-all">{user.email || 'Email não informado'}</p>
              </div>

              {/* QR Code decorativo */}
              <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center">
                <div className="w-16 h-16 grid grid-cols-4 grid-rows-4 gap-0.5">
                  {Array(16).fill(0).map((_, i) => (
                    <div key={i} className={`bg-white/80 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-30'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white">Carregando...</div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-white">Identificação</h1>
            {userType === 'Admin' && (
              <div className="text-gray-400 text-sm">
                Total de registros: {users.length}
              </div>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>

          {/* Paginação - Visível apenas para admin e quando houver mais de uma página */}
          {userType === 'Admin' && totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Anterior
              </button>
              
              <span className="text-white">
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
