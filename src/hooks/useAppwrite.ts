import { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query, AppwriteException } from 'appwrite';
import { getAppwriteErrorMessage } from '@/lib/appwriteErrors';

export function useAppwriteCollection<T extends { $id: string }>(collectionId: string, storageKey?: string) {
  const [data, setData] = useState<T[]>([]);
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
      const response = await databases.listDocuments(
        DATABASE_ID,
        collectionId,
        currentQueries.length > 0 ? currentQueries : undefined
      );
      setData(response.documents as T[]);
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

  const create = useCallback(async (item: Omit<T, '$id'>, documentId: string = ID.unique()) => {
    const response = await databases.createDocument(DATABASE_ID, collectionId, documentId, item);
    await loadData(queries);
    return response;
  }, [collectionId, loadData, queries]);

  const update = useCallback(async (id: string, item: Partial<Omit<T, '$id'>>) => {
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