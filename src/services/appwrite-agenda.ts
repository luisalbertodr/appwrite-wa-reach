import { databases, DATABASE_ID, CITAS_COLLECTION_ID } from '@/lib/appwrite';
import { Cita, LipooutUserInput } from '@/types'; // Import LipooutUserInput
import { ID, Query, Models } from 'appwrite'; // Import Models
import { formatISO, startOfDay, endOfDay } from 'date-fns';

// Usamos el helper y Omitimos campos calculados/anidados
export type CreateCitaInput = Omit<LipooutUserInput<Cita>, 'cliente' | 'empleado' | 'articulo' | 'duracion_minutos'>;
export type UpdateCitaInput = Partial<CreateCitaInput>;

// Obtener citas para un día específico y opcionalmente un empleado
export const getCitasPorDia = async (fecha: Date, empleadoId?: string): Promise<Cita[]> => {
  const inicioDia = formatISO(startOfDay(fecha));
  const finDia = formatISO(endOfDay(fecha));

  const queries = [
    Query.greaterThanEqual('fecha_hora_inicio', inicioDia),
    Query.lessThanEqual('fecha_hora_inicio', finDia),
    Query.orderAsc('fecha_hora_inicio'),
    Query.limit(500),
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

  // Preparamos el objeto a guardar, incluyendo el campo calculado
  const citaToSave: LipooutUserInput<Cita> = {
    ...cita,
    duracion_minutos: duracionMinutos,
  };

  return databases.createDocument<Cita & Models.Document>( // Añadimos Models.Document
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    ID.unique(),
    citaToSave // Enviamos el objeto compatible
  );
};

// Actualizar una cita existente
export const updateCita = (id: string, cita: UpdateCitaInput) => {
   // Preparamos el objeto parcial a actualizar
   const citaToUpdate: Partial<LipooutUserInput<Cita>> = { ...cita };

   // Recalcular duración si las fechas cambian
   if (cita.fecha_hora_inicio || cita.fecha_hora_fin) {
       // Asumimos que el hook/componente envía ambas fechas si una cambia
       if (cita.fecha_hora_inicio && cita.fecha_hora_fin) {
           const inicio = new Date(cita.fecha_hora_inicio);
           const fin = new Date(cita.fecha_hora_fin);
           const duracionMs = fin.getTime() - inicio.getTime();
           citaToUpdate.duracion_minutos = Math.round(duracionMs / (1000 * 60));
       } else {
         // Si solo cambia una fecha, necesitaríamos la otra del objeto original.
         // Esto debería gestionarse en el hook que llama a updateCita.
         console.warn("Actualizando fechas de cita sin ambas presentes, la duración podría ser incorrecta.");
       }
   }

  return databases.updateDocument<Cita & Models.Document>( // Añadimos Models.Document
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    id,
    citaToUpdate // Enviamos el objeto parcial compatible
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