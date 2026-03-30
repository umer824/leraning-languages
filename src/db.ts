import { openDB, IDBPDatabase } from 'idb';
import { Lesson, UserProfile } from './types';

const DB_NAME = 'linguaquest-db';
const DB_VERSION = 1;

export interface PendingSync {
  id?: number;
  type: 'xp' | 'exercise-result' | 'sync' | 'goal';
  data: any;
  timestamp: string;
}

let dbPromise: Promise<IDBPDatabase>;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('lessons')) {
          db.createObjectStore('lessons', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'uid' });
        }
        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
};

export const saveLessons = async (lessons: Lesson[]) => {
  const db = await getDB();
  const tx = db.transaction('lessons', 'readwrite');
  for (const lesson of lessons) {
    await tx.store.put(lesson);
  }
  await tx.done;
};

export const getCachedLessons = async (): Promise<Lesson[]> => {
  const db = await getDB();
  return db.getAll('lessons');
};

export const saveUserProfile = async (profile: UserProfile) => {
  const db = await getDB();
  await db.put('userProfile', profile);
};

export const getCachedUserProfile = async (uid: string): Promise<UserProfile | undefined> => {
  const db = await getDB();
  return db.get('userProfile', uid);
};

export const addPendingSync = async (sync: PendingSync) => {
  const db = await getDB();
  await db.add('pendingSync', sync);
};

export const getPendingSyncs = async (): Promise<PendingSync[]> => {
  const db = await getDB();
  return db.getAll('pendingSync');
};

export const clearPendingSync = async (id: number) => {
  const db = await getDB();
  await db.delete('pendingSync', id);
};
