'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import type { Notice } from '@/types/notice';
import Navigation from '@/components/Navigation';
import { useUser } from '@/hooks/useUser';

export default function Avisos() {
  const { user, loading: userLoading } = useUser();
  const [userType, setUserType] = useState<string>('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newNotice, setNewNotice] = useState({
    titulo: '',
    mensagem: '',
    criado_por: ''
  });

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('tipo')
            .eq('user_id', authUser.id)
            .single();

          //console.log('User Data:', userData);
          
          if (userData) {
            setUserType(userData.tipo || '');
            //console.log('User type:', userData.tipo);
          }
        }
      } catch (error) {
        console.error('Error fetching user type:', error);
      }
    };

    fetchUserType();
  }, []);

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    filterNotices();
  }, [notices, startDate, endDate, searchQuery]);

  const filterNotices = () => {
    let filtered = [...notices];
    
    if (startDate) {
      filtered = filtered.filter(notice => 
        notice.created_at && new Date(notice.created_at) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      filtered = filtered.filter(notice => 
        notice.created_at && new Date(notice.created_at) <= new Date(endDate)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notice =>
        notice.titulo?.toLowerCase().includes(query) ||
        notice.mensagem?.toLowerCase().includes(query)
      );
    }
    
    setFilteredNotices(filtered);
    setCurrentPage(1); // Reset para primeira página quando filtrar
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNotices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNotices.length / itemsPerPage);

  const fetchNotices = async () => {
    const supabase = createSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('avisos')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotices(data || []);
      setFilteredNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewNotice({
      titulo: '',
      mensagem: '',
      criado_por: ''
    });
    setEditingNotice(null);
  };

  const handleEdit = (notice: Notice) => {
    if (userType.toLowerCase() !== 'admin') return;
    setNewNotice({
      titulo: notice.titulo || '',
      mensagem: notice.mensagem || '',
      criado_por: notice.criado_por || ''
    });
    setEditingNotice(notice.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (userType.toLowerCase() !== 'admin') return;
    const supabase = createSupabaseClient();
    try {
      if (!newNotice.titulo.trim()) {
        alert('O título é obrigatório');
        return;
      }
      if (!newNotice.mensagem.trim()) {
        alert('A mensagem é obrigatória');
        return;
      }
      if (!newNotice.criado_por.trim()) {
        alert('O autor é obrigatório');
        return;
      }

      if (editingNotice) {
        const { error } = await supabase
          .from('avisos')
          .update({
            titulo: newNotice.titulo.trim(),
            mensagem: newNotice.mensagem.trim(),
            criado_por: newNotice.criado_por.trim(),
            data_edicao: new Date().toISOString()
          })
          .eq('id', editingNotice);

        if (error) throw error;

        const { data: updatedNotice, error: fetchError } = await supabase
          .from('avisos')
          .select('*')
          .eq('id', editingNotice)
          .single();

        if (fetchError) throw fetchError;

        setNotices(notices.map(notice => 
          notice.id === editingNotice ? updatedNotice : notice
        ));
      } else {
        const { data, error } = await supabase
          .from('avisos')
          .insert({
            titulo: newNotice.titulo.trim(),
            mensagem: newNotice.mensagem.trim(),
            criado_por: newNotice.criado_por.trim()
          })
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('Nenhum dado retornado do servidor');

        setNotices([data, ...notices]);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving notice:', error);
      alert(error?.message || 'Erro ao salvar aviso. Por favor, tente novamente.');
    }
  };

  const handleDelete = async (id: number) => {
    if (userType.toLowerCase() !== 'admin') return;
    const supabase = createSupabaseClient();
    if (window.confirm('Tem certeza que deseja excluir este aviso?')) {
      try {
        const { error } = await supabase
          .from('avisos')
          .update({ 
            ativo: false, 
            data_exclusao: new Date().toISOString() 
          })
          .eq('id', id);

        if (error) throw error;

        setNotices(notices.filter(notice => notice.id !== id));
      } catch (error) {
        console.error('Error deleting notice:', error);
        alert('Erro ao excluir aviso. Por favor, tente novamente.');
      }
    }
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  if (loading || userLoading) {
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-500 mb-6">Avisos</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-4 bg-gray-800 p-2 rounded-lg flex-grow">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <label className="text-gray-400 text-sm mr-2">De:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <label className="text-gray-400 text-sm mr-2">Até:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={clearDateFilters}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors duration-200 hover:bg-gray-700"
                  title="Limpar filtros de data"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 6v12c0 1-1 2-2 2h12a2 2 0 002-2V6M8 6V4c0-1 1-2 2-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>

              <div className="relative flex-grow max-w-md">
                <input
                  type="text"
                  placeholder="Pesquisar em títulos e mensagens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-1.5 text-sm border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <svg
                  className="absolute left-3 top-2 h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            
            {userType.toLowerCase() === 'admin' && (
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out transform hover:scale-105 whitespace-nowrap"
                onClick={() => setIsModalOpen(true)}
              >
                Novo Aviso
              </button>
            )}
          </div>

          {/* Lista de Avisos */}
          <div className="grid gap-6 max-w-3xl mx-auto">
            {currentItems.map((notice) => (
              <div key={notice.id} className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{notice.titulo}</h3>
                    <div className="text-gray-400 text-sm space-y-1">
                      <p>Criado em: {notice.created_at ? new Date(notice.created_at).toLocaleDateString('pt-BR') : 'Data desconhecida'} • Por: {notice.criado_por}</p>
                      {notice.data_edicao && (
                        <p>Editado em: {new Date(notice.data_edicao).toLocaleDateString('pt-BR')}</p>
                      )}
                    </div>
                  </div>
                  {userType.toLowerCase() === 'admin' && (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleEdit(notice)}
                        className="text-blue-500 hover:text-blue-400 transition-colors duration-200"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(notice.id)}
                        className="text-red-500 hover:text-red-400 transition-colors duration-200"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{notice.mensagem}</p>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          )}

          {/* Modal de Criação/Edição */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
                <h2 className="text-xl font-bold text-white mb-4">
                  {editingNotice ? 'Editar Aviso' : 'Novo Aviso'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Título</label>
                    <input
                      type="text"
                      value={newNotice.titulo}
                      onChange={(e) => setNewNotice({ ...newNotice, titulo: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Mensagem</label>
                    <textarea
                      value={newNotice.mensagem}
                      onChange={(e) => setNewNotice({ ...newNotice, mensagem: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 h-32"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Autor</label>
                    <input
                      type="text"
                      value={newNotice.criado_por}
                      onChange={(e) => setNewNotice({ ...newNotice, criado_por: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
                  >
                    {editingNotice ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
