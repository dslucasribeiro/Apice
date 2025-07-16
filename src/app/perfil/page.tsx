'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { User as AuthUser } from '@/types/user';
import Navigation from '@/components/Navigation';
import Image from 'next/image';
import { XMarkIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface UserCardProps {
  user: UserProfile;
}

interface UserProfile {
  id: number;
  user_id: string;
  created_at?: string | null;
  nome: string;
  cpf: string | null;
  rg: string | null;
  data_nasc: string | null;
  celular: string | null;
  email: string | null;
  ano_conclusao_ensino_medio: number | null;
  responsavel_financeiro: string | null;
  foto_perfil: string | null;
  tipo: string | null;
  status: string | null;
  newProfilePicture?: File;
  previewUrl?: string;
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

interface Aluno {
  id: number;
  nome: string;
}

export default function Perfil() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const itemsPerPage = 10;
  const supabase = createSupabaseClient();
  
  // Estados para o modal de desempenhos
  const [isModalDesempenhosOpen, setIsModalDesempenhosOpen] = useState(false);
  const [alunoSelecionadoDesempenho, setAlunoSelecionadoDesempenho] = useState('');
  const [simuladoSelecionadoDesempenho, setSimuladoSelecionadoDesempenho] = useState('');
  const [simuladosAluno, setSimuladosAluno] = useState<{id: string, titulo: string}[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  
  // Estados para o modal de resultados
  const [isModalCartaoRespostaOpen, setIsModalCartaoRespostaOpen] = useState(false);
  const [simuladoRespostaId, setSimuladoRespostaId] = useState<number | null>(null);
  const [mostrarDetalhesQuestoes, setMostrarDetalhesQuestoes] = useState(false);
  
  // Estado para o resultado do simulado
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

  useEffect(() => {
    fetchUsers();
    carregarAlunos();
  }, [currentPage]); // Refetch quando a página mudar

  const fetchUsers = async () => {
    try {
      // Primeiro, pegar o usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar tipo do usuário
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('user_id', currentUser.id)
        .single();

      setUserType(userData?.tipo || null);

      // Se for aluno, buscar apenas os próprios dados
      // Se for admin, buscar todos os usuários com paginação e ordenação
      let query = supabase
        .from('usuarios')
        .select('*', { count: 'exact' });

      if (userData?.tipo === 'Aluno') {
        query = query.eq('user_id', currentUser.id);
      } else {
        // Para admin, aplicar ordenação e paginação
        query = query
          .order('nome', { ascending: true })
          .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      if (count !== null) {
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
      
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    //console.log('Users state updated:', users);
  }, [users]);

  // Funções de formatação
  const formatCPF = (cpf: string | null) => {
    if (!cpf) return 'CPF não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4');
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Data não informada';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'Telefone não informado';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/g, '($1) $2-$3');
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-500';
    
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'bg-green-500';
      case 'inativo':
        return 'bg-red-500';
      case 'pendente':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    
    // Se a URL já for completa (começa com http ou https), retorna ela mesma
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Caso contrário, constrói a URL do Supabase
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos_perfil/${path}`;
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      let fotoUrl = editingUser.foto_perfil;

      // Se houver uma nova foto para upload
      if (editingUser.newProfilePicture) {
        const file = editingUser.newProfilePicture;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        // Upload da nova foto
        const { error: uploadError, data } = await supabase.storage
          .from('fotos_perfil')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Se havia uma foto anterior, deletá-la
        if (editingUser.foto_perfil) {
          try {
            await supabase.storage
              .from('fotos_perfil')
              .remove([editingUser.foto_perfil]);
          } catch (error) {
            console.error('Erro ao deletar foto antiga:', error);
          }
        }

        // Atualizar a URL da foto
        fotoUrl = fileName;
      }

      // Atualizar dados do usuário
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: editingUser.nome,
          cpf: editingUser.cpf,
          data_nasc: editingUser.data_nasc,
          celular: editingUser.celular,
          email: editingUser.email,
          status: editingUser.status,
          foto_perfil: fotoUrl
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Atualiza a lista de usuários
      await fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error.message);
      alert('Erro ao atualizar usuário. Por favor, tente novamente.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Verificar o tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A foto deve ter no máximo 5MB');
        return;
      }

      // Verificar o tipo do arquivo
      if (!file.type.startsWith('image/')) {
        alert('O arquivo deve ser uma imagem');
        return;
      }

      // Criar URL para preview
      const previewUrl = URL.createObjectURL(file);

      setEditingUser(prev => prev ? {
        ...prev,
        newProfilePicture: file,
        previewUrl: previewUrl
      } : null);
    }
  };

  const handlePhotoClick = (user: UserProfile) => {
    setSelectedUser({ ...user });
    setShowPhotoModal(true);
  };

  const handlePhotoUpdate = async (file: File) => {
    if (!selectedUser) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // Upload da nova foto
      const { error: uploadError } = await supabase.storage
        .from('fotos_perfil')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Se havia uma foto anterior, deletá-la
      if (selectedUser.foto_perfil) {
        try {
          await supabase.storage
            .from('fotos_perfil')
            .remove([selectedUser.foto_perfil]);
        } catch (error) {
          console.error('Erro ao deletar foto antiga:', error);
        }
      }

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('usuarios')
        .update({ foto_perfil: fileName })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Atualiza a lista de usuários
      await fetchUsers();
      setShowPhotoModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Erro ao atualizar foto:', error.message);
      alert('Erro ao atualizar foto. Por favor, tente novamente.');
    }
  };

  const handlePasswordModalOpen = (user: UserProfile) => {
    setSelectedUserForPassword(user);
    setShowPasswordModal(true);
  };
  
  // Funções para gerenciar o modal de desempenhos
  const handleDesempenhoModalOpen = (user: UserProfile) => {
    setAlunoSelecionadoDesempenho(user.id.toString());
    carregarSimuladosDoAluno(user.id);
    setIsModalDesempenhosOpen(true);
  };
  
  // Função para carregar lista de alunos
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
  
  // Função para carregar simulados respondidos pelo aluno
  const carregarSimuladosDoAluno = async (alunoId: number) => {
    const supabase = createSupabaseClient();
    
    try {
      // Carregar todos os simulados disponíveis para este aluno
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
  
  // Função para visualizar o desempenho do aluno em um simulado
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!selectedUserForPassword) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Se for admin alterando senha de outro usuário
      if (userType === 'Admin' && currentUser?.id !== selectedUserForPassword.user_id) {
        // Usar o endpoint da API para alterar a senha
        const response = await fetch('/api/users/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUserForPassword.user_id,
            newPassword: passwordData.newPassword
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao alterar senha');
        }
      } else {
        // Se for o próprio usuário alterando sua senha
        const { error } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });
        if (error) throw error;
      }

      alert('Senha alterada com sucesso!');
      setShowPasswordModal(false);
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
      setSelectedUserForPassword(null);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      setPasswordError(error.message);
    }
  };

  // Cleanup function para liberar as URLs de preview
  useEffect(() => {
    return () => {
      if (editingUser?.previewUrl) {
        URL.revokeObjectURL(editingUser.previewUrl);
      }
    };
  }, [editingUser?.previewUrl]);

  const UserCard = ({ user }: UserCardProps) => (
    <div className="mt-8 flex justify-center px-4">
      <div className="relative bg-gradient-to-br from-blue-900 to-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-5xl mx-auto overflow-hidden">
        {/* Efeito de brilho */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform rotate-12 translate-y-32"></div>
        
        <div className="relative z-10">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Identificação Acadêmica</h2>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getStatusColor(user.status)}`}>
                {user.status || 'Indefinido'}
              </span>
              {userType === 'Admin' && (
                <button 
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={() => handleEdit(user)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Foto e Informações Principais */}
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0 relative group">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-700 border-2 border-blue-400">
                {user.foto_perfil ? (
                  <Image
                    src={getImageUrl(user.foto_perfil) || ''}
                    alt={user.nome || 'Usuário'}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <button
                onClick={() => handlePhotoClick(user)}
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200 rounded-lg"
              >
                <svg
                  className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            
            <div className="flex-grow">
              <h3 className="text-xl font-semibold text-white mb-2">{user.nome}</h3>
              <div className="space-y-1 text-gray-300">
                <p className="text-sm">CPF: {formatCPF(user.cpf)}</p>
                <p className="text-sm">D. Nascimento: {formatDate(user.data_nasc)}</p>
              </div>
            </div>
          </div>

          {/* Informações de Contato e QR Code */}
          <div className="border-t border-blue-800 pt-4">
            <div className="flex justify-between items-start">
              <div className="text-sm text-gray-300">
                <p className="text-blue-400 mb-2">Contato</p>
                <p className="mb-1">{formatPhone(user.celular)}</p>
                <p className="break-all">{user.email || 'Email não informado'}</p>
                <div className="flex flex-col space-y-2 mt-4">
                  <button
                    onClick={() => handlePasswordModalOpen(user)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Alterar Senha
                  </button>
                  
                  {userType === 'Admin' && (
                    <button
                      onClick={() => handleDesempenhoModalOpen(user)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ChartBarIcon className="h-5 w-5" />
                      Ver Desempenho
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code decorativo */}
              <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center">
                <div className="w-16 h-16 grid grid-cols-4 grid-rows-4 gap-0.5">
                  {Array(16).fill(0).map((_, i) => (
                    <div 
                      key={i} 
                      className={`bg-white/80 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-30'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
                        alert('Por favor, selecione um simulado para visualizar o desempenho.');
                      }
                    }}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    disabled={!simuladoSelecionadoDesempenho}
                  >
                    Visualizar Desempenho
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsModalDesempenhosOpen(false)}
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Resultados do Simulado */}
      {isModalCartaoRespostaOpen && resultadoSimulado.mostrando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-5 rounded-lg w-full max-w-4xl mx-auto my-4 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Resultado do Simulado</h2>
              <button 
                onClick={() => setIsModalCartaoRespostaOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-green-500 text-2xl font-bold">{resultadoSimulado.acertos}</p>
                  <p className="text-gray-300">Acertos</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-red-500 text-2xl font-bold">{resultadoSimulado.erros}</p>
                  <p className="text-gray-300">Erros</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-blue-500 text-2xl font-bold">{resultadoSimulado.percentual}%</p>
                  <p className="text-gray-300">Aproveitamento</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-white text-lg font-semibold mb-3">Desempenho por Nível de Dificuldade</h3>
                <div className="space-y-3">
                  {Object.entries(resultadoSimulado.estatisticasDificuldade).map(([dificuldade, stats]) => {
                    if (stats.total === 0) return null;
                    
                    let barColor;
                    switch(dificuldade) {
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
                          <span className="text-gray-300">{stats.acertos}/{stats.total} ({stats.percentual}%)</span>
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
                  {Object.entries(resultadoSimulado.estatisticasAssunto).map(([assunto, stats], index) => {
                    if (stats.total === 0) return null;
                    
                    return (
                      <div key={index} className="bg-gray-700 p-3 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-300 text-sm truncate" title={assunto}>{assunto}</span>
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
                        {resultadoSimulado.questoesDetalhes?.map((questao) => (
                          <tr key={questao.id} className="border-b border-gray-600">
                            <td className="px-4 py-3 text-center">{questao.numero}</td>
                            <td className="px-4 py-3 text-center uppercase">{questao.respostaAluno}</td>
                            <td className="px-4 py-3 text-center uppercase">{questao.respostaCorreta}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block w-3 h-3 rounded-full ${questao.acertou ? 'bg-green-500' : 'bg-red-500'}`}></span>
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
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsModalCartaoRespostaOpen(false)}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
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
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-white">Identificação</h1>
            {userType === 'Admin' && (
              <div className="text-gray-400 text-sm">
                Total de registros: {users.length}
              </div>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>

          {/* Paginação - Visível apenas para admin e quando houver mais de uma página */}
          {userType === 'Admin' && totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Anterior
              </button>
              
              <span className="text-white">
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Edição */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Editar Identificação</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={editingUser.nome || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">CPF</label>
                <input
                  type="text"
                  value={editingUser.cpf || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, cpf: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={editingUser.data_nasc?.split('T')[0] || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, data_nasc: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Celular</label>
                <input
                  type="tel"
                  value={editingUser.celular || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, celular: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={editingUser.status || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-2"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de Foto */}
      {showPhotoModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Alterar Foto de Perfil</h2>
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-700 border-2 border-blue-400">
                  {selectedUser.previewUrl ? (
                    <Image
                      src={selectedUser.previewUrl}
                      alt={selectedUser.nome || 'Preview'}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedUser.foto_perfil ? (
                    <Image
                      src={getImageUrl(selectedUser.foto_perfil) || ''}
                      alt={selectedUser.nome || 'Usuário'}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      if (file.size > 5 * 1024 * 1024) {
                        alert('A foto deve ter no máximo 5MB');
                        return;
                      }
                      const previewUrl = URL.createObjectURL(file);
                      setSelectedUser(prev => prev ? {
                        ...prev,
                        newProfilePicture: file,
                        previewUrl
                      } : null);
                    }
                  }}
                  className="hidden"
                  id="foto-perfil-modal"
                />
                <label
                  htmlFor="foto-perfil-modal"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer mb-2"
                >
                  Escolher Foto
                </label>
                <p className="text-sm text-gray-400">
                  Tamanho máximo: 5MB. Formatos: JPG, PNG
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    if (selectedUser?.previewUrl) {
                      URL.revokeObjectURL(selectedUser.previewUrl);
                    }
                    setShowPhotoModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (selectedUser?.newProfilePicture) {
                      handlePhotoUpdate(selectedUser.newProfilePicture);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={!selectedUser?.newProfilePicture}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Alteração de Senha */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {userType === 'Admin' 
                ? `Alterar Senha - ${selectedUserForPassword.nome}`
                : 'Alterar Senha'}
            </h3>
            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Nova Senha</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {passwordError && (
                <div className="mt-4 text-red-500 text-sm">{passwordError}</div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUserForPassword(null);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
