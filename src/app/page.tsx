'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { useRouter } from 'next/navigation';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardStats {
  totalUsuarios: number;
  totalAulas: number;
  totalAvisos: number;
  totalSimulados: number;
  totalMateriais: number;
  totalDuvidas: number;
  duvidasResolvidas: number;
  comentariosPorDia: {
    data: string;
    total: number;
  }[];
  distribuicaoUsuarios: {
    tipo: string;
    total: number;
  }[];
  desempenhoSimulados: {
    simulado: string;
    media: number;
  }[];
  materiaisMaisAcessados: {
    id: number;
    titulo: string;
    acessos: number;
    tipo: string;
  }[];
  ultimasDuvidas: {
    id: number;
    titulo: string;
    status: string;
    data_criacao: string;
  }[];
  ultimasAulas: {
    id: number;
    titulo: string;
    assunto: string;
    data_criacao: string;
  }[];
  ultimosAvisos: {
    id: number;
    titulo: string;
    data_criacao: string;
  }[];
}

export default function Home() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    fetchDashboardStats();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Buscar totais existentes
      const { count: totalUsuarios } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });

      const { count: totalAulas } = await supabase
        .from('aulas')
        .select('*', { count: 'exact', head: true });

      const { count: totalAvisos } = await supabase
        .from('avisos')
        .select('*', { count: 'exact', head: true });

      // Novos totais
      const { count: totalSimulados } = await supabase
        .from('simulados')
        .select('*', { count: 'exact', head: true });

      const { count: totalMateriais } = await supabase
        .from('materiais')
        .select('*', { count: 'exact', head: true });

      const { count: totalDuvidas } = await supabase
        .from('duvidas')
        .select('*', { count: 'exact', head: true });

      const { count: duvidasResolvidas } = await supabase
        .from('duvidas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolvida');

      // Buscar desempenho dos simulados
      const { data: simulados } = await supabase
        .from('simulados')
        .select('titulo, notas')
        .order('created_at', { ascending: false })
        .limit(5);

      const desempenhoSimulados = simulados?.map(simulado => ({
        simulado: simulado.titulo,
        media: Array.isArray(simulado.notas) 
          ? simulado.notas.reduce((acc: number, curr: number) => acc + curr, 0) / simulado.notas.length 
          : 0
      })) || [];

      // Buscar materiais mais acessados
      const { data: materiais } = await supabase
        .from('materiais')
        .select('id, titulo, acessos, tipo')
        .order('acessos', { ascending: false })
        .limit(5);

      const materiaisMaisAcessados = materiais || [];

      // Buscar últimas dúvidas
      const { data: ultimasDuvidas } = await supabase
        .from('duvidas')
        .select('id, titulo, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const transformedDuvidas = ultimasDuvidas?.map(duvida => ({
        ...duvida,
        data_criacao: duvida.created_at
      })) || [];

      // Buscar comentários por dia (últimos 7 dias)
      const { data: comentariosPorDia } = await supabase
        .from('comentarios')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Processar comentários por dia
      const comentariosAgrupados = comentariosPorDia?.reduce((acc, { created_at }) => {
        const data = new Date(created_at).toLocaleDateString();
        acc[data] = (acc[data] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const comentariosProcessados = Object.entries(comentariosAgrupados || {}).map(([data, total]) => ({
        data,
        total,
      }));

      // Buscar distribuição de usuários por tipo
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('tipo');

      const distribuicao = usuarios?.reduce((acc, { tipo }) => {
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const distribuicaoProcessada = Object.entries(distribuicao || {}).map(([tipo, total]) => ({
        tipo,
        total,
      }));

      // Buscar últimas aulas
      const { data: ultimasAulas } = await supabase
        .from('aulas')
        .select('id, titulo, assunto, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const transformedAulas = ultimasAulas?.map(aula => ({
        ...aula,
        data_criacao: aula.created_at
      })) || [];

      // Buscar últimos avisos
      const { data: ultimosAvisos } = await supabase
        .from('avisos')
        .select('id, titulo, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const transformedAvisos = ultimosAvisos?.map(aviso => ({
        ...aviso,
        data_criacao: aviso.created_at
      })) || [];

      setStats({
        totalUsuarios: totalUsuarios || 0,
        totalAulas: totalAulas || 0,
        totalAvisos: totalAvisos || 0,
        totalSimulados: totalSimulados || 0,
        totalMateriais: totalMateriais || 0,
        totalDuvidas: totalDuvidas || 0,
        duvidasResolvidas: duvidasResolvidas || 0,
        comentariosPorDia: comentariosProcessados,
        distribuicaoUsuarios: distribuicaoProcessada,
        desempenhoSimulados,
        materiaisMaisAcessados,
        ultimasDuvidas: transformedDuvidas,
        ultimasAulas: transformedAulas,
        ultimosAvisos: transformedAvisos,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-blue-500">Carregando...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-500">Dashboard</h1>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Total de Alunos</h3>
            <p className="text-3xl font-bold text-white">{stats?.totalUsuarios}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Total de Aulas</h3>
            <p className="text-3xl font-bold text-white">{stats?.totalAulas}</p>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Materiais</h3>
            <p className="text-3xl font-bold text-white">{stats?.totalMateriais}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Simulados</h3>
            <p className="text-3xl font-bold text-white">{stats?.totalSimulados}</p>
          </div>
        </div>

        {/* Segunda linha de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Dúvidas</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{stats?.totalDuvidas}</p>
                <p className="text-sm text-white opacity-80">Total</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats?.duvidasResolvidas}</p>
                <p className="text-sm text-white opacity-80">Resolvidas</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Avisos</h3>
            <p className="text-3xl font-bold text-white">{stats?.totalAvisos}</p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Atividade nos Últimos 7 Dias</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: stats?.comentariosPorDia.map(item => item.data) || [],
                  datasets: [
                    {
                      label: 'Comentários',
                      data: stats?.comentariosPorDia.map(item => item.total) || [],
                      backgroundColor: 'rgba(59, 130, 246, 0.5)',
                      borderColor: 'rgb(59, 130, 246)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { color: 'white' },
                      grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    },
                    x: {
                      ticks: { color: 'white' },
                      grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    },
                  },
                  plugins: {
                    legend: {
                      labels: { color: 'white' },
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Usuários</h3>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: stats?.distribuicaoUsuarios.map(item => item.tipo) || [],
                  datasets: [
                    {
                      data: stats?.distribuicaoUsuarios.map(item => item.total) || [],
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(147, 51, 234, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                      ],
                      borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(147, 51, 234)',
                        'rgb(34, 197, 94)',
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right' as const,
                      labels: { color: 'white' },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Desempenho em Simulados</h3>
            <div className="space-y-4">
              {stats?.desempenhoSimulados.map((item, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium">{item.simulado}</h4>
                  <div className="flex items-center mt-2">
                    <div className="flex-grow bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(item.media / 10) * 100}%` }}
                      />
                    </div>
                    <span className="ml-2 text-white">{item.media.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Materiais Mais Acessados</h3>
            <div className="space-y-4">
              {stats?.materiaisMaisAcessados.map(material => (
                <div key={material.id} className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium">{material.titulo}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-400 text-sm">{material.tipo}</span>
                    <span className="text-blue-400">{material.acessos} acessos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Últimas Dúvidas</h3>
            <div className="space-y-4">
              {stats?.ultimasDuvidas.map(duvida => (
                <div key={duvida.id} className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium">{duvida.titulo}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      duvida.status === 'resolvida' 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {duvida.status}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(duvida.data_criacao).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Últimas Atualizações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Últimas Aulas</h3>
            <div className="space-y-4">
              {stats?.ultimasAulas.map(aula => (
                <div key={aula.id} className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium">{aula.titulo}</h4>
                  <p className="text-gray-400 text-sm">{aula.assunto}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(aula.data_criacao).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Últimos Avisos</h3>
            <div className="space-y-4">
              {stats?.ultimosAvisos.map(aviso => (
                <div key={aviso.id} className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium">{aviso.titulo}</h4>
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(aviso.data_criacao).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
