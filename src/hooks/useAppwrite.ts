import { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { ID, Models, Query } from 'appwrite';
import { getAppwriteErrorMessage } from '@/lib/appwriteErrors';

export function useAppwriteCollection<T>(
  collectionId: string,
  storageKey?: string,
  manual: boolean = false,
  postFilter?: (items: (T & Models.Document)[], queries: string[]) => (T & Models.Document)[]
) {
  const [data, setData] = useState<(T & Models.Document)[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<string[]>([]);
  const [hasBeenTriggered, setHasBeenTriggered] = useState(false);

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
      do {
        response = await databases.listDocuments<T & Models.Document>(
          DATABASE_ID,
          collectionId,
          [...currentQueries, Query.limit(100), Query.offset(offset)]
        );
        allDocuments = allDocuments.concat(response.documents);
        offset += response.documents.length;
      } while (offset < response.total);

      // Apply post-filter if provided
      if (postFilter) {
        allDocuments = postFilter(allDocuments, currentQueries);
      }

      setData(allDocuments);
      setTotal(allDocuments.length); // Update total to reflect filtered count
    } catch (err) {
      console.error('Error loading data:', err);
      setError(getAppwriteErrorMessage(err));
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [collectionId, manual, hasBeenTriggered, postFilter]);

  useEffect(() => {
    if (!manual) {
      loadData([]);
    }
  }, [collectionId, loadData, manual]);

  // Load initial data for CampaignsTab to show all clients when no filters applied
  useEffect(() => {
    if (manual && collectionId === 'clients' && !hasBeenTriggered) {
      loadData([]);
    }
  }, [collectionId, manual, hasBeenTriggered, loadData]);

  const applyQueries = useCallback((newQueries: string[]) => {
    setQueries(newQueries);
    setHasBeenTriggered(true);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newQueries));
    }
    loadData(newQueries);
  }, [storageKey, loadData]);

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
