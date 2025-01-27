import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();
    
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
        { error: 'Apenas administradores podem alterar senhas de outros usuários' },
        { status: 403 }
      );
    }

    // Atualizar a senha do usuário usando a service_role key
    const serviceRoleSupabase = createRouteHandlerClient(
      { cookies },
      {
        options: {
          db: { schema: 'auth' },
          global: { headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
        }
      }
    );

    const { error } = await serviceRoleSupabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar senha:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
