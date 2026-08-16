// Firebase Multi-Tenant Integration Service for E-Absensi Digital V2.0
// Supports Firestore & Realtime Database per Domain / School Tenant

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
import { FirebaseAppConfig, AppConfig, DomainTenantConfig } from '../types';

const FIREBASE_STORAGE_KEY = 'e_absensi_firebase_config';

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

let cachedAppMap: Record<string, FirebaseApp> = {};
let cachedDbMap: Record<string, Firestore> = {};
let unsubscribeListeners: (() => void)[] = [];

// Helper to get active domain slug for isolation
export function getActiveDomainSlug(overrideDomain?: string): string {
  if (typeof window === 'undefined') return 'default';
  
  if (overrideDomain && overrideDomain.trim()) {
    return overrideDomain.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  const testingDomain = localStorage.getItem('e_absensi_testing_domain');
  if (testingDomain && testingDomain.trim()) {
    return testingDomain.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  const hostname = window.location.hostname.toLowerCase().trim();
  const searchParams = new URLSearchParams(window.location.search);
  const paramDomain = (searchParams.get('domain') || searchParams.get('tenant') || '').toLowerCase().trim();
  
  const target = paramDomain || hostname || 'default';
  return target.replace(/[^a-z0-9]/g, '_');
}

export function getFirebaseConfig(domain?: string): FirebaseAppConfig {
  if (typeof window !== 'undefined') {
    try {
      // 1. Check if specific domain tenant config has its own custom Firebase config
      const appConfigRaw = localStorage.getItem('e_absensi_config_v1');
      if (appConfigRaw) {
        const appConfig: AppConfig = JSON.parse(appConfigRaw);
        if (appConfig.domain_tenants && Array.isArray(appConfig.domain_tenants)) {
          const targetDomain = domain || window.location.hostname;
          const tenant = appConfig.domain_tenants.find((t: DomainTenantConfig) => 
            t.domain && (t.domain.toLowerCase().trim() === targetDomain.toLowerCase().trim() || targetDomain.toLowerCase().includes(t.domain.toLowerCase().trim()))
          );
          if (tenant && tenant.firebase_config && tenant.firebase_config.apiKey) {
            return { ...DEFAULT_FIREBASE_CONFIG, ...tenant.firebase_config };
          }
        }
      }

      // 2. Global fallback config
      const stored = localStorage.getItem(FIREBASE_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[Firebase Multi-Tenant] Error reading config from storage:', e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(cfg: FirebaseAppConfig, domain?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (domain) {
      // Save specific to domain tenant
      const appConfigRaw = localStorage.getItem('e_absensi_config_v1');
      if (appConfigRaw) {
        const appConfig: AppConfig = JSON.parse(appConfigRaw);
        if (appConfig.domain_tenants && Array.isArray(appConfig.domain_tenants)) {
          appConfig.domain_tenants = appConfig.domain_tenants.map((t) => {
            if (t.domain && t.domain.toLowerCase().trim() === domain.toLowerCase().trim()) {
              return { ...t, firebase_config: cfg };
            }
            return t;
          });
          localStorage.setItem('e_absensi_config_v1', JSON.stringify(appConfig));
        }
      }
    }

    // Also save as global default config
    localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(cfg));
    cachedAppMap = {};
    cachedDbMap = {};
    initFirebase(domain);
  } catch (e) {
    console.error('[Firebase Multi-Tenant] Error saving config:', e);
  }
}

export function initFirebase(domain?: string): { app: FirebaseApp | null; db: Firestore | null } {
  const config = getFirebaseConfig(domain);
  const domainKey = domain || getActiveDomainSlug();

  if (!config.enabled || !config.apiKey || !config.projectId) {
    return { app: null, db: null };
  }

  try {
    if (!cachedAppMap[domainKey]) {
      const appName = `app_${domainKey}`;
      const existingApps = getApps();
      const found = existingApps.find((a) => a.name === appName);
      
      if (found) {
        cachedAppMap[domainKey] = found;
      } else {
        cachedAppMap[domainKey] = initializeApp(
          {
            apiKey: config.apiKey,
            authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
            projectId: config.projectId,
            storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
            databaseURL: config.databaseURL || `https://${config.projectId}-default-rtdb.firebaseio.com`,
          },
          appName
        );
      }
    }

    if (!cachedDbMap[domainKey] && cachedAppMap[domainKey]) {
      cachedDbMap[domainKey] = getFirestore(cachedAppMap[domainKey]);
    }

    return { app: cachedAppMap[domainKey], db: cachedDbMap[domainKey] };
  } catch (err) {
    console.error(`[Firebase Multi-Tenant] Initialization error for domain ${domainKey}:`, err);
    return { app: null, db: null };
  }
}

export async function checkFirebaseConnection(domain?: string): Promise<{
  success: boolean;
  enabled: boolean;
  message: string;
  projectId?: string;
  domainSlug?: string;
}> {
  const config = getFirebaseConfig(domain);
  const domainSlug = getActiveDomainSlug(domain);

  if (!config.enabled) {
    return {
      success: false,
      enabled: false,
      message: `Firebase belum diaktifkan untuk domain ${domainSlug}.`,
      domainSlug,
    };
  }

  if (!config.apiKey || !config.projectId) {
    return {
      success: false,
      enabled: true,
      message: `API Key & Project ID Firebase belum diisi untuk domain ${domainSlug}.`,
      domainSlug,
    };
  }

  try {
    const { db } = initFirebase(domain);
    if (!db) {
      return {
        success: false,
        enabled: true,
        message: `Gagal menginisialisasi modul Firebase Firestore untuk domain ${domainSlug}.`,
        domainSlug,
      };
    }

    // Ping test into tenant-isolated heartbeat path
    const pingRef = doc(db, 'tenants', domainSlug, 'system', 'status');
    await setDoc(pingRef, { lastPing: new Date().toISOString(), status: 'online', domain: domainSlug }, { merge: true });

    return {
      success: true,
      enabled: true,
      message: `Terhubung - Firestore Domain [${domainSlug}] (Project: ${config.projectId}) Online`,
      projectId: config.projectId,
      domainSlug,
    };
  } catch (err: any) {
    return {
      success: false,
      enabled: true,
      message: `Error Koneksi Firebase Domain [${domainSlug}]: ${err?.message || 'Gagal terhubung'}`,
      projectId: config.projectId,
      domainSlug,
    };
  }
}

// Write document to Domain Tenant isolated Firestore path: tenants/{domain_slug}/{collectionName}/{docId}
export async function setFirebaseData(
  collectionName: string,
  docId: string,
  data: any,
  domain?: string
): Promise<boolean> {
  try {
    const domainSlug = getActiveDomainSlug(domain);
    const { db } = initFirebase(domain);
    if (!db) return false;

    // Multi-Tenant Isolation Path: tenants/{domainSlug}/{collectionName}/{docId}
    const docRef = doc(db, 'tenants', domainSlug, collectionName, docId);
    await setDoc(docRef, { ...data, tenantDomain: domainSlug, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firebase Multi-Tenant] Error writing to tenants/${collectionName}/${docId}:`, err);
    return false;
  }
}

// Real-time listener for Domain Tenant isolated Firestore collection changes
export function setupFirebaseRealtimeListeners(
  onDataSync: (key: string, data: any) => void,
  domain?: string
): () => void {
  unsubscribeListeners.forEach((unsub) => unsub());
  unsubscribeListeners = [];

  const domainSlug = getActiveDomainSlug(domain);
  const { db } = initFirebase(domain);
  if (!db) return () => {};

  const collectionsToListen = ['siswa', 'guru', 'absensi', 'absensi_guru', 'libur', 'config'];

  collectionsToListen.forEach((colName) => {
    try {
      const unsub = onSnapshot(
        collection(db, 'tenants', domainSlug, colName),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              onDataSync(colName, { id: change.doc.id, ...change.doc.data() });
            }
          });
        },
        (error) => {
          console.warn(`[Firebase Multi-Tenant] Listener error on ${domainSlug}/${colName}:`, error);
        }
      );
      unsubscribeListeners.push(unsub);
    } catch (e) {
      console.warn(`[Firebase Multi-Tenant] Failed to attach listener for ${domainSlug}/${colName}:`, e);
    }
  });

  return () => {
    unsubscribeListeners.forEach((unsub) => unsub());
    unsubscribeListeners = [];
  };
}
