import { databases, DATABASE_ID, CITAS_COLLECTION_ID } from '@/lib/appwrite';
import { Cita } from '@/types';
import { ID, Query } from 'appwrite';
import { formatISO, startOfDay, endOfDay } from 'date-fns';

export type CreateCitaInput = Omit<Cita, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions' | 'cliente' | 'empleado' | 'articulo' | 'duracion_minutos'>;
export type UpdateCitaInput = Partial<CreateCitaInput>;

// Obtener citas para un día específico y opcionalmente un empleado
export const getCitasPorDia = async (fecha: Date, empleadoId?: string): Promise<Cita[]> => {
  const inicioDia = formatISO(startOfDay(fecha));
  const finDia = formatISO(endOfDay(fecha));

  const queries = [
    Query.greaterThanEqual('fecha_hora_inicio', inicioDia),
    Query.lessThanEqual('fecha_hora_inicio', finDia),
    Query.orderAsc('fecha_hora_inicio'),
    Query.limit(500), // Límite alto para un día
  ];

  if (empleadoId) {
    queries.push(Query.equal('empleado_id', empleadoId));
  }

  const response = await databases.listDocuments<Cita>(
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    queries
  );
  return response.documents;
};

// Crear una nueva cita
export const createCita = (cita: CreateCitaInput) => {
  // Calcular duración antes de guardar
  const inicio = new Date(cita.fecha_hora_inicio);
  const fin = new Date(cita.fecha_hora_fin);
  const duracionMs = fin.getTime() - inicio.getTime();
  const duracionMinutos = Math.round(duracionMs / (1000 * 60));

  const citaCompleta = {
    ...cita,
    duracion_minutos: duracionMinutos,
  };

  return databases.createDocument<Cita>(
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    ID.unique(),
    citaCompleta
  );
};

// Actualizar una cita existente
export const updateCita = (id: string, cita: UpdateCitaInput) => {
   const citaCompleta = { ...cita } as Partial<Cita>;
   // Recalcular duración si las fechas cambian
   if (cita.fecha_hora_inicio || cita.fecha_hora_fin) {
       // Similar a Empleado, necesitamos las fechas actuales para calcular bien.
       // El hook se encargará de esto. Por ahora, asumimos que se pasan ambas si cambian.
       if (cita.fecha_hora_inicio && cita.fecha_hora_fin) {
           const inicio = new Date(cita.fecha_hora_inicio);
           const fin = new Date(cita.fecha_hora_fin);
           const duracionMs = fin.getTime() - inicio.getTime();
           citaCompleta.duracion_minutos = Math.round(duracionMs / (1000 * 60));
       }
   }

  return databases.updateDocument<Cita>(
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    id,
    citaCompleta // Enviamos el objeto con la duración potencialmente actualizada
  );
};

// Eliminar una cita
export const deleteCita = (id: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    id
  );
};