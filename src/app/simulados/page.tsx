'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { FolderIcon, DocumentIcon, PlayCircleIcon, DocumentCheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Pasta {
  id: number;
  titulo: string;
  descricao: string | null;
  parent_id: number | null;
  ordem: number;
}

interface Simulado {
  id: number;
  titulo: string;
  descricao: string | null;
  pasta_id: number;
  pdf_questoes: string;
  pdf_gabarito: string;
  video_resolucao: string | null;
  ordem: number;
  ativo: boolean;
  download_permitido: boolean;
  created_at: string;
  updated_at: string;
}

interface StorageError {
  message: string;
  statusCode?: string;
}

export default function Simulados() {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [pastaAtual, setPastaAtual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<Pasta[]>([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [isModalPastaOpen, setIsModalPastaOpen] = useState(false);
  const [isModalSimuladoOpen, setIsModalSimuladoOpen] = useState(false);
  const [isModalResolucaoOpen, setIsModalResolucaoOpen] = useState(false);
  const [isModalPdfOpen, setIsModalPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [permiteDownload, setPermiteDownload] = useState(false);
  const [simuladoSelecionado, setSimuladoSelecionado] = useState<Simulado | null>(null);
  const [novaPasta, setNovaPasta] = useState({
    titulo: '',
    descricao: '',
  });
  const [novoSimulado, setNovoSimulado] = useState({
    titulo: '',
    descricao: '',
    arquivoQuestoes: null as File | null,
    arquivoGabarito: null as File | null,
    videoResolucao: '',
    downloadPermitido: false
  });
  const [arquivoQuestoes, setArquivoQuestoes] = useState<File | null>(null);
  const [arquivoGabarito, setArquivoGabarito] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

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
        .from('simulado_pastas')
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
        const { data: simuladosData, error: simuladosError } = await supabase
          .from('simulados')
          .select('*')
          .eq('pasta_id', pastaAtual)
          .eq('ativo', true)
          .order('ordem');

        if (simuladosError) throw simuladosError;
        setSimulados(simuladosData || []);
      } else {
        setSimulados([]);
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
        .from('simulado_pastas')
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
        .from('simulado_pastas')
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

  const handleAddSimulado = async () => {
    if (!novoSimulado.titulo || !novoSimulado.arquivoQuestoes || !novoSimulado.arquivoGabarito) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseClient();
      let questoesUrl = '';
      let gabaritoUrl = '';

      if (novoSimulado.arquivoQuestoes) {
        const { data: questoesData, error: questoesError } = await supabase.storage
          .from('simulados')
          .upload(`${Date.now()}_questoes_${novoSimulado.arquivoQuestoes.name}`, novoSimulado.arquivoQuestoes);

        if (questoesError) throw questoesError;
        questoesUrl = questoesData.path;
      }

      if (novoSimulado.arquivoGabarito) {
        const { data: gabaritoData, error: gabaritoError } = await supabase.storage
          .from('simulados')
          .upload(`${Date.now()}_gabarito_${novoSimulado.arquivoGabarito.name}`, novoSimulado.arquivoGabarito);

        if (gabaritoError) throw gabaritoError;
        gabaritoUrl = gabaritoData.path;
      }

      const { data: simulado, error: simuladoError } = await supabase
        .from('simulados')
        .insert([
          {
            titulo: novoSimulado.titulo,
            descricao: novoSimulado.descricao,
            pasta_id: pastaAtual,
            pdf_questoes: questoesUrl,
            pdf_gabarito: gabaritoUrl,
            video_resolucao: novoSimulado.videoResolucao,
            download_permitido: novoSimulado.downloadPermitido,
            ativo: true,
            ordem: simulados.length
          }
        ])
        .select()
        .single();

      if (simuladoError) throw simuladoError;

      setSimulados([...simulados, simulado]);
      setIsModalSimuladoOpen(false);
      setNovoSimulado({
        titulo: '',
        descricao: '',
        arquivoQuestoes: null,
        arquivoGabarito: null,
        videoResolucao: '',
        downloadPermitido: false
      });

    } catch (error) {
      console.error('Erro ao adicionar simulado:', error);
      alert('Erro ao adicionar simulado. Por favor, tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSimulado = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este simulado?')) return;

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('simulados')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      // Atualiza a lista de simulados removendo o simulado excluído
      setSimulados(simulados.filter(s => s.id !== id));
    } catch (error) {
      console.error('Erro ao excluir simulado:', error);
      alert('Erro ao excluir simulado. Por favor, tente novamente.');
    }
  };

  const abrirPdf = async (url: string | null, permitirDownload: boolean) => {
    if (!url) return;

    const pdfUrl = url.startsWith('http') 
      ? url 
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/simulados/${url}`;

    if (permitirDownload) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } else {
      setSelectedPdf(pdfUrl);
      setShowPdfModal(true);
    }
  };

  const PdfViewer = ({ url, onClose }: { url: string; onClose: () => void }) => {
    return (
      <div className="w-full h-full relative bg-gray-900">
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
        >
          <XMarkIcon className="h-8 w-8" />
        </button>
        <div className="absolute inset-0">
          <iframe 
            src={`${url}#toolbar=0`} 
            className="w-full h-full" 
            title="PDF Viewer"
          />
        </div>
      </div>
    );
  };

  const PdfModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
    return (
      <div className="fixed inset-0 z-40">
        <PdfViewer url={url} onClose={onClose} />
      </div>
    );
  };

  const getGoogleDriveViewUrl = (url: string) => {
    // Extrai o ID do arquivo do Google Drive da URL
    const fileId = url.match(/[-\w]{25,}/);
    if (!fileId) return url;
    return `https://drive.google.com/file/d/${fileId[0]}/preview`;
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  const SimuladoCard = ({ simulado, onDelete }: { simulado: Simulado; onDelete: () => void }) => {
    const isAdmin = userType?.toLowerCase() === 'admin';

    return (
      <div className="bg-gray-800 rounded-lg p-6 relative">
        {isAdmin && (
          <button
            onClick={onDelete}
            className="absolute top-4 right-4 text-red-500 hover:text-red-600"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
        
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <DocumentIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-white">{simulado.titulo}</h3>
              {simulado.descricao && (
                <p className="text-gray-400 text-sm">{simulado.descricao}</p>
              )}
            </div>
          </div>

          {simulado.video_resolucao && (
            <div className="flex items-center space-x-3">
              <PlayCircleIcon className="h-6 w-6 text-purple-400 flex-shrink-0" />
              <p className="text-gray-400 text-sm">Vídeo com resolução disponível</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <button
              onClick={() => abrirPdf(simulado.pdf_questoes, simulado.download_permitido)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
            >
              <DocumentIcon className="h-5 w-5" />
              <span>Questões</span>
            </button>
            
            <button
              onClick={() => abrirPdf(simulado.pdf_gabarito, simulado.download_permitido)}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm"
            >
              <DocumentCheckIcon className="h-5 w-5" />
              <span>Gabarito</span>
            </button>
            
            {simulado.video_resolucao && (
              <button
                onClick={() => abrirResolucao(simulado)}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm"
              >
                <PlayCircleIcon className="h-5 w-5" />
                <span>Resolução</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const abrirResolucao = (simulado: Simulado) => {
    if (!simulado.video_resolucao) return;
    setSimuladoSelecionado({
      ...simulado,
      video_resolucao: getYoutubeEmbedUrl(simulado.video_resolucao)
    });
    setIsModalResolucaoOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Simulados</h1>
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
                  onClick={() => setIsModalSimuladoOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Novo Simulado
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastas.map((pasta) => (
              <div
                key={pasta.id}
                onClick={() => navegarParaPasta(pasta.id)}
                className="bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <FolderIcon className="h-8 w-8 text-yellow-400" />
                  <div>
                    <h3 className="text-lg font-medium text-white">{pasta.titulo}</h3>
                    {pasta.descricao && (
                      <p className="text-gray-400 text-sm mt-1">{pasta.descricao}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {simulados.map((simulado) => (
              <SimuladoCard
                key={simulado.id}
                simulado={simulado}
                onDelete={() => handleDeleteSimulado(simulado.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal de Nova Pasta */}
      {isModalPastaOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Nova Pasta</h2>
            <input
              type="text"
              placeholder="Título da pasta"
              className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
              value={novaPasta.titulo}
              onChange={(e) => setNovaPasta({ ...novaPasta, titulo: e.target.value })}
            />
            <textarea
              placeholder="Descrição (opcional)"
              className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
              value={novaPasta.descricao}
              onChange={(e) => setNovaPasta({ ...novaPasta, descricao: e.target.value })}
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsModalPastaOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPasta}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Simulado */}
      {isModalSimuladoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-4 rounded-lg w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-white mb-3">Adicionar Novo Simulado</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Título do Simulado
                </label>
                <input
                  type="text"
                  value={novoSimulado.titulo}
                  onChange={(e) => setNovoSimulado({ ...novoSimulado, titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  placeholder="Digite o título do simulado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={novoSimulado.descricao}
                  onChange={(e) => setNovoSimulado({ ...novoSimulado, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  placeholder="Digite uma descrição para o simulado"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Arquivo de Questões (PDF)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col w-full h-16 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-all">
                      <div className="flex items-center justify-center h-full space-x-2">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 002 2V5a2 2 0 00-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-400">
                          {novoSimulado.arquivoQuestoes ? novoSimulado.arquivoQuestoes.name : 'Clique para selecionar'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => setNovoSimulado({ 
                          ...novoSimulado, 
                          arquivoQuestoes: e.target.files ? e.target.files[0] : null 
                        })}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Arquivo de Gabarito (PDF)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col w-full h-16 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-all">
                      <div className="flex items-center justify-center h-full space-x-2">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 002 2V5a2 2 0 00-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-400">
                          {novoSimulado.arquivoGabarito ? novoSimulado.arquivoGabarito.name : 'Clique para selecionar'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => setNovoSimulado({ 
                          ...novoSimulado, 
                          arquivoGabarito: e.target.files ? e.target.files[0] : null 
                        })}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Link do Vídeo de Resolução
                  </label>
                  <input
                    type="text"
                    value={novoSimulado.videoResolucao}
                    onChange={(e) => setNovoSimulado({ ...novoSimulado, videoResolucao: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                    placeholder="URL do YouTube"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="downloadPermitido"
                    checked={novoSimulado.downloadPermitido}
                    onChange={(e) => setNovoSimulado({ ...novoSimulado, downloadPermitido: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="downloadPermitido" className="text-sm text-gray-300">
                    Permitir download dos arquivos
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setIsModalSimuladoOpen(false);
                  setNovoSimulado({
                    titulo: '',
                    descricao: '',
                    arquivoQuestoes: null,
                    arquivoGabarito: null,
                    videoResolucao: '',
                    downloadPermitido: false
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSimulado}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adicionando...</span>
                  </>
                ) : (
                  <span>Adicionar Simulado</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Resolução em Vídeo */}
      {isModalResolucaoOpen && simuladoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsModalResolucaoOpen(false)}
                className="text-white hover:text-gray-300"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
              {simuladoSelecionado.video_resolucao && (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={simuladoSelecionado.video_resolucao}
                  title="Resolução do Simulado"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showPdfModal && selectedPdf && (
        <PdfModal url={selectedPdf} onClose={() => setShowPdfModal(false)} />
      )}
    </div>
  );
}
