'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import Navigation from '@/components/Navigation';

interface Pasta {
  id: number;
  titulo: string;
  descricao: string | null;
  parent_id: number | null;
  ordem: number;
}

interface Material {
  id: number;
  titulo: string;
  descricao: string | null;
  pasta_id: number;
  tipo: 'documento' | 'video' | 'link' | 'arquivo';
  url: string;
  ordem: number;
  download_permitido: boolean;
}

export default function MateriaisDidaticos() {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [pastaAtual, setPastaAtual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<Pasta[]>([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [isModalPastaOpen, setIsModalPastaOpen] = useState(false);
  const [isModalMaterialOpen, setIsModalMaterialOpen] = useState(false);
  const [novaPasta, setNovaPasta] = useState({
    titulo: '',
    descricao: '',
  });
  const [novoMaterial, setNovoMaterial] = useState({
    titulo: '',
    descricao: '',
    tipo: 'documento' as const,
    url: '',
    download_permitido: true,
  });

  useEffect(() => {
    fetchUserType();
    carregarConteudo();
  }, [pastaAtual]);

  const fetchUserType = async () => {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('user_id', user.id)
        .single();
      
      if (userData) {
        setUserType(userData.tipo);
      }
    }
  };

  const carregarConteudo = async () => {
    setLoading(true);
    const supabase = createSupabaseClient();

    try {
      // Carregar pastas do nível atual
      let query = supabase
        .from('material_pastas')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (pastaAtual === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', pastaAtual);
      }

      const { data: pastasData, error: pastasError } = await query;

      if (pastasError) throw pastasError;
      setPastas(pastasData || []);

      // Carregar materiais apenas se estiver dentro de uma pasta
      if (pastaAtual !== null) {
        const { data: materiaisData, error: materiaisError } = await supabase
          .from('materiais_didaticos')
          .select('*')
          .eq('pasta_id', pastaAtual)
          .eq('ativo', true)
          .order('ordem');

        if (materiaisError) throw materiaisError;
        setMateriais(materiaisData || []);
      } else {
        setMateriais([]);
      }

      // Atualizar breadcrumbs
      await atualizarBreadcrumbs();
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarBreadcrumbs = async () => {
    const supabase = createSupabaseClient();
    const breadcrumbsArray: Pasta[] = [];
    let currentId = pastaAtual;

    while (currentId !== null) {
      const { data, error } = await supabase
        .from('material_pastas')
        .select('*')
        .eq('id', currentId)
        .single();

      if (error || !data) break;

      breadcrumbsArray.unshift(data);
      currentId = data.parent_id;
    }

    setBreadcrumbs(breadcrumbsArray);
  };

  const navegarParaPasta = (pastaId: number | null) => {
    setPastaAtual(pastaId);
  };

  const handleAddPasta = async () => {
    if (!novaPasta.titulo || userType?.toLowerCase() !== 'admin') return;

    const supabase = createSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('material_pastas')
        .insert({
          ...novaPasta,
          parent_id: pastaAtual,
          ordem: pastas.length
        })
        .select()
        .single();

      if (error) throw error;

      setPastas([...pastas, data]);
      setIsModalPastaOpen(false);
      setNovaPasta({ titulo: '', descricao: '' });
    } catch (error) {
      console.error('Erro ao adicionar pasta:', error);
      alert('Erro ao criar pasta. Por favor, tente novamente.');
    }
  };

  const handleAddMaterial = async () => {
    if (!novoMaterial.titulo || !novoMaterial.url || userType?.toLowerCase() !== 'admin') return;

    const supabase = createSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('materiais_didaticos')
        .insert({
          ...novoMaterial,
          pasta_id: pastaAtual,
          ordem: materiais.length
        })
        .select()
        .single();

      if (error) throw error;

      setMateriais([...materiais, data]);
      setIsModalMaterialOpen(false);
      setNovoMaterial({
        titulo: '',
        descricao: '',
        tipo: 'documento',
        url: '',
        download_permitido: true,
      });
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      alert('Erro ao adicionar material. Por favor, tente novamente.');
    }
  };

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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs e Navegação */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-gray-400 mb-4">
              <button
                onClick={() => navegarParaPasta(null)}
                className="hover:text-blue-500 transition-colors"
              >
                Início
              </button>
              {breadcrumbs.map((pasta, index) => (
                <div key={pasta.id} className="flex items-center">
                  <span className="mx-2">/</span>
                  <button
                    onClick={() => navegarParaPasta(pasta.id)}
                    className="hover:text-blue-500 transition-colors"
                  >
                    {pasta.titulo}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-blue-500">
                {pastaAtual ? breadcrumbs[breadcrumbs.length - 1]?.titulo : 'Material Didático'}
              </h1>
              {userType?.toLowerCase() === 'admin' && (
                <div className="space-x-4">
                  <button
                    onClick={() => setIsModalPastaOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Nova Pasta
                  </button>
                  <button
                    onClick={() => setIsModalMaterialOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Novo Material
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grid de Pastas e Materiais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pastas */}
            {pastas.map((pasta) => (
              <div
                key={pasta.id}
                onClick={() => navegarParaPasta(pasta.id)}
                className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{pasta.titulo}</h3>
                    {pasta.descricao && (
                      <p className="text-sm text-gray-400">{pasta.descricao}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Materiais */}
            {materiais.map((material) => (
              <div
                key={material.id}
                className="bg-gray-800 rounded-lg p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{material.titulo}</h3>
                    {material.descricao && (
                      <p className="text-sm text-gray-400">{material.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-500 hover:text-blue-400"
                  >
                    {material.download_permitido ? 'Download' : 'Visualizar'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Nova Pasta */}
      {isModalPastaOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Nova Pasta</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Título</label>
                <input
                  type="text"
                  value={novaPasta.titulo}
                  onChange={(e) => setNovaPasta({ ...novaPasta, titulo: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Descrição (opcional)</label>
                <textarea
                  value={novaPasta.descricao}
                  onChange={(e) => setNovaPasta({ ...novaPasta, descricao: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsModalPastaOpen(false)}
                  className="text-gray-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPasta}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Criar Pasta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Material */}
      {isModalMaterialOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Novo Material</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Título</label>
                <input
                  type="text"
                  value={novoMaterial.titulo}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, titulo: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Descrição (opcional)</label>
                <textarea
                  value={novoMaterial.descricao}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, descricao: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Tipo</label>
                <select
                  value={novoMaterial.tipo}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, tipo: e.target.value as any })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                >
                  <option value="documento">Documento</option>
                  <option value="video">Vídeo</option>
                  <option value="link">Link</option>
                  <option value="arquivo">Arquivo</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">URL</label>
                <input
                  type="text"
                  value={novoMaterial.url}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, url: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={novoMaterial.download_permitido}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, download_permitido: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-gray-300">Permitir download</label>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsModalMaterialOpen(false)}
                  className="text-gray-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMaterial}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Adicionar Material
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
