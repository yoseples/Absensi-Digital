// Supabase Integration Service for E-Absensi Digital V2.0
// Supports Total Domain Tenant Isolation Method (PostgreSQL & Realtime Client)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAppConfig, AppConfig, DomainTenantConfig } from '../types';
import { getActiveDomainSlug } from './firebase';

const SUPABASE_STORAGE_KEY = 'e_absensi_supabase_config';

export const DEFAULT_SUPABASE_CONFIG: SupabaseAppConfig = {
  enabled: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
  tenantTablePrefix: 'tenant_',
  schema: 'public',
};

let cachedClientMap: Record<string, SupabaseClient> = {};
let activeRealtimeChannels: any[] = [];

export function getSupabaseConfig(domain?: string): SupabaseAppConfig {
  if (typeof window !== 'undefined') {
    try {
      // 1. Check domain tenant custom Supabase config
      const appConfigRaw = localStorage.getItem('e_absensi_config_v1');
      if (appConfigRaw) {
        const appConfig: AppConfig = JSON.parse(appConfigRaw);
        if (appConfig.domain_tenants && Array.isArray(appConfig.domain_tenants)) {
          const targetDomain = domain || window.location.hostname;
          const tenant = appConfig.domain_tenants.find((t: DomainTenantConfig) =>
            t.domain && (t.domain.toLowerCase().trim() === targetDomain.toLowerCase().trim() || targetDomain.toLowerCase().includes(t.domain.toLowerCase().trim()))
          );
          if (tenant && tenant.supabase_config && tenant.supabase_config.supabaseUrl) {
            return { ...DEFAULT_SUPABASE_CONFIG, ...tenant.supabase_config };
          }
        }
      }

      // 2. Global fallback Supabase config
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SUPABASE_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[Supabase Total Isolation] Error reading config from storage:', e);
    }
  }
  return DEFAULT_SUPABASE_CONFIG;
}

export function saveSupabaseConfig(cfg: SupabaseAppConfig, domain?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (domain) {
      const appConfigRaw = localStorage.getItem('e_absensi_config_v1');
      if (appConfigRaw) {
        const appConfig: AppConfig = JSON.parse(appConfigRaw);
        if (appConfig.domain_tenants && Array.isArray(appConfig.domain_tenants)) {
          appConfig.domain_tenants = appConfig.domain_tenants.map((t) => {
            if (t.domain && t.domain.toLowerCase().trim() === domain.toLowerCase().trim()) {
              return { ...t, supabase_config: cfg };
            }
            return t;
          });
          localStorage.setItem('e_absensi_config_v1', JSON.stringify(appConfig));
        }
      }
    }

    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(cfg));
    cachedClientMap = {};
    initSupabase(domain);
  } catch (e) {
    console.error('[Supabase Total Isolation] Error saving config:', e);
  }
}

export function initSupabase(domain?: string): SupabaseClient | null {
  const config = getSupabaseConfig(domain);
  const domainKey = domain || getActiveDomainSlug();

  if (!config.enabled || !config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  try {
    if (!cachedClientMap[domainKey]) {
      cachedClientMap[domainKey] = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
      });
    }
    return cachedClientMap[domainKey];
  } catch (err) {
    console.error(`[Supabase Total Isolation] Initialization error for domain ${domainKey}:`, err);
    return null;
  }
}

export async function checkSupabaseConnection(domain?: string): Promise<{
  success: boolean;
  enabled: boolean;
  message: string;
  domainSlug?: string;
  url?: string;
}> {
  const config = getSupabaseConfig(domain);
  const domainSlug = getActiveDomainSlug(domain);

  if (!config.enabled) {
    return {
      success: false,
      enabled: false,
      message: `Supabase belum diaktifkan untuk domain [${domainSlug}].`,
      domainSlug,
    };
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return {
      success: false,
      enabled: true,
      message: `Supabase URL & Anon Key belum diisi untuk domain [${domainSlug}].`,
      domainSlug,
    };
  }

  try {
    const client = initSupabase(domain);
    if (!client) {
      return {
        success: false,
        enabled: true,
        message: `Gagal membuat Supabase Client untuk domain [${domainSlug}].`,
        domainSlug,
      };
    }

    // Ping test into tenant-isolated system status record
    const { error } = await client
      .from('system_status')
      .upsert(
        {
          id: `status_${domainSlug}`,
          tenant_domain: domainSlug,
          last_ping: new Date().toISOString(),
          status: 'online',
        },
        { onConflict: 'id' }
      );

    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "system_status" does not exist')) {
      return {
        success: false,
        enabled: true,
        message: `Koneksi Supabase Respons: ${error.message} (Domain: ${domainSlug})`,
        domainSlug,
        url: config.supabaseUrl,
      };
    }

    return {
      success: true,
      enabled: true,
      message: `Terhubung - Supabase PostgreSQL (Domain: ${domainSlug}) Online`,
      domainSlug,
      url: config.supabaseUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      enabled: true,
      message: `Error Koneksi Supabase Domain [${domainSlug}]: ${err?.message || 'Gagal terhubung'}`,
      domainSlug,
      url: config.supabaseUrl,
    };
  }
}

// Write document to Total Tenant Isolated Supabase Table
export async function setSupabaseData(
  tableName: string,
  docId: string,
  data: any,
  domain?: string
): Promise<boolean> {
  try {
    const client = initSupabase(domain);
    if (!client) return false;

    const domainSlug = getActiveDomainSlug(domain);
    const targetTable = tableName.toLowerCase();

    // Payload wrapped with tenant_domain for RLS & partition isolation
    const payload = {
      id: docId,
      tenant_domain: domainSlug,
      payload: data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from(targetTable).upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase Total Isolation] Upsert to ${targetTable} error:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[Supabase Total Isolation] Error writing to ${tableName}/${docId}:`, err);
    return false;
  }
}

// Setup Supabase Realtime Listener with Total Tenant Isolation Filter
export function setupSupabaseRealtimeListeners(
  onDataSync: (key: string, data: any) => void,
  domain?: string
): () => void {
  activeRealtimeChannels.forEach((ch) => {
    try {
      ch.unsubscribe();
    } catch {}
  });
  activeRealtimeChannels = [];

  const client = initSupabase(domain);
  if (!client) return () => {};

  const domainSlug = getActiveDomainSlug(domain);
  const tablesToListen = ['siswa', 'guru', 'absensi', 'absensi_guru', 'libur', 'config'];

  tablesToListen.forEach((table) => {
    try {
      const channel = client
        .channel(`tenant_${domainSlug}_${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `tenant_domain=eq.${domainSlug}`,
          },
          (payload) => {
            if (payload.new && (payload.new as any).payload) {
              onDataSync(table, (payload.new as any).payload);
            }
          }
        )
        .subscribe();

      activeRealtimeChannels.push(channel);
    } catch (e) {
      console.warn(`[Supabase Realtime] Failed to subscribe to ${table}:`, e);
    }
  });

  return () => {
    activeRealtimeChannels.forEach((ch) => {
      try {
        ch.unsubscribe();
      } catch {}
    });
    activeRealtimeChannels = [];
  };
}
