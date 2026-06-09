import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { alunoId, simuladoId } = await request.json();

    if (!Number.isInteger(alunoId) || typeof simuladoId !== 'string' || !simuladoId) {
      return NextResponse.json(
        { error: 'Aluno ou simulado inválido.' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { data: currentUserData } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('user_id', currentUser.id)
      .single();

    if (currentUserData?.tipo !== 'Admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem reiniciar tentativas.' },
        { status: 403 }
      );
    }

    const serviceRoleSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: questoes, error: questoesError } = await serviceRoleSupabase
      .from('questoes')
      .select('id')
      .eq('simulado_id', simuladoId);

    if (questoesError) throw questoesError;

    if (!questoes || questoes.length === 0) {
      return NextResponse.json({ error: 'Simulado não encontrado.' }, { status: 404 });
    }

    const { error: deleteError } = await serviceRoleSupabase
      .from('respostas_alunos')
      .delete()
      .eq('aluno_id', alunoId)
      .in('questao_id', questoes.map(questao => questao.id));

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao reiniciar tentativa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao reiniciar tentativa.' },
      { status: 500 }
    );
  }
}
