import { useState, useEffect } from 'react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query, AppwriteException } from 'appwrite';
import { getAppwriteErrorMessage, isTransientError } from '@/lib/appwriteErrors';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

export function useAppwriteCollection<T>(collectionId: string, initialQueries: Query[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0); // New state for total count
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<string[]>(initialQueries.map(q => q.toString())); // State to manage queries, convert initial queries to strings

  useEffect(() => {
    loadData();
  }, [collectionId, queries.join(',')]); // Rerun when collectionId or queries change, join for dependency array

  // Helper to convert Query objects to strings for initialQueries
  // This is needed because the initialQueries might be Query objects, but the state stores strings.
  // This function is not used directly in the component, but conceptually for the initial state.
  const convertQueriesToStrings = (queryArray: Query[]): string[] => {
    return queryArray.map(q => q.toString());
  };

  const loadData = async () => {
    setLoading(true);
    let allDocuments: T[] = [];
    let currentOffset = 0;
    const limit = 5000; // Max documents per query in Appwrite

    try {
      let hasMore = true;
      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          collectionId,
          [
            ...queries, // Existing queries
            Query.limit(limit).toString(),
            Query.offset(currentOffset).toString()
          ]
        );

        allDocuments = allDocuments.concat(response.documents as T[]);
        setTotal(response.total); // Update total count with the actual total from Appwrite

        if (response.documents.length < limit) {
          hasMore = false;
        } else {
          currentOffset += limit;
        }
      }
      setData(allDocuments);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(getAppwriteErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const applyQueries = (newQueries: string[]) => {
    setQueries(newQueries);
  };

  const create = async (data: Omit<T, '$id'>, documentId: string = ID.unique()) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await databases.createDocument(
          DATABASE_ID,
          collectionId,
          documentId,
          data
        );
        await loadData();
        return response;
      } catch (err) {
        console.error('Error creating document:', err);
        if (isTransientError(err) && i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
          continue;
        }
        setError(getAppwriteErrorMessage(err));
        throw err;
      }
    }
    throw new Error(getAppwriteErrorMessage(new AppwriteException('Unknown error after retries', 500, 'general_unknown')));
  };

  const update = async (id: string, data: Partial<T>) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
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
        console.error('Error updating document:', err);
        if (isTransientError(err) && i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
          continue;
        }
        setError(getAppwriteErrorMessage(err));
        throw err;
      }
    }
    throw new Error(getAppwriteErrorMessage(new AppwriteException('Unknown error after retries', 500, 'general_unknown')));
  };

  const remove = async (id: string) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        await databases.deleteDocument(DATABASE_ID, collectionId, id);
        await loadData();
      } catch (err) {
        console.error('Error removing document:', err);
        if (isTransientError(err) && i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
          continue;
        }
        setError(getAppwriteErrorMessage(err));
        throw err;
      }
    }
    throw new Error(getAppwriteErrorMessage(new AppwriteException('Unknown error after retries', 500, 'general_unknown')));
  };

  return { data, total, loading, error, create, update, remove, reload: loadData, applyQueries };
}
