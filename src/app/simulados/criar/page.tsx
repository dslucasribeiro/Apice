'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { ArrowLeftIcon, PlusIcon, TrashIcon, PhotoIcon, PencilIcon } from '@heroicons/react/24/outline';

type DificuldadeType = 'fácil' | 'média' | 'difícil';

interface Alternativa {
  letra: string;
  texto: string;
  correta: boolean;
  imagem_url?: string;
}

interface Questao {
  numero: number;
  enunciado: string;
  imagem_url?: string;
  assunto: string;
  dificuldade: DificuldadeType;
  alternativas: Alternativa[];
}

interface Pasta {
  id: number;
  titulo: string;
  descricao: string | null;
  parent_id: number | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

type Assunto = {
  id: number;
  nome: string;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
};

export default function CriarSimulado() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  
  const [novoSimuladoMes, setNovoSimuladoMes] = useState('');
  const [novoSimuladoAno, setNovoSimuladoAno] = useState(new Date().getFullYear());
  const [pastaIdSelecionada, setPastaIdSelecionada] = useState<number | null>(null);
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [assuntos, setAssuntos] = useState<Assunto[]>([]);
  
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [imagemQuestao, setImagemQuestao] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [uploadingImagem, setUploadingImagem] = useState(false);
  const [questaoEditandoIndex, setQuestaoEditandoIndex] = useState<number | null>(null);
  const [imagensAlternativas, setImagensAlternativas] = useState<{[key: string]: File}>({});
  const [imagensAlternativasPreview, setImagensAlternativasPreview] = useState<{[key: string]: string}>({});
  const [questaoAtual, setQuestaoAtual] = useState({
    enunciado: '',
    assunto: '',
    dificuldade: 'fácil' as DificuldadeType,
    alternativas: [
      { letra: 'a', texto: '', correta: false }
    ]
  });

  useEffect(() => {
    verificarPermissao();
    carregarPastas();
    carregarAssuntos();
  }, []);

  const verificarPermissao = async () => {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: userData } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('user_id', user.id)
      .single();

    if (userData?.tipo?.toLowerCase() !== 'admin') {
      router.push('/simulados');
      return;
    }

    setUserType(userData.tipo);
  };

  const carregarPastas = async () => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('simulado_pastas')
      .select('*')
      .eq('ativo', true)
      .order('ordem');

    if (!error && data) {
      setPastas(data);
    }
  };

  const carregarAssuntos = async () => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('assuntos')
      .select('*')
      .eq('ativo', true)
      .order('categoria', { ascending: true })
      .order('ordem', { ascending: true });

    if (!error && data) {
      setAssuntos(data);
    }
  };

  const adicionarAlternativa = () => {
    const letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const proximaLetra = letras[questaoAtual.alternativas.length];
    
    if (!proximaLetra) {
      alert('Número máximo de alternativas atingido (10).');
      return;
    }
    
    setQuestaoAtual({
      ...questaoAtual,
      alternativas: [
        ...questaoAtual.alternativas,
        { letra: proximaLetra, texto: '', correta: false }
      ]
    });
  };

  const removerAlternativa = (index: number) => {
    if (questaoAtual.alternativas.length <= 1) {
      alert('É necessário ter pelo menos uma alternativa.');
      return;
    }
    
    const novasAlternativas = questaoAtual.alternativas.filter((_, i) => i !== index);
    setQuestaoAtual({
      ...questaoAtual,
      alternativas: novasAlternativas
    });
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      setImagemQuestao(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removerImagem = () => {
    setImagemQuestao(null);
    setImagemPreview(null);
  };

  const handleImagemAlternativaChange = (letra: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      setImagensAlternativas({
        ...imagensAlternativas,
        [letra]: file
      });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagensAlternativasPreview({
          ...imagensAlternativasPreview,
          [letra]: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removerImagemAlternativa = (letra: string) => {
    const novasImagens = { ...imagensAlternativas };
    const novasPreviews = { ...imagensAlternativasPreview };
    delete novasImagens[letra];
    delete novasPreviews[letra];
    setImagensAlternativas(novasImagens);
    setImagensAlternativasPreview(novasPreviews);
  };

  const adicionarQuestao = async () => {
    if (!questaoAtual.alternativas.some(alt => alt.correta)) {
      alert('Selecione uma alternativa correta.');
      return;
    }
    
    if (!questaoAtual.enunciado || !questaoAtual.assunto) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    
    // Validar que cada alternativa tem texto OU imagem
    const alternativasInvalidas = questaoAtual.alternativas.filter(alt => 
      !alt.texto.trim() && !imagensAlternativasPreview[alt.letra]
    );
    
    if (alternativasInvalidas.length > 0) {
      alert('Cada alternativa precisa ter texto ou imagem.');
      return;
    }

    let imagemUrl = null;
    
    if (imagemQuestao) {
      setUploadingImagem(true);
      try {
        const supabase = createSupabaseClient();
        const fileExt = imagemQuestao.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('questoes-imagens')
          .upload(fileName, imagemQuestao, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('questoes-imagens')
          .getPublicUrl(uploadData.path);

        imagemUrl = publicUrl;
      } catch (error: any) {
        alert(`Erro ao fazer upload da imagem: ${error.message || 'Erro desconhecido'}. Continuando sem imagem.`);
      } finally {
        setUploadingImagem(false);
      }
    }

    // Upload de imagens das alternativas
    const alternativasComImagens = await Promise.all(
      questaoAtual.alternativas.map(async (alt) => {
        let imagemAltUrl = undefined;
        
        if (imagensAlternativas[alt.letra]) {
          try {
            const supabase = createSupabaseClient();
            const file = imagensAlternativas[alt.letra];
            const fileExt = file.name.split('.').pop();
            const fileName = `alt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('questoes-imagens')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('questoes-imagens')
              .getPublicUrl(uploadData.path);

            imagemAltUrl = publicUrl;
          } catch (error: any) {
            console.error(`Erro ao fazer upload da imagem da alternativa ${alt.letra}:`, error);
          }
        }
        
        return {
          ...alt,
          imagem_url: imagemAltUrl
        };
      })
    );
    
    setQuestoes([
      ...questoes,
      {
        numero: questoes.length + 1,
        enunciado: questaoAtual.enunciado,
        imagem_url: imagemUrl || undefined,
        assunto: questaoAtual.assunto,
        dificuldade: questaoAtual.dificuldade,
        alternativas: alternativasComImagens
      }
    ]);
    
    setQuestaoAtual({
      enunciado: '',
      assunto: '',
      dificuldade: 'fácil',
      alternativas: [
        { letra: 'a', texto: '', correta: false }
      ]
    });
    
    setImagemQuestao(null);
    setImagemPreview(null);
    setImagensAlternativas({});
    setImagensAlternativasPreview({});
  };

  const removerQuestao = (index: number) => {
    const novasQuestoes = questoes.filter((_, i) => i !== index);
    const questoesRenumeradas = novasQuestoes.map((q, i) => ({
      ...q,
      numero: i + 1
    }));
    setQuestoes(questoesRenumeradas);
  };

  const editarQuestao = (index: number) => {
    const questao = questoes[index];
    setQuestaoEditandoIndex(index);
    setQuestaoAtual({
      enunciado: questao.enunciado,
      assunto: questao.assunto,
      dificuldade: questao.dificuldade,
      alternativas: questao.alternativas
    });
    
    if (questao.imagem_url) {
      setImagemPreview(questao.imagem_url);
    }

    // Carregar previews das imagens das alternativas existentes
    const previews: {[key: string]: string} = {};
    questao.alternativas.forEach(alt => {
      if (alt.imagem_url) {
        previews[alt.letra] = alt.imagem_url;
      }
    });
    setImagensAlternativasPreview(previews);
    
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setQuestaoEditandoIndex(null);
    setQuestaoAtual({
      enunciado: '',
      assunto: '',
      dificuldade: 'fácil',
      alternativas: [
        { letra: 'a', texto: '', correta: false }
      ]
    });
    setImagemQuestao(null);
    setImagemPreview(null);
    setImagensAlternativas({});
    setImagensAlternativasPreview({});
  };

  const salvarEdicaoQuestao = async () => {
    if (!questaoAtual.alternativas.some(alt => alt.correta)) {
      alert('Selecione uma alternativa correta.');
      return;
    }
    
    if (!questaoAtual.enunciado || !questaoAtual.assunto) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    
    // Validar que cada alternativa tem texto OU imagem
    const alternativasInvalidas = questaoAtual.alternativas.filter(alt => 
      !alt.texto.trim() && !imagensAlternativasPreview[alt.letra]
    );
    
    if (alternativasInvalidas.length > 0) {
      alert('Cada alternativa precisa ter texto ou imagem.');
      return;
    }

    let imagemUrl = questoes[questaoEditandoIndex!].imagem_url;
    
    if (imagemQuestao) {
      setUploadingImagem(true);
      try {
        const supabase = createSupabaseClient();
        const fileExt = imagemQuestao.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('questoes-imagens')
          .upload(fileName, imagemQuestao, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('questoes-imagens')
          .getPublicUrl(uploadData.path);

        imagemUrl = publicUrl;
      } catch (error: any) {
        alert(`Erro ao fazer upload da imagem: ${error.message || 'Erro desconhecido'}. Continuando sem imagem.`);
      } finally {
        setUploadingImagem(false);
      }
    }

    // Upload de imagens das alternativas na edição
    const alternativasComImagens = await Promise.all(
      questaoAtual.alternativas.map(async (alt) => {
        // Manter imagem existente se não houver nova
        const questaoOriginal = questoes[questaoEditandoIndex!];
        const altOriginal = questaoOriginal.alternativas.find(a => a.letra === alt.letra);
        let imagemAltUrl = altOriginal?.imagem_url;
        
        // Se houver nova imagem, fazer upload
        if (imagensAlternativas[alt.letra]) {
          try {
            const supabase = createSupabaseClient();
            const file = imagensAlternativas[alt.letra];
            const fileExt = file.name.split('.').pop();
            const fileName = `alt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('questoes-imagens')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('questoes-imagens')
              .getPublicUrl(uploadData.path);

            imagemAltUrl = publicUrl;
          } catch (error: any) {
            console.error(`Erro ao fazer upload da imagem da alternativa ${alt.letra}:`, error);
          }
        }
        
        return {
          ...alt,
          imagem_url: imagemAltUrl
        };
      })
    );
    
    const novasQuestoes = [...questoes];
    novasQuestoes[questaoEditandoIndex!] = {
      numero: questoes[questaoEditandoIndex!].numero,
      enunciado: questaoAtual.enunciado,
      imagem_url: imagemUrl,
      assunto: questaoAtual.assunto,
      dificuldade: questaoAtual.dificuldade,
      alternativas: alternativasComImagens
    };
    
    setQuestoes(novasQuestoes);
    cancelarEdicao();
  };

  const salvarSimulado = async () => {
    if (!novoSimuladoMes) {
      alert('Selecione o mês do simulado.');
      return;
    }

    if (questoes.length === 0) {
      alert('Adicione pelo menos uma questão ao simulado.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createSupabaseClient();
      
      const { data: simuladoData, error: simuladoError } = await supabase
        .from('simulados_criados')
        .insert([
          {
            mes: novoSimuladoMes,
            ano: novoSimuladoAno,
            pasta_id: pastaIdSelecionada || null
          }
        ])
        .select()
        .single();

      if (simuladoError) {
        console.error('Erro ao criar simulado:', simuladoError);
        throw new Error(`Erro ao criar simulado: ${simuladoError.message}`);
      }

      for (const questao of questoes) {
        const { data: questaoData, error: questaoError } = await supabase
          .from('questoes')
          .insert([
            {
              simulado_id: simuladoData.id,
              numero: questao.numero,
              enunciado: questao.enunciado,
              imagem_url: questao.imagem_url || null,
              assunto: questao.assunto,
              dificuldade: questao.dificuldade
            }
          ])
          .select()
          .single();

        if (questaoError) {
          console.error('Erro ao criar questão:', questaoError);
          throw new Error(`Erro ao criar questão ${questao.numero}: ${questaoError.message}`);
        }

        const alternativasParaInserir = questao.alternativas.map(alt => ({
          questao_id: questaoData.id,
          letra: alt.letra,
          texto: alt.texto,
          correta: alt.correta,
          imagem_url: alt.imagem_url || null
        }));

        const { error: alternativasError } = await supabase
          .from('alternativas')
          .insert(alternativasParaInserir);

        if (alternativasError) {
          console.error('Erro ao criar alternativas:', alternativasError);
          throw new Error(`Erro ao criar alternativas da questão ${questao.numero}: ${alternativasError.message}`);
        }
      }

      alert('Simulado criado com sucesso!');
      router.push('/simulados');
      
    } catch (error: any) {
      console.error('Erro completo ao salvar simulado:', error);
      alert(`Ocorreu um erro ao salvar o simulado: ${error.message || 'Erro desconhecido'}. Por favor, tente novamente.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (userType?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Verificando permissões...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/simulados')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            <h1 className="text-3xl font-bold">Criar Novo Simulado Interno</h1>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Informações do Simulado</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mês do Simulado *
                </label>
                <select
                  value={novoSimuladoMes}
                  onChange={(e) => setNovoSimuladoMes(e.target.value)}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ano do Simulado *
                </label>
                <input
                  type="number"
                  value={novoSimuladoAno}
                  onChange={(e) => setNovoSimuladoAno(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  min={2020}
                  max={2100}
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pasta (opcional)
              </label>
              <select
                value={pastaIdSelecionada || ''}
                onChange={(e) => setPastaIdSelecionada(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione uma pasta (opcional)</option>
                {pastas.map((pasta) => (
                  <option key={pasta.id} value={pasta.id}>
                    {pasta.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {questoes.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Questões Adicionadas ({questoes.length})
              </h2>
              <div className="space-y-3">
                {questoes.map((questao, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-white">Questão {questao.numero}</h4>
                          <span className="text-xs px-2 py-1 bg-blue-600 rounded">
                            {questao.assunto}
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-600 rounded">
                            {questao.dificuldade}
                          </span>
                          {questao.imagem_url && (
                            <span className="flex items-center text-xs px-2 py-1 bg-green-600 rounded">
                              <PhotoIcon className="w-3 h-3 mr-1" />
                              Com imagem
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm line-clamp-2">{questao.enunciado}</p>
                        <div className="mt-2 text-xs text-gray-400">
                          Resposta correta: {questao.alternativas.find(alt => alt.correta)?.letra.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => editarQuestao(index)}
                          className="text-blue-500 hover:text-blue-400 transition-colors"
                          title="Editar questão"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => removerQuestao(index)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                          title="Remover questão"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {novoSimuladoMes && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {questaoEditandoIndex !== null 
                  ? `Editar Questão ${questoes[questaoEditandoIndex].numero}` 
                  : `Adicionar Questão ${questoes.length + 1}`}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Enunciado da Questão *
                    </label>
                    <label className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg cursor-pointer transition-colors">
                      <PhotoIcon className="w-4 h-4" />
                      <span>Adicionar Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImagemChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    value={questaoAtual.enunciado}
                    onChange={(e) => setQuestaoAtual({...questaoAtual, enunciado: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    rows={4}
                    placeholder="Digite o enunciado completo da questão..."
                  />
                  
                  {imagemPreview && (
                    <div className="mt-3 relative inline-block">
                      <img 
                        src={imagemPreview} 
                        alt="Preview" 
                        className="max-w-md max-h-64 rounded-lg border border-gray-600"
                      />
                      <button
                        onClick={removerImagem}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Assunto *
                    </label>
                    <select
                      value={questaoAtual.assunto}
                      onChange={(e) => setQuestaoAtual({...questaoAtual, assunto: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione um assunto</option>
                      {assuntos.reduce((acc, assunto) => {
                        const categoria = assunto.categoria || 'Sem Categoria';
                        if (!acc.find((item: any) => item.categoria === categoria)) {
                          acc.push({ categoria, assuntos: [] });
                        }
                        const categoriaIndex = acc.findIndex((item: any) => item.categoria === categoria);
                        acc[categoriaIndex].assuntos.push(assunto);
                        return acc;
                      }, [] as Array<{categoria: string, assuntos: Assunto[]}>).map((grupo) => (
                        <optgroup key={grupo.categoria} label={grupo.categoria}>
                          {grupo.assuntos.map((assunto) => (
                            <option key={assunto.id} value={assunto.nome}>
                              {assunto.nome}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nível de Dificuldade *
                    </label>
                    <select
                      value={questaoAtual.dificuldade}
                      onChange={(e) => setQuestaoAtual({...questaoAtual, dificuldade: e.target.value as DificuldadeType})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="fácil">Fácil</option>
                      <option value="média">Médio</option>
                      <option value="difícil">Difícil</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-300">
                      Alternativas * (Marque a resposta correta)
                    </label>
                    <button
                      type="button"
                      onClick={adicionarAlternativa}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Adicionar Alternativa</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {questaoAtual.alternativas.map((alternativa, index) => (
                      <div key={index} className="bg-gray-700 p-3 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center mt-2 space-x-2">
                            <span className="text-gray-300 font-medium w-6">{alternativa.letra.toUpperCase()})</span>
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
                              className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={alternativa.texto}
                              onChange={(e) => {
                                const novasAlternativas = [...questaoAtual.alternativas];
                                novasAlternativas[index].texto = e.target.value;
                                setQuestaoAtual({...questaoAtual, alternativas: novasAlternativas});
                              }}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:border-blue-500"
                              rows={2}
                              placeholder={`Digite o texto da alternativa ${alternativa.letra.toUpperCase()}...`}
                            />
                            
                            {/* Preview da imagem da alternativa */}
                            {imagensAlternativasPreview[alternativa.letra] && (
                              <div className="mt-2 relative inline-block">
                                <img
                                  src={imagensAlternativasPreview[alternativa.letra]}
                                  alt={`Imagem alternativa ${alternativa.letra}`}
                                  className="max-w-xs max-h-32 rounded border border-gray-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => removerImagemAlternativa(alternativa.letra)}
                                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
                                  title="Remover imagem"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-2">
                            {/* Botão sutil para adicionar imagem */}
                            <label
                              className="cursor-pointer text-gray-400 hover:text-blue-400 transition-colors"
                              title="Adicionar imagem à alternativa"
                            >
                              <PhotoIcon className="w-5 h-5" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImagemAlternativaChange(alternativa.letra, e)}
                                className="hidden"
                              />
                            </label>
                            
                            {questaoAtual.alternativas.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removerAlternativa(index)}
                                className="text-red-500 hover:text-red-400 transition-colors"
                                title="Remover alternativa"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {questaoEditandoIndex !== null && (
                  <button
                    onClick={cancelarEdicao}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={questaoEditandoIndex !== null ? salvarEdicaoQuestao : adicionarQuestao}
                  disabled={uploadingImagem}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>
                    {uploadingImagem 
                      ? 'Fazendo upload da imagem...' 
                      : questaoEditandoIndex !== null 
                        ? 'Salvar Edição' 
                        : 'Adicionar Questão'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {!novoSimuladoMes && (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">
                Selecione o mês e ano do simulado para começar a adicionar questões.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-4 sticky bottom-0 bg-gray-900 py-4 border-t border-gray-800">
            <button
              onClick={() => router.push('/simulados')}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={salvarSimulado}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={questoes.length === 0 || isLoading}
            >
              {isLoading ? 'Salvando...' : `Salvar Simulado (${questoes.length} questões)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
