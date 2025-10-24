import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAparatos,
  createAparato,
  updateAparato,
  deleteAparato,
  CreateAparatoInput,
  UpdateAparatoInput,
} from '../services/appwrite-aparatos';

const APARATOS_QUERY_KEY = 'aparatos';

export const useGetAparatos = (soloActivos: boolean = true) => {
  return useQuery({
    queryKey: [APARATOS_QUERY_KEY, { soloActivos }],
    queryFn: () => getAparatos(soloActivos),
    staleTime: 1000 * 60 * 15,
  });
};

export const useCreateAparato = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newAparato: CreateAparatoInput) => createAparato(newAparato),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [APARATOS_QUERY_KEY] });
    },
  });
};

export const useUpdateAparato = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAparatoInput }) =>
      updateAparato(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [APARATOS_QUERY_KEY] });
    },
  });
};

export const useDeleteAparato = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAparato(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [APARATOS_QUERY_KEY] });
    },
  });
};
