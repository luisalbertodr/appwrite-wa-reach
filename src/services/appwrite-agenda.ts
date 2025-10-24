import { databases, DATABASE_ID, CITAS_COLLECTION_ID } from '@/lib/appwrite';
import { Cita, CitaInput } from '@/types'; // Import CitaInput
import { ID, Query, Models } from 'appwrite'; // Import Models
import { startOfDay, endOfDay } from 'date-fns';

// Usamos el tipo CitaInput directamente
export type CreateCitaInput = CitaInput;
export type UpdateCitaInput = Partial<CitaInput>;

// Obtener citas para un día específico y opcionalmente un empleado
export const getCitasPorDia = async (fecha: Date, empleadoId?: string): Promise<Cita[]> => {
  const inicioDia = startOfDay(fecha);
  const finDia = endOfDay(fecha);

  // Convertir a formato ISO sin milisegundos y en UTC
  const inicioDiaStr = inicioDia.toISOString().split('.')[0] + 'Z';
  const finDiaStr = finDia.toISOString().split('.')[0] + 'Z';

  const queries = [
    Query.greaterThanEqual('fecha_hora', inicioDiaStr),
    Query.lessThanEqual('fecha_hora', finDiaStr),
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

// Obtener citas para un rango de fechas (útil para vista de calendario)
export const getCitasPorRango = async (
  fechaInicio: Date,
  fechaFin: Date,
  empleadoId?: string
): Promise<Cita[]> => {
  // Convertir a formato ISO sin milisegundos y en UTC
  const fechaInicioStr = fechaInicio.toISOString().split('.')[0] + 'Z';
  const fechaFinStr = fechaFin.toISOString().split('.')[0] + 'Z';

  const queries = [
    Query.greaterThanEqual('fecha_hora', fechaInicioStr),
    Query.lessThanEqual('fecha_hora', fechaFinStr),
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
export const createCita = async (cita: CreateCitaInput) => {
  console.log('=== CREAR CITA - Datos enviados ===');
  console.log('DATABASE_ID:', DATABASE_ID);
  console.log('CITAS_COLLECTION_ID:', CITAS_COLLECTION_ID);
  console.log('Datos de la cita:', JSON.stringify(cita, null, 2));
  console.log('Tipo de cada campo:');
  Object.entries(cita).forEach(([key, value]) => {
    console.log(`  ${key}: ${typeof value} =`, value);
  });
  
  try {
    const result = await databases.createDocument(
      DATABASE_ID,
      CITAS_COLLECTION_ID,
      ID.unique(),
      cita
    );
    console.log('✓ Cita creada exitosamente:', result.$id);
    return result;
  } catch (error: any) {
    console.error('=== ERROR AL CREAR CITA ===');
    console.error('Error completo:', error);
    console.error('Mensaje:', error.message);
    console.error('Code:', error.code);
    console.error('Type:', error.type);
    console.error('Response:', error.response);
    throw error;
  }
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
