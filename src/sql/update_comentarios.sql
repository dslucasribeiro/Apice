-- Adicionar coluna parent_id na tabela comentarios
alter table public.comentarios
add column parent_id integer references public.comentarios(id);
