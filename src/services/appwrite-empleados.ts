import { databases, DATABASE_ID, EMPLEADOS_COLLECTION_ID } from '@/lib/appwrite';
import { Empleado, LipooutUserInput } from '@/types'; // Import LipooutUserInput
import { ID, Query, Models } from 'appwrite'; // Import Models

// Usamos el helper LipooutUserInput
export type CreateEmpleadoInput = LipooutUserInput<Empleado>;
export type UpdateEmpleadoInput = Partial<CreateEmpleadoInput>;

export const getEmpleados = async (soloActivos: boolean = true): Promise<Empleado[]> => {
  const queries = [Query.limit(100)];
  if (soloActivos) {
    queries.push(Query.equal('activo', true));
  }
  const response = await databases.listDocuments<Empleado>(
    DATABASE_ID,
    EMPLEADOS_COLLECTION_ID,
    queries
  );
  return response.documents;
};

export const createEmpleado = (empleado: CreateEmpleadoInput) => {
  // Generar nombre_completo antes de guardar
  const empleadoCompleto = {
    ...empleado,
    nombre_completo: `${empleado.nombre} ${empleado.apellidos}`.trim(),
  };
  return databases.createDocument<Empleado & Models.Document>( // Añadimos Models.Document
    DATABASE_ID,
    EMPLEADOS_COLLECTION_ID,
    ID.unique(),
    empleadoCompleto
  );
};

export const updateEmpleado = (id: string, empleado: UpdateEmpleadoInput) => {
   // Actualizar nombre_completo si nombre o apellidos cambian
   const empleadoCompleto = { ...empleado };
   if (empleado.nombre !== undefined || empleado.apellidos !== undefined) {
       // Asumimos que si se actualiza uno, se pasan ambos o se obtienen previamente
       // Idealmente, se pasaría el nombre completo ya calculado desde el hook/componente
       empleadoCompleto.nombre_completo = `${empleado.nombre || ''} ${empleado.apellidos || ''}`.trim();
       // Si solo se pasa uno, necesitaríamos obtener el valor actual del otro campo
   }

  return databases.updateDocument<Empleado & Models.Document>( // Añadimos Models.Document
    DATABASE_ID,
    EMPLEADOS_COLLECTION_ID,
    id,
    empleadoCompleto
  );
};

export const deleteEmpleado = (id: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    EMPLEADOS_COLLECTION_ID,
    id
  );
};