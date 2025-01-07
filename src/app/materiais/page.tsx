'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { FolderIcon } from '@heroicons/react/24/outline';
import { XMarkIcon, TrashIcon, DocumentIcon, PlayCircleIcon } from '@heroicons/react/24/outline';

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
  tipo: 'documento' | 'video' | 'link' | 'arquivo';
  url: string;
  assunto: string | null;
  pasta_id: number | null;
  tags: string[] | null;
  download_permitido: boolean;
  ordem: number;
  ativo: boolean;
}

export default function Materiais() {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [pastaAtual, setPastaAtual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [isEditingPasta, setIsEditingPasta] = useState<number | null>(null);
  const [editPastaTitle, setEditPastaTitle] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<Pasta[]>([]);
  const [isModalPastaOpen, setIsModalPastaOpen] = useState(false);
  const [isModalMaterialOpen, setIsModalMaterialOpen] = useState(false);
  const [novoMaterial, setNovoMaterial] = useState({
    titulo: '',
    descricao: '',
    tipo: 'documento' as 'documento' | 'video' | 'link' | 'arquivo',
    url: '',
    assunto: '',
    tags: [] as string[],
    download_permitido: true,
    arquivo: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  const [isModalPdfOpen, setIsModalPdfOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [permiteDownload, setPermiteDownload] = useState(false);

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

  const handleAddMaterial = async () => {
    console.log('Iniciando handleAddMaterial');
    console.log('Estado atual do novoMaterial:', novoMaterial);
    console.log('UserType:', userType);
    console.log('PastaAtual:', pastaAtual);

    if (!novoMaterial.titulo || userType?.toLowerCase() !== 'admin') {
      console.log('Validação inicial falhou:', { titulo: novoMaterial.titulo, userType });
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if ((novoMaterial.tipo === 'documento' || novoMaterial.tipo === 'arquivo') && !novoMaterial.arquivo) {
      console.log('Arquivo obrigatório não fornecido para tipo:', novoMaterial.tipo);
      alert('Por favor, selecione um arquivo');
      return;
    }

    if ((novoMaterial.tipo === 'video' || novoMaterial.tipo === 'link') && !novoMaterial.url) {
      console.log('URL obrigatória não fornecida para tipo:', novoMaterial.tipo);
      alert('Por favor, insira uma URL válida');
      return;
    }

    setUploading(true);
    try {
      console.log('Iniciando processo de upload');
      const supabase = createSupabaseClient();
      let finalUrl = novoMaterial.url;

      if (novoMaterial.arquivo) {
        console.log('Iniciando upload do arquivo:', novoMaterial.arquivo.name);
        const fileName = `${Date.now()}_${novoMaterial.arquivo.name}`;
        console.log('Nome do arquivo para upload:', fileName);

        const { data: arquivoData, error: arquivoError } = await supabase.storage
          .from('material')
          .upload(fileName, novoMaterial.arquivo);

        if (arquivoError) {
          console.error('Erro no upload do arquivo:', arquivoError);
          throw arquivoError;
        }

        console.log('Upload concluído, dados retornados:', arquivoData);
        finalUrl = arquivoData.path;
      }

      console.log('Preparando dados para inserção no banco:', {
        titulo: novoMaterial.titulo,
        tipo: novoMaterial.tipo,
        url: finalUrl
      });

      const { data: material, error: materialError } = await supabase
        .from('materiais_didaticos')
        .insert([
          {
            titulo: novoMaterial.titulo,
            descricao: novoMaterial.descricao || null,
            tipo: novoMaterial.tipo,
            url: finalUrl,
            assunto: novoMaterial.assunto || null,
            pasta_id: pastaAtual,
            tags: novoMaterial.tags.length > 0 ? novoMaterial.tags : null,
            download_permitido: novoMaterial.download_permitido,
            ordem: materiais.length,
            ativo: true
          }
        ])
        .select()
        .single();

      if (materialError) {
        console.error('Erro ao inserir no banco:', materialError);
        throw materialError;
      }

      console.log('Material inserido com sucesso:', material);

      setMateriais([...materiais, material]);
      setIsModalMaterialOpen(false);
      setNovoMaterial({
        titulo: '',
        descricao: '',
        tipo: 'documento',
        url: '',
        assunto: '',
        tags: [],
        download_permitido: true,
        arquivo: null
      });

      console.log('Estado atualizado e modal fechado');
      await carregarConteudo();
      console.log('Conteúdo recarregado');

    } catch (error) {
      console.error('Erro detalhado ao adicionar material:', error);
      alert('Erro ao adicionar material. Por favor, tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditPasta = (pastaId: number) => {
    if (userType?.toLowerCase() !== 'admin') return;

    const pasta = pastas.find(p => p.id === pastaId);
    if (!pasta) return;

    setIsEditingPasta(pastaId);
    setEditPastaTitle(pasta.titulo);
  };

  const handleSaveEditPasta = async (pastaId: number) => {
    if (!editPastaTitle.trim() || userType?.toLowerCase() !== 'admin') return;

    const supabase = createSupabaseClient();
    try {
      const { error } = await supabase
        .from('material_pastas')
        .update({ titulo: editPastaTitle.trim() })
        .eq('id', pastaId);

      if (error) throw error;

      setPastas(pastas.map(pasta => 
        pasta.id === pastaId ? { ...pasta, titulo: editPastaTitle.trim() } : pasta
      ));
      setIsEditingPasta(null);
      setEditPastaTitle('');
    } catch (error) {
      console.error('Erro ao editar pasta:', error);
      alert('Erro ao editar pasta. Por favor, tente novamente.');
    }
  };

  const handleDeletePasta = async (pastaId: number) => {
    if (userType?.toLowerCase() !== 'admin') return;

    const supabase = createSupabaseClient();
    try {
      const { error } = await supabase
        .from('material_pastas')
        .delete()
        .eq('id', pastaId);

      if (error) throw error;

      setPastas(pastas.filter(pasta => pasta.id !== pastaId));
      if (pastaAtual === pastaId) {
        setPastaAtual(null);
      }
    } catch (error) {
      console.error('Erro ao excluir pasta:', error);
      alert('Erro ao excluir pasta. Por favor, tente novamente.');
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) {
      return;
    }

    try {
      const supabase = createSupabaseClient();
      
      // Primeiro, busca o material para ter a URL do arquivo
      const { data: material } = await supabase
        .from('materiais_didaticos')
        .select('url, tipo')
        .eq('id', materialId)
        .single();

      // Se for um documento ou arquivo, remove do storage
      if (material && (material.tipo === 'documento' || material.tipo === 'arquivo')) {
        await supabase.storage
          .from('material')
          .remove([material.url]);
      }

      // Marca como inativo no banco
      const { error } = await supabase
        .from('materiais_didaticos')
        .update({ ativo: false })
        .eq('id', materialId);

      if (error) throw error;

      // Atualiza a lista de materiais
      setMateriais(materiais.filter(m => m.id !== materialId));
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      alert('Erro ao excluir material. Por favor, tente novamente.');
    }
  };

  const abrirMaterial = async (material: Material) => {
    const supabase = createSupabaseClient();
    
    try {
      if (material.tipo === 'video') {
        window.open(material.url, '_blank');
        return;
      }

      if (material.tipo === 'link') {
        window.open(material.url, '_blank');
        return;
      }

      // Para documentos e arquivos, obter URL de download/visualização
      const { data } = await supabase.storage
        .from('material')
        .createSignedUrl(material.url, 3600); // URL válida por 1 hora

      if (data) {
        setSelectedUrl(data.signedUrl);
        setPermiteDownload(material.download_permitido);
        setIsModalPdfOpen(true);
      }
    } catch (error) {
      console.error('Erro ao abrir material:', error);
      alert('Erro ao abrir material. Por favor, tente novamente.');
    }
  };

  const handleDownload = async (url: string) => {
    if (!permiteDownload) return;
    window.open(url, '_blank');
  };

  const PdfViewer = ({ url, onClose }: { url: string; onClose: () => void }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-semibold">Visualizador de PDF</h2>
            <div className="flex space-x-2">
              {permiteDownload && (
                <button
                  onClick={() => handleDownload(url)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Download
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full"
            title="PDF Viewer"
          />
        </div>
      </div>
    );
  };

  const MaterialCard = ({ material }: { material: Material }) => {
    const isAdmin = userType?.toLowerCase() === 'admin';

    return (
      <div className="bg-gray-800 rounded-lg p-6 relative">
        {isAdmin && (
          <button
            onClick={() => handleDeleteMaterial(material.id)}
            className="absolute top-4 right-4 text-red-500 hover:text-red-600"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
        
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <DocumentIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-white">{material.titulo}</h3>
              {material.descricao && (
                <p className="text-gray-400 text-sm">{material.descricao}</p>
              )}
            </div>
          </div>

          {material.assunto && (
            <p className="text-gray-400 text-sm">Assunto: {material.assunto}</p>
          )}
          
          <div className="flex space-x-2">
            <button
              onClick={() => abrirMaterial(material)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
            >
              {material.tipo === 'video' ? (
                <PlayCircleIcon className="h-5 w-5" />
              ) : (
                <DocumentIcon className="h-5 w-5" />
              )}
              <span>{material.tipo === 'video' ? 'Assistir' : 'Visualizar'}</span>
            </button>
          </div>
        </div>
      </div>
    );
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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Materiais Didáticos</h1>
            <nav className="flex mt-2" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <button
                    onClick={() => navegarParaPasta(null)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Início
                  </button>
                </li>
                {breadcrumbs.map((pasta, index) => (
                  <li key={pasta.id} className="flex items-center">
                    <span className="text-gray-400 mx-2">/</span>
                    <button
                      onClick={() => navegarParaPasta(pasta.id)}
                      className={`${
                        index === breadcrumbs.length - 1
                          ? 'text-gray-100'
                          : 'text-blue-400 hover:text-blue-300'
                      }`}
                    >
                      {pasta.titulo}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          {userType?.toLowerCase() === 'admin' && (
            <div className="flex space-x-4">
              <button
                onClick={() => setIsModalPastaOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Nova Pasta
              </button>
              {pastaAtual !== null && (
                <button
                  onClick={() => setIsModalMaterialOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Novo Material
                </button>
              )}
            </div>
          )}
        </div>
        {/* Grid de Pastas e Materiais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pastas */}
          {pastas.map((pasta) => (
            <div
              key={pasta.id}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors relative group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center flex-1">
                  <FolderIcon className="h-6 w-6 text-yellow-500 mr-2" />
                  {isEditingPasta === pasta.id ? (
                    <input
                      type="text"
                      value={editPastaTitle}
                      onChange={(e) => setEditPastaTitle(e.target.value)}
                      onBlur={() => handleSaveEditPasta(pasta.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEditPasta(pasta.id);
                        } else if (e.key === 'Escape') {
                          setIsEditingPasta(null);
                          setEditPastaTitle('');
                        }
                      }}
                      className="bg-gray-900 text-white px-2 py-1 rounded flex-1"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      onClick={() => navegarParaPasta(pasta.id)}
                      className="text-white hover:text-blue-400 font-medium flex-1 text-left"
                    >
                      {pasta.titulo}
                    </button>
                  )}
                </div>
                {userType?.toLowerCase() === 'admin' && (
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPasta(pasta.id);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Editar pasta"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePasta(pasta.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Excluir pasta"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {pasta.descricao && (
                <p className="text-sm text-gray-400 ml-8">{pasta.descricao}</p>
              )}
            </div>
          ))}
          {/* Materiais */}
          {materiais.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      </main>

      {/* Modal de Novo Material */}
      {isModalMaterialOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white">Novo Material</h2>
              <button
                onClick={() => setIsModalMaterialOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={novoMaterial.titulo}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, titulo: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o título do material"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tipo de Material *
                  </label>
                  <select
                    value={novoMaterial.tipo}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, tipo: e.target.value as any })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="documento">Documento</option>
                    <option value="video">Vídeo</option>
                    <option value="link">Link</option>
                    <option value="arquivo">Arquivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={novoMaterial.assunto}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, assunto: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o assunto do material"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={novoMaterial.tags.join(', ')}
                    onChange={(e) => setNovoMaterial({ 
                      ...novoMaterial, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: matemática, álgebra, ensino médio"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={novoMaterial.descricao}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, descricao: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Digite uma descrição para o material"
                  />
                </div>

                {novoMaterial.tipo === 'link' || novoMaterial.tipo === 'video' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={novoMaterial.url}
                      onChange={(e) => setNovoMaterial({ ...novoMaterial, url: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Arquivo *
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setNovoMaterial({ ...novoMaterial, arquivo: e.target.files?.[0] || null })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      accept={novoMaterial.tipo === 'documento' ? '.pdf,.doc,.docx' : '*.*'}
                    />
                  </div>
                )}

                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    checked={novoMaterial.download_permitido}
                    onChange={(e) => setNovoMaterial({ ...novoMaterial, download_permitido: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-300">
                    Permitir download
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setIsModalMaterialOpen(false)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMaterial}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Salvar Material</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de PDF */}
      {isModalPdfOpen && selectedUrl && (
        <PdfViewer url={selectedUrl} onClose={() => setIsModalPdfOpen(false)} />
      )}
    </div>
  );
}