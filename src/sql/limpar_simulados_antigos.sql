-- ============================================
-- SCRIPT PARA LIMPAR SIMULADOS ANTIGOS (PDF)
-- ============================================
-- ATENÇÃO: Este script remove PERMANENTEMENTE todos os dados
-- dos simulados antigos (sistema com PDF).
-- 
-- Execute este script no Supabase SQL Editor.
-- ============================================

-- 1. Identificar IDs das questões antigas (para remover respostas depois)
-- Primeiro, vamos remover respostas de alunos que estão vinculadas a questões antigas
DELETE FROM respostas_alunos
WHERE questao_id IN (
  SELECT id FROM questoes WHERE "simuladoExistente_id" IS NOT NULL
);

-- 2. Remover respostas dos alunos aos simulados antigos (tabela simulados_respondidos)
DELETE FROM simulados_respondidos;

-- 3. Remover alternativas das questões dos simulados antigos
DELETE FROM alternativas 
WHERE "simuladoExistente_id" IS NOT NULL;

-- 4. Remover questões dos simulados antigos
DELETE FROM questoes 
WHERE "simuladoExistente_id" IS NOT NULL;

-- 5. Remover os simulados antigos
DELETE FROM simulados;

-- ============================================
-- VERIFICAÇÃO (execute após a limpeza)
-- ============================================

-- Verificar se ainda há simulados antigos
SELECT COUNT(*) as total_simulados_antigos FROM simulados;
-- Resultado esperado: 0

-- Verificar se ainda há respostas de simulados antigos
SELECT COUNT(*) as total_respostas_antigas FROM simulados_respondidos;
-- Resultado esperado: 0

-- Verificar questões órfãs (não deveria haver nenhuma)
SELECT COUNT(*) as questoes_antigas 
FROM questoes 
WHERE "simuladoExistente_id" IS NOT NULL;
-- Resultado esperado: 0

-- Verificar alternativas órfãs (não deveria haver nenhuma)
SELECT COUNT(*) as alternativas_antigas 
FROM alternativas 
WHERE "simuladoExistente_id" IS NOT NULL;
-- Resultado esperado: 0

-- ============================================
-- VERIFICAR SIMULADOS DIGITAIS (devem permanecer intactos)
-- ============================================

-- Contar simulados digitais (NÃO devem ser afetados)
SELECT COUNT(*) as total_simulados_digitais FROM simulados_criados;

-- Contar questões de simulados digitais (NÃO devem ser afetadas)
SELECT COUNT(*) as questoes_digitais 
FROM questoes 
WHERE simulado_id IS NOT NULL;

-- Contar respostas de alunos em simulados digitais (NÃO devem ser afetadas)
SELECT COUNT(*) as respostas_digitais FROM respostas_alunos;
