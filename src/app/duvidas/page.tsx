'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { ChatBubbleLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Topico {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  created_at: string;
  user_id: string;
  nomeUsuario: string;
  respostasCount: number;
}

interface Resposta {
  id: number;
  conteudo: string;
  is_solucao: boolean;
  created_at: string;
  user_id: string;
  topico_id: number;
  nomeUsuario: string;
}

export default function Duvidas() {
  const [topicos, setTopicos] = useState<Topico[]>([]);
  const [topicoSelecionado, setTopicoSelecionado] = useState<Topico | null>(null);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [novoTopico, setNovoTopico] = useState({ titulo: '', descricao: '' });
  const [novaResposta, setNovaResposta] = useState('');
  const [userType, setUserType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNovoTopicoModal, setShowNovoTopicoModal] = useState(false);
  const supabase = createSupabaseClient();

  useEffect(() => {
    fetchUserType();
    fetchTopicos();
  }, []);

  const fetchUserType = async () => {
    const storedUserType = localStorage.getItem('userType');
    if (storedUserType) {
      setUserType(storedUserType);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('user_id', user.id)
          .single();
        
        if (userData) {
          setUserType(userData.tipo);
          localStorage.setItem('userType', userData.tipo);
        }
      }
    }
  };

  const fetchTopicos = async () => {
    setIsLoading(true);
    try {
      // Primeiro, buscar os tópicos
      const { data: topicosData, error: topicosError } = await supabase
        .from('topicos_duvidas')
        .select('*')
        .order('created_at', { ascending: false });

      if (topicosError) {
        console.error('Erro ao carregar tópicos:', topicosError);
        return;
      }

      // Para cada tópico, buscar o nome do usuário e a contagem de respostas
      const topicosComNomesERespostas = await Promise.all(
        (topicosData || []).map(async (topico) => {
          // Buscar nome do usuário
          const { data: userData } = await supabase
            .from('usuarios')
            .select('nome')
            .eq('user_id', topico.user_id)
            .single();
          
          // Buscar contagem de respostas
          const { count } = await supabase
            .from('respostas_duvidas')
            .select('*', { count: 'exact', head: true })
            .eq('topico_id', topico.id);
          
          return {
            ...topico,
            nomeUsuario: userData?.nome || 'Usuário',
            respostasCount: count || 0
          };
        })
      );

      setTopicos(topicosComNomesERespostas);
    } catch (error) {
      console.error('Erro na requisição:', error);
    }
    setIsLoading(false);
  };

  const fetchRespostas = async (topicoId: number) => {
    try {
      const { data: respostasData, error: respostasError } = await supabase
        .from('respostas_duvidas')
        .select('*')
        .eq('topico_id', topicoId)
        .order('created_at', { ascending: true });

      if (respostasError) {
        console.error('Erro ao carregar respostas:', respostasError);
        return;
      }

      const respostasComNomes = await Promise.all(
        (respostasData || []).map(async (resposta) => {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('nome')
            .eq('user_id', resposta.user_id)
            .single();
          
          return {
            ...resposta,
            nomeUsuario: userData?.nome || 'Usuário'
          };
        })
      );

      setRespostas(respostasComNomes);
    } catch (error) {
      console.error('Erro na requisição:', error);
    }
  };

  const criarTopico = async () => {
    if (!novoTopico.titulo.trim() || !novoTopico.descricao.trim()) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('topicos_duvidas')
      .insert([
        {
          titulo: novoTopico.titulo,
          descricao: novoTopico.descricao,
          user_id: user.id,
          status: 'aberto'
        }
      ]);

    if (error) {
      console.error('Erro ao criar tópico:', error);
      alert('Erro ao criar tópico. Por favor, tente novamente.');
    } else {
      setNovoTopico({ titulo: '', descricao: '' });
      setShowNovoTopicoModal(false);
      fetchTopicos();
    }
  };

  const responderTopico = async () => {
    if (!novaResposta.trim() || !topicoSelecionado) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('respostas_duvidas')
      .insert([
        {
          topico_id: topicoSelecionado.id,
          conteudo: novaResposta,
          user_id: user.id
        }
      ]);

    if (error) {
      console.error('Erro ao responder:', error);
      alert('Erro ao enviar resposta. Por favor, tente novamente.');
    } else {
      setNovaResposta('');
      fetchRespostas(topicoSelecionado.id);
    }
  };

  const marcarComoResolvido = async (topicoId: number) => {
    const { error } = await supabase
      .from('topicos_duvidas')
      .update({ status: 'resolvido' })
      .eq('id', topicoId);

    if (error) {
      console.error('Erro ao marcar como resolvido:', error);
      alert('Erro ao atualizar status. Por favor, tente novamente.');
    } else {
      fetchTopicos();
      if (topicoSelecionado?.id === topicoId) {
        setTopicoSelecionado(prev => prev ? { ...prev, status: 'resolvido' } : null);
      }
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-white mb-4 sm:mb-0">Fórum de Dúvidas</h1>
          <button
            onClick={() => setShowNovoTopicoModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full sm:w-auto"
          >
            Nova Dúvida
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Tópicos */}
          <div className="lg:col-span-1 bg-gray-800 rounded-lg p-4 h-[calc(100vh-12rem)] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4 sticky top-0 bg-gray-800 py-2">Tópicos</h2>
            {isLoading ? (
              <div className="text-center text-gray-400">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {topicos.map((topico) => (
                  <div
                    key={topico.id}
                    onClick={() => {
                      setTopicoSelecionado(topico);
                      fetchRespostas(topico.id);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      topicoSelecionado?.id === topico.id
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white line-clamp-1">{topico.titulo}</h3>
                      {topico.status === 'resolvido' && (
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mt-1">
                      por {topico.nomeUsuario}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
                      <span>{topico.respostasCount} respostas</span>
                      <span className="hidden sm:inline">{formatarData(topico.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes do Tópico e Respostas */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4 h-[calc(100vh-12rem)] overflow-y-auto">
            {topicoSelecionado ? (
              <>
                <div className="border-b border-gray-700 pb-4 mb-4 sticky top-0 bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white break-words">{topicoSelecionado.titulo}</h2>
                    {userType === 'Admin' && topicoSelecionado.status !== 'resolvido' && (
                      <button
                        onClick={() => marcarComoResolvido(topicoSelecionado.id)}
                        className="flex items-center space-x-2 text-green-400 hover:text-green-300 ml-4"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="hidden sm:inline">Marcar como resolvido</span>
                      </button>
                    )}
                  </div>
                  <p className="text-gray-300 mt-2 break-words">{topicoSelecionado.descricao}</p>
                  <div className="flex flex-wrap items-center text-sm text-gray-400 mt-2">
                    <span>por {topicoSelecionado.nomeUsuario}</span>
                    <span className="mx-2">•</span>
                    <span>{formatarData(topicoSelecionado.created_at)}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-4">
                  {respostas.map((resposta) => (
                    <div key={resposta.id} className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-200 break-words">{resposta.conteudo}</p>
                      <div className="flex flex-wrap items-center text-sm text-gray-400 mt-2">
                        <span>por {resposta.nomeUsuario}</span>
                        <span className="mx-2">•</span>
                        <span>{formatarData(resposta.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {topicoSelecionado.status !== 'resolvido' && (
                  <div className="mt-4 sticky bottom-0 bg-gray-800 pt-4">
                    <textarea
                      value={novaResposta}
                      onChange={(e) => setNovaResposta(e.target.value)}
                      placeholder="Escreva sua resposta..."
                      className="w-full bg-gray-700 text-white rounded-lg p-3 min-h-[100px]"
                    />
                    <button
                      onClick={responderTopico}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full sm:w-auto"
                    >
                      Responder
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-400">
                Selecione um tópico para ver os detalhes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Tópico */}
      {showNovoTopicoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">Nova Dúvida</h2>
            <input
              type="text"
              value={novoTopico.titulo}
              onChange={(e) => setNovoTopico({ ...novoTopico, titulo: e.target.value })}
              placeholder="Título da dúvida"
              className="w-full bg-gray-700 text-white rounded-lg p-3 mb-4"
            />
            <textarea
              value={novoTopico.descricao}
              onChange={(e) => setNovoTopico({ ...novoTopico, descricao: e.target.value })}
              placeholder="Descreva sua dúvida em detalhes..."
              className="w-full bg-gray-700 text-white rounded-lg p-3 min-h-[150px] mb-4"
            />
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowNovoTopicoModal(false)}
                className="text-gray-400 hover:text-white px-4 py-2 rounded-md w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button
                onClick={criarTopico}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full sm:w-auto"
              >
                Criar Tópico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
