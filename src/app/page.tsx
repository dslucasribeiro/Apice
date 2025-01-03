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
  comentariosPorDia: {
    data: string;
    total: number;
  }[];
  distribuicaoUsuarios: {
    tipo: string;
    total: number;
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
      // Buscar total de usuários
      const { count: totalUsuarios } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });

      // Buscar total de aulas
      const { count: totalAulas } = await supabase
        .from('aulas')
        .select('*', { count: 'exact', head: true });

      // Buscar total de avisos
      const { count: totalAvisos } = await supabase
        .from('avisos')
        .select('*', { count: 'exact', head: true });

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
        comentariosPorDia: comentariosProcessados,
        distribuicaoUsuarios: distribuicaoProcessada,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Total de Alunos</h3>
            <p className="text-3xl font-bold text-white">{stats?.totalUsuarios}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Total de Aulas</h3>
            <p className="text-3xl font-bold text-white">{stats?.totalAulas}</p>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Total de Avisos</h3>
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
