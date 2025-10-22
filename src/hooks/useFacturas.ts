import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFacturas,
  createFactura,
  updateFactura,
  deleteFactura,
} from '@/services/appwrite-facturas'; // Importamos el servicio
import { CreateFacturaInput, UpdateFacturaInput } from '@/types/factura.types'; // Importamos los tipos

const FACTURAS_QUERY_KEY = 'facturas';

// Hook para OBTENER facturas con filtros opcionales
export const useGetFacturas = (searchQuery?: string, estado?: string) => {
  return useQuery({
    // La queryKey incluye los filtros
    queryKey: [FACTURAS_QUERY_KEY, { searchQuery, estado }],
    queryFn: () => getFacturas(searchQuery, estado), // Pasamos filtros al servicio
    staleTime: 1000 * 60 * 2, // 2 minutos de caché
  });
};

// Hook para CREAR una factura
export const useCreateFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newFactura: CreateFacturaInput) => createFactura(newFactura),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACTURAS_QUERY_KEY] });
    },
  });
};

// Hook para ACTUALIZAR una factura
export const useUpdateFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFacturaInput }) =>
      updateFactura(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FACTURAS_QUERY_KEY] });
    },
  });
};

// Hook para ELIMINAR una factura
export const useDeleteFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFactura(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACTURAS_QUERY_KEY] });
    },
  });
};
