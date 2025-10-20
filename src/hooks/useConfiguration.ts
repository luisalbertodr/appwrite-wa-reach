import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConfiguracion,
  updateConfiguracion,
  UpdateConfiguracionInput,
} from '@/services/appwrite-configuracion';
import { Configuracion } from '@/types';
import { Models } from 'appwrite';

const CONFIGURACION_QUERY_KEY = 'configuracion';

// Hook para OBTENER la configuración
export const useGetConfiguracion = () => {
  return useQuery<Configuracion & Models.Document>({
    queryKey: [CONFIGURACION_QUERY_KEY],
    queryFn: getConfiguracion,
    staleTime: 1000 * 60 * 60, // Cachear 1 hora
    retry: 1,
  });
};

// Hook para ACTUALIZAR la configuración (genérico)
export const useUpdateConfiguracion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConfiguracionInput }) =>
      updateConfiguracion(id, data),
    onSuccess: (data) => {
      // Actualiza la caché local con los nuevos datos
      queryClient.setQueryData([CONFIGURACION_QUERY_KEY], data);
      // Invalida por si acaso, aunque setQueryData debería ser suficiente
      // queryClient.invalidateQueries({ queryKey: [CONFIGURACION_QUERY_KEY] });
    },
  });
};

// Hook específico para obtener el SIGUIENTE NÚMERO DE DOCUMENTO
// Esto es una mutación porque *actualiza* el contador en la DB
export const useGenerarSiguienteNumero = () => {
    const queryClient = useQueryClient();

    // Usamos la mutación de actualización
    const mutation = useMutation({
        mutationFn: async ({ config, tipo }: { config: Configuracion & Models.Document, tipo: 'factura' | 'presupuesto' }) => {
            
            let nuevoNumero: number;
            let dataToUpdate: UpdateConfiguracionInput;
            let serie: string;
            
            if (tipo === 'factura') {
                nuevoNumero = (config.ultimoNumeroFactura || 0) + 1;
                serie = config.serieFactura || 'FRA';
                dataToUpdate = { ultimoNumeroFactura: nuevoNumero };
            } else { // presupuesto
                nuevoNumero = (config.ultimoNumeroPresupuesto || 0) + 1;
                serie = config.seriePresupuesto || 'PRE';
                dataToUpdate = { ultimoNumeroPresupuesto: nuevoNumero };
            }

            // 1. Actualizar el contador en Appwrite
            const updatedConfig = await updateConfiguracion(config.$id, dataToUpdate);

            // 2. Formatear el número (ej: FRA2025-00001)
            const año = new Date().getFullYear();
            const numeroFormateado = String(nuevoNumero).padStart(5, '0');
            const numeroCompleto = `${serie}${año}-${numeroFormateado}`;

            return { updatedConfig, numeroCompleto };
        },
        onSuccess: ({ updatedConfig }) => {
            // Actualizar la caché de configuración inmediatamente
            queryClient.setQueryData([CONFIGURACION_QUERY_KEY], updatedConfig);
        },
        onError: (error) => {
             console.error("Error al incrementar el contador:", error);
             // Aquí podríamos intentar revertir si algo salió mal
        }
    });

    return mutation;
};