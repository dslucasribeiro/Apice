'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { useRouter } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalUsuarios: number;
  totalAulas: number;
  totalMateriais: number;
  totalSimulados: number;
  totalDuvidas: number;
  duvidasResolvidas: number;
  totalAvisos: number;
  comentariosPorDia: {
    data: string;
    total: number;
  }[];
  materiaisMaisAcessados: {
    id: number;
    titulo: string;
    tipo: string;
    acessos: number;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: usuarios } = await supabase.from('usuarios').select('*');
      const { data: aulas } = await supabase.from('aulas').select('*');
      const { data: materiais } = await supabase.from('materiais_didaticos').select('*');
      const { data: simulados } = await supabase.from('simulados').select('*');
      const { data: duvidas } = await supabase.from('topicos_duvidas').select('*');
      const { data: avisos } = await supabase.from('avisos').select('*');
      const { data: comentarios } = await supabase
        .from('comentarios')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Processar comentários por dia
      const comentariosPorDia = comentarios?.reduce((acc: Record<string, number>, { created_at }) => {
        const data = new Date(created_at).toLocaleDateString();
        acc[data] = (acc[data] || 0) + 1;
        return acc;
      }, {}) || {};

      const ultimosSeteDias = Array.from({ length: 7 }, (_, i) => {
        const data = new Date();
        data.setDate(data.getDate() - i);
        return data.toLocaleDateString();
      }).reverse();

      const comentariosProcessados = ultimosSeteDias.map(data => ({
        data,
        total: comentariosPorDia[data] || 0
      }));

      setStats({
        totalUsuarios: usuarios?.length || 0,
        totalAulas: aulas?.length || 0,
        totalMateriais: materiais?.length || 0,
        totalSimulados: simulados?.length || 0,
        totalDuvidas: duvidas?.length || 0,
        duvidasResolvidas: duvidas?.filter(d => d.status === 'resolvida')?.length || 0,
        totalAvisos: avisos?.length || 0,
        comentariosPorDia: comentariosProcessados,
        materiaisMaisAcessados: materiais?.sort((a, b) => (b.acessos || 0) - (a.acessos || 0))
          .slice(0, 3)
          .map(m => ({
            id: m.id,
            titulo: m.titulo,
            tipo: m.tipo,
            acessos: m.acessos || 0
          })) || []
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
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
            <div className="text-white text-xl">Carregando...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Cards Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-medium mb-2">Total de Alunos</h3>
            <p className="text-4xl font-bold">{stats?.totalUsuarios || 0}</p>
          </div>
          
          <div className="bg-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-medium mb-2">Total de Aulas</h3>
            <p className="text-4xl font-bold">{stats?.totalAulas || 0}</p>
          </div>
          
          <div className="bg-emerald-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-medium mb-2">Materiais</h3>
            <p className="text-4xl font-bold">{stats?.totalMateriais || 0}</p>
          </div>

          <div className="bg-amber-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-medium mb-2">Simulados</h3>
            <p className="text-4xl font-bold">{stats?.totalSimulados || 0}</p>
          </div>
        </div>

        {/* Segunda linha de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-indigo-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-medium mb-2">Dúvidas</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{stats?.totalDuvidas || 0}</p>
                <p className="text-sm opacity-80">Total</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{stats?.duvidasResolvidas || 0}</p>
                <p className="text-sm opacity-80">Resolvidas</p>
              </div>
            </div>
          </div>

          <div className="bg-red-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-medium mb-2">Avisos</h3>
            <p className="text-4xl font-bold">{stats?.totalAvisos || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfico de Atividades */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Atividade nos Últimos 7 Dias</h3>
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: stats?.comentariosPorDia.map(item => item.data) || [],
                  datasets: [
                    {
                      label: 'Comentários',
                      data: stats?.comentariosPorDia.map(item => item.total) || [],
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
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

          {/* Materiais Mais Acessados */}
          <div className="bg-gray-800 rounded-lg p-6">
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
        </div>
      </main>
    </div>
  );
}
