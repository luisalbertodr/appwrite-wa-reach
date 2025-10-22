import { account } from "@/lib/appwrite";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppwriteException } from "appwrite";
import { useNavigate } from "react-router-dom";

/**
 * Función de fetching para obtener el usuario actual.
 * Será llamada por React Query.
 */
const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch (error) {
    // Si Appwrite lanza un error 401 (no logueado), no lo tratamos como un error
    // de fetching, sino como una ausencia de usuario.
    if (error instanceof AppwriteException && error.code === 401) {
      return null;
    }
    // Otros errores (red, etc.) sí se lanzan para que React Query los capture.
    throw error;
  }
};

/**
 * Hook [useQuery] para obtener el estado del usuario.
 * Esto reemplaza el useEffect/useState en App.tsx.
 * Se alinea con la Tarea #014.
 */
export const useUser = () => {
  return useQuery({
    queryKey: ["user"], // Clave de caché global para el usuario
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutos de staleTime
    retry: (failureCount, error) => {
      // No reintentar en errores 401 (manejados por getCurrentUser)
      if (error instanceof AppwriteException && error.code === 401) {
        return false;
      }
      // Reintentar en otros errores (ej. red) hasta 2 veces
      return failureCount < 2;
    },
  });
};

/**
 * Hook [useMutation] para manejar el Logout.
 * Esto reemplaza el handleLogout en Index.tsx.
 * Se alinea con la Tarea #015.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => account.deleteSession("current"),
    onSuccess: () => {
      // Limpiar la caché del usuario
      queryClient.removeQueries({ queryKey: ["user"] });
      // Redirigir al login
      navigate("/login");
    },
    onError: (error) => {
      // Aunque falle (ej. sesión ya expirada), limpiamos y redirigimos
      console.error("Error al cerrar sesión:", error);
      queryClient.removeQueries({ queryKey: ["user"] });
      navigate("/login");
    },
  });
};