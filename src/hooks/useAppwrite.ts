import { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query, AppwriteException, Models } from 'appwrite';
import { getAppwriteErrorMessage } from '@/lib/appwriteErrors';

// CORRECCIÓN: Se eliminó la restricción genérica y se usan los tipos de Appwrite
// para definir con precisión los datos que vienen de la base de datos.
export function useAppwriteCollection<T>(collectionId: string, storageKey?: string) {
  // El estado 'data' ahora espera un array de objetos que son una combinación
  // de tu tipo (T) y el tipo Document de Appwrite, que incluye $id, $createdAt, etc.
  const [data, setData] = useState<(T & Models.Document)[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<string[]>([]);

  const loadData = useCallback(async (currentQueries: string[]) => {
    if (storageKey && currentQueries.length === 0) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Le indicamos a la función qué tipo de documento esperamos
      const response = await databases.listDocuments<T & Models.Document>(
        DATABASE_ID,
        collectionId,
        currentQueries.length > 0 ? currentQueries : undefined
      );
      // El tipado es ahora correcto y no necesita conversiones forzadas
      setData(response.documents);
      setTotal(response.total);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(getAppwriteErrorMessage(err));
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [collectionId, storageKey]);

  useEffect(() => {
    if (storageKey) {
      const savedQueriesJSON = localStorage.getItem(storageKey);
      if (savedQueriesJSON) {
        const savedQueries = JSON.parse(savedQueriesJSON);
        if (savedQueries && savedQueries.length > 0) {
          setQueries(savedQueries);
          loadData(savedQueries);
          return;
        }
      }
      setLoading(false);
    } else {
      loadData([]);
    }
  }, [collectionId, storageKey, loadData]);

  const applyQueries = useCallback((newQueries: string[]) => {
    setQueries(newQueries);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newQueries));
    }
    loadData(newQueries);
  }, [storageKey, loadData]);

  // Al crear, solo enviamos los datos del usuario (T), sin los campos de Appwrite ($id, etc.)
  const create = useCallback(async (item: Omit<T, keyof Models.Document>, documentId: string = ID.unique()) => {
    const response = await databases.createDocument(DATABASE_ID, collectionId, documentId, item);
    await loadData(queries);
    return response;
  }, [collectionId, loadData, queries]);

  // Al actualizar, también enviamos solo los datos del usuario
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