import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getArticulos, 
  getFamilias, 
  createArticulo, 
  updateArticulo, 
  deleteArticulo,
  createFamilia, // <-- NUEVO
  updateFamilia, // <-- NUEVO
  deleteFamilia, // <-- NUEVO
  CreateArticuloInput,
  UpdateArticuloInput,
  FamiliaInput // <-- NUEVO
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

// (NUEVO)
export const useCreateFamilia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newFamilia: FamiliaInput) => createFamilia(newFamilia),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FAMILIAS_QUERY_KEY] });
    },
  });
};

// (NUEVO)
export const useUpdateFamilia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FamiliaInput> }) =>
      updateFamilia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FAMILIAS_QUERY_KEY] });
    },
  });
};

// (NUEVO)
export const useDeleteFamilia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFamilia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FAMILIAS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ARTICULOS_QUERY_KEY] }); // Artículos pueden afectarse
    },
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

// --- Hook Consolidado ---
// Hook principal que agrupa todas las funcionalidades de artículos
export const useArticulos = (familiaId?: string) => {
  const { data: articulos, isLoading, error } = useGetArticulos(familiaId);
  const { mutateAsync: createAsync } = useCreateArticulo();
  const { mutateAsync: updateAsync } = useUpdateArticulo();
  const { mutateAsync: deleteAsync } = useDeleteArticulo();

  return {
    articulos: articulos || [],
    isLoading,
    error,
    createArticulo: createAsync,
    updateArticulo: updateAsync,
    deleteArticulo: deleteAsync,
  };
};
