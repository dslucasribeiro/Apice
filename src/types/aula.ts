export type Aula = {
  id: number;
  titulo: string;
  descricao: string;
  assunto: string;
  url_video: string;
  created_at: string;
};

export type Comentario = {
  id: number;
  aula_id: number;
  usuario_id: number;
  texto: string;
  created_at: string;
  parent_id: number | null;
  usuario: {
    nome: string;
    foto_perfil?: string;
  };
  respostas?: Comentario[];
};
