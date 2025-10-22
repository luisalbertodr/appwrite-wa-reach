import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFacturas,
  createFactura,
  updateFactura,
  deleteFactura,
} from '@/services/appwrite-facturas'; // Importamos el servicio
import { CreateFacturaInput, UpdateFacturaInput, Factura } from '@/types'; // Importamos los tipos
import { Models } from 'appwrite'; // Importar Models

const FACTURAS_QUERY_KEY = 'facturas';

// Hook para OBTENER facturas con filtros opcionales y paginación
export const useGetFacturas = (
    searchQuery?: string, 
    estado?: string,
    limit: number = 25,
    offset: number = 0
) => {
  return useQuery<Models.DocumentList<Factura>>({ // --- CORRECCIÓN: Tipo actualizado
    // La queryKey incluye los filtros y paginación
    queryKey: [FACTURAS_QUERY_KEY, { searchQuery, estado, limit, offset }], // --- CORRECCIÓN: Key actualizada
    queryFn: () => getFacturas(searchQuery, estado, limit, offset), // --- CORRECCIÓN: Pasamos filtros al servicio
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