import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getArticulos, 
  getFamilias, 
  createArticulo, 
  updateArticulo, 
  deleteArticulo,
  CreateArticuloInput,
  UpdateArticuloInput
} from '@/services/appwrite-articulos';

const ARTICULOS_QUERY_KEY = 'articulos';
const FAMILIAS_QUERY_KEY = 'familias';

// --- Hooks de Familias ---

export const useGetFamilias = () => {
  return useQuery({
    queryKey: [FAMILIAS_QUERY_KEY],
    queryFn: getFamilias,
    staleTime: 1000 * 60 * 15, // 15 minutos de caché para familias
  });
};

// --- Hooks de Artículos ---

export const useGetArticulos = (familiaId?: string) => {
  return useQuery({
    queryKey: [ARTICULOS_QUERY_KEY, { familiaId }],
    queryFn: () => getArticulos(familiaId),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

export const useCreateArticulo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newArticulo: CreateArticuloInput) => createArticulo(newArticulo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ARTICULOS_QUERY_KEY] });
    },
  });
};

export const useUpdateArticulo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateArticuloInput }) => 
      updateArticulo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ARTICULOS_QUERY_KEY] });
    },
  });
};

export const useDeleteArticulo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteArticulo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ARTICULOS_QUERY_KEY] });
    },
  });
};