'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { FolderIcon, DocumentIcon, PlayCircleIcon, DocumentCheckIcon, TrashIcon, XMarkIcon, PencilIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface Pasta {
  id: number;
  titulo: string;
  descricao: string | null;
  parent_id: number | null;
  ordem: number;
}

interface SimuladoDigital {
  id: string;
  mes: string;
  ano: number;
  pasta_id: number | null;
  created_at: string;
  questoes_count?: number;
}

// TIPO 1 - DESATIVADO: Interface para simulados com PDFs
// interface Simulado {
//   id: number;
//   titulo: string;
//   descricao: string | null;
//   pasta_id: number;
//   pdf_questoes: string;
//   pdf_gabarito: string;
//   video_resolucao: string | null;
//   ordem: number;
//   ativo: boolean;
//   download_permitido: boolean;
//   created_at: string;
//   updated_at: string;
// }

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

interface ResultadoSimulado {
  id: number;
  mes_simulado: string;
  url_simulado: string;
  created_at: string;
}

// Tipo para questão respondida com detalhes
type QuestaoRespondidaType = {
  id: string;
  numero: number;
  respostaAluno: string;
  respostaCorreta: string;
  acertou: boolean;
  assunto: string;
  dificuldade: string;
};

// Tipo para o resultado do simulado
type ResultadoSimuladoType = {
  acertos: number;
  erros: number;
  total: number;
  percentual: number;
  mostrando: boolean;
  estatisticasDificuldade: {
    fácil: { total: number; acertos: number; percentual: number };
    média: { total: number; acertos: number; percentual: number };
    difícil: { total: number; acertos: number; percentual: number };
  };
  estatisticasAssunto: Record<string, { total: number; acertos: number; percentual: number }>;
  questoesDetalhes?: QuestaoRespondidaType[];
};

type DificuldadeType = 'fácil' | 'média' | 'difícil';

export default function Simulados() {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  // TIPO 1 - DESATIVADO: Estado para simulados com PDFs
  // const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [simuladosDigitais, setSimuladosDigitais] = useState<SimuladoDigital[]>([]);
  const [pastaAtual, setPastaAtual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<Pasta[]>([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [isModalPastaOpen, setIsModalPastaOpen] = useState(false);
  // TIPO 1 - DESATIVADO: Modal para adicionar simulado com PDF
  // const [isModalSimuladoOpen, setIsModalSimuladoOpen] = useState(false);
  const [isModalResolucaoOpen, setIsModalResolucaoOpen] = useState(false);
  const [isModalPdfOpen, setIsModalPdfOpen] = useState(false);
  const [isModalCriarSimuladoOpen, setIsModalCriarSimuladoOpen] = useState(false);
  const [mostrarDetalhesQuestoes, setMostrarDetalhesQuestoes] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [permiteDownload, setPermiteDownload] = useState(false);
  // TIPO 1 - DESATIVADO: Simulado selecionado (PDF)
  // const [simuladoSelecionado, setSimuladoSelecionado] = useState<Simulado | null>(null);
  const [novaPasta, setNovaPasta] = useState({
    titulo: '',
    descricao: '',
  });
  // TIPO 1 - DESATIVADO: Estado para novo simulado com PDFs
  // const [novoSimulado, setNovoSimulado] = useState({
  //   titulo: '',
  //   descricao: '',
  //   arquivoQuestoes: null as File | null,
  //   arquivoGabarito: null as File | null,
  //   videoResolucao: '',
  //   downloadPermitido: false
  // });
  // TIPO 1 - DESATIVADO: Estados para arquivos PDF
  // const [arquivoQuestoes, setArquivoQuestoes] = useState<File | null>(null);
  // const [arquivoGabarito, setArquivoGabarito] = useState<File | null>(null);
  // TIPO 1 - DESATIVADO: Estado de upload
  // const [uploading, setUploading] = useState(false);
  // TIPO 1 - DESATIVADO: Estados para visualização de PDF
  // const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  // const [showPdfModal, setShowPdfModal] = useState(false);
  const [isEditingPasta, setIsEditingPasta] = useState<number | null>(null);
  const [editPastaTitle, setEditPastaTitle] = useState('');
  // TIPO 1 - DESATIVADO: Estados para edição de simulado PDF
  // const [isEditingSimulado, setIsEditingSimulado] = useState<number | null>(null);
  // const [editSimulado, setEditSimulado] = useState({
  //   titulo: '',
  //   pdf_questoes: '',
  //   pdf_gabarito: '',
  //   video_resolucao: ''
  // });
  // const [isModalEditSimuladoOpen, setIsModalEditSimuladoOpen] = useState(false);
  const [isModalResultadoOpen, setIsModalResultadoOpen] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [novoResultado, setNovoResultado] = useState<NovoResultado>({
    arquivoResultado: null,
    mes: '',
    alunoId: ''
  });
  const [searchAluno, setSearchAluno] = useState('');
  const [showAlunoDropdown, setShowAlunoDropdown] = useState(false);
  const [isModalVerResultadoOpen, setIsModalVerResultadoOpen] = useState(false);
  const [resultadosAluno, setResultadosAluno] = useState<ResultadoSimulado[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);
  
  // Estado para controlar a modal de desempenhos
  const [isModalDesempenhosOpen, setIsModalDesempenhosOpen] = useState(false);
  const [alunoSelecionadoDesempenho, setAlunoSelecionadoDesempenho] = useState('');
  const [simuladoSelecionadoDesempenho, setSimuladoSelecionadoDesempenho] = useState('');
  const [simuladosAluno, setSimuladosAluno] = useState<{id: string, titulo: string}[]>([]);
  
  // Estados para criação de simulado com questões
  const [novoSimuladoMes, setNovoSimuladoMes] = useState('');
  const [novoSimuladoAno, setNovoSimuladoAno] = useState(new Date().getFullYear());
  const [pastaIdSelecionada, setPastaIdSelecionada] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questoes, setQuestoes] = useState<{
    numero: number;
    enunciado: string;
    assunto: string;
    dificuldade: DificuldadeType;
    alternativas: {
      letra: string;
      texto: string;
      correta: boolean;
    }[];
  }[]>([]);
  const [questaoAtual, setQuestaoAtual] = useState({
    enunciado: '',
    assunto: '',
    dificuldade: 'fácil',
    alternativas: [
      { letra: 'a', texto: '', correta: false },
      { letra: 'b', texto: '', correta: false },
      { letra: 'c', texto: '', correta: false },
      { letra: 'd', texto: '', correta: false },
      { letra: 'e', texto: '', correta: false }
    ]
  });

  // Novo estado para o modal de escolha de tipo de simulado
  const [isModalEscolhaTipoOpen, setIsModalEscolhaTipoOpen] = useState(false);

  // Estado para o modal de gabaritos vinculados
  const [isModalGabaritosVinculadosOpen, setIsModalGabaritosVinculadosOpen] = useState(false);
  
  // Estado para o modal de visualização de alternativas do gabarito
  const [isModalAlternativasGabaritoOpen, setIsModalAlternativasGabaritoOpen] = useState(false);
  const [alternativasGabarito, setAlternativasGabarito] = useState<{
    simuladoId: number | null;
    titulo: string;
    alternativas: {
      numero: number;
      letra: string;
      assunto: string;
      dificuldade: DificuldadeType;
    }[];
  }>({ simuladoId: null, titulo: '', alternativas: [] });

  // Estados para o modal de gabarito
  const [isModalGabaritoOpen, setIsModalGabaritoOpen] = useState(false);
  const [gabarito, setGabarito] = useState({
    simuladoId: null as number | null,
    questoes: [] as {
      numero: number;
      assunto: string;
      dificuldade: DificuldadeType;
      alternativaCorreta: string;
    }[]
  });
  const [questaoGabaritoAtual, setQuestaoGabaritoAtual] = useState({
    numero: 1,
    assunto: '',
    dificuldade: 'fácil',
    alternativaCorreta: 'a'
  });
  // TIPO 1 - DESATIVADO: Simulados disponíveis (PDFs) para vincular gabarito
  // const [simuladosDisponiveis, setSimuladosDisponiveis] = useState<Simulado[]>([]);
  const alunosFiltrados = alunos.filter(aluno => 
    aluno.nome.toLowerCase().includes(searchAluno.toLowerCase())
  );

  // Estados para gerenciar o cartão resposta
  const [isModalCartaoRespostaOpen, setIsModalCartaoRespostaOpen] = useState(false);
  const [simuladoRespostaId, setSimuladoRespostaId] = useState<number | null>(null);
  const [questoesSimulado, setQuestoesSimulado] = useState<{numero: number, id: string}[]>([]);
  const [respostasAluno, setRespostasAluno] = useState<{[key: number]: string}>({});

  // Ampliando o estado de resultado do simulado para incluir mais estatísticas
  const [resultadoSimulado, setResultadoSimulado] = useState<ResultadoSimuladoType>({
    acertos: 0,
    erros: 0,
    total: 0,
    percentual: 0,
    mostrando: false,
    estatisticasDificuldade: {
      fácil: { total: 0, acertos: 0, percentual: 0 },
      média: { total: 0, acertos: 0, percentual: 0 },
      difícil: { total: 0, acertos: 0, percentual: 0 }
    },
    estatisticasAssunto: {}
  });

  // Adicionando estado para controlar quais simulados o aluno já respondeu
  const [simuladosRespondidos, setSimuladosRespondidos] = useState<number[]>([]);

  useEffect(() => {
    fetchUserType();
    carregarConteudo();
    carregarAlunos();
    // TIPO 1 - DESATIVADO: carregarSimuladosDisponiveis();
    carregarSimuladosRespondidos();
    carregarSimuladosDigitais();
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

      // TIPO 1 - DESATIVADO: Carregamento de simulados PDFs
      // if (pastaAtual !== null) {
      //   const { data: simuladosData, error: simuladosError } = await supabase
      //     .from('simulados')
      //     .select('*')
      //     .eq('pasta_id', pastaAtual)
      //     .eq('ativo', true)
      //     .order('ordem');

      //   if (simuladosError) throw simuladosError;
      //   setSimulados(simuladosData || []);
      // } else {
      //   setSimulados([]);
      // }

      await atualizarBreadcrumbs();
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarSimuladosDigitais = async () => {
    const supabase = createSupabaseClient();
    
    try {
      let query = supabase
        .from('simulados_criados')
        .select('*, questoes(count)');

      if (pastaAtual !== null) {
        query = query.eq('pasta_id', pastaAtual);
      } else {
        query = query.is('pasta_id', null);
      }

      const { data, error } = await query.order('ano', { ascending: false }).order('mes');

      if (error) throw error;

      const simuladosComContagem = data?.map(sim => ({
        ...sim,
        questoes_count: sim.questoes?.[0]?.count || 0
      })) || [];

      setSimuladosDigitais(simuladosComContagem);
    } catch (error) {
      console.error('Erro ao carregar simulados digitais:', error);
      setSimuladosDigitais([]);
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

  // TIPO 1 - DESATIVADO: Função para adicionar simulado com PDFs
  // const handleAddSimulado = async () => {
  //   if (!novoSimulado.titulo || !novoSimulado.arquivoQuestoes || !novoSimulado.arquivoGabarito) {
  //     alert('Por favor, preencha todos os campos obrigatórios');
  //     return;
  //   }

  //   setUploading(true);
  //   try {
  //     const supabase = createSupabaseClient();
  //     let questoesUrl = '';
  //     let gabaritoUrl = '';

  //     if (novoSimulado.arquivoQuestoes) {
  //       const { data: questoesData, error: questoesError } = await supabase.storage
  //         .from('simulados')
  //         .upload(`${Date.now()}_questoes_${novoSimulado.arquivoQuestoes.name}`, novoSimulado.arquivoQuestoes);

  //       if (questoesError) throw questoesError;
  //       questoesUrl = questoesData.path;
  //     }

  //     if (novoSimulado.arquivoGabarito) {
  //       const { data: gabaritoData, error: gabaritoError } = await supabase.storage
  //         .from('simulados')
  //         .upload(`${Date.now()}_gabarito_${novoSimulado.arquivoGabarito.name}`, novoSimulado.arquivoGabarito);

  //       if (gabaritoError) throw gabaritoError;
  //       gabaritoUrl = gabaritoData.path;
  //     }

  //     const { data: simulado, error: simuladoError } = await supabase
  //       .from('simulados')
  //       .insert([
  //         {
  //           titulo: novoSimulado.titulo,
  //           descricao: novoSimulado.descricao,
  //           pasta_id: pastaAtual,
  //           pdf_questoes: questoesUrl,
  //           pdf_gabarito: gabaritoUrl,
  //           video_resolucao: novoSimulado.videoResolucao,
  //           download_permitido: novoSimulado.downloadPermitido,
  //           ativo: true,
  //           ordem: simulados.length
  //         }
  //       ])
  //       .select()
  //       .single();

  //     if (simuladoError) throw simuladoError;

  //     setSimulados([...simulados, simulado]);
  //     setIsModalSimuladoOpen(false);
  //     setNovoSimulado({
  //       titulo: '',
  //       descricao: '',
  //       arquivoQuestoes: null,
  //       arquivoGabarito: null,
  //       videoResolucao: '',
  //       downloadPermitido: false
  //     });

  //   } catch (error) {
  //     console.error('Erro ao adicionar simulado:', error);
  //     alert('Erro ao adicionar simulado. Por favor, tente novamente.');
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  // TIPO 1 - DESATIVADO: Função para deletar simulado PDF
  // const handleDeleteSimulado = async (id: number) => {
  //   if (!confirm('Tem certeza que deseja excluir este simulado?')) return;

  //   try {
  //     const supabase = createSupabaseClient();
  //     const { error } = await supabase
  //       .from('simulados')
  //       .update({ ativo: false })
  //       .eq('id', id);

  //     if (error) throw error;

  //     // Atualiza a lista de simulados removendo o simulado excluído
  //     setSimulados(simulados.filter(s => s.id !== id));
  //   } catch (error) {
  //     console.error('Erro ao excluir simulado:', error);
  //     alert('Erro ao excluir simulado. Por favor, tente novamente.');
  //   }
  // };

  // TIPO 1 - DESATIVADO: Função para abrir PDF de simulado
  // const abrirPdf = async (url: string | null, permitirDownload: boolean) => {
  //   if (!url) return;

  //   const pdfUrl = url.startsWith('http') 
  //     ? url 
  //     : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/simulados/${url}`;

  //   if (permitirDownload) {
  //     window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  //   } else {
  //     setSelectedPdf(pdfUrl);
  //     setShowPdfModal(true);
  //   }
  // };
  
  // Função para visualizar as alternativas do gabarito
  const visualizarAlternativasGabarito = async (simuladoId: number, titulo: string) => {
    try {
      setIsLoading(true);
      
      // Fazer a requisição para buscar as alternativas do gabarito
      const supabase = createSupabaseClient();
      let query = supabase
        .from('alternativas')
        .select('id, letra, texto, correta, questao_id, "simuladoExistente_id", questoes(numero, assunto, dificuldade)')
        .eq('simuladoExistente_id', simuladoId)
        .eq('correta', true);
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }

      console.log('Alternativas encontradas:', data);
      
      if (!data || data.length === 0) {
        alert('Nenhuma alternativa correta encontrada para este simulado.');
        setIsLoading(false);
        return;
      }
      
      // Formatar os dados para exibição
      const alternativasFormatadas = data
        .map((alt, index) => {
          // Se questoes for um array, pegamos o primeiro elemento
          const questao = Array.isArray(alt.questoes) ? alt.questoes[0] : alt.questoes;
          
          return {
            numero: questao?.numero || index + 1, // Usar índice+1 como fallback para número
            letra: alt.letra,
            assunto: questao?.assunto || 'Não especificado',
            dificuldade: questao?.dificuldade || 'média'
          };
        })
        .sort((a, b) => a.numero - b.numero); // Ordenar por número

      setAlternativasGabarito({
        simuladoId,
        titulo,
        alternativas: alternativasFormatadas
      });
      
      // Abrir o modal de alternativas do gabarito
      setIsModalAlternativasGabaritoOpen(true);
    } catch (error) {
      console.error('Erro ao buscar alternativas do gabarito:', error);
      alert('Erro ao buscar as alternativas deste simulado.');
    } finally {
      setIsLoading(false);
    }
  };


  // TIPO 1 - DESATIVADO: Componentes para visualização de PDF
  // const PdfViewer = ({ url, onClose }: { url: string; onClose: () => void }) => {
  //   return (
  //     <div className="w-full h-full relative bg-gray-900">
  //       <button
  //         onClick={onClose}
  //         className="fixed top-4 right-4 z-50 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
  //       >
  //         <XMarkIcon className="h-8 w-8" />
  //       </button>
  //       <div className="absolute inset-0">
  //         <iframe 
  //           src={`${url}#toolbar=0`} 
  //           className="w-full h-full" 
  //           title="PDF Viewer"
  //         />
  //       </div>
  //     </div>
  //   );
  // };

  // const PdfModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
  //   return (
  //     <div className="fixed inset-0 z-40">
  //       <PdfViewer url={url} onClose={onClose} />
  //     </div>
  //   );
  // };

  const getPandaVideoEmbedCode = (urlOrId: string) => {
    // Extrai o ID do vídeo da URL ou usa o próprio ID se for fornecido diretamente
    const videoId = urlOrId.includes('pandavideo.com.br')
      ? urlOrId.split('v=').pop() || urlOrId
      : urlOrId;

    // Retorna o código de embed do Panda Video
    return `<div style="position:relative;padding-top:56.25%;"><iframe id="panda-${videoId}" src="https://player-vz-bc721c9c-237.tv.pandavideo.com.br/embed/?v=${videoId}" style="border:none;position:absolute;top:0;left:0;" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen=true width="100%" height="100%" fetchpriority="high"></iframe></div>`;
  };

  // TIPO 1 - DESATIVADO: Função para abrir vídeo de resolução do simulado PDF
  // const abrirResolucao = (simulado: Simulado) => {
  //   if (!simulado.video_resolucao) return;
  //   setSimuladoSelecionado({
  //     ...simulado,
  //     video_resolucao: simulado.video_resolucao
  //   });
  //   setIsModalResolucaoOpen(true);
  // };

  const handleEditPasta = (pastaId: number) => {
    const pasta = pastas.find(p => p.id === pastaId);
    if (pasta) {
      setIsEditingPasta(pastaId);
      setEditPastaTitle(pasta.titulo);
    }
  };
  
  // TIPO 1 - DESATIVADO: Função para editar simulado PDF
  // const handleEditSimulado = (simulado: Simulado) => {
  //   if (userType?.toLowerCase() !== 'admin') return;
  //   
  //   setIsEditingSimulado(simulado.id);
  //   setEditSimulado({
  //     titulo: simulado.titulo,
  //     pdf_questoes: simulado.pdf_questoes,
  //     pdf_gabarito: simulado.pdf_gabarito,
  //     video_resolucao: simulado.video_resolucao || ''
  //   });
  //   setIsModalEditSimuladoOpen(true);
  // };

  // TIPO 1 - DESATIVADO: Função para salvar edição de simulado PDF
  // const handleSaveEditSimulado = async () => {
  //   if (!isEditingSimulado || userType?.toLowerCase() !== 'admin') return;
  //   
  //   const supabase = createSupabaseClient();
  //   try {
  //     const { data, error } = await supabase
  //       .from('simulados')
  //       .update({
  //         titulo: editSimulado.titulo,
  //         video_resolucao: editSimulado.video_resolucao
  //       })
  //       .eq('id', isEditingSimulado)
  //       .select()
  //       .single();

  //     if (error) {
  //       throw error;
  //     }

  //     // Atualizar o simulado na lista local
  //     setSimulados(simulados.map(simulado => 
  //       simulado.id === isEditingSimulado 
  //         ? { ...simulado, 
  //             titulo: editSimulado.titulo, 
  //             video_resolucao: editSimulado.video_resolucao 
  //           } 
  //         : simulado
  //     ));

  //     // Resetar os estados de edição
  //     setIsEditingSimulado(null);
  //     setIsModalEditSimuladoOpen(false);
  //   } catch (error) {
  //     console.error('Erro ao atualizar simulado:', error);
  //     alert('Ocorreu um erro ao atualizar o simulado. Por favor, tente novamente.');
  //   }
  // };

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
  
  // Função para carregar simulados respondidos pelo aluno (simulados disponíveis para mostrar desempenho)
  const carregarSimuladosDoAluno = async (alunoId: number) => {
    const supabase = createSupabaseClient();
    
    try {
      // Carregar todos os simulados disponíveis para este teste
      // Como está dando erro ao tentar acessar 'respostas_alunos', vamos simplesmente mostrar todos os simulados disponíveis
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo')
        .eq('ativo', true)
        .order('titulo');
        
      if (error) throw error;
      
      // Definir os simulados para o aluno
      setSimuladosAluno(data || []);
    } catch (error) {
      console.error('Erro ao carregar simulados:', error);
      setSimuladosAluno([]);
    }
  };
  
  // Função para visualizar o desempenho do aluno selecionado no simulado selecionado
  const visualizarDesempenhoAluno = async (alunoId: string, simuladoId: string) => {
    try {
      const supabase = createSupabaseClient();
      const simuladoIdNumber = parseInt(simuladoId);
      
      // Definir o simuladoRespostaId para usar nas funções existentes
      setSimuladoRespostaId(simuladoIdNumber);
      
      // Buscar as questões do simulado
      const { data: questoes, error: questoesError } = await supabase
        .from('questoes')
        .select('id, numero, assunto, dificuldade')
        .eq('simuladoExistente_id', simuladoIdNumber)
        .order('numero', { ascending: true });
      
      if (questoesError) {
        console.error('Erro ao buscar questões:', questoesError);
        alert('Ocorreu um erro ao buscar as questões do simulado.');
        return;
      }
      
      if (!questoes || questoes.length === 0) {
        alert('Não foram encontradas questões para este simulado.');
        return;
      }
      
      // Buscar as respostas do aluno para este simulado
      const questoesIds = questoes.map(q => q.id);
      const { data: respostasAluno, error: respostasError } = await supabase
        .from('respostas_alunos')
        .select('questao_id, alternativa_resposta')
        .eq('aluno_id', alunoId)
        .in('questao_id', questoesIds);
      
      if (respostasError) {
        console.error('Erro ao buscar respostas do aluno:', respostasError);
        alert('Ocorreu um erro ao buscar as respostas do aluno.');
        return;
      }
      
      if (!respostasAluno || respostasAluno.length === 0) {
        alert('O aluno selecionado ainda não respondeu a este simulado.');
        return;
      }
      
      // Criar um mapa de respostas do aluno por questão
      const respostasPorQuestao: { [key: string]: string } = {};
      respostasAluno.forEach(resposta => {
        respostasPorQuestao[resposta.questao_id] = resposta.alternativa_resposta;
      });
      
      // Buscar as alternativas corretas para o simulado
      const { data: alternativas, error: alternativasError } = await supabase
        .from('alternativas')
        .select('questao_id, letra')
        .eq('simuladoExistente_id', simuladoIdNumber)
        .eq('correta', true);
      
      if (alternativasError) {
        console.error('Erro ao buscar alternativas:', alternativasError);
        alert('Ocorreu um erro ao buscar as alternativas corretas.');
        return;
      }
      
      // Criar um mapa de alternativas corretas por questão
      const alternativasCorretas: { [key: string]: string } = {};
      alternativas?.forEach(alt => {
        alternativasCorretas[alt.questao_id] = alt.letra;
      });
      
      // Calcular quantas questões o aluno acertou
      let acertos = 0;
      let erros = 0;
      let total = questoes.length;
      
      // Inicializar estatísticas por dificuldade e assunto
      const estatisticasDificuldade = {
        fácil: { total: 0, acertos: 0, percentual: 0 },
        média: { total: 0, acertos: 0, percentual: 0 },
        difícil: { total: 0, acertos: 0, percentual: 0 }
      };
      const estatisticasAssunto: { [assunto: string]: { total: number, acertos: number, percentual: number } } = {};
      
      for (const questao of questoes) {
        const respostaAluno = respostasPorQuestao[questao.id];
        const alternativaCorreta = alternativasCorretas[questao.id];
        const dificuldade = questao.dificuldade?.toLowerCase() as DificuldadeType;
        
        // Garantir que a dificuldade seja uma das três opções válidas
        const dificuldadeValida: DificuldadeType = 
          ['fácil', 'média', 'difícil'].includes(dificuldade) 
            ? dificuldade 
            : 'média';
        
        // Incrementar o total para esta dificuldade
        estatisticasDificuldade[dificuldadeValida].total++;
        
        // Inicializar estatísticas para este assunto se necessário
        if (!estatisticasAssunto[questao.assunto]) {
          estatisticasAssunto[questao.assunto] = { total: 0, acertos: 0, percentual: 0 };
        }
        estatisticasAssunto[questao.assunto].total++;
        
        if (respostaAluno && alternativaCorreta && 
            respostaAluno.toLowerCase() === alternativaCorreta.toLowerCase()) {
          acertos++;
          estatisticasDificuldade[dificuldadeValida].acertos++;
          estatisticasAssunto[questao.assunto].acertos++;
        } else {
          erros++;
        }
      }
      
      // Calcular percentuais por dificuldade e assunto
      Object.keys(estatisticasDificuldade).forEach((dificuldade) => {
        const diff = dificuldade as DificuldadeType;
        if (estatisticasDificuldade[diff].total > 0) {
          estatisticasDificuldade[diff].percentual = Math.round(
            (estatisticasDificuldade[diff].acertos / estatisticasDificuldade[diff].total) * 100
          );
        }
      });
      
      Object.keys(estatisticasAssunto).forEach((assunto) => {
        if (estatisticasAssunto[assunto].total > 0) {
          estatisticasAssunto[assunto].percentual = Math.round(
            (estatisticasAssunto[assunto].acertos / estatisticasAssunto[assunto].total) * 100
          );
        }
      });
      
      // Calcular o percentual de acertos
      const percentual = total > 0 ? Math.round((acertos / total) * 100) : 0;
      
      // Criar array com detalhes de cada questão respondida
      const questoesDetalhes: QuestaoRespondidaType[] = questoes.map(questao => {
        const respostaAluno = respostasPorQuestao[questao.id] || '-';
        const respostaCorreta = alternativasCorretas[questao.id] || '-';
        const acertou: boolean = !!(respostaAluno && 
                       respostaCorreta && 
                       respostaAluno.toLowerCase() === respostaCorreta.toLowerCase());
        
        return {
          id: questao.id,
          numero: questao.numero,
          respostaAluno,
          respostaCorreta,
          acertou,
          assunto: questao.assunto || 'Não especificado',
          dificuldade: questao.dificuldade || 'média'
        };
      }).sort((a, b) => a.numero - b.numero); // Ordenar por número da questão
      
      // Configurar o modal para mostrar o resultado
      setResultadoSimulado({
        acertos,
        erros,
        total,
        percentual,
        mostrando: true,
        estatisticasDificuldade,
        estatisticasAssunto,
        questoesDetalhes
      });
      
      // Fechar a modal de desempenhos e abrir a modal de resultados
      setIsModalDesempenhosOpen(false);
      setIsModalCartaoRespostaOpen(true);
      
    } catch (error) {
      console.error('Erro ao carregar desempenho do simulado:', error);
      alert('Ocorreu um erro ao carregar o desempenho. Por favor, tente novamente.');
    }
  };

  const normalizarMes = (mes: string) => {
    return mes.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // TIPO 1 - DESATIVADO: Função para adicionar resultado de simulado (PDF)
  // const handleAddResultado = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   
  //   if (!novoResultado.arquivoResultado || !novoResultado.mes || !novoResultado.alunoId || !searchAluno) {
  //     alert('Por favor, preencha todos os campos');
  //     return;
  //   }

  //   setUploading(true);
  //   try {
  //     const supabase = createSupabaseClient();
  //     const fileExt = novoResultado.arquivoResultado.name.split('.').pop();
  //     const mesNormalizado = normalizarMes(novoResultado.mes);
  //     const fileName = `resultados/${Date.now()}_resultado_${novoResultado.alunoId}_${mesNormalizado}.${fileExt}`;
  //     
  //     // Upload do arquivo PDF para o bucket 'resultados'
  //     const { data: uploadData, error: uploadError } = await supabase.storage
  //       .from('resultados')
  //       .upload(fileName, novoResultado.arquivoResultado, {
  //         contentType: 'application/pdf'
  //       });

  //     if (uploadError) throw uploadError;

  //     // Pegar a URL pública do arquivo
  //     const { data: { publicUrl } } = supabase
  //       .storage
  //       .from('resultados')
  //       .getPublicUrl(uploadData.path);

  //     // Salvar referência no banco de dados
  //     const { error: dbError } = await supabase
  //       .from('resultado_simulado')
  //       .insert([{
  //         id_aluno: parseInt(novoResultado.alunoId),
  //         nome_aluno: searchAluno,
  //         mes_simulado: novoResultado.mes,
  //         url_simulado: publicUrl
  //       }]);

  //     if (dbError) {
  //       await supabase.storage
  //         .from('resultados')
  //         .remove([uploadData.path]);
  //       throw dbError;
  //     }

  //     // Limpar o formulário e fechar o modal
  //     setNovoResultado({
  //       arquivoResultado: null,
  //       mes: '',
  //       alunoId: ''
  //     });
  //     setSearchAluno('');
  //     setIsModalResultadoOpen(false);
  //     alert('Resultado adicionado com sucesso!');
  //   } catch (error: any) {
  //     alert('Erro ao adicionar resultado. Por favor, tente novamente.');
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  const carregarResultadosAluno = async () => {
    const supabase = createSupabaseClient();
    
    // Pegar o user_id do aluno logado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Buscar o id do aluno na tabela usuarios
    const { data: userData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!userData) return;

    // Carregar resultados do aluno
    const { data: resultados } = await supabase
      .from('resultado_simulado')
      .select('*')
      .eq('id_aluno', userData.id)
      .order('created_at', { ascending: false });

    if (resultados) {
      setResultadosAluno(resultados);
      // Extrair meses únicos dos resultados
      const mesesUnicos = resultados
        .map(r => r.mes_simulado)
        .filter((mes, index, array) => array.indexOf(mes) === index);
      setMesesDisponiveis(mesesUnicos);
      // Selecionar o mês mais recente
      if (mesesUnicos.length > 0) {
        setMesSelecionado(mesesUnicos[0]);
      }
    }
  };

  const handleVerResultado = () => {
    carregarResultadosAluno();
    setIsModalVerResultadoOpen(true);
  };

  const salvarSimulado = async () => {
    try {
      setIsLoading(true);
      
      // Criar cliente Supabase
      const supabase = createSupabaseClient();
      
      // Verificar se temos todas as informações necessárias
      if (!novoSimuladoMes || questoes.length === 0) {
        alert('Preencha todos os campos obrigatórios e adicione pelo menos uma questão.');
        setIsLoading(false);
        return;
      }
      
      // 1. Inserir o simulado na tabela simulados_criados
      const { data: simuladoCriado, error: simuladoError } = await supabase
        .from('simulados_criados')
        .insert({
          mes: novoSimuladoMes,
          ano: novoSimuladoAno,
          pasta_id: pastaIdSelecionada
        })
        .select()
        .single();
      
      if (simuladoError) {
        console.error('Erro ao criar simulado:', simuladoError);
        alert('Erro ao criar simulado. Por favor, tente novamente.');
        setIsLoading(false);
        return;
      }
      
      // 2. Para cada questão, inserir na tabela questoes
      for (const questao of questoes) {
        const { data: questaoCriada, error: questaoError } = await supabase
          .from('questoes')
          .insert({
            simulado_id: simuladoCriado.id,
            numero: questao.numero,
            enunciado: questao.enunciado,
            assunto: questao.assunto,
            dificuldade: questao.dificuldade
          })
          .select()
          .single();

        if (questaoError) throw questaoError;

        // 3. Para cada alternativa da questão, inserir na tabela alternativas
        for (const alternativa of questao.alternativas) {
          const { error: alternativaError } = await supabase
            .from('alternativas')
            .insert({
              questao_id: questaoCriada.id,
              "simuladoExistente_id": simuladoCriado.id,
              letra: alternativa.letra,
              texto: alternativa.texto,
              correta: alternativa.correta
            });

          if (alternativaError) throw alternativaError;
        }
      }
      
      alert('Simulado criado com sucesso!');
      
      // Limpar o formulário e fechar o modal
      setNovoSimuladoMes('');
      setNovoSimuladoAno(new Date().getFullYear());
      setPastaIdSelecionada(null);
      setQuestoes([]);
      setQuestaoAtual({
        enunciado: '',
        assunto: '',
        dificuldade: 'fácil',
        alternativas: [
          { letra: 'a', texto: '', correta: false },
          { letra: 'b', texto: '', correta: false },
          { letra: 'c', texto: '', correta: false },
          { letra: 'd', texto: '', correta: false },
          { letra: 'e', texto: '', correta: false }
        ]
      });
      setIsModalCriarSimuladoOpen(false);
      
      // Recarregar os dados
      carregarConteudo();
      
    } catch (error: any) {
      console.error('Erro ao salvar simulado:', error);
      alert('Ocorreu um erro ao salvar o simulado. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // TIPO 1 - DESATIVADO: Função para carregar simulados PDFs disponíveis
  // const carregarSimuladosDisponiveis = async () => {
  //   const supabase = createSupabaseClient();
  //   try {
  //     const { data, error } = await supabase
  //       .from('simulados')
  //       .select('*')
  //       .eq('ativo', true)
  //       .order('titulo');
  //     
  //     if (error) throw error;
  //     setSimuladosDisponiveis(data || []);
  //   } catch (error) {
  //     console.error('Erro ao carregar simulados:', error);
  //   }
  // };

  // Função para carregar os simulados que o aluno já respondeu
  const carregarSimuladosRespondidos = async () => {
    try {
      const supabase = createSupabaseClient();
      
      // Obter o ID do aluno atual (do usuário logado)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Usuário não autenticado.');
        return;
      }
      
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userData) {
        console.error('Dados do usuário não encontrados.');
        return;
      }
      
      const alunoId = userData.id;
      
      // Buscar simulados respondidos da nova tabela
      const { data: simuladosData, error: simuladosError } = await supabase
        .from('simulados_respondidos')
        .select('simulado_id')
        .eq('aluno_id', alunoId)
        .eq('respondido', true);
      
      if (simuladosError) {
        console.error('Erro ao buscar simulados respondidos:', simuladosError);
        return;
      }
      
      if (simuladosData && simuladosData.length > 0) {
        // Extrair os IDs dos simulados respondidos
        const simuladosIds = simuladosData.map(item => item.simulado_id);
        setSimuladosRespondidos(simuladosIds);
      } else {
        setSimuladosRespondidos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar simulados respondidos:', error);
    }
  };

  const salvarGabarito = async () => {
    if (!gabarito.simuladoId || gabarito.questoes.length === 0) {
      alert('Selecione um simulado e adicione pelo menos uma questão.');
      return;
    }

    try {
      const supabase = createSupabaseClient();
      
      // Para cada questão no gabarito, salvar na tabela de questões
      for (const questao of gabarito.questoes) {
        // 1. Inserir a questão
        const { data: questaoData, error: questaoError } = await supabase
          .from('questoes')
          .insert({
            "simuladoExistente_id": gabarito.simuladoId,
            numero: questao.numero,
            assunto: questao.assunto,
            dificuldade: questao.dificuldade as DificuldadeType,
            enunciado: null // Campo opcional
          })
          .select()
          .single();

        if (questaoError) throw questaoError;

        // 2. Inserir apenas a alternativa correta
        const { error: alternativaError } = await supabase
          .from('alternativas')
          .insert({
            questao_id: questaoData.id,
            "simuladoExistente_id": gabarito.simuladoId,
            letra: questao.alternativaCorreta,
            texto: null, // Campo opcional
            correta: true
          });

        if (alternativaError) throw alternativaError;
      }

      alert('Gabarito salvo com sucesso!');
      // Limpar o formulário e fechar o modal
      setGabarito({
        simuladoId: null,
        questoes: []
      });
      setIsModalGabaritoOpen(false);
      
      // Recarregar os dados atualizados
      carregarConteudo();
    } catch (error: any) {
      console.error('Erro ao salvar gabarito:', error);
      alert(`Erro ao salvar o gabarito: ${error.message || 'Verifique o console para mais detalhes.'}`);
    }
  };

  // TIPO 1 - DESATIVADO: Tipo Simulado foi desativado, usando 'any' temporariamente
  const abrirCartaoResposta = async (simulado: any) => {
    // Reset do estado de resultados do simulado para garantir que começamos com a tela de respostas
    setResultadoSimulado({
      acertos: 0,
      erros: 0,
      total: 0,
      percentual: 0,
      mostrando: false,
      estatisticasDificuldade: {
        fácil: { total: 0, acertos: 0, percentual: 0 },
        média: { total: 0, acertos: 0, percentual: 0 },
        difícil: { total: 0, acertos: 0, percentual: 0 }
      },
      estatisticasAssunto: {}
    });
    
    setIsModalCartaoRespostaOpen(true);
    
    // Se o simulado já tiver sido passado, usamos o ID dele
    if (simulado && simulado.id) {
      setSimuladoRespostaId(simulado.id);
      
      // Verificar explicitamente se o simulado já foi respondido
      const supabase = createSupabaseClient();
      
      // Obter o ID do aluno atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Usuário não autenticado.');
        carregarQuestoesSimulado(simulado.id);
        return;
      }
      
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userData) {
        console.error('Dados do usuário não encontrados.');
        carregarQuestoesSimulado(simulado.id);
        return;
      }
      
      const alunoId = userData.id;
      
      // Buscar na tabela de simulados_respondidos
      const { data: simuladoRespondido, error } = await supabase
        .from('simulados_respondidos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('simulado_id', simulado.id)
        .eq('respondido', true)
        .single();
      
      if (error || !simuladoRespondido) {
        console.log('Simulado não respondido ou erro na verificação:', error);
        // Resetar o estado de resultados para garantir que mostramos a tela de cartão resposta
        setResultadoSimulado({
          acertos: 0,
          erros: 0,
          total: 0,
          percentual: 0,
          mostrando: false,
          estatisticasDificuldade: {
            fácil: { total: 0, acertos: 0, percentual: 0 },
            média: { total: 0, acertos: 0, percentual: 0 },
            difícil: { total: 0, acertos: 0, percentual: 0 }
          },
          estatisticasAssunto: {}
        });
        
        // Carregar as questões do simulado
        carregarQuestoesSimulado(simulado.id);
      } else {
        // Se já foi respondido, carrega as estatísticas de desempenho
        console.log('Simulado já respondido, carregando desempenho');
        carregarDesempenhoSimulado(simulado.id);
      }
    } else {
      // Caso contrário, resetamos o estado
      setSimuladoRespostaId(null);
      setQuestoesSimulado([]);
      setRespostasAluno({});
    }
  };

  const carregarQuestoesSimulado = async (simuladoId: number) => {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('questoes')
        .select('id, numero')
        .eq('simuladoExistente_id', simuladoId)
        .order('numero', { ascending: true });
      
      if (error) {
        console.error('Erro ao carregar questões:', error);
        return;
      }

      if (data && data.length > 0) {
        setQuestoesSimulado(data);
        // Inicializa o objeto de respostas com valores vazios
        const respostasIniciais: {[key: number]: string} = {};
        data.forEach(questao => {
          respostasIniciais[questao.numero] = '';
        });
        setRespostasAluno(respostasIniciais);
      } else {
        setQuestoesSimulado([]);
        setRespostasAluno({});
      }
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
    }
  };

  const handleSimuladoRespostaChange = (simuladoId: number) => {
    setSimuladoRespostaId(simuladoId);
    carregarQuestoesSimulado(simuladoId);
  };

  const handleRespostaChange = (numeroQuestao: number, alternativa: string) => {
    setRespostasAluno(prev => ({
      ...prev,
      [numeroQuestao]: alternativa
    }));
  };

  const salvarRespostasAluno = async () => {
    // Verificar se todas as questões foram respondidas
    const todasRespondidas = Object.values(respostasAluno).every(resposta => resposta !== '');
    
    if (!todasRespondidas) {
      alert('Por favor, responda todas as questões antes de salvar.');
      return;
    }

    try {
      const supabase = createSupabaseClient();
      
      // Obter o ID do aluno atual (do usuário logado)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Usuário não autenticado. Por favor, faça login novamente.');
        return;
      }
      
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('user_id', user.id)
        .single();

      if (!userData) {
        alert('Não foi possível encontrar suas informações. Por favor, contate o suporte.');
        return;
      }
      
      const alunoId = userData.id;
      
      // Contadores para o resultado
      let totalQuestoes = Object.keys(respostasAluno).length;
      let acertos = 0;
      let erros = 0;
      
      // Salvar as respostas para cada questão
      for (const numeroQuestao in respostasAluno) {
        if (respostasAluno.hasOwnProperty(numeroQuestao)) {
          const questao = questoesSimulado.find(q => q.numero === parseInt(numeroQuestao));
          const alternativaResposta = respostasAluno[parseInt(numeroQuestao)];
          
          if (questao) {
            // Salvar a resposta do aluno
            const { error: respostaError } = await supabase
              .from('respostas_alunos')
              .insert({
                aluno_id: alunoId,
                questao_id: questao.id,
                alternativa_id: null, // Não nos preocupamos com este campo agora
                alternativa_resposta: alternativaResposta
              });
              
            if (respostaError) {
              console.error('Erro ao salvar resposta:', respostaError);
              alert('Ocorreu um erro ao salvar suas respostas. Por favor, tente novamente.');
              return;
            }
            
            // Verificar se a resposta está correta
            const { data: alternativaCorreta, error: alternativaError } = await supabase
              .from('alternativas')
              .select('letra')
              .eq('questao_id', questao.id)
              .eq('correta', true)
              .eq('simuladoExistente_id', simuladoRespostaId)
              .single();
            
            if (!alternativaError && alternativaCorreta) {
              // Comparar a resposta do aluno com a alternativa correta (ambas em minúsculo)
              if (alternativaCorreta.letra.toLowerCase() === alternativaResposta.toLowerCase()) {
                acertos++;
              } else {
                erros++;
              }
            } else {
              console.error('Erro ao buscar alternativa correta:', alternativaError);
            }
          }
        }
      }
      
      // Registrar que o aluno respondeu este simulado na tabela simulados_respondidos
      if (simuladoRespostaId) {
        // Verificar se já existe um registro para este aluno e simulado
        const { data: existingRecord, error: checkError } = await supabase
          .from('simulados_respondidos')
          .select('id')
          .eq('aluno_id', alunoId)
          .eq('simulado_id', simuladoRespostaId)
          .eq('respondido', true)
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 é o código para "não encontrado"
          console.error('Erro ao verificar registro existente:', checkError);
        }
        
        if (existingRecord) {
          // Atualizar o registro existente
          const { error: updateError } = await supabase
            .from('simulados_respondidos')
            .update({
              respondido: true,
              data_resposta: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id);
            
          if (updateError) {
            console.error('Erro ao atualizar registro de simulado respondido:', updateError);
          }
        } else {
          // Criar um novo registro
          const { error: insertError } = await supabase
            .from('simulados_respondidos')
            .insert({
              aluno_id: alunoId,
              simulado_id: simuladoRespostaId,
              respondido: true,
              data_resposta: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('Erro ao registrar simulado como respondido:', insertError);
          }
        }
      }
      
      // Calcular o percentual de acertos
      const percentual = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;
      
      // Obter informações do simulado para o webhook
      let simuladoTitulo = '';
      if (simuladoRespostaId) {
        const { data: simuladoData } = await supabase
          .from('simulados')
          .select('titulo')
          .eq('id', simuladoRespostaId)
          .single();
          
        if (simuladoData) {
          simuladoTitulo = simuladoData.titulo;
        }
      }
      
      // Disparar o webhook para o n8n com os dados das respostas
      try {
        const webhookUrl = 'https://primary-production-ef06a.up.railway.app/webhook-test/a8480b53-6418-4026-a988-1119f4720de3';
        const webhookData = {
          aluno: {
            id: alunoId,
            nome: userData.nome,
            email: userData.email
          },
          simulado: {
            id: simuladoRespostaId,
            titulo: simuladoTitulo
          },
          resultado: {
            acertos,
            erros,
            totalQuestoes,
            percentual
          },
          dataEnvio: new Date().toISOString(),
          respostas: respostasAluno
        };
        
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });
        
        if (!webhookResponse.ok) {
          console.error('Erro ao enviar dados para o webhook:', await webhookResponse.text());
        } else {
          console.log('Webhook disparado com sucesso');
        }
      } catch (webhookError) {
        console.error('Erro ao disparar webhook:', webhookError);
        // Não interromper o fluxo principal se o webhook falhar
      }
      
      // Em vez de atualizar parcialmente o resultado, carregar o desempenho completo do simulado
      if (simuladoRespostaId) {
        // Fechar o modal de resposta brevemente para garantir que a interface seja atualizada adequadamente
        setIsModalCartaoRespostaOpen(false);
        
        // Pequeno delay para permitir que as operações de banco de dados sejam concluídas
        setTimeout(() => {
          // Reabrir o modal com os dados completos
          carregarDesempenhoSimulado(simuladoRespostaId);
        }, 500);
      } else {
        // Caso de fallback (não deveria acontecer): usar os dados básicos que já calculamos
        setResultadoSimulado({
          acertos,
          erros,
          total: totalQuestoes,
          percentual,
          mostrando: true,
          estatisticasDificuldade: {
            fácil: { total: 0, acertos: 0, percentual: 0 },
            média: { total: 0, acertos: 0, percentual: 0 },
            difícil: { total: 0, acertos: 0, percentual: 0 }
          },
          estatisticasAssunto: {}
        });
      }
      
      alert('Respostas salvas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      alert('Ocorreu um erro ao salvar suas respostas. Por favor, tente novamente.');
    }
  };

  // Função para carregar o desempenho do aluno em um simulado
  const carregarDesempenhoSimulado = async (simuladoId: number) => {
    try {
      const supabase = createSupabaseClient();
      
      // Obter o ID do aluno atual (do usuário logado)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Usuário não autenticado. Por favor, faça login novamente.');
        return;
      }
      
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userData) {
        alert('Não foi possível encontrar suas informações. Por favor, contate o suporte.');
        return;
      }
      
      const alunoId = userData.id;
      
      // Verificar se o aluno realmente respondeu este simulado
      const { data: simuladoRespondido, error } = await supabase
        .from('simulados_respondidos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('simulado_id', simuladoId)
        .eq('respondido', true)
        .single();
      
      if (error || !simuladoRespondido) {
        console.error('Erro ao verificar se o simulado foi respondido:', error);
        alert('Você ainda não respondeu este simulado ou o administrador resetou suas respostas.');
        
        // Remover da lista de simulados respondidos
        setSimuladosRespondidos(simuladosRespondidos.filter(id => id !== simuladoId));
        
        // Redirecionar para o cartão resposta normal
        // Resetar o estado de resultados para garantir que mostramos a tela de cartão resposta
        setResultadoSimulado({
          acertos: 0,
          erros: 0,
          total: 0,
          percentual: 0,
          mostrando: false,
          estatisticasDificuldade: {
            fácil: { total: 0, acertos: 0, percentual: 0 },
            média: { total: 0, acertos: 0, percentual: 0 },
            difícil: { total: 0, acertos: 0, percentual: 0 }
          },
          estatisticasAssunto: {}
        });
        
        // Carregar as questões do simulado
        carregarQuestoesSimulado(simuladoId);
        return;
      }
      
      // Buscar as questões do simulado
      const { data: questoes, error: questoesError } = await supabase
        .from('questoes')
        .select('id, numero, assunto, dificuldade')
        .eq('simuladoExistente_id', simuladoId)
        .order('numero', { ascending: true });
      
      if (questoesError) {
        console.error('Erro ao buscar questões:', questoesError);
        alert('Ocorreu um erro ao buscar as questões do simulado.');
        return;
      }
      
      if (!questoes || questoes.length === 0) {
        alert('Não foram encontradas questões para este simulado.');
        return;
      }
      
      // Buscar as respostas do aluno para este simulado
      const questoesIds = questoes.map(q => q.id);
      const { data: respostasAluno, error: respostasError } = await supabase
        .from('respostas_alunos')
        .select('questao_id, alternativa_resposta')
        .eq('aluno_id', alunoId)
        .in('questao_id', questoesIds);
      
      if (respostasError) {
        console.error('Erro ao buscar respostas do aluno:', respostasError);
        alert('Ocorreu um erro ao buscar suas respostas.');
        return;
      }
      
      // Criar um mapa de respostas do aluno por questão
      const respostasPorQuestao: { [key: string]: string } = {};
      respostasAluno?.forEach(resposta => {
        respostasPorQuestao[resposta.questao_id] = resposta.alternativa_resposta;
      });
      
      // Buscar as alternativas corretas para o simulado
      const { data: alternativas, error: alternativasError } = await supabase
        .from('alternativas')
        .select('questao_id, letra')
        .eq('simuladoExistente_id', simuladoId)
        .eq('correta', true);
      
      if (alternativasError) {
        console.error('Erro ao buscar alternativas:', alternativasError);
        alert('Ocorreu um erro ao buscar as alternativas corretas.');
        return;
      }
      
      // Criar um mapa de alternativas corretas por questão
      const alternativasCorretas: { [key: string]: string } = {};
      alternativas?.forEach(alt => {
        alternativasCorretas[alt.questao_id] = alt.letra;
      });
      
      // Calcular quantas questões o aluno acertou
      let acertos = 0;
      let erros = 0;
      let total = questoes.length;
      
      // Inicializar estatísticas por dificuldade e assunto
      const estatisticasDificuldade = {
        fácil: { total: 0, acertos: 0, percentual: 0 },
        média: { total: 0, acertos: 0, percentual: 0 },
        difícil: { total: 0, acertos: 0, percentual: 0 }
      };
      const estatisticasAssunto: { [assunto: string]: { total: number, acertos: number, percentual: number } } = {};
      
      for (const questao of questoes) {
        const respostaAluno = respostasPorQuestao[questao.id];
        const alternativaCorreta = alternativasCorretas[questao.id];
        const dificuldade = questao.dificuldade.toLowerCase() as DificuldadeType;
        
        // Garantir que a dificuldade seja uma das três opções válidas
        const dificuldadeValida: DificuldadeType = 
          ['fácil', 'média', 'difícil'].includes(dificuldade) 
            ? dificuldade 
            : 'média';
        
        // Incrementar o total para esta dificuldade
        estatisticasDificuldade[dificuldadeValida].total++;
        
        // Inicializar estatísticas para este assunto se necessário
        if (!estatisticasAssunto[questao.assunto]) {
          estatisticasAssunto[questao.assunto] = { total: 0, acertos: 0, percentual: 0 };
        }
        estatisticasAssunto[questao.assunto].total++;
        
        if (respostaAluno && alternativaCorreta && 
            respostaAluno.toLowerCase() === alternativaCorreta.toLowerCase()) {
          acertos++;
          estatisticasDificuldade[dificuldadeValida].acertos++;
          estatisticasAssunto[questao.assunto].acertos++;
        } else {
          erros++;
        }
      }
      
      // Calcular percentuais por dificuldade e assunto
      Object.keys(estatisticasDificuldade).forEach((dificuldade) => {
        const diff = dificuldade as DificuldadeType;
        if (estatisticasDificuldade[diff].total > 0) {
          estatisticasDificuldade[diff].percentual = Math.round(
            (estatisticasDificuldade[diff].acertos / estatisticasDificuldade[diff].total) * 100
          );
        }
      });
      
      Object.keys(estatisticasAssunto).forEach((assunto) => {
        if (estatisticasAssunto[assunto].total > 0) {
          estatisticasAssunto[assunto].percentual = Math.round(
            (estatisticasAssunto[assunto].acertos / estatisticasAssunto[assunto].total) * 100
          );
        }
      });
      
      // Calcular o percentual de acertos
      const percentual = total > 0 ? Math.round((acertos / total) * 100) : 0;
      
      // Criar array com detalhes de cada questão respondida
      const questoesDetalhes: QuestaoRespondidaType[] = questoes.map(questao => {
        const respostaAluno = respostasPorQuestao[questao.id] || '-';
        const respostaCorreta = alternativasCorretas[questao.id] || '-';
        const acertou: boolean = !!(respostaAluno && 
                       respostaCorreta && 
                       respostaAluno.toLowerCase() === respostaCorreta.toLowerCase());
        
        return {
          id: questao.id,
          numero: questao.numero,
          respostaAluno,
          respostaCorreta,
          acertou,
          assunto: questao.assunto || 'Não especificado',
          dificuldade: questao.dificuldade || 'média'
        };
      }).sort((a, b) => a.numero - b.numero); // Ordenar por número da questão
      
      // Configurar o modal para mostrar o resultado
      setSimuladoRespostaId(simuladoId);
      setResultadoSimulado({
        acertos,
        erros,
        total,
        percentual,
        mostrando: true,
        estatisticasDificuldade,
        estatisticasAssunto,
        questoesDetalhes
      });
      
      // Abrir o modal para exibir o resultado
      setIsModalCartaoRespostaOpen(true);
      
    } catch (error) {
      console.error('Erro ao carregar desempenho do simulado:', error);
      alert('Ocorreu um erro ao carregar seu desempenho. Por favor, tente novamente.');
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
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                onClick={() => window.location.href = '/simulados/criar'}
              >
                Novo Simulado Digital
              </button>
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
                onClick={() => setIsModalEscolhaTipoOpen(true)}
              >
                Vincular Gabarito
              </button>
              {/* TIPO 1 - DESATIVADO: Botão para adicionar simulado PDF */}
              {/* {pastaAtual !== null && (
                <button
                  onClick={() => setIsModalSimuladoOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Novo Simulado
                </button>
              )} */}
              {/* Botão "Adicionar Resultado" temporariamente ocultado 
              <button
                onClick={() => setIsModalResultadoOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
              >
                Adicionar Resultado
              </button>
              */}
            </div>
          )}
          {/* Botão "Ver Resultado" temporariamente ocultado
          {userType?.toLowerCase() === 'aluno' && (
            <button
              onClick={handleVerResultado}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Ver Resultado
            </button>
          )}
          */}
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

            {/* TIPO 2: Renderização de simulados digitais */}
            {simuladosDigitais.map((simulado) => (
              <div
                key={simulado.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors relative group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <DocumentCheckIcon className="h-6 w-6 text-green-500" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Simulado {simulado.mes} {simulado.ano}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {simulado.questoes_count} questões
                      </p>
                    </div>
                  </div>
                  {userType?.toLowerCase() === 'admin' && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => window.location.href = `/simulados/digital/${simulado.id}`}
                        className="p-2 text-blue-500 hover:text-blue-400 transition-colors"
                        title="Ver detalhes"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este simulado?')) {
                            // TODO: Implementar exclusão
                          }
                        }}
                        className="p-2 text-red-500 hover:text-red-400 transition-colors"
                        title="Excluir simulado"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => window.location.href = `/simulados/digital/${simulado.id}`}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <PlayCircleIcon className="w-5 h-5" />
                  <span>Iniciar Simulado</span>
                </button>
              </div>
            ))}

            {/* TIPO 1 - DESATIVADO: Renderização de simulados PDF */}
            {/* {simulados.map((simulado) => (
              <div
                key={simulado.id}
                className="bg-gray-800 rounded-lg p-6 relative"
              >
                {userType?.toLowerCase() === 'admin' && (
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button
                      onClick={() => handleEditSimulado(simulado)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSimulado(simulado.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
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
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => abrirPdf(simulado.pdf_questoes, simulado.download_permitido)}
                      className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded-md text-sm"
                    >
                      <DocumentIcon className="h-4 w-4" />
                      <span>Questões</span>
                    </button>
                    
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded-md text-sm flex items-center space-x-1"
                      onClick={() => simuladosRespondidos.includes(simulado.id) ? carregarDesempenhoSimulado(simulado.id) : abrirCartaoResposta(simulado)}
                    >
                      <DocumentIcon className="h-4 w-4" />
                      <span>{simuladosRespondidos.includes(simulado.id) ? "Ver desempenho" : "Responder simulado"}</span>
                    </button>
                    
                    <button
                      onClick={() => abrirPdf(simulado.pdf_gabarito, simulado.download_permitido)}
                      className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded-md text-sm"
                    >
                      <DocumentCheckIcon className="h-4 w-4" />
                      <span>Gabarito</span>
                    </button>
                    
                    {simulado.video_resolucao && (
                      <button
                        onClick={() => abrirResolucao(simulado)}
                        className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 rounded-md text-sm"
                      >
                        <PlayCircleIcon className="h-4 w-4" />
                        <span>Resolução em vídeo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))} */}
          </div>
        )}
      </main>

      {/* Modal de Escolha de Tipo de Simulado */}
      {isModalEscolhaTipoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-4xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Escolha o tipo de simulado</h2>
              <button 
                onClick={() => setIsModalEscolhaTipoOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Botão Interno foi ocultado conforme solicitado */}
              
              <button
                onClick={() => {
                  setIsModalEscolhaTipoOpen(false);
                  setIsModalGabaritoOpen(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white py-6 px-4 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <DocumentCheckIcon className="h-10 w-10 mb-2" />
                <span className="text-lg font-medium">Gabarito</span>
                <p className="text-xs text-gray-300 mt-1 text-center">Adicione apenas um gabarito</p>
              </button>

              <button
                onClick={() => {
                  setIsModalEscolhaTipoOpen(false);
                  setIsModalGabaritosVinculadosOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white py-6 px-4 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <DocumentIcon className="h-10 w-10 mb-2" />
                <span className="text-lg font-medium">Gabaritos vinculados</span>
                <p className="text-xs text-gray-300 mt-1 text-center">Consulte gabaritos vinculados</p>
              </button>
              
              <button
                onClick={() => {
                  setIsModalEscolhaTipoOpen(false);
                  setIsModalDesempenhosOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-6 px-4 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <ChartBarIcon className="h-10 w-10 mb-2" />
                <span className="text-lg font-medium">Desempenhos</span>
                <p className="text-xs text-gray-300 mt-1 text-center">Visualize desempenhos</p>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Desempenhos */}
      {isModalDesempenhosOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-5 rounded-lg w-full max-w-2xl mx-auto my-4 modal-compact">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Desempenhos</h2>
              <button 
                onClick={() => setIsModalDesempenhosOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <div className="space-y-4">
                {/* Seletor de Aluno */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Selecione o Aluno
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full p-2 pl-3 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white"
                      placeholder="Digite o nome do aluno"
                      value={searchAluno}
                      onChange={(e) => {
                        setSearchAluno(e.target.value);
                        setShowAlunoDropdown(true);
                      }}
                      onClick={() => setShowAlunoDropdown(true)}
                    />
                    {showAlunoDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {alunosFiltrados.length > 0 ? (
                          alunosFiltrados.map((aluno) => (
                            <div
                              key={aluno.id}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-white"
                              onClick={() => {
                                setAlunoSelecionadoDesempenho(aluno.id.toString());
                                setSearchAluno(aluno.nome);
                                setShowAlunoDropdown(false);
                                // Carregar simulados respondidos pelo aluno
                                carregarSimuladosDoAluno(aluno.id);
                              }}
                            >
                              {aluno.nome}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-400">Nenhum aluno encontrado</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seletor de Simulado */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Selecione o Simulado
                  </label>
                  <select
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    value={simuladoSelecionadoDesempenho}
                    onChange={(e) => setSimuladoSelecionadoDesempenho(e.target.value)}
                  >
                    <option value="">Selecione o simulado</option>
                    {simuladosAluno.map((simulado) => (
                      <option key={simulado.id} value={simulado.id}>
                        {simulado.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botão para visualizar desempenho */}
                <div className="mt-6">
                  <button
                    onClick={() => {
                      if (alunoSelecionadoDesempenho && simuladoSelecionadoDesempenho) {
                        visualizarDesempenhoAluno(alunoSelecionadoDesempenho, simuladoSelecionadoDesempenho);
                      } else {
                        alert('Por favor, selecione um aluno e um simulado para visualizar o desempenho.');
                      }
                    }}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    disabled={!alunoSelecionadoDesempenho || !simuladoSelecionadoDesempenho}
                  >
                    Visualizar Desempenho
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsModalDesempenhosOpen(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TIPO 1 - DESATIVADO: Modal de Gabaritos Vinculados */}
      {/* {isModalGabaritosVinculadosOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-5 rounded-lg w-full max-w-2xl mx-auto my-4 modal-compact">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Gabaritos Vinculados</h2>
              <button 
                onClick={() => setIsModalGabaritosVinculadosOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <div className="modal-content-scroll">
                {simuladosDisponiveis.length > 0 ? (
                  <div className="space-y-3">
                    {simuladosDisponiveis.map((simulado) => (
                      <div key={simulado.id} className="bg-gray-700 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-white">{simulado.titulo}</h3>
                            {simulado.descricao && (
                              <p className="text-gray-400 text-sm">{simulado.descricao}</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => visualizarAlternativasGabarito(simulado.id, simulado.titulo)}
                              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm"
                            >
                              <DocumentCheckIcon className="h-4 w-4" />
                              <span>Ver Gabarito</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Nenhum gabarito vinculado encontrado.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsModalGabaritosVinculadosOpen(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )} */}

      {/* TIPO 1 - DESATIVADO: Modal de Novo Simulado PDF */}
      {/* {isModalSimuladoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                  rows={2}
                  placeholder="Digite uma descrição para o simulado"
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
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 002 2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 002 2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
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
      )} */}
      
      {/* TIPO 1 - DESATIVADO: Modal de Resolução em Vídeo */}
      {/* {isModalResolucaoOpen && simuladoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsModalResolucaoOpen(false)}
                className="text-white hover:text-gray-300"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" stroke="currentColor">
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
      )} */}

      {/* TIPO 1 - DESATIVADO: Modal de visualização de PDF */}
      {/* {showPdfModal && selectedPdf && (
        <PdfModal url={selectedPdf} onClose={() => setShowPdfModal(false)} />
      )} */}

      {/* TIPO 1 - DESATIVADO: Modal de adicionar resultado (PDF) */}
      {/* {isModalResultadoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
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
      )} */}
      
      {/* Modal Ver Resultado */}
      {isModalVerResultadoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Ver Resultados</h2>
              <button
                onClick={() => setIsModalVerResultadoOpen(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Mês
                </label>
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {mesesDisponiveis.map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>

              {mesSelecionado && resultadosAluno.filter(r => r.mes_simulado === mesSelecionado).map((resultado) => (
                <div key={resultado.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white">
                      {new Date(resultado.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <a
                      href={resultado.url_simulado}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Visualizar PDF
                    </a>
                  </div>
                </div>
              ))}

              {(!mesSelecionado || resultadosAluno.filter(r => r.mes_simulado === mesSelecionado).length === 0) && (
                <p className="text-gray-400 text-center py-4">
                  Nenhum resultado disponível para este mês.
                </p>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsModalVerResultadoOpen(false)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Criar Simulado com Questões */}
      {isModalCriarSimuladoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-4xl mx-4 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Criar Novo Simulado</h2>
              <button onClick={() => setIsModalCriarSimuladoOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Seleção de mês */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mês do Simulado
              </label>
              <select
                value={novoSimuladoMes}
                onChange={(e) => setNovoSimuladoMes(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
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
            
            {/* Seleção de ano */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ano do Simulado
              </label>
              <input
                type="number"
                value={novoSimuladoAno}
                onChange={(e) => setNovoSimuladoAno(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                min={2020}
                max={2100}
                required
              />
            </div>
            
            {/* Seleção de pasta (opcional) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pasta (opcional)
              </label>
              <select
                value={pastaIdSelecionada || ''}
                onChange={(e) => setPastaIdSelecionada(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione uma pasta (opcional)</option>
                {pastas.map((pasta) => (
                  <option key={pasta.id} value={pasta.id}>
                    {pasta.titulo}
                  </option>
                ))}
              </select>
            </div>

            {novoSimuladoMes && (
              <>
                {/* Lista de questões já adicionadas */}
                {questoes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-white mb-3">Questões Adicionadas</h3>
                    <div className="space-y-2">
                      {questoes.map((questao, index) => (
                        <div key={index} className="bg-gray-800 p-3 rounded-lg">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-white">Questão {questao.numero}</h4>
                            <div className="text-sm text-gray-400">
                              <span className="mr-3">Assunto: {questao.assunto}</span>
                              <span>Dificuldade: {questao.dificuldade}</span>
                            </div>
                          </div>
                          <p className="text-gray-300 mt-1">{questao.enunciado.substring(0, 100)}...</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulário para adicionar nova questão */}
                <div className="bg-gray-800 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Questão {questoes.length + 1}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Enunciado da Questão
                      </label>
                      <textarea
                        value={questaoAtual.enunciado}
                        onChange={(e) => setQuestaoAtual({...questaoAtual, enunciado: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        rows={4}
                        placeholder="Digite o enunciado da questão..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Assunto
                        </label>
                        <input
                          type="text"
                          value={questaoAtual.assunto}
                          onChange={(e) => setQuestaoAtual({...questaoAtual, assunto: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                          placeholder="Ex: Matemática, Física, etc."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nível de Dificuldade
                        </label>
                        <select
                          value={questaoAtual.dificuldade}
                          onChange={(e) => setQuestaoAtual({...questaoAtual, dificuldade: e.target.value as DificuldadeType})}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        >
                          <option value="fácil">Fácil</option>
                          <option value="média">Médio</option>
                          <option value="difícil">Difícil</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Alternativas
                      </label>
                      <div className="space-y-3">
                        {questaoAtual.alternativas.map((alternativa, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="flex items-center mt-2">
                              <span className="text-gray-300 font-medium w-6">{alternativa.letra})</span>
                              <input
                                type="radio"
                                name="alternativa-correta"
                                checked={alternativa.correta}
                                onChange={() => {
                                  const novasAlternativas = questaoAtual.alternativas.map((alt, i) => ({
                                    ...alt,
                                    correta: i === index
                                  }));
                                  setQuestaoAtual({...questaoAtual, alternativas: novasAlternativas});
                                }}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-700"
                              />
                            </div>
                            <textarea
                              value={alternativa.texto}
                              onChange={(e) => {
                                const novasAlternativas = [...questaoAtual.alternativas];
                                novasAlternativas[index].texto = e.target.value;
                                setQuestaoAtual({...questaoAtual, alternativas: novasAlternativas});
                              }}
                              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                              rows={2}
                              placeholder={`Digite o texto da alternativa ${alternativa.letra}...`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        // Validar se pelo menos uma alternativa está marcada como correta
                        if (!questaoAtual.alternativas.some(alt => alt.correta)) {
                          alert('Selecione uma alternativa correta.');
                          return;
                        }
                        
                        // Validar se todos os campos obrigatórios estão preenchidos
                        if (!questaoAtual.enunciado || !questaoAtual.assunto) {
                          alert('Preencha todos os campos obrigatórios.');
                          return;
                        }
                        
                        // Adicionar a questão à lista
                        setQuestoes([
                          ...questoes,
                          {
                            numero: questoes.length + 1,
                            enunciado: questaoAtual.enunciado,
                            assunto: questaoAtual.assunto,
                            dificuldade: questaoAtual.dificuldade as DificuldadeType,
                            alternativas: questaoAtual.alternativas
                          }
                        ]);
                        
                        // Limpar o formulário para a próxima questão
                        setQuestaoAtual({
                          enunciado: '',
                          assunto: '',
                          dificuldade: 'fácil',
                          alternativas: [
                            { letra: 'a', texto: '', correta: false },
                            { letra: 'b', texto: '', correta: false },
                            { letra: 'c', texto: '', correta: false },
                            { letra: 'd', texto: '', correta: false },
                            { letra: 'e', texto: '', correta: false }
                          ]
                        });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      Adicionar Questão
                    </button>
                  </div>
                </div>
                
                {/* Botões de ação */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      // Limpar o formulário e fechar o modal
                      setNovoSimuladoMes('');
                      setNovoSimuladoAno(new Date().getFullYear());
                      setPastaIdSelecionada(null);
                      setQuestoes([]);
                      setQuestaoAtual({
                        enunciado: '',
                        assunto: '',
                        dificuldade: 'fácil',
                        alternativas: [
                          { letra: 'a', texto: '', correta: false },
                          { letra: 'b', texto: '', correta: false },
                          { letra: 'c', texto: '', correta: false },
                          { letra: 'd', texto: '', correta: false },
                          { letra: 'e', texto: '', correta: false }
                        ]
                      });
                      setIsModalCriarSimuladoOpen(false);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarSimulado}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                    disabled={questoes.length === 0 || isLoading}
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Simulado'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Modal de Gabarito */}
      {isModalGabaritoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-4xl mx-4 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Criar Gabarito</h2>
              <button onClick={() => setIsModalGabaritoOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Seleção de simulado */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Selecione o Simulado
              </label>
              <select
                value={gabarito.simuladoId || ''}
                onChange={(e) => setGabarito({ ...gabarito, simuladoId: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Selecione um simulado</option>
                {/* TIPO 1 - DESATIVADO: Lista de simulados PDF foi desativada */}
                {/* {simuladosDisponiveis.map((simulado) => (
                  <option key={simulado.id} value={simulado.id}>
                    {simulado.titulo}
                  </option>
                ))} */}
              </select>
            </div>

            {gabarito.simuladoId && (
              <>
                {/* Lista de questões já adicionadas */}
                {gabarito.questoes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-white mb-3">Questões Adicionadas</h3>
                    <div className="space-y-2">
                      {gabarito.questoes.map((questao, index) => (
                        <div key={index} className="bg-gray-800 p-3 rounded-lg">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-white">Questão {questao.numero}</h4>
                            <div className="text-sm text-gray-400">
                              <span className="mr-3">Assunto: {questao.assunto}</span>
                              <span>Dificuldade: {questao.dificuldade}</span>
                            </div>
                          </div>
                          <p className="text-gray-300 mt-1">{questao.numero} - {questao.alternativaCorreta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulário para adicionar nova questão */}
                <div className="bg-gray-800 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Questão {gabarito.questoes.length + 1}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Número da Questão
                      </label>
                      <input
                        type="number"
                        value={questaoGabaritoAtual.numero}
                        onChange={(e) => setQuestaoGabaritoAtual({ ...questaoGabaritoAtual, numero: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Assunto
                      </label>
                      <input
                        type="text"
                        value={questaoGabaritoAtual.assunto}
                        onChange={(e) => setQuestaoGabaritoAtual({ ...questaoGabaritoAtual, assunto: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        placeholder="Ex: Matemática, Física, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Alternativa Correta
                      </label>
                      <select
                        value={questaoGabaritoAtual.alternativaCorreta}
                        onChange={(e) => setQuestaoGabaritoAtual({ ...questaoGabaritoAtual, alternativaCorreta: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      >
                        <option value="a">A</option>
                        <option value="b">B</option>
                        <option value="c">C</option>
                        <option value="d">D</option>
                        <option value="e">E</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nível de Dificuldade
                      </label>
                      <select
                        value={questaoGabaritoAtual.dificuldade}
                        onChange={(e) => setQuestaoGabaritoAtual({ ...questaoGabaritoAtual, dificuldade: e.target.value as DificuldadeType })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      >
                        <option value="fácil">Fácil</option>
                        <option value="média">Médio</option>
                        <option value="difícil">Difícil</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        // Validar se todos os campos obrigatórios estão preenchidos
                        if (!questaoGabaritoAtual.numero || !questaoGabaritoAtual.assunto) {
                          alert('Preencha todos os campos obrigatórios.');
                          return;
                        }
                        
                        // Adicionar a questão à lista
                        setGabarito({
                          ...gabarito,
                          questoes: [
                            ...gabarito.questoes,
                            {
                              numero: questaoGabaritoAtual.numero,
                              assunto: questaoGabaritoAtual.assunto,
                              alternativaCorreta: questaoGabaritoAtual.alternativaCorreta,
                              dificuldade: questaoGabaritoAtual.dificuldade as DificuldadeType
                            }
                          ]
                        });
                        
                        // Limpar o formulário para a próxima questão
                        setQuestaoGabaritoAtual({
                          numero: gabarito.questoes.length + 2,
                          assunto: '',
                          dificuldade: 'fácil',
                          alternativaCorreta: 'a'
                        });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      Adicionar Questão
                    </button>
                  </div>
                </div>
                
                {/* Botões de ação */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      // Limpar o formulário e fechar o modal
                      setGabarito({
                        simuladoId: null,
                        questoes: []
                      });
                      setIsModalGabaritoOpen(false);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // Implementação futura para salvar o gabarito
                      salvarGabarito();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                  >
                    Salvar Gabarito
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Modal de Cartão Resposta */}
      {isModalCartaoRespostaOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 p-4 rounded-lg w-full max-w-2xl mx-auto my-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                {resultadoSimulado.mostrando ? "Resultado do Simulado" : "Cartão Resposta"}
              </h2>
              <button onClick={() => {
                setIsModalCartaoRespostaOpen(false);
                setResultadoSimulado({ acertos: 0, erros: 0, total: 0, percentual: 0, mostrando: false, estatisticasDificuldade: { fácil: { total: 0, acertos: 0, percentual: 0 }, média: { total: 0, acertos: 0, percentual: 0 }, difícil: { total: 0, acertos: 0, percentual: 0 } }, estatisticasAssunto: {} });
                setSimuladoRespostaId(null);
                setQuestoesSimulado([]);
                setRespostasAluno({});
                setMostrarDetalhesQuestoes(false);
              }} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Resultado do simulado */}
            {resultadoSimulado.mostrando ? (
              <div className="text-center">
                <div className="bg-gray-800 p-4 rounded-lg mb-4">
                  <h3 className="text-2xl font-bold text-white mb-4">Seu Resultado</h3>
                  
                  {/* Cards com métricas de acertos, erros e aproveitamento percentual */}
                  <div className="flex flex-wrap justify-around gap-3 mb-4">
                    <div className="flex flex-col items-center bg-blue-600 p-4 rounded-lg w-32">
                      <span className="text-sm text-white mb-1">Acertos</span>
                      <span className="text-3xl font-bold text-white">{resultadoSimulado.acertos}</span>
                      <span className="text-sm text-white">questões</span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-red-600 p-4 rounded-lg w-32">
                      <span className="text-sm text-white mb-1">Erros</span>
                      <span className="text-3xl font-bold text-white">{resultadoSimulado.erros}</span>
                      <span className="text-sm text-white">questões</span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-purple-600 p-4 rounded-lg w-32">
                      <span className="text-sm text-white mb-1">Aproveitamento</span>
                      <span className="text-3xl font-bold text-white">{resultadoSimulado.percentual}%</span>
                    </div>
                  </div>
                  
                  {/* Desempenho por dificuldade */}
                  <div className="mb-4 text-left">
                    <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">
                      Desempenho por Dificuldade
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-500 bg-opacity-20 p-3 rounded-lg border border-green-500">
                        <h5 className="text-base font-medium text-white mb-2">Fácil</h5>
                        <div className="flex items-center justify-between">
                          <span className="text-white">
                            {resultadoSimulado.estatisticasDificuldade.fácil.acertos} / {resultadoSimulado.estatisticasDificuldade.fácil.total}
                          </span>
                          <span className="text-lg font-bold text-white">
                            {resultadoSimulado.estatisticasDificuldade.fácil.percentual}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                          <div 
                            className="bg-green-500 h-2.5 rounded-full" 
                            style={{width: `${resultadoSimulado.estatisticasDificuldade.fácil.percentual}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-500 bg-opacity-20 p-3 rounded-lg border border-yellow-500">
                        <h5 className="text-base font-medium text-white mb-2">Médio</h5>
                        <div className="flex items-center justify-between">
                          <span className="text-white">
                            {resultadoSimulado.estatisticasDificuldade.média.acertos} / {resultadoSimulado.estatisticasDificuldade.média.total}
                          </span>
                          <span className="text-lg font-bold text-white">
                            {resultadoSimulado.estatisticasDificuldade.média.percentual}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                          <div 
                            className="bg-yellow-500 h-2.5 rounded-full" 
                            style={{width: `${resultadoSimulado.estatisticasDificuldade.média.percentual}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="bg-red-500 bg-opacity-20 p-3 rounded-lg border border-red-500">
                        <h5 className="text-base font-medium text-white mb-2">Difícil</h5>
                        <div className="flex items-center justify-between">
                          <span className="text-white">
                            {resultadoSimulado.estatisticasDificuldade.difícil.acertos} / {resultadoSimulado.estatisticasDificuldade.difícil.total}
                          </span>
                          <span className="text-lg font-bold text-white">
                            {resultadoSimulado.estatisticasDificuldade.difícil.percentual}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                          <div 
                            className="bg-red-500 h-2.5 rounded-full" 
                            style={{width: `${resultadoSimulado.estatisticasDificuldade.difícil.percentual}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Desempenho por assunto */}
                  <div className="text-left max-h-[30vh] overflow-y-auto pr-2">
                    <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">
                      Desempenho por Assunto
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {Object.keys(resultadoSimulado.estatisticasAssunto).map((assunto, index) => {
                        const estatistica = resultadoSimulado.estatisticasAssunto[assunto];
                        // Cores alternadas para os assuntos
                        const bgColorClass = index % 2 === 0 ? 'bg-blue-500' : 'bg-purple-500';
                        const borderColorClass = index % 2 === 0 ? 'border-blue-500' : 'border-purple-500';
                        return (
                          <div key={assunto} className={`${bgColorClass} bg-opacity-20 p-3 rounded-lg border ${borderColorClass}`}>
                            <h5 className="text-base font-medium text-white mb-2">{assunto}</h5>
                            <div className="flex items-center justify-between">
                              <span className="text-white">
                                {estatistica.acertos} / {estatistica.total}
                              </span>
                              <span className="text-lg font-bold text-white">
                                {estatistica.percentual}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                              <div 
                                className={`${bgColorClass} h-2.5 rounded-full`} 
                                style={{width: `${estatistica.percentual}%`}}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(resultadoSimulado.estatisticasAssunto).length === 0 && (
                        <div className="text-gray-400 text-center py-4">
                          Nenhuma informação de assunto disponível
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Botão para mostrar/ocultar detalhes das questões */}
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setMostrarDetalhesQuestoes(!mostrarDetalhesQuestoes)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-all duration-200 flex items-center"
                    >
                      {mostrarDetalhesQuestoes ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          Ocultar Detalhes por Questão
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Ver Detalhes por Questão
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Detalhes das questões respondidas (condicional) */}
                  {mostrarDetalhesQuestoes && (
                    <div className="text-left mt-4 animate-fadeIn">
                      <h4 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">
                        Detalhes por Questão
                      </h4>
                      <div className="max-h-[40vh] overflow-y-auto pr-2">
                        <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                          <thead className="bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium text-white">Nº</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-white">Marcou</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-white">Correta</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-white">Assunto</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-white">Dificuldade</th>
                              <th className="px-4 py-2 text-center text-sm font-medium text-white">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {resultadoSimulado.questoesDetalhes?.map((questao) => (
                              <tr key={questao.id} className={questao.acertou ? "bg-green-800 bg-opacity-20" : "bg-red-800 bg-opacity-20"}>
                                <td className="px-4 py-2 text-sm text-gray-300">{questao.numero}</td>
                                <td className="px-4 py-2 text-sm text-gray-300 font-mono uppercase">{questao.respostaAluno}</td>
                                <td className="px-4 py-2 text-sm text-gray-300 font-mono uppercase">{questao.respostaCorreta}</td>
                                <td className="px-4 py-2 text-sm text-gray-300">{questao.assunto}</td>
                                <td className="px-4 py-2 text-sm text-gray-300">{questao.dificuldade}</td>
                                <td className="px-4 py-2 text-sm text-center">
                                  {questao.acertou ? (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-green-100 bg-green-600 rounded">
                                      Acerto
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded">
                                      Erro
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {(!resultadoSimulado.questoesDetalhes || resultadoSimulado.questoesDetalhes.length === 0) && (
                              <tr>
                                <td colSpan={6} className="px-4 py-4 text-sm text-center text-gray-400">
                                  Nenhuma questão disponível
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    {resultadoSimulado.percentual >= 70 ? (
                      <div className="text-green-400 text-lg">
                        <span className="font-bold">Parabéns!</span> Você teve um ótimo desempenho.
                      </div>
                    ) : resultadoSimulado.percentual >= 50 ? (
                      <div className="text-yellow-400 text-lg">
                        <span className="font-bold">Bom trabalho!</span> Continue praticando para melhorar.
                      </div>
                    ) : (
                      <div className="text-red-400 text-lg">
                        <span className="font-bold">Continue estudando!</span> Você pode melhorar na próxima tentativa.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full mx-auto bg-gray-800 rounded-lg p-4 shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4 text-center">
                  Cartão Resposta
                </h2>
                
                {/* Instruções para responder o simulado */}
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <p className="text-white mb-3">
                    Selecione a alternativa que você considera correta para cada questão abaixo.
                  </p>
                  <p className="text-yellow-400 text-sm">
                    Importante: Responda todas as questões antes de enviar suas respostas.
                  </p>
                </div>
                
                {/* Lista de questões para responder */}
                <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto pr-2">
                  {questoesSimulado.length > 0 ? (
                    questoesSimulado.map((questao) => (
                      <div key={questao.id} className="bg-gray-700 p-3 rounded-lg">
                        <div className="flex items-center mb-3">
                          <span className="bg-blue-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center">
                            {questao.numero}
                          </span>
                          <span className="ml-3 text-lg text-white font-medium">Questão {questao.numero}</span>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2">
                          {['A', 'B', 'C', 'D', 'E'].map((letra) => (
                            <button
                              key={letra}
                              onClick={() => handleRespostaChange(questao.numero, letra)}
                              className={`py-3 px-4 rounded-md text-center font-medium ${
                                respostasAluno[questao.numero] === letra
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                              }`}
                            >
                              {letra}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-400">Nenhuma questão disponível para este simulado.</p>
                    </div>
                  )}
                </div>
                
                {/* Botões de ação */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalCartaoRespostaOpen(false);
                      setResultadoSimulado({ acertos: 0, erros: 0, total: 0, percentual: 0, mostrando: false, estatisticasDificuldade: { fácil: { total: 0, acertos: 0, percentual: 0 }, média: { total: 0, acertos: 0, percentual: 0 }, difícil: { total: 0, acertos: 0, percentual: 0 } }, estatisticasAssunto: {} });
                      setSimuladoRespostaId(null);
                      setQuestoesSimulado([]);
                      setRespostasAluno({});
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarRespostasAluno}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
                  >
                    Salvar Respostas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modal de Alternativas do Gabarito */}
      {isModalAlternativasGabaritoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-5 rounded-lg w-full max-w-3xl mx-auto my-4 modal-compact">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Gabarito: {alternativasGabarito.titulo}</h2>
              <button 
                onClick={() => setIsModalAlternativasGabaritoOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <div className="modal-content-scroll max-h-[60vh] overflow-y-auto pr-2">
                {alternativasGabarito.alternativas.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-12 text-gray-400 text-sm font-semibold mb-2 px-2">
                      <div className="col-span-2">Questão</div>
                      <div className="col-span-2">Alternativa</div>
                      <div className="col-span-5">Assunto</div>
                      <div className="col-span-3">Dificuldade</div>
                    </div>
                    
                    {alternativasGabarito.alternativas.map((alt) => (
                      <div 
                        key={alt.numero} 
                        className="grid grid-cols-12 bg-gray-700 p-3 rounded-lg items-center"
                      >
                        <div className="col-span-2 text-white font-semibold">{alt.numero}</div>
                        <div className="col-span-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold uppercase">
                            {alt.letra}
                          </span>
                        </div>
                        <div className="col-span-5 text-white">{alt.assunto}</div>
                        <div className="col-span-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium 
                            ${alt.dificuldade === 'fácil' ? 'bg-green-500 bg-opacity-20 text-green-300 border border-green-500' : 
                              alt.dificuldade === 'média' ? 'bg-yellow-500 bg-opacity-20 text-yellow-300 border border-yellow-500' : 
                              'bg-red-500 bg-opacity-20 text-red-300 border border-red-500'}`}>
                            {alt.dificuldade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <p>Nenhuma alternativa cadastrada para este simulado.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsModalAlternativasGabaritoOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TIPO 1 - DESATIVADO: Modal de Edição de Simulado PDF */}
      {/* {isModalEditSimuladoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-4 rounded-lg w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-white mb-3">Editar Simulado</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Título do Simulado
                </label>
                <input
                  type="text"
                  value={editSimulado.titulo}
                  onChange={(e) => setEditSimulado({ ...editSimulado, titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  placeholder="Digite o título do simulado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Link do Vídeo de Resolução
                </label>
                <input
                  type="text"
                  value={editSimulado.video_resolucao}
                  onChange={(e) => setEditSimulado({ ...editSimulado, video_resolucao: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  placeholder="Cole o ID do vídeo do Panda (ex: 952a06f4-df4e-421a-ae66-d8ed4d6491aa)"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsModalEditSimuladoOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditSimulado}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2"
              >
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
