import { useState, useEffect } from 'react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';

export function useAppwriteCollection<T>(collectionId: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [collectionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, collectionId);
      setData(response.documents as T[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const create = async (data: Omit<T, '$id'>) => {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        collectionId,
        'unique()',
        data
      );
      await loadData();
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
      throw err;
    }
  };

  const update = async (id: string, data: Partial<T>) => {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        collectionId,
        id,
        data
      );
      await loadData();
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, collectionId, id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      throw err;
    }
  };

  return { data, loading, error, create, update, remove, reload: loadData };
}