import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFacturas,
  createFactura,
  updateFactura,
  deleteFactura,
  CreateFacturaInput,
  UpdateFacturaInput,
} from '@/services/appwrite-facturas'; // Importamos el servicio

const FACTURAS_QUERY_KEY = 'facturas';

// Hook para OBTENER facturas con filtros opcionales
export const useGetFacturas = (clienteId?: string, estado?: string) => {
  return useQuery({
    // La queryKey incluye los filtros para que la caché funcione correctamente
    queryKey: [FACTURAS_QUERY_KEY, { clienteId, estado }],
    queryFn: () => getFacturas(clienteId, estado),
    staleTime: 1000 * 60 * 2, // 2 minutos de caché para la lista de facturas
  });
};

// Hook para CREAR una factura
export const useCreateFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newFactura: CreateFacturaInput) => createFactura(newFactura),
    onSuccess: () => {
      // Invalidar todas las queries de facturas al crear una nueva
      queryClient.invalidateQueries({ queryKey: [FACTURAS_QUERY_KEY] });
    },
    // Podríamos añadir onError para mostrar notificaciones de error
  });
};

// Hook para ACTUALIZAR una factura
export const useUpdateFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFacturaInput }) =>
      updateFactura(id, data),
    onSuccess: (_, variables) => {
      // Invalidar todas las queries de facturas
      queryClient.invalidateQueries({ queryKey: [FACTURAS_QUERY_KEY] });
      // (Opcional) Actualizar la caché de la factura individual si la tenemos
      // queryClient.setQueryData(['factura', variables.id], updatedData);
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

// (Opcional) Hook para obtener una factura individual por ID
// export const useGetFacturaById = (id: string) => { ... }