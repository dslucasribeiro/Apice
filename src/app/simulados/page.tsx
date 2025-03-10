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

interface Aluno {
  id: number;
  nome: string;
}

interface NovoResultado {
  arquivoResultado: File | null;
  mes: string;
  alunoId: string;
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
  const [isEditingPasta, setIsEditingPasta] = useState<number | null>(null);
  const [editPastaTitle, setEditPastaTitle] = useState('');
  const [isModalResultadoOpen, setIsModalResultadoOpen] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [novoResultado, setNovoResultado] = useState<NovoResultado>({
    arquivoResultado: null,
    mes: '',
    alunoId: ''
  });
  const [searchAluno, setSearchAluno] = useState('');
  const [showAlunoDropdown, setShowAlunoDropdown] = useState(false);

  const alunosFiltrados = alunos.filter(aluno => 
    aluno.nome.toLowerCase().includes(searchAluno.toLowerCase())
  );

  useEffect(() => {
    fetchUserType();
    carregarConteudo();
    carregarAlunos();
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

  const getPandaVideoEmbedCode = (urlOrId: string) => {
    // Extrai o ID do vídeo da URL ou usa o próprio ID se for fornecido diretamente
    const videoId = urlOrId.includes('pandavideo.com.br')
      ? urlOrId.split('v=').pop() || urlOrId
      : urlOrId;

    // Retorna o código de embed do Panda Video
    return `<div style="position:relative;padding-top:56.25%;"><iframe id="panda-${videoId}" src="https://player-vz-bc721c9c-237.tv.pandavideo.com.br/embed/?v=${videoId}" style="border:none;position:absolute;top:0;left:0;" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen=true width="100%" height="100%" fetchpriority="high"></iframe></div>`;
  };

  const abrirResolucao = (simulado: Simulado) => {
    if (!simulado.video_resolucao) return;
    setSimuladoSelecionado({
      ...simulado,
      video_resolucao: simulado.video_resolucao // Não precisa mais transformar a URL
    });
    setIsModalResolucaoOpen(true);
  };

  const handleEditPasta = async (pastaId: number) => {
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
        .from('simulado_pastas')
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

    if (!confirm('Tem certeza que deseja excluir esta pasta? Esta ação não pode ser desfeita.')) {
      return;
    }

    const supabase = createSupabaseClient();
    try {
      // Primeiro, verificar se há subpastas
      const { data: subpastas } = await supabase
        .from('simulado_pastas')
        .select('id')
        .eq('parent_id', pastaId);

      if (subpastas && subpastas.length > 0) {
        alert('Não é possível excluir esta pasta pois ela contém subpastas. Exclua as subpastas primeiro.');
        return;
      }

      // Verificar se há simulados na pasta
      const { data: simuladosPasta } = await supabase
        .from('simulados')
        .select('id')
        .eq('pasta_id', pastaId);

      if (simuladosPasta && simuladosPasta.length > 0) {
        alert('Não é possível excluir esta pasta pois ela contém simulados. Exclua os simulados primeiro.');
        return;
      }

      // Se não houver subpastas nem simulados, excluir a pasta
      const { error } = await supabase
        .from('simulado_pastas')
        .delete()
        .eq('id', pastaId);

      if (error) throw error;

      setPastas(pastas.filter(pasta => pasta.id !== pastaId));
    } catch (error) {
      console.error('Erro ao excluir pasta:', error);
      alert('Erro ao excluir pasta. Por favor, tente novamente.');
    }
  };

  const carregarAlunos = async () => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('tipo', 'Aluno')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar alunos:', error);
      return;
    }

    setAlunos(data || []);
  };

  const handleAddResultado = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novoResultado.arquivoResultado || !novoResultado.mes || !novoResultado.alunoId) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseClient();
      const fileExt = novoResultado.arquivoResultado.name.split('.').pop();
      const fileName = `${Date.now()}_resultado_${novoResultado.alunoId}_${novoResultado.mes}.${fileExt}`;

      // Upload do arquivo PDF
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resultados')
        .upload(fileName, novoResultado.arquivoResultado);

      if (uploadError) throw uploadError;

      // Salvar referência no banco de dados
      const { error: dbError } = await supabase
        .from('resultados_simulados')
        .insert({
          aluno_id: parseInt(novoResultado.alunoId),
          mes: novoResultado.mes,
          arquivo_url: uploadData.path
        });

      if (dbError) throw dbError;

      // Limpar o formulário e fechar o modal
      setNovoResultado({
        arquivoResultado: null,
        mes: '',
        alunoId: ''
      });
      setIsModalResultadoOpen(false);
      alert('Resultado adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar resultado:', error);
      alert('Erro ao adicionar resultado. Por favor, tente novamente.');
    } finally {
      setUploading(false);
    }
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
              <button
                onClick={() => setIsModalResultadoOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
              >
                Adicionar Resultado
              </button>
            </div>
          )}
          {userType?.toLowerCase() === 'aluno' && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Ver Resultado
            </button>
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
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                {pasta.descricao && (
                  <p className="text-gray-400 text-sm">{pasta.descricao}</p>
                )}
              </div>
            ))}

            {simulados.map((simulado) => (
              <div
                key={simulado.id}
                className="bg-gray-800 rounded-lg p-6 relative"
              >
                {userType?.toLowerCase() === 'admin' && (
                  <button
                    onClick={() => handleDeleteSimulado(simulado.id)}
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
                    placeholder="Cole o ID do vídeo do Panda (ex: 952a06f4-df4e-421a-ae66-d8ed4d6491aa)"
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
            <div className="relative pb-[56.25%] bg-black rounded-lg overflow-hidden">
              {simuladoSelecionado.video_resolucao && (
                <div 
                  className="absolute top-0 left-0 w-full h-full"
                  dangerouslySetInnerHTML={{ __html: getPandaVideoEmbedCode(simuladoSelecionado.video_resolucao) }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showPdfModal && selectedPdf && (
        <PdfModal url={selectedPdf} onClose={() => setShowPdfModal(false)} />
      )}

      {isModalResultadoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Adicionar Resultado</h2>
                <button onClick={() => setIsModalResultadoOpen(false)} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleAddResultado}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Arquivo PDF
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setNovoResultado({
                      ...novoResultado,
                      arquivoResultado: e.target.files?.[0] || null
                    })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Mês
                  </label>
                  <select
                    value={novoResultado.mes}
                    onChange={(e) => setNovoResultado({
                      ...novoResultado,
                      mes: e.target.value
                    })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione o mês</option>
                    <option value="Janeiro">Janeiro</option>
                    <option value="Fevereiro">Fevereiro</option>
                    <option value="Março">Março</option>
                    <option value="Abril">Abril</option>
                    <option value="Maio">Maio</option>
                    <option value="Junho">Junho</option>
                    <option value="Julho">Julho</option>
                    <option value="Agosto">Agosto</option>
                    <option value="Setembro">Setembro</option>
                    <option value="Outubro">Outubro</option>
                    <option value="Novembro">Novembro</option>
                    <option value="Dezembro">Dezembro</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Aluno
                  </label>
                  <input
                    type="text"
                    value={searchAluno}
                    onChange={(e) => {
                      setSearchAluno(e.target.value);
                      setShowAlunoDropdown(true);
                    }}
                    onFocus={() => setShowAlunoDropdown(true)}
                    placeholder="Digite para buscar um aluno"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  {showAlunoDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {alunosFiltrados.map((aluno) => (
                        <button
                          key={aluno.id}
                          type="button"
                          className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 focus:outline-none"
                          onClick={() => {
                            setNovoResultado({
                              ...novoResultado,
                              alunoId: aluno.id.toString()
                            });
                            setSearchAluno(aluno.nome);
                            setShowAlunoDropdown(false);
                          }}
                        >
                          {aluno.nome}
                        </button>
                      ))}
                      {alunosFiltrados.length === 0 && (
                        <div className="px-4 py-2 text-gray-400">
                          Nenhum aluno encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalResultadoOpen(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      'Adicionar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
