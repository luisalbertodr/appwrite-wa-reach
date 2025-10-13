import { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { ID, Models, Query } from 'appwrite';
import { getAppwriteErrorMessage } from '@/lib/appwriteErrors';

export function useAppwriteCollection<T>(collectionId: string, storageKey?: string, manual: boolean = false) {
  const [data, setData] = useState<(T & Models.Document)[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<string[]>(() => {
    if (storageKey) {
      const savedQueries = localStorage.getItem(storageKey);
      return savedQueries ? JSON.parse(savedQueries) : [];
    }
    return [];
  });
  const [hasBeenTriggered, setHasBeenTriggered] = useState(!manual);

  const loadData = useCallback(async (currentQueries: string[]) => {
    if (manual && !hasBeenTriggered) {
        setData([]);
        setTotal(0);
        setLoading(false);
        return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let allDocuments: (T & Models.Document)[] = [];
      let offset = 0;
      let response;
      // Bucle para obtener todos los documentos paginados que coincidan con la consulta
      do {
        response = await databases.listDocuments<T & Models.Document>(
          DATABASE_ID,
          collectionId,
          [...currentQueries, Query.limit(100), Query.offset(offset)]
        );
        allDocuments = allDocuments.concat(response.documents);
        offset = allDocuments.length;
      } while (allDocuments.length < response.total);

      setData(allDocuments);
      setTotal(response.total);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(getAppwriteErrorMessage(err));
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [collectionId, manual, hasBeenTriggered]);

  useEffect(() => {
    // Solo se ejecuta si hay queries o si no es manual
    if (queries.length > 0 || !manual) {
      loadData(queries);
    }
  }, [loadData, queries, manual]);

  const applyQueries = useCallback((newQueries: string[]) => {
    setHasBeenTriggered(true);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newQueries));
    }
    setQueries(newQueries);
  }, [storageKey]);

  const create = useCallback(async (item: Omit<T, keyof Models.Document>, documentId: string = ID.unique()) => {
    const response = await databases.createDocument(DATABASE_ID, collectionId, documentId, item);
    await loadData(queries);
    return response;
  }, [collectionId, loadData, queries]);

  const update = useCallback(async (id: string, item: Partial<Omit<T, keyof Models.Document>>) => {
    const response = await databases.updateDocument(DATABASE_ID, collectionId, id, item);
    await loadData(queries);
    return response;
  }, [collectionId, loadData, queries]);

  const remove = useCallback(async (id: string) => {
    await databases.deleteDocument(DATABASE_ID, collectionId, id);
    await loadData(queries);
  }, [collectionId, loadData, queries]);

  const reload = useCallback(() => {
    loadData(queries);
  }, [loadData, queries]);

  return { data, total, loading, error, create, update, remove, reload, applyQueries };
}