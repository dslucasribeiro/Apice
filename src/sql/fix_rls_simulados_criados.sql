-- ============================================
-- SCRIPT PARA CORRIGIR POLÍTICAS RLS
-- Tabela: simulados_criados
-- ============================================
-- Este script ajusta as políticas de segurança (RLS) para permitir
-- que administradores possam deletar simulados digitais.
-- ============================================

-- 1. Verificar políticas existentes na tabela simulados_criados
-- Execute este SELECT primeiro para ver as políticas atuais:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'simulados_criados';

-- ============================================
-- 2. OPÇÃO A: Desabilitar RLS temporariamente (NÃO RECOMENDADO PARA PRODUÇÃO)
-- ============================================
-- ALTER TABLE simulados_criados DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. OPÇÃO B: Criar política para permitir DELETE por admins (RECOMENDADO)
-- ============================================

-- Primeiro, remover política de DELETE existente se houver
DROP POLICY IF EXISTS "Admins podem deletar simulados" ON simulados_criados;

-- Criar nova política que permite DELETE para admins
CREATE POLICY "Admins podem deletar simulados"
ON simulados_criados
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()::int
        AND usuarios.tipo = 'Admin'
    )
);

-- ============================================
-- 4. Verificar se há política de SELECT que pode estar interferindo
-- ============================================

-- Se não houver política de SELECT, criar uma:
DROP POLICY IF EXISTS "Todos podem ver simulados" ON simulados_criados;

CREATE POLICY "Todos podem ver simulados"
ON simulados_criados
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 5. Verificar políticas após as alterações
-- ============================================
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'simulados_criados';

-- ============================================
-- TESTE MANUAL (opcional)
-- ============================================
-- Para testar se a deleção funciona, execute:
-- DELETE FROM simulados_criados WHERE id = 'ID_DO_SIMULADO_AQUI';
-- Se retornar "DELETE 1", a política está funcionando.
