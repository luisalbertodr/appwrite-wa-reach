import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  CreateProveedorInput,
  UpdateProveedorInput,
} from '../services/appwrite-proveedores';

const PROVEEDORES_QUERY_KEY = 'proveedores';

export const useGetProveedores = (soloActivos: boolean = true) => {
  return useQuery({
    queryKey: [PROVEEDORES_QUERY_KEY, { soloActivos }],
    queryFn: () => getProveedores(soloActivos),
    staleTime: 1000 * 60 * 15,
  });
};

export const useCreateProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newProveedor: CreateProveedorInput) => createProveedor(newProveedor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROVEEDORES_QUERY_KEY] });
    },
  });
};

export const useUpdateProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProveedorInput }) =>
      updateProveedor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROVEEDORES_QUERY_KEY] });
    },
  });
};

export const useDeleteProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProveedor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROVEEDORES_QUERY_KEY] });
    },
  });
};
