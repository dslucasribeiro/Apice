'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon, ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

type Assunto = {
  id: number;
  nome: string;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
};

export default function AssuntosPage() {
  const router = useRouter();
  const [assuntos, setAssuntos] = useState<Assunto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssunto, setEditingAssunto] = useState<Assunto | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    ordem: 0,
    ativo: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    carregarAssuntos();
  }, []);

  const carregarAssuntos = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('assuntos')
        .select('*')
        .order('categoria', { ascending: true })
        .order('ordem', { ascending: true });

      if (error) throw error;
      setAssuntos(data || []);
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      alert('Erro ao carregar assuntos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      alert('O nome do assunto é obrigatório');
      return;
    }

    try {
      const supabase = createSupabaseClient();

      if (editingAssunto) {
        // Atualizar
        const { error } = await supabase
          .from('assuntos')
          .update({
            nome: formData.nome.trim(),
            categoria: formData.categoria.trim() || null,
            ordem: formData.ordem,
            ativo: formData.ativo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAssunto.id);

        if (error) throw error;
        alert('Assunto atualizado com sucesso!');
      } else {
        // Criar
        const { error } = await supabase
          .from('assuntos')
          .insert({
            nome: formData.nome.trim(),
            categoria: formData.categoria.trim() || null,
            ordem: formData.ordem,
            ativo: formData.ativo
          });

        if (error) throw error;
        alert('Assunto criado com sucesso!');
      }

      setIsModalOpen(false);
      setEditingAssunto(null);
      setFormData({ nome: '', categoria: '', ordem: 0, ativo: true });
      carregarAssuntos();
    } catch (error: any) {
      console.error('Erro ao salvar assunto:', error);
      if (error.code === '23505') {
        alert('Já existe um assunto com este nome');
      } else {
        alert('Erro ao salvar assunto');
      }
    }
  };

  const handleEdit = (assunto: Assunto) => {
    setEditingAssunto(assunto);
    setFormData({
      nome: assunto.nome,
      categoria: assunto.categoria || '',
      ordem: assunto.ordem,
      ativo: assunto.ativo
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este assunto?')) return;

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('assuntos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Assunto excluído com sucesso!');
      carregarAssuntos();
    } catch (error) {
      console.error('Erro ao excluir assunto:', error);
      alert('Erro ao excluir assunto. Pode haver questões vinculadas a ele.');
    }
  };

  const handleToggleAtivo = async (assunto: Assunto) => {
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('assuntos')
        .update({ ativo: !assunto.ativo })
        .eq('id', assunto.id);

      if (error) throw error;
      carregarAssuntos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do assunto');
    }
  };

  const toggleCategoria = (categoria: string) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const categorias = Array.from(new Set(assuntos.map(a => a.categoria).filter(Boolean))) as string[];
  
  const assuntosFiltrados = assuntos.filter(assunto => {
    const matchSearch = assunto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (assunto.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchCategoria = categoriaFilter === 'all' || 
                          (categoriaFilter === 'sem-categoria' && !assunto.categoria) ||
                          assunto.categoria === categoriaFilter;
    return matchSearch && matchCategoria;
  });

  const assuntosPorCategoria = assuntosFiltrados.reduce((acc, assunto) => {
    const cat = assunto.categoria || 'Sem Categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(assunto);
    return acc;
  }, {} as Record<string, Assunto[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Voltar</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Assuntos</h1>
          <p className="text-gray-400">Administre os assuntos disponíveis para as questões dos simulados</p>
        </div>

        {/* Filtros e Ações */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar assunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por Categoria */}
            <div className="w-full md:w-64">
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as Categorias</option>
                <option value="sem-categoria">Sem Categoria</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Botão Adicionar */}
            <button
              onClick={() => {
                setEditingAssunto(null);
                setFormData({ nome: '', categoria: '', ordem: 0, ativo: true });
                setIsModalOpen(true);
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <PlusIcon className="w-5 h-5" />
              Novo Assunto
            </button>
          </div>

          {/* Estatísticas */}
          <div className="flex gap-4 text-sm text-gray-400">
            <span>Total: {assuntos.length}</span>
            <span>Ativos: {assuntos.filter(a => a.ativo).length}</span>
            <span>Inativos: {assuntos.filter(a => !a.ativo).length}</span>
          </div>
        </div>

        {/* Lista de Assuntos por Categoria */}
        <div className="space-y-6">
          {Object.entries(assuntosPorCategoria).map(([categoria, assuntosCategoria]) => {
            const isExpanded = categoriasExpandidas[categoria] ?? true;
            
            return (
              <div key={categoria} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* Header da Categoria - Clicável */}
                <button
                  onClick={() => toggleCategoria(categoria)}
                  className="w-full bg-gray-700 px-4 py-3 flex items-center gap-2 hover:bg-gray-650 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-blue-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-blue-400" />
                  )}
                  <FolderIcon className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">{categoria}</h2>
                  <span className="text-sm text-gray-400">({assuntosCategoria.length})</span>
                </button>

                {/* Assuntos - Mostrar apenas se expandido */}
                {isExpanded && (
                  <div className="divide-y divide-gray-700">
                    {assuntosCategoria.map(assunto => (
                  <div
                    key={assunto.id}
                    className={`p-4 flex items-center justify-between hover:bg-gray-750 transition-colors ${
                      !assunto.ativo ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{assunto.nome}</h3>
                      <div className="flex gap-4 mt-1 text-sm text-gray-400">
                        <span>Ordem: {assunto.ordem}</span>
                        <span className={`px-2 py-0.5 rounded ${
                          assunto.ativo ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {assunto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAtivo(assunto)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          assunto.ativo
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {assunto.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleEdit(assunto)}
                        className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(assunto.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {assuntosFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhum assunto encontrado
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              {editingAssunto ? 'Editar Assunto' : 'Novo Assunto'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome do Assunto *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Trigonometria"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoria (opcional)
                </label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Geometria Plana"
                  list="categorias-existentes"
                />
                <datalist id="categorias-existentes">
                  {categorias.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ordem
                </label>
                <input
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="ativo" className="text-sm text-gray-300">
                  Assunto ativo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAssunto(null);
                    setFormData({ nome: '', categoria: '', ordem: 0, ativo: true });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingAssunto ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
