import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    // Criar cliente Supabase com cookies do servidor
    const supabase = createRouteHandlerClient({ cookies });

    // Verificar se o usuário atual é admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { data: currentUserData } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('user_id', currentUser.id)
      .single();

    if (currentUserData?.tipo !== 'Admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir usuários' },
        { status: 403 }
      );
    }

    // Buscar o user_id do usuário a ser deletado
    const { data: userToDelete, error: fetchError } = await supabase
      .from('usuarios')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !userToDelete) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Criar cliente com service_role para deletar do auth
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

    // 1. Deletar da tabela usuarios primeiro
    const { error: deleteDbError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (deleteDbError) {
      throw new Error(`Erro ao deletar da tabela usuarios: ${deleteDbError.message}`);
    }

    // 2. Deletar do auth do Supabase
    if (userToDelete.user_id) {
      const { error: deleteAuthError } = await serviceRoleSupabase.auth.admin.deleteUser(
        userToDelete.user_id
      );

      if (deleteAuthError) {
        console.error('Erro ao deletar do auth:', deleteAuthError);
        // Não vamos reverter a exclusão da tabela usuarios, apenas logar o erro
        // O usuário já foi removido da tabela principal
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
