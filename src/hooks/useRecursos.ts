import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecursos,
  createRecurso,
  updateRecurso,
  deleteRecurso,
  CreateRecursoInput,
  UpdateRecursoInput,
} from '../services/appwrite-recursos';

const RECURSOS_QUERY_KEY = 'recursos';

export const useGetRecursos = (soloActivos: boolean = true) => {
  return useQuery({
    queryKey: [RECURSOS_QUERY_KEY, { soloActivos }],
    queryFn: () => getRecursos(soloActivos),
    staleTime: 1000 * 60 * 15,
  });
};

export const useCreateRecurso = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newRecurso: CreateRecursoInput) => createRecurso(newRecurso),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECURSOS_QUERY_KEY] });
    },
  });
};

export const useUpdateRecurso = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecursoInput }) =>
      updateRecurso(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECURSOS_QUERY_KEY] });
    },
  });
};

export const useDeleteRecurso = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecurso(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECURSOS_QUERY_KEY] });
    },
  });
};
