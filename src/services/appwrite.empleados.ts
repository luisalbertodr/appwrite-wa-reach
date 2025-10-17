import { databases, DATABASE_ID, EMPLEADOS_COLLECTION_ID } from '@/lib/appwrite';
import { Empleado } from '@/types';
import { ID, Query } from 'appwrite';

export type CreateEmpleadoInput = Omit<Empleado, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>;
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
  return databases.createDocument<Empleado>(
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
       // Necesitamos obtener el registro actual para combinar nombre/apellidos
       // Esto se manejará mejor en el hook con una query previa si es necesario,
       // o se puede pasar el objeto completo al hook.
       // Por simplicidad aquí, asumimos que el hook se encarga o que se pasan ambos campos.
       empleadoCompleto.nombre_completo = `${empleado.nombre || ''} ${empleado.apellidos || ''}`.trim();
   }

  return databases.updateDocument<Empleado>(
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