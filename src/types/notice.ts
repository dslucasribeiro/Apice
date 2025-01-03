export type Notice = {
  id: number;
  created_at: string | null;
  titulo: string | null;
  mensagem: string | null;
  criado_por: string | null;
  data_edicao: string | null;
  data_exclusao: string | null;
  ativo: boolean | null;
};
