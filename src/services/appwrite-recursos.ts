import { databases, DATABASE_ID, RECURSOS_COLLECTION_ID } from '@/lib/appwrite';
import { Recurso, LipooutUserInput } from '@/types';
import { ID, Query, Models } from 'appwrite';

export type CreateRecursoInput = LipooutUserInput<Recurso>;
export type UpdateRecursoInput = Partial<CreateRecursoInput>;

export const getRecursos = async (soloActivos: boolean = true): Promise<(Recurso & Models.Document)[]> => {
  const queries = [Query.limit(100)];
  if (soloActivos) {
    queries.push(Query.equal('activo', true));
  }
  const response = await databases.listDocuments<Recurso & Models.Document>(
    DATABASE_ID,
    RECURSOS_COLLECTION_ID,
    queries
  );
  return response.documents;
};

export const createRecurso = (recursoInput: CreateRecursoInput) => {
  const recursoToSave: any = { ...recursoInput };
  
  // Limpiar campos undefined
  Object.keys(recursoToSave).forEach(key => {
    if (recursoToSave[key] === undefined) {
      delete recursoToSave[key];
    }
  });

  return databases.createDocument<Recurso & Models.Document>(
    DATABASE_ID,
    RECURSOS_COLLECTION_ID,
    ID.unique(),
    recursoToSave
  );
};

export const updateRecurso = (id: string, recursoInput: UpdateRecursoInput) => {
  const recursoToUpdate: any = { ...recursoInput };
  
  // Limpiar campos undefined
  Object.keys(recursoToUpdate).forEach(key => {
    if (recursoToUpdate[key] === undefined) {
      delete recursoToUpdate[key];
    }
  });

  return databases.updateDocument<Recurso & Models.Document>(
    DATABASE_ID,
    RECURSOS_COLLECTION_ID,
    id,
    recursoToUpdate
  );
};

export const deleteRecurso = (id: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    RECURSOS_COLLECTION_ID,
    id
  );
};
