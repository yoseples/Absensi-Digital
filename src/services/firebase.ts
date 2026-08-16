// Firebase Integration Service for E-Absensi Digital V2.0
// Supports Firestore & Realtime Database sync across multi-devices & browsers

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  Firestore,
} from 'firebase/firestore';
import { FirebaseAppConfig } from '../types';

const FIREBASE_STORAGE_KEY = 'e_absensi_firebase_config';

// Default Demo Firebase Config Structure
export const DEFAULT_FIREBASE_CONFIG: FirebaseAppConfig = {
  enabled: false,
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  databaseURL: '',
};

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let unsubscribeListeners: (() => void)[] = [];

export function getFirebaseConfig(): FirebaseAppConfig {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(FIREBASE_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[Firebase] Error reading config from storage:', e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(cfg: FirebaseAppConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(cfg));
    // Reset cached instances on config change
    cachedApp = null;
    cachedDb = null;
    initFirebase();
  } catch (e) {
    console.error('[Firebase] Error saving config:', e);
  }
}

export function initFirebase(): { app: FirebaseApp | null; db: Firestore | null } {
  const config = getFirebaseConfig();

  if (!config.enabled || !config.apiKey || !config.projectId) {
    return { app: null, db: null };
  }

  try {
    if (!cachedApp) {
      if (getApps().length > 0) {
        cachedApp = getApp();
      } else {
        cachedApp = initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
          projectId: config.projectId,
          storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
          databaseURL: config.databaseURL || `https://${config.projectId}-default-rtdb.firebaseio.com`,
        });
      }
    }

    if (!cachedDb && cachedApp) {
      cachedDb = getFirestore(cachedApp);
    }

    return { app: cachedApp, db: cachedDb };
  } catch (err) {
    console.error('[Firebase] Initialization error:', err);
    return { app: null, db: null };
  }
}

export async function checkFirebaseConnection(): Promise<{
  success: boolean;
  enabled: boolean;
  message: string;
  projectId?: string;
}> {
  const config = getFirebaseConfig();
  if (!config.enabled) {
    return {
      success: false,
      enabled: false,
      message: 'Firebase belum diaktifkan di Pengaturan Developer.',
    };
  }

  if (!config.apiKey || !config.projectId) {
    return {
      success: false,
      enabled: true,
      message: 'Kunci API Key & Project ID Firebase belum diisi secara lengkap.',
    };
  }

  try {
    const { db } = initFirebase();
    if (!db) {
      return {
        success: false,
        enabled: true,
        message: 'Gagal menginisialisasi modul Firebase Firestore.',
      };
    }

    // Ping test by reading/writing heartbeats collection
    const pingRef = doc(db, 'system', 'status');
    await setDoc(pingRef, { lastPing: new Date().toISOString(), status: 'online' }, { merge: true });

    return {
      success: true,
      enabled: true,
      message: `Terhubung - Firebase Firestore (Project: ${config.projectId}) Online`,
      projectId: config.projectId,
    };
  } catch (err: any) {
    return {
      success: false,
      enabled: true,
      message: `Error Koneksi Firebase: ${err?.message || 'Gagal terhubung ke server Firebase'}`,
      projectId: config.projectId,
    };
  }
}

// Write document to Firestore collection
export async function setFirebaseData(collectionName: string, docId: string, data: any): Promise<boolean> {
  try {
    const { db } = initFirebase();
    if (!db) return false;

    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error writing to ${collectionName}/${docId}:`, err);
    return false;
  }
}

// Real-time listener for Firestore collection changes across all devices
export function setupFirebaseRealtimeListeners(
  onDataSync: (key: string, data: any) => void
): () => void {
  // Clear previous listeners if any
  unsubscribeListeners.forEach((unsub) => unsub());
  unsubscribeListeners = [];

  const { db } = initFirebase();
  if (!db) return () => {};

  const collectionsToListen = ['siswa', 'guru', 'absensi', 'absensi_guru', 'libur', 'config'];

  collectionsToListen.forEach((colName) => {
    try {
      const unsub = onSnapshot(
        collection(db, colName),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              onDataSync(colName, { id: change.doc.id, ...change.doc.data() });
            }
          });
        },
        (error) => {
          console.warn(`[Firebase] Listener error on collection ${colName}:`, error);
        }
      );
      unsubscribeListeners.push(unsub);
    } catch (e) {
      console.warn(`[Firebase] Failed to attach listener for ${colName}:`, e);
    }
  });

  return () => {
    unsubscribeListeners.forEach((unsub) => unsub());
    unsubscribeListeners = [];
  };
}
