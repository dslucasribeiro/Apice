'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { User as AuthUser } from '@/types/user';
import Navigation from '@/components/Navigation';
import Image from 'next/image';

interface UserCardProps {
  user: UserProfile;
}

interface UserProfile {
  id: number;
  user_id: string;
  created_at?: string | null;
  nome: string;
  cpf: string | null;
  rg: string | null;
  data_nasc: string | null;
  celular: string | null;
  email: string | null;
  ano_conclusao_ensino_medio: number | null;
  responsavel_financeiro: string | null;
  foto_perfil: string | null;
  tipo: string | null;
  status: string | null;
  newProfilePicture?: File;
  previewUrl?: string;
}

export default function Perfil() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
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
    //console.log('Users state updated:', users);
  }, [users]);

  // Funções de formatação
  const formatCPF = (cpf: string | null) => {
    if (!cpf) return 'CPF não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4');
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Data não informada';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'Telefone não informado';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/g, '($1) $2-$3');
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

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    
    // Se a URL já for completa (começa com http ou https), retorna ela mesma
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Caso contrário, constrói a URL do Supabase
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos_perfil/${path}`;
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      let fotoUrl = editingUser.foto_perfil;

      // Se houver uma nova foto para upload
      if (editingUser.newProfilePicture) {
        const file = editingUser.newProfilePicture;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        // Upload da nova foto
        const { error: uploadError, data } = await supabase.storage
          .from('fotos_perfil')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Se havia uma foto anterior, deletá-la
        if (editingUser.foto_perfil) {
          try {
            await supabase.storage
              .from('fotos_perfil')
              .remove([editingUser.foto_perfil]);
          } catch (error) {
            console.error('Erro ao deletar foto antiga:', error);
          }
        }

        // Atualizar a URL da foto
        fotoUrl = fileName;
      }

      // Atualizar dados do usuário
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: editingUser.nome,
          cpf: editingUser.cpf,
          data_nasc: editingUser.data_nasc,
          celular: editingUser.celular,
          email: editingUser.email,
          status: editingUser.status,
          foto_perfil: fotoUrl
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Atualiza a lista de usuários
      await fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error.message);
      alert('Erro ao atualizar usuário. Por favor, tente novamente.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Verificar o tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A foto deve ter no máximo 5MB');
        return;
      }

      // Verificar o tipo do arquivo
      if (!file.type.startsWith('image/')) {
        alert('O arquivo deve ser uma imagem');
        return;
      }

      // Criar URL para preview
      const previewUrl = URL.createObjectURL(file);

      setEditingUser(prev => prev ? {
        ...prev,
        newProfilePicture: file,
        previewUrl: previewUrl
      } : null);
    }
  };

  const handlePhotoClick = (user: UserProfile) => {
    setSelectedUser({ ...user });
    setShowPhotoModal(true);
  };

  const handlePhotoUpdate = async (file: File) => {
    if (!selectedUser) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // Upload da nova foto
      const { error: uploadError } = await supabase.storage
        .from('fotos_perfil')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Se havia uma foto anterior, deletá-la
      if (selectedUser.foto_perfil) {
        try {
          await supabase.storage
            .from('fotos_perfil')
            .remove([selectedUser.foto_perfil]);
        } catch (error) {
          console.error('Erro ao deletar foto antiga:', error);
        }
      }

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('usuarios')
        .update({ foto_perfil: fileName })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Atualiza a lista de usuários
      await fetchUsers();
      setShowPhotoModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Erro ao atualizar foto:', error.message);
      alert('Erro ao atualizar foto. Por favor, tente novamente.');
    }
  };

  // Cleanup function para liberar as URLs de preview
  useEffect(() => {
    return () => {
      if (editingUser?.previewUrl) {
        URL.revokeObjectURL(editingUser.previewUrl);
      }
    };
  }, [editingUser?.previewUrl]);

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
              {userType === 'Admin' && (
                <button 
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={() => handleEdit(user)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Foto e Informações Principais */}
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0 relative group">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-700 border-2 border-blue-400">
                {user.foto_perfil ? (
                  <Image
                    src={getImageUrl(user.foto_perfil) || ''}
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
              <button
                onClick={() => handlePhotoClick(user)}
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200 rounded-lg"
              >
                <svg
                  className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            
            <div className="flex-grow">
              <h3 className="text-xl font-semibold text-white mb-2">{user.nome}</h3>
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
                    <div 
                      key={i} 
                      className={`bg-white/80 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-30'}`}
                    />
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

      {/* Modal de Edição */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Editar Identificação</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={editingUser.nome || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">CPF</label>
                <input
                  type="text"
                  value={editingUser.cpf || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, cpf: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={editingUser.data_nasc?.split('T')[0] || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, data_nasc: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Celular</label>
                <input
                  type="tel"
                  value={editingUser.celular || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, celular: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={editingUser.status || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de Foto */}
      {showPhotoModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Alterar Foto de Perfil</h2>
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-700 border-2 border-blue-400">
                  {selectedUser.previewUrl ? (
                    <Image
                      src={selectedUser.previewUrl}
                      alt={selectedUser.nome || 'Preview'}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedUser.foto_perfil ? (
                    <Image
                      src={getImageUrl(selectedUser.foto_perfil) || ''}
                      alt={selectedUser.nome || 'Usuário'}
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

              <div className="flex flex-col items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      if (file.size > 5 * 1024 * 1024) {
                        alert('A foto deve ter no máximo 5MB');
                        return;
                      }
                      const previewUrl = URL.createObjectURL(file);
                      setSelectedUser(prev => prev ? {
                        ...prev,
                        newProfilePicture: file,
                        previewUrl
                      } : null);
                    }
                  }}
                  className="hidden"
                  id="foto-perfil-modal"
                />
                <label
                  htmlFor="foto-perfil-modal"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer mb-2"
                >
                  Escolher Foto
                </label>
                <p className="text-sm text-gray-400">
                  Tamanho máximo: 5MB. Formatos: JPG, PNG
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    if (selectedUser?.previewUrl) {
                      URL.revokeObjectURL(selectedUser.previewUrl);
                    }
                    setShowPhotoModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (selectedUser?.newProfilePicture) {
                      handlePhotoUpdate(selectedUser.newProfilePicture);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={!selectedUser?.newProfilePicture}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
