'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Alternativa {
  id: string;
  letra: string;
  texto: string;
  correta: boolean;
  imagem_url?: string | null;
}

interface Questao {
  id: string;
  numero: number;
  enunciado: string;
  imagem_url: string | null;
  assunto: string;
  dificuldade: string;
  alternativas: Alternativa[];
}

interface Simulado {
  id: string;
  mes: string;
  ano: number;
}

export default function SimuladoDigitalPage() {
  const params = useParams();
  const router = useRouter();
  const simuladoId = params.id as string;

  const [simulado, setSimulado] = useState<Simulado | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [questaoAtualIndex, setQuestaoAtualIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarSimulado();
  }, [simuladoId]);

  const carregarSimulado = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();

      const { data: simuladoData, error: simuladoError } = await supabase
        .from('simulados_criados')
        .select('*')
        .eq('id', simuladoId)
        .single();

      if (simuladoError) throw simuladoError;
      setSimulado(simuladoData);

      const { data: questoesData, error: questoesError } = await supabase
        .from('questoes')
        .select(`
          *,
          alternativas (*)
        `)
        .eq('simulado_id', simuladoId)
        .order('numero');

      if (questoesError) throw questoesError;

      const questoesFormatadas = questoesData.map(q => ({
        ...q,
        alternativas: (q.alternativas as any[]).sort((a, b) => 
          a.letra.localeCompare(b.letra)
        )
      }));

      setQuestoes(questoesFormatadas);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (usuarioData) {
          const questoesIds = questoesFormatadas.map(q => q.id);
          const { data: respostasExistentes } = await supabase
            .from('respostas_alunos')
            .select('questao_id, alternativa_resposta')
            .eq('aluno_id', usuarioData.id)
            .in('questao_id', questoesIds);

          if (respostasExistentes && respostasExistentes.length > 0) {
            const respostasMap: Record<string, string> = {};
            respostasExistentes.forEach(r => {
              respostasMap[r.questao_id] = r.alternativa_resposta;
            });
            setRespostas(respostasMap);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar simulado:', error);
      alert('Erro ao carregar simulado. Tente novamente.');
      router.push('/simulados');
    } finally {
      setLoading(false);
    }
  };

  const questaoAtual = questoes[questaoAtualIndex];

  const handleSelecionarAlternativa = (questaoId: string, letra: string) => {
    setRespostas({
      ...respostas,
      [questaoId]: letra
    });
  };

  const proximaQuestao = () => {
    if (questaoAtualIndex < questoes.length - 1) {
      setQuestaoAtualIndex(questaoAtualIndex + 1);
    }
  };

  const questaoAnterior = () => {
    if (questaoAtualIndex > 0) {
      setQuestaoAtualIndex(questaoAtualIndex - 1);
    }
  };

  const handleResponder = async () => {
    const respostaAtual = respostas[questaoAtual.id];
    
    if (!respostaAtual) {
      alert('Selecione uma alternativa antes de responder.');
      return;
    }

    setSalvando(true);
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Você precisa estar logado para responder.');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!usuarioData) {
        alert('Usuário não encontrado.');
        return;
      }

      const { error } = await supabase
        .from('respostas_alunos')
        .insert({
          aluno_id: usuarioData.id,
          questao_id: questaoAtual.id,
          alternativa_id: null,
          alternativa_resposta: respostaAtual
        });

      if (error) throw error;

      if (questaoAtualIndex < questoes.length - 1) {
        proximaQuestao();
      } else {
        alert('Simulado finalizado! Redirecionando para resultados...');
        router.push(`/simulados/digital/${simuladoId}/resultado`);
      }
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
      alert('Erro ao salvar resposta. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Carregando simulado...</p>
        </div>
      </div>
    );
  }

  if (!simulado || !questaoAtual) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Simulado não encontrado.</p>
          <button
            onClick={() => router.push('/simulados')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/simulados')}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold">
              Simulado {simulado.mes} {simulado.ano}
            </h1>
            <p className="text-sm text-gray-400">
              Questão {questaoAtualIndex + 1} de {questoes.length}
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Questão {questaoAtual.numero}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-1 bg-blue-600 rounded">
                  {questaoAtual.assunto}
                </span>
                <span className="text-xs px-2 py-1 bg-purple-600 rounded">
                  {questaoAtual.dificuldade}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
              {questaoAtual.enunciado}
            </p>
            {questaoAtual.imagem_url && (
              <div className="mt-4">
                <img
                  src={questaoAtual.imagem_url}
                  alt="Imagem da questão"
                  className="max-w-full rounded-lg border border-gray-700"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {questaoAtual.alternativas.map((alternativa) => (
              <button
                key={alternativa.id}
                onClick={() => handleSelecionarAlternativa(questaoAtual.id, alternativa.letra)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  respostas[questaoAtual.id] === alternativa.letra
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <span className="font-bold text-lg">
                    {alternativa.letra.toUpperCase()})
                  </span>
                  <div className="flex-1">
                    <span>{alternativa.texto}</span>
                    {alternativa.imagem_url && (
                      <div className="mt-3">
                        <img
                          src={alternativa.imagem_url}
                          alt={`Imagem alternativa ${alternativa.letra}`}
                          className="max-w-full max-h-48 rounded border border-gray-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={questaoAnterior}
            disabled={questaoAtualIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span>Anterior</span>
          </button>

          <button
            onClick={handleResponder}
            disabled={salvando || !respostas[questaoAtual.id]}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {salvando ? 'Salvando...' : 'Responder'}
          </button>

          <button
            onClick={proximaQuestao}
            disabled={questaoAtualIndex === questoes.length - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>Próxima</span>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            {questoes.map((_, index) => (
              <button
                key={index}
                onClick={() => setQuestaoAtualIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                  index === questaoAtualIndex
                    ? 'bg-blue-600 text-white'
                    : respostas[questoes[index].id]
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
