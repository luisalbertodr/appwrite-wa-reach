import { databases, DATABASE_ID, ARTICULOS_COLLECTION_ID, FAMILIAS_COLLECTION_ID } from '@/lib/appwrite';
import { Articulo, Familia } from '@/types';
import { ID, Query } from 'appwrite';

// --- API de Familias ---

export const getFamilias = async (): Promise<Familia[]> => {
  const response = await databases.listDocuments<Familia>(
    DATABASE_ID,
    FAMILIAS_COLLECTION_ID,
    [Query.limit(100)]
  );
  return response.documents;
};

// --- API de Artículos ---

export type CreateArticuloInput = Omit<Articulo, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions' | 'familia'>;
export type UpdateArticuloInput = Partial<CreateArticuloInput>;

export const getArticulos = async (familiaId?: string): Promise<Articulo[]> => {
  const queries = [Query.limit(100)];
  if (familiaId) {
    queries.push(Query.equal('familia_id', familiaId));
  }
  
  const response = await databases.listDocuments<Articulo>(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    queries
  );
  return response.documents;
};

export const createArticulo = (articulo: CreateArticuloInput) => {
  return databases.createDocument<Articulo>(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    ID.unique(),
    articulo
  );
};

export const updateArticulo = (id: string, articulo: UpdateArticuloInput) => {
  return databases.updateDocument<Articulo>(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    id,
    articulo
  );
};

export const deleteArticulo = (id: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    id
  );
};