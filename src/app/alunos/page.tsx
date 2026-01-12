'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/user';
import Navigation from '@/components/Navigation';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";
import {ptBR} from 'date-fns/locale/pt-BR';
import InputMask from 'react-input-mask';

registerLocale('pt-BR', ptBR);

export default function Alunos() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAdmins, setShowAdmins] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [newUser, setNewUser] = useState({
    nome: '',
    cpf: '',
    rg: '',
    data_nasc: '',
    celular: '',
    email: '',
    ano_conclusao_ensino_medio: new Date().getFullYear().toString(),
    responsavel_financeiro: 'Eu mesmo',
    tipo: 'Aluno',
    status: 'ativo'
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
    const userType = localStorage.getItem('userType');
    setIsAdmin(userType === 'Admin');
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      setCurrentUser(userData);
    }
  };

  const checkIfAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: currentUser } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('user_id', session.user.id)
          .single();

        setIsAdmin(currentUser?.tipo === 'Admin');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  useEffect(() => {
    const searchTermLower = searchTerm.toLowerCase();
    const filtered = users.filter(user => {
      const matchesSearch = (
        (user.nome?.toLowerCase() || '').includes(searchTermLower) ||
        (user.email?.toLowerCase() || '').includes(searchTermLower) ||
        (user.cpf || '').includes(searchTerm)
      );
      const matchesType = showAdmins ? user.tipo === 'Admin' : user.tipo === 'Aluno';
      return matchesSearch && matchesType;
    });
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users, showAdmins]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome');

      if (error) throw error;
      setUsers(data || []);
      const initialFiltered = (data || []).filter(user => user.tipo === 'Aluno');
      setFilteredUsers(initialFiltered);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções de formatação
  const formatCPF = (cpf: string | null) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'Não informado';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const resetForm = () => {
    setNewUser({
      nome: '',
      cpf: '',
      rg: '',
      data_nasc: '',
      celular: '',
      email: '',
      ano_conclusao_ensino_medio: new Date().getFullYear().toString(),
      responsavel_financeiro: 'Eu mesmo',
      tipo: 'Aluno',
      status: 'ativo'
    });
    setEditingUser(null);
  };

  const handleEdit = async (user: User) => {
    setNewUser({
      nome: user.nome,
      cpf: user.cpf,
      rg: user.rg,
      data_nasc: user.data_nasc,
      celular: user.celular,
      email: user.email,
      ano_conclusao_ensino_medio: user.ano_conclusao_ensino_medio.toString(),
      responsavel_financeiro: user.responsavel_financeiro,
      tipo: user.tipo, // Mantendo o tipo original
      status: user.status
    });
    setEditingUser(user.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
      try {
        const response = await fetch('/api/users/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao excluir usuário');
        }

        // Recarregar a lista de usuários após deletar
        await fetchUsers();
        alert('Usuário excluído com sucesso!');
      } catch (error: any) {
        console.error('Error deleting user:', error);
        alert(error.message || 'Erro ao excluir aluno. Por favor, tente novamente.');
      }
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedUsers.length === 0) {
      alert('Selecione pelo menos um aluno para excluir.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir ${selectedUsers.length} aluno(s) selecionado(s)?`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const userId of selectedUsers) {
        try {
          const response = await fetch('/api/users/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId }),
          });

          const data = await response.json();

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Erro ao excluir usuário ${userId}:`, data.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`Erro ao excluir usuário ${userId}:`, error);
        }
      }

      // Recarregar a lista de usuários
      await fetchUsers();
      setSelectedUsers([]);

      if (errorCount === 0) {
        alert(`${successCount} aluno(s) excluído(s) com sucesso!`);
      } else {
        alert(`${successCount} aluno(s) excluído(s) com sucesso. ${errorCount} erro(s) ao excluir.`);
      }
    } catch (error: any) {
      console.error('Error deleting users:', error);
      alert('Erro ao excluir alunos. Por favor, tente novamente.');
    }
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map(user => user.id));
    }
  };

  const handleSubmit = async () => {
    try {
      // Validar apenas nome e email
      if (!newUser.nome || !newUser.email) {
        alert('Nome e email são campos obrigatórios.');
        return;
      }

      const userToSave = {
        ...newUser,
        cpf: newUser.cpf ? newUser.cpf.replace(/\D/g, '') : '',
        celular: newUser.celular ? newUser.celular.replace(/\D/g, '') : '',
        rg: newUser.rg || '',
        data_nasc: newUser.data_nasc || null,
        ano_conclusao_ensino_medio: newUser.ano_conclusao_ensino_medio || new Date().getFullYear().toString(),
        responsavel_financeiro: newUser.responsavel_financeiro || 'Eu mesmo',
        tipo: newUser.tipo || 'Aluno',
        status: 'ativo'
      };

      // 1. Primeiro, criar o usuário no auth
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: userToSave.email,
        password: '123456', // Senha padrão alterada para '123456'
        options: {
          data: {
            nome: userToSave.nome,
          }
        }
      });

      if (authError) {
        console.error('Erro ao criar usuário no auth:', authError);
        alert('Erro ao criar usuário. Por favor, verifique se o email já está cadastrado.');
        return;
      }

      if (!authUser.user?.id) {
        throw new Error('Erro ao criar usuário no auth');
      }

      // 2. Depois, inserir na tabela usuarios com o user_id
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          ...userToSave,
          user_id: authUser.user.id,
        }])
        .select();

      if (error) {
        // Se houver erro, tentar deletar o usuário criado no auth
        await supabase.auth.admin.deleteUser(authUser.user.id);
        console.error('Erro ao salvar usuário:', error);
        alert('Erro ao salvar usuário. Por favor, tente novamente.');
        return;
      }

      if (data) {
        setUsers([...users, data[0]]);
        setIsModalOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro ao salvar usuário. Por favor, tente novamente.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value } = target;
    setNewUser(prev => ({

      ...prev,
      [name]: value
    }));
  };

  // Gera array de anos para seleção (últimos 50 anos)
  const years = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

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
        <div className="flex items-center justify-between mb-6 space-x-4">
          {/* Botão Toggle Admin/Alunos - Só aparece para admins */}
          {isAdmin && (
            <button
              onClick={() => setShowAdmins(!showAdmins)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center"
            >
              {showAdmins ? 'Alunos' : 'Administradores'}
            </button>
          )}
          <div className="flex items-center space-x-4 ml-auto">
            {/* Contador de Usuários */}
            <div className="hidden sm:flex items-center bg-gray-800 px-4 py-2 rounded-lg">
              <span className="text-xl font-bold text-blue-500">{filteredUsers.length}</span>
              <span className="ml-2 text-gray-400">{showAdmins ? 'Admins' : 'Alunos'}</span>
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar ${showAdmins ? 'admin' : 'aluno'}...`}
                className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Botão Adicionar com Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center whitespace-nowrap"
              >
                Adicionar Usuário
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => {
                      setNewUser(prev => ({ ...prev, tipo: 'Aluno' }));
                      setIsModalOpen(true);
                      setIsDropdownOpen(false);
                      setEditingUser(null);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg"
                  >
                    Cadastrar Aluno
                  </button>
                  <button
                    onClick={() => {
                      setNewUser(prev => ({ ...prev, tipo: 'Admin' }));
                      setIsModalOpen(true);
                      setIsDropdownOpen(false);
                      setEditingUser(null);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg"
                  >
                    Cadastrar Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botões de Ação para Seleção Múltipla */}
        {selectedUsers.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-blue-900 bg-opacity-50 px-4 py-3 rounded-lg">
            <span className="text-white font-medium">
              {selectedUsers.length} aluno(s) selecionado(s)
            </span>
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar Seleção
              </button>
              <button
                onClick={handleDeleteMultiple}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Excluir Selecionados</span>
              </button>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="w-full">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">RG</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data Nasc.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Celular</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ano Conclusão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-800">
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{user.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{formatCPF(user.cpf)}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{user.rg}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {user.data_nasc ? new Date(user.data_nasc).toLocaleDateString('pt-BR') : ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{formatPhone(user.celular)}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{user.ano_conclusao_ensino_medio}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-500 hover:text-blue-400 transition-colors duration-200"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-500 hover:text-red-400 transition-colors duration-200"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação Sutil - Agora fora da tabela */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    currentPage === i + 1
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-blue-500 mb-4">
                {editingUser ? 'Editar Usuário' : `Adicionar ${newUser.tipo}`}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">Nome</label>
                  <input
                    type="text"
                    name="nome"
                    value={newUser.nome}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">CPF</label>
                  <InputMask
                    mask="999.999.999-99"
                    name="cpf"
                    value={newUser.cpf}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">RG</label>
                  <input
                    type="text"
                    name="rg"
                    value={newUser.rg}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Data de Nascimento</label>
                  <DatePicker
                    selected={newUser.data_nasc ? new Date(newUser.data_nasc) : null}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setNewUser({ ...newUser, data_nasc: date.toISOString() });
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    locale="pt-BR"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholderText="Selecione a data"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Celular</label>
                  <InputMask
                    mask="(99) 99999-9999"
                    name="celular"
                    value={newUser.celular}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Ano de Conclusão do Ensino Médio</label>
                  <select
                    name="ano_conclusao_ensino_medio"
                    value={newUser.ano_conclusao_ensino_medio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Responsável Financeiro</label>
                  <select
                    name="responsavel_financeiro"
                    value={newUser.responsavel_financeiro}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Eu mesmo">Eu mesmo</option>
                    <option value="Pai">Pai</option>
                    <option value="Mãe">Mãe</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <input type="hidden" name="tipo" value={newUser.tipo} />
                <input type="hidden" name="status" value="ativo" />
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingUser ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
