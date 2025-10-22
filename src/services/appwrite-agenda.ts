import { databases, DATABASE_ID, CITAS_COLLECTION_ID } from '@/lib/appwrite';
import { Cita, CitaInput } from '@/types'; // Import CitaInput
import { ID, Query, Models } from 'appwrite'; // Import Models
import { startOfDay, endOfDay } from 'date-fns';

// Usamos el tipo CitaInput directamente
export type CreateCitaInput = CitaInput;
export type UpdateCitaInput = Partial<CitaInput>;

// Obtener citas para un día específico y opcionalmente un empleado
export const getCitasPorDia = async (fecha: Date, empleadoId?: string): Promise<Cita[]> => {
  const inicioDia = startOfDay(fecha).toISOString();
  const finDia = endOfDay(fecha).toISOString();

  const queries = [
    Query.greaterThanEqual('fecha_hora', inicioDia),
    Query.lessThanEqual('fecha_hora', finDia),
    Query.orderAsc('fecha_hora'),
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
  return databases.createDocument(
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    ID.unique(),
    cita
  );
};

// Actualizar una cita existente
export const updateCita = (id: string, cita: UpdateCitaInput) => {
  return databases.updateDocument(
    DATABASE_ID,
    CITAS_COLLECTION_ID,
    id,
    cita
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
