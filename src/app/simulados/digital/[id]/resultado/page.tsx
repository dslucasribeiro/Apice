'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

type QuestaoRespondidaType = {
  id: string;
  numero: number;
  respostaAluno: string;
  respostaCorreta: string;
  acertou: boolean;
  assunto: string;
  dificuldade: string;
};

type ResultadoSimuladoType = {
  acertos: number;
  erros: number;
  total: number;
  percentual: number;
  estatisticasDificuldade: {
    fácil: { total: number; acertos: number; percentual: number };
    média: { total: number; acertos: number; percentual: number };
    difícil: { total: number; acertos: number; percentual: number };
  };
  estatisticasAssunto: Record<string, { total: number; acertos: number; percentual: number }>;
  questoesDetalhes: QuestaoRespondidaType[];
};

type DificuldadeType = 'fácil' | 'média' | 'difícil';

interface Simulado {
  id: string;
  mes: string;
  ano: number;
}

export default function ResultadoSimuladoPage() {
  const params = useParams();
  const router = useRouter();
  const simuladoId = params.id as string;

  const [simulado, setSimulado] = useState<Simulado | null>(null);
  const [resultado, setResultado] = useState<ResultadoSimuladoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarDetalhesQuestoes, setMostrarDetalhesQuestoes] = useState(false);

  useEffect(() => {
    carregarResultado();
  }, [simuladoId]);

  const carregarResultado = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();

      // Buscar dados do simulado
      const { data: simuladoData, error: simuladoError } = await supabase
        .from('simulados_criados')
        .select('*')
        .eq('id', simuladoId)
        .single();

      if (simuladoError) throw simuladoError;
      setSimulado(simuladoData);

      // Buscar usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Você precisa estar logado.');
        router.push('/simulados');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!usuarioData) {
        alert('Usuário não encontrado.');
        router.push('/simulados');
        return;
      }

      const alunoId = usuarioData.id;

      // Buscar questões do simulado
      const { data: questoes, error: questoesError } = await supabase
        .from('questoes')
        .select('id, numero, assunto, dificuldade')
        .eq('simulado_id', simuladoId)
        .order('numero', { ascending: true });

      if (questoesError) throw questoesError;

      if (!questoes || questoes.length === 0) {
        alert('Não foram encontradas questões para este simulado.');
        router.push('/simulados');
        return;
      }

      // Buscar respostas do aluno
      const questoesIds = questoes.map(q => q.id);
      const { data: respostasAluno, error: respostasError } = await supabase
        .from('respostas_alunos')
        .select('questao_id, alternativa_resposta')
        .eq('aluno_id', alunoId)
        .in('questao_id', questoesIds);

      if (respostasError) throw respostasError;

      if (!respostasAluno || respostasAluno.length === 0) {
        alert('Você ainda não respondeu este simulado.');
        router.push(`/simulados/digital/${simuladoId}`);
        return;
      }

      // Criar mapa de respostas do aluno
      const respostasPorQuestao: Record<string, string> = {};
      respostasAluno.forEach(resposta => {
        respostasPorQuestao[resposta.questao_id] = resposta.alternativa_resposta;
      });

      // Buscar alternativas corretas
      const { data: alternativas, error: alternativasError } = await supabase
        .from('alternativas')
        .select('questao_id, letra, correta')
        .in('questao_id', questoesIds)
        .eq('correta', true);

      if (alternativasError) throw alternativasError;

      // Criar mapa de alternativas corretas
      const alternativasCorretas: Record<string, string> = {};
      alternativas?.forEach(alt => {
        alternativasCorretas[alt.questao_id] = alt.letra;
      });

      // Calcular estatísticas
      let acertos = 0;
      let erros = 0;
      const total = questoes.length;

      const estatisticasDificuldade = {
        fácil: { total: 0, acertos: 0, percentual: 0 },
        média: { total: 0, acertos: 0, percentual: 0 },
        difícil: { total: 0, acertos: 0, percentual: 0 }
      };

      const estatisticasAssunto: Record<string, { total: number; acertos: number; percentual: number }> = {};

      const questoesDetalhes: QuestaoRespondidaType[] = [];

      for (const questao of questoes) {
        const respostaAluno = respostasPorQuestao[questao.id];
        const respostaCorreta = alternativasCorretas[questao.id];
        const dificuldade = (questao.dificuldade?.toLowerCase() || 'média') as DificuldadeType;

        const dificuldadeValida: DificuldadeType =
          ['fácil', 'média', 'difícil'].includes(dificuldade)
            ? dificuldade
            : 'média';

        estatisticasDificuldade[dificuldadeValida].total++;

        if (!estatisticasAssunto[questao.assunto]) {
          estatisticasAssunto[questao.assunto] = { total: 0, acertos: 0, percentual: 0 };
        }
        estatisticasAssunto[questao.assunto].total++;

        const acertou = !!(
          respostaAluno &&
          respostaCorreta &&
          respostaAluno.toLowerCase() === respostaCorreta.toLowerCase()
        );

        if (acertou) {
          acertos++;
          estatisticasDificuldade[dificuldadeValida].acertos++;
          estatisticasAssunto[questao.assunto].acertos++;
        } else {
          erros++;
        }

        questoesDetalhes.push({
          id: questao.id,
          numero: questao.numero,
          respostaAluno: respostaAluno || '-',
          respostaCorreta: respostaCorreta || '-',
          acertou,
          assunto: questao.assunto || 'Não especificado',
          dificuldade: questao.dificuldade || 'média'
        });
      }

      // Calcular percentuais
      Object.keys(estatisticasDificuldade).forEach(dificuldade => {
        const diff = dificuldade as DificuldadeType;
        if (estatisticasDificuldade[diff].total > 0) {
          estatisticasDificuldade[diff].percentual = Math.round(
            (estatisticasDificuldade[diff].acertos / estatisticasDificuldade[diff].total) * 100
          );
        }
      });

      Object.keys(estatisticasAssunto).forEach(assunto => {
        if (estatisticasAssunto[assunto].total > 0) {
          estatisticasAssunto[assunto].percentual = Math.round(
            (estatisticasAssunto[assunto].acertos / estatisticasAssunto[assunto].total) * 100
          );
        }
      });

      const percentual = total > 0 ? Math.round((acertos / total) * 100) : 0;

      setResultado({
        acertos,
        erros,
        total,
        percentual,
        estatisticasDificuldade,
        estatisticasAssunto,
        questoesDetalhes: questoesDetalhes.sort((a, b) => a.numero - b.numero)
      });
    } catch (error) {
      console.error('Erro ao carregar resultado:', error);
      alert('Erro ao carregar resultado. Tente novamente.');
      router.push('/simulados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Carregando resultado...</p>
        </div>
      </div>
    );
  }

  if (!simulado || !resultado) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Resultado não encontrado.</p>
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
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/simulados')}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Voltar para Simulados</span>
          </button>
          <h1 className="text-2xl font-bold">
            Resultado - Simulado {simulado.mes} {simulado.ano}
          </h1>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-green-500 text-3xl font-bold">{resultado.acertos}</p>
              <p className="text-gray-300 mt-2">Acertos</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-red-500 text-3xl font-bold">{resultado.erros}</p>
              <p className="text-gray-300 mt-2">Erros</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className={`text-3xl font-bold ${
                resultado.percentual >= 70 ? 'text-green-500' :
                resultado.percentual >= 50 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {resultado.percentual}%
              </p>
              <p className="text-gray-300 mt-2">Aproveitamento</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-white text-lg font-semibold mb-3">Desempenho por Nível de Dificuldade</h3>
            <div className="space-y-3">
              {Object.entries(resultado.estatisticasDificuldade).map(([dificuldade, stats]) => {
                if (stats.total === 0) return null;

                let barColor;
                switch (dificuldade) {
                  case 'fácil':
                    barColor = 'bg-green-500';
                    break;
                  case 'média':
                    barColor = 'bg-yellow-500';
                    break;
                  case 'difícil':
                    barColor = 'bg-red-500';
                    break;
                  default:
                    barColor = 'bg-blue-500';
                }

                return (
                  <div key={dificuldade}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 capitalize">{dificuldade}</span>
                      <span className="text-gray-300">
                        {stats.acertos}/{stats.total} ({stats.percentual}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2.5">
                      <div
                        className={`${barColor} h-2.5 rounded-full`}
                        style={{ width: `${stats.percentual}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-white text-lg font-semibold mb-3">Desempenho por Assunto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(resultado.estatisticasAssunto).map(([assunto, stats]) => {
                if (stats.total === 0) return null;

                return (
                  <div key={assunto} className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 text-sm truncate" title={assunto}>
                        {assunto}
                      </span>
                      <span className="text-gray-300 text-sm">{stats.percentual}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full"
                        style={{ width: `${stats.percentual}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-lg font-semibold">Detalhes das Questões</h3>
              <button
                onClick={() => setMostrarDetalhesQuestoes(!mostrarDetalhesQuestoes)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {mostrarDetalhesQuestoes ? 'Ocultar detalhes' : 'Mostrar detalhes'}
              </button>
            </div>

            {mostrarDetalhesQuestoes && (
              <div className="bg-gray-700 rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-gray-800">
                    <tr>
                      <th className="px-4 py-3">Questão</th>
                      <th className="px-4 py-3">Resposta</th>
                      <th className="px-4 py-3">Gabarito</th>
                      <th className="px-4 py-3">Resultado</th>
                      <th className="px-4 py-3">Assunto</th>
                      <th className="px-4 py-3">Dificuldade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.questoesDetalhes.map(questao => (
                      <tr key={questao.id} className="border-b border-gray-600">
                        <td className="px-4 py-3 text-center">{questao.numero}</td>
                        <td className="px-4 py-3 text-center uppercase">{questao.respostaAluno}</td>
                        <td className="px-4 py-3 text-center uppercase">{questao.respostaCorreta}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block w-3 h-3 rounded-full ${
                              questao.acertou ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></span>
                        </td>
                        <td className="px-4 py-3">{questao.assunto}</td>
                        <td className="px-4 py-3 capitalize">{questao.dificuldade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => router.push('/simulados')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Voltar para Simulados
          </button>
        </div>
      </div>
    </div>
  );
}
