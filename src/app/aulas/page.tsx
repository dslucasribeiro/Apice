'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import type { Aula, Comentario } from '@/types/aula';
import Navigation from '@/components/Navigation';
import Image from 'next/image';
import AulaModal from '@/components/AulaModal';

export default function Aulas() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [assuntos, setAssuntos] = useState<string[]>([]);
  const [assuntoSelecionado, setAssuntoSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [respondendoA, setRespondendoA] = useState<Comentario | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [aulaParaEditar, setAulaParaEditar] = useState<Aula | undefined>(undefined);

  const supabase = createSupabaseClient();

  useEffect(() => {
    console.log('Iniciando carregamento da página de aulas...');
    fetchAulas();
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      console.log('Iniciando fetchUserData...');
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Dados do auth.getUser:', { user, error });
      
      if (error) {
        console.error('Erro ao buscar usuário autenticado:', error);
        return;
      }
      
      if (user) {
        console.log('ID do usuário autenticado:', user.id);
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id, tipo')
          .eq('user_id', user.id)
          .single();

        console.log('Resultado da consulta na tabela usuarios:', { userData, userError });

        if (userError) {
          console.error('Erro ao buscar dados do usuário na tabela usuarios:', userError);
          throw userError;
        }
        
        if (userData) {
          console.log('Dados do usuário encontrados:', {
            id: userData.id,
            tipo: userData.tipo,
            user_id: user.id
          });
          setUserId(userData.id);
          setUserType(userData.tipo || '');
          console.log('Estado atualizado - userType:', userData.tipo);
        } else {
          console.log('Nenhum dado de usuário encontrado na tabela usuarios');
        }
      } else {
        console.log('Nenhum usuário autenticado encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  // Função para extrair o ID do vídeo do YouTube da URL
  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const handleAddComentario = async () => {
    if (!novoComentario.trim() || !userId || !aulaAberta) return;

    try {
      const { data: comentario, error } = await supabase
        .from('comentarios')
        .insert({
          aula_id: aulaAberta.id,
          usuario_id: userId,
          texto: novoComentario.trim(),
          created_at: new Date().toISOString(),
          ativo: true,
          parent_id: respondendoA ? respondendoA.id : null
        })
        .select(`
          *,
          usuario:usuarios (
            nome,
            foto_perfil
          )
        `)
        .single();

      if (error) throw error;

      if (comentario) {
        if (respondendoA) {
          setComentarios(prevComentarios => 
            prevComentarios.map(c => {
              if (c.id === respondendoA.id) {
                return {
                  ...c,
                  respostas: [...(c.respostas || []), comentario]
                };
              }
              return c;
            })
          );
        } else {
          setComentarios(prevComentarios => [...prevComentarios, { ...comentario, respostas: [] }]);
        }

        setNovoComentario('');
        setRespondendoA(null);
      }
    } catch (error) {
      alert('Erro ao adicionar comentário. Por favor, tente novamente.');
    }
  };

  const fetchComentarios = async (aulaId: number) => {
    try {
      const { data: mainComments, error: mainError } = await supabase
        .from('comentarios')
        .select(`
          *,
          usuario:usuarios (
            id,
            nome,
            foto_perfil
          )
        `)
        .eq('aula_id', aulaId)
        .is('parent_id', null)
        .eq('ativo', true)
        .order('created_at', { ascending: true });

      if (mainError) throw mainError;

      const { data: replies, error: repliesError } = await supabase
        .from('comentarios')
        .select(`
          *,
          usuario:usuarios (
            id,
            nome,
            foto_perfil
          )
        `)
        .eq('aula_id', aulaId)
        .not('parent_id', 'is', null)
        .eq('ativo', true)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      const commentsWithReplies = mainComments.map(comment => ({
        ...comment,
        respostas: replies.filter(reply => reply.parent_id === comment.id)
      }));

      setComentarios(commentsWithReplies);
    } catch (error) {
      // Silently handle error
    }
  };

  const fetchAulas = async () => {
    try {
      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAulas(data || []);

      // Extrair assuntos únicos
      const uniqueAssuntos = Array.from(
        new Set(data?.map(aula => aula.assunto) || [])
      ).filter(Boolean).sort();
      
      setAssuntos(uniqueAssuntos);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  const handleAulaClick = async (aula: Aula) => {
    setAulaAberta(aula);
    await fetchComentarios(aula.id);
  };

  const handleEditAula = (aula: Aula, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Tentando editar aula. Tipo do usuário:', userType);
    if (userType === 'Admin') {
      setAulaParaEditar(aula);
      setModalOpen(true);
    } else {
      alert('Você não tem permissão para editar aulas.');
    }
  };

  const handleAddAula = () => {
    console.log('Tentando adicionar aula. Tipo do usuário:', userType);
    if (userType === 'Admin') {
      setAulaParaEditar(undefined);
      setModalOpen(true);
    } else {
      alert('Você não tem permissão para adicionar aulas.');
    }
  };

  const AulaCard = ({ aula }: { aula: Aula }) => (
    <div 
      className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-colors relative group"
      onClick={() => handleAulaClick(aula)}
    >
      {userType === 'Admin' && (
        <button
          onClick={(e) => handleEditAula(aula, e)}
          className="absolute top-2 right-2 p-2 bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">{aula.titulo}</h3>
        <span className="px-3 py-1 bg-blue-600 text-sm rounded-full text-white">
          {aula.assunto}
        </span>
      </div>
      <p className="text-gray-300 mb-4">{aula.descricao}</p>
      <p className="text-sm text-gray-400">
        Adicionada em {new Date(aula.created_at).toLocaleDateString('pt-BR')}
      </p>
    </div>
  );

  const ComentarioComponent = ({ comentario, isResposta = false }: { comentario: Comentario, isResposta?: boolean }) => (
    <div className={`bg-gray-700 rounded-lg p-4 ${isResposta ? 'ml-8' : ''}`}>
      <div className="flex items-center gap-3 mb-2">
        {comentario.usuario.foto_perfil ? (
          <div className="relative w-8 h-8">
            <Image
              src={comentario.usuario.foto_perfil}
              alt={comentario.usuario.nome}
              fill
              className="rounded-full object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <span className="text-gray-300 text-sm">
              {comentario.usuario.nome.charAt(0)}
            </span>
          </div>
        )}
        <div>
          <p className="text-white font-medium">{comentario.usuario.nome}</p>
          <p className="text-sm text-gray-400">
            {new Date(comentario.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
      <p className="text-gray-300 mb-2">{comentario.texto}</p>
      {!isResposta && userId && (
        <button
          onClick={() => setRespondendoA(comentario)}
          className="text-blue-400 text-sm hover:text-blue-300"
        >
          Responder
        </button>
      )}
    </div>
  );

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
      <main className="container mx-auto px-4 py-8">
        {aulaAberta ? (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setAulaAberta(null)}
              className="mb-6 text-gray-300 hover:text-white flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7-9 18 9-2zm0 0v-8" />
              </svg>
              Voltar para lista de aulas
            </button>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">{aulaAberta.titulo}</h1>
              <p className="text-gray-300">{aulaAberta.descricao}</p>
            </div>

            <div className="relative pb-[56.25%] mb-8">
              <iframe
                src={getYouTubeEmbedUrl(aulaAberta.url_video)}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Comentários</h2>
              
              {/* Formulário de Novo Comentário */}
              <div className="mb-8">
                <div className="bg-gray-700 p-4 rounded-lg">
                  {respondendoA && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-300 mb-2">
                        Respondendo ao comentário de <span className="font-semibold">{respondendoA.usuario.nome}</span>:
                      </p>
                      <p className="text-gray-400 text-sm italic mb-2">"{respondendoA.texto}"</p>
                      <button
                        onClick={() => setRespondendoA(null)}
                        className="text-red-400 text-sm hover:text-red-300 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar resposta
                      </button>
                    </div>
                  )}
                  <textarea
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    placeholder={respondendoA ? "Escreva sua resposta..." : "Adicione um comentário..."}
                    className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500 mb-2"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddComentario}
                      className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {respondendoA ? 'Enviar resposta' : 'Enviar comentário'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Comentários */}
              <div className="space-y-6">
                {comentarios.map((comentario) => (
                  <div key={comentario.id} className="space-y-4">
                    {/* Comentário Principal */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {comentario.usuario.foto_perfil ? (
                          <div className="relative w-10 h-10">
                            <Image
                              src={comentario.usuario.foto_perfil}
                              alt={comentario.usuario.nome}
                              fill
                              className="rounded-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-gray-300 text-lg">
                              {comentario.usuario.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{comentario.usuario.nome}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(comentario.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-3">{comentario.texto}</p>
                      <button
                        onClick={() => setRespondendoA(comentario)}
                        className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Responder
                      </button>
                    </div>

                    {/* Respostas */}
                    {comentario.respostas && comentario.respostas.length > 0 && (
                      <div className="ml-8 space-y-4">
                        {comentario.respostas.map((resposta) => (
                          <div key={resposta.id} className="bg-gray-700/70 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              {resposta.usuario.foto_perfil ? (
                                <div className="relative w-8 h-8">
                                  <Image
                                    src={resposta.usuario.foto_perfil}
                                    alt={resposta.usuario.nome}
                                    fill
                                    className="rounded-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                  <span className="text-gray-300 text-sm">
                                    {resposta.usuario.nome.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="text-white font-medium">{resposta.usuario.nome}</p>
                                <p className="text-sm text-gray-400">
                                  {new Date(resposta.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                            <p className="text-gray-300">{resposta.texto}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <select
                  value={assuntoSelecionado}
                  onChange={(e) => setAssuntoSelecionado(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos os assuntos</option>
                  {assuntos.map((assunto) => (
                    <option key={assunto} value={assunto}>
                      {assunto}
                    </option>
                  ))}
                </select>
              </div>
              {userType === 'Admin' && (
                <button
                  onClick={handleAddAula}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Nova Aula
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {aulas
                .filter(aula => !assuntoSelecionado || aula.assunto === assuntoSelecionado)
                .map((aula) => (
                  <div
                    key={aula.id}
                    className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-colors relative group"
                    onClick={() => handleAulaClick(aula)}
                  >
                    {userType === 'Admin' && (
                      <button
                        onClick={(e) => handleEditAula(aula, e)}
                        className="absolute top-2 right-2 p-2 bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-white">{aula.titulo}</h3>
                      <span className="px-3 py-1 bg-blue-600 text-sm rounded-full text-white">
                        {aula.assunto}
                      </span>
                    </div>
                    <p className="text-gray-300">{aula.descricao}</p>
                    <p className="text-sm text-gray-400 mt-4">
                      Adicionada em {new Date(aula.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
            </div>
          </>
        )}
      </main>

      {userType === 'Admin' && (
        <AulaModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setAulaParaEditar(undefined);
          }}
          aula={aulaParaEditar}
          onSuccess={fetchAulas}
        />
      )}
    </div>
  );
}
