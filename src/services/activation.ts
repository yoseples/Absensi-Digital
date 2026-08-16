import { getAppConfig, saveAppConfig, addSystemLog } from './storage';

export interface AppActivationState {
  isActivated: boolean;
  appId: string;
  activationToken: string;
  activatedAt?: string;
  registeredSchool?: string;
  registeredNpsn?: string;
  licenseType: 'Full Version' | 'Demo';
}

export interface RegisteredAppLicense {
  id: string;
  appId: string;
  npsn: string;
  namaSekolah: string;
  token: string;
  registeredAt: string;
  status: 'Aktif' | 'Deactivated' | 'Pending Activation';
  deviceType?: string;
  lastSeen?: string;
  notes?: string;
  domain?: string;
  isNewAutoDetected?: boolean;
}

const ACTIVATION_STORAGE_KEY = 'e_absensi_activation_v1';
const APP_ID_KEY = 'e_absensi_app_id_v1';
const REGISTERED_LICENSES_KEY = 'e_absensi_registered_licenses_v1';
const SECRET_SALT = 'EABSENSI-SECRET-SALT-PRO-2026';

// Initial default registered school devices & licenses for developer management
const DEFAULT_REGISTERED_LICENSES: RegisteredAppLicense[] = [];

// Generates a simple deterministic 16-char hex hash from string
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return p1 + p2;
}

// Format 16 hex chars into EABS-XXXX-XXXX-XXXX-XXXX
function formatToken(hex: string): string {
  const clean = hex.padEnd(16, '0').substring(0, 16);
  return `EABS-${clean.substring(0, 4)}-${clean.substring(4, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}`;
}

/**
 * Check if current runtime environment is the Master Licensing Hub domain (absen.kangyos.com)
 */
export function isMasterLicenseDomain(): boolean {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('absen.kangyos.com') || host.includes('kangyos.com')) {
      return true;
    }
  }
  const config = getAppConfig();
  if (config.active_domain && config.active_domain.toLowerCase().includes('kangyos')) {
    return true;
  }
  return false;
}

/**
 * Get or create unique App Machine/Domain ID for this domain installation
 */
export function getOrCreateAppId(): string {
  const config = getAppConfig();
  const npsn = config.npsn || '10101234';

  let domain = '';
  if (config.active_domain && config.active_domain.trim()) {
    domain = config.active_domain.trim().toLowerCase();
  } else if (typeof window !== 'undefined' && window.location) {
    domain = window.location.hostname.toLowerCase();
  }

  // Clean domain name (strip www and port if present)
  domain = domain.replace(/^www\./, '').split(':')[0] || 'localhost';

  // Deterministic 8-char hex hash from domain name
  const domainHex = simpleHash(`DOMAIN_${domain}`).substring(0, 8).toUpperCase();
  const appId = `APP-${npsn}-${domainHex}`;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(APP_ID_KEY, appId);
  }

  return appId;
}

/**
 * Generate valid activation token for a specific App ID and NPSN
 */
export function generateTokenForAppId(appId: string, npsn?: string): string {
  const configNpsn = npsn || getAppConfig().npsn || '10101234';
  const rawString = `${appId.toUpperCase().trim()}_${configNpsn.trim()}_${SECRET_SALT}`;
  const hex = simpleHash(rawString);
  return formatToken(hex);
}

/**
 * Generate Unlimited Domain License package for any target Domain Name & NPSN
 */
export function generateTokenForTargetDomain(domainInput: string, npsnInput: string = '10101234', namaSekolah: string = 'Sekolah Pemesan') {
  const cleanDomain = domainInput
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0] || 'localhost';

  const cleanNpsn = npsnInput.trim() || '10101234';
  const domainHex = simpleHash(`DOMAIN_${cleanDomain}`).substring(0, 8).toUpperCase();
  const targetAppId = `APP-${cleanNpsn}-${domainHex}`;
  const activationToken = generateTokenForAppId(targetAppId, cleanNpsn);

  const whatsappMessage = 
`*LENSISI RESMI E-ABSENSI (FULL VERSION)*
-----------------------------------
 Domain Target : ${cleanDomain}
 NPSN Sekolah  : ${cleanNpsn}
 Nama Sekolah  : ${namaSekolah}
 ID Aplikasi   : ${targetAppId}
 Key Aktivasi  : ${activationToken}
 Tipe Lisensi  : Unlimited Domain Full Version
-----------------------------------
Petunjuk Penggunaan:
1. Buka aplikasi E-Absensi pada domain *${cleanDomain}*
2. Masuk ke menu *Pengaturan > Aktivasi Lisensi*
3. Tempelkan Key Aktivasi di atas lalu klik *Aktivasikan*

Lisensi ini berlaku untuk seluruh perangkat yang mengakses domain *${cleanDomain}*.`;

  return {
    domain: cleanDomain,
    npsn: cleanNpsn,
    namaSekolah,
    appId: targetAppId,
    activationToken,
    whatsappMessage,
  };
}

/**
 * Get current activation state.
 * Checks both shared AppConfig (synced via MySQL for all users on this domain) and local storage.
 * Auto-activates in Full Master Mode if accessed on absen.kangyos.com
 */
export function getActivationState(): AppActivationState {
  const appId = getOrCreateAppId();
  const config = getAppConfig();

  // If running on Master Licensing domain (absen.kangyos.com), auto activate as Master Hub
  if (isMasterLicenseDomain()) {
    return {
      isActivated: true,
      appId,
      activationToken: generateTokenForAppId(appId, config.npsn),
      activatedAt: 'Teraktivasi Master Hub',
      registeredSchool: 'KangYos Master Licensing Hub (absen.kangyos.com)',
      registeredNpsn: config.npsn || '10101234',
      licenseType: 'Full Version',
    };
  }

  // Check 1: Shared Token in AppConfig (synced via MySQL server across all devices on this domain)
  if (config.activation_token) {
    const expectedToken = generateTokenForAppId(appId, config.npsn);
    if (cleanToken(config.activation_token) === cleanToken(expectedToken)) {
      return {
        isActivated: true,
        appId,
        activationToken: config.activation_token,
        activatedAt: config.activation_date || 'Teraktivasi Domain',
        registeredSchool: config.registered_school || config.nama_sekolah,
        registeredNpsn: config.npsn || '10101234',
        licenseType: 'Full Version',
      };
    }
  }

  // Check 2: Token in local storage
  const raw = localStorage.getItem(ACTIVATION_STORAGE_KEY);
  if (raw) {
    try {
      const state: AppActivationState = JSON.parse(raw);
      state.appId = appId;
      
      if (state.isActivated && state.activationToken) {
        const expectedToken = generateTokenForAppId(appId, config.npsn);
        if (cleanToken(state.activationToken) === cleanToken(expectedToken)) {
          // Sync token to AppConfig so all other devices on this domain also get Full Version
          if (!config.activation_token) {
            saveAppConfig({
              ...config,
              activation_token: expectedToken,
              activation_date: state.activatedAt || new Date().toLocaleString('id-ID'),
              registered_school: state.registeredSchool || config.nama_sekolah,
            });
          }
          return {
            ...state,
            isActivated: true,
            licenseType: 'Full Version',
          };
        }
      }
    } catch {}
  }

  return {
    isActivated: false,
    appId,
    activationToken: '',
    licenseType: 'Demo',
  };
}

function cleanToken(token: string): string {
  return token.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

/**
 * Verify token and activate application if valid
 */
export function activateApplication(tokenInput: string, user: string = 'admin'): { success: boolean; message: string } {
  const appId = getOrCreateAppId();
  const config = getAppConfig();
  const expectedToken = generateTokenForAppId(appId, config.npsn);

  if (!tokenInput || !tokenInput.trim()) {
    return { success: false, message: 'Token aktivasi tidak boleh kosong.' };
  }

  const cleanedInput = cleanToken(tokenInput);
  const cleanedExpected = cleanToken(expectedToken);

  if (cleanedInput !== cleanedExpected) {
    addSystemLog({
      type: 'system',
      action: 'Aktivasi Gagal',
      user,
      role: 'admin',
      details: `Percobaan aktivasi dengan token yang tidak valid: ${tokenInput}`,
      status: 'failed',
    });
    return { 
      success: false, 
      message: 'Token aktivasi tidak valid! Pastikan Token sesuai dengan ID Aplikasi/Domain anda.' 
    };
  }

  const activatedAt = new Date().toLocaleString('id-ID');
  const newState: AppActivationState = {
    isActivated: true,
    appId,
    activationToken: expectedToken,
    activatedAt,
    registeredSchool: config.nama_sekolah,
    registeredNpsn: config.npsn || '10101234',
    licenseType: 'Full Version',
  };

  localStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify(newState));

  // Sync token into AppConfig so MySQL and all devices on this domain get Full Version instantly
  saveAppConfig({
    ...config,
    activation_token: expectedToken,
    activation_date: activatedAt,
    registered_school: config.nama_sekolah,
  });

  addSystemLog({
    type: 'system',
    action: 'Aktivasi Berhasil',
    user,
    role: 'admin',
    details: `Aplikasi berhasil diaktivasi ke Full Version untuk domain ${appId}. Token: ${expectedToken}`,
    status: 'success',
  });

  return { success: true, message: 'Selamat! Aplikasi E-Absensi berhasil diaktivasi ke Versi Penuh (Full Version) untuk seluruh perangkat di domain ini.' };
}

/**
 * Deactivate application back to Demo mode
 */
export function deactivateApplication(user: string = 'developer'): void {
  const appId = getOrCreateAppId();
  const newState: AppActivationState = {
    isActivated: false,
    appId,
    activationToken: '',
    licenseType: 'Demo',
  };
  localStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify(newState));

  const config = getAppConfig();
  saveAppConfig({
    ...config,
    activation_token: '',
    activation_date: '',
    registered_school: '',
  });

  addSystemLog({
    type: 'system',
    action: 'Reset Aktivasi',
    user,
    role: 'developer',
    details: 'Status aktivasi aplikasi dikembalikan ke Mode Demo.',
    status: 'warning',
  });
}

// Limits constants for Demo mode
export const DEMO_LIMITS = {
  MAX_SISWA: 10,
  MAX_GURU: 10,
  EXPORT_RESTRICTED: true,
};

/**
 * Get registered school/app licenses list for Developer
 */
export function getRegisteredLicenses(): RegisteredAppLicense[] {
  const raw = localStorage.getItem(REGISTERED_LICENSES_KEY);
  if (!raw) {
    localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify(DEFAULT_REGISTERED_LICENSES));
    return DEFAULT_REGISTERED_LICENSES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_REGISTERED_LICENSES;
  }
}

/**
 * Save new registered license entry
 */
export function addRegisteredLicense(entry: Omit<RegisteredAppLicense, 'id' | 'registeredAt'>): RegisteredAppLicense {
  const current = getRegisteredLicenses();
  const newEntry: RegisteredAppLicense = {
    ...entry,
    id: `LIC-${Math.floor(1000 + Math.random() * 9000)}`,
    registeredAt: new Date().toLocaleString('id-ID'),
  };
  const updated = [newEntry, ...current];
  localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify(updated));
  return newEntry;
}

/**
 * Delete a registered license
 */
export function deleteRegisteredLicense(id: string): void {
  const current = getRegisteredLicenses();
  const updated = current.filter((item) => item.id !== id);
  localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify(updated));
}

/**
 * Toggle active status of a registered license
 */
export function toggleRegisteredLicenseStatus(id: string): void {
  const current = getRegisteredLicenses();
  const updated = current.map((item) => {
    if (item.id === id) {
      const newStatus: 'Aktif' | 'Deactivated' = item.status === 'Aktif' ? 'Deactivated' : 'Aktif';
      return { ...item, status: newStatus };
    }
    return item;
  });
  localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify(updated));
}

/**
 * Clear all registered device licenses
 */
export function clearAllRegisteredLicenses(): void {
  localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify([]));
}

/**
 * Automatically detects current domain environment and registers it into the telemetry device list
 */
export function autoDetectAndRegisterDomain(): RegisteredAppLicense | null {
  if (typeof window === 'undefined' || !window.location) return null;

  const config = getAppConfig();
  const rawDomain = window.location.hostname.toLowerCase().replace(/^www\./, '').split(':')[0] || 'localhost';
  const appId = getOrCreateAppId();
  const npsn = config.npsn || '10101234';
  const namaSekolah = config.nama_sekolah || 'SMA Negeri 1 Indonesia';
  const nowStr = new Date().toLocaleString('id-ID');

  const ua = navigator.userAgent;
  let deviceSpec = 'Web App Client';
  if (/android/i.test(ua)) deviceSpec = 'Android Mobile App';
  else if (/iphone|ipad/i.test(ua)) deviceSpec = 'iOS Mobile App';
  else if (/windows/i.test(ua)) deviceSpec = 'Windows PC';
  else if (/macintosh/i.test(ua)) deviceSpec = 'macOS Desktop';

  const licenses = getRegisteredLicenses();
  const existingIdx = licenses.findIndex(
    (item) => item.appId === appId || (item.domain && item.domain.toLowerCase() === rawDomain)
  );

  const act = getActivationState();
  const token = generateTokenForAppId(appId, npsn);
  const status: 'Aktif' | 'Pending Activation' = act.isActivated ? 'Aktif' : 'Pending Activation';

  if (existingIdx >= 0) {
    // Update existing telemetry record
    licenses[existingIdx] = {
      ...licenses[existingIdx],
      lastSeen: nowStr,
      deviceType: deviceSpec,
      namaSekolah: namaSekolah || licenses[existingIdx].namaSekolah,
      npsn: npsn || licenses[existingIdx].npsn,
      domain: rawDomain,
      status: act.isActivated ? 'Aktif' : licenses[existingIdx].status,
    };
    localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify(licenses));
    return licenses[existingIdx];
  } else {
    // Register new auto-detected domain
    const newEntry: RegisteredAppLicense = {
      id: `AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
      appId,
      npsn,
      namaSekolah,
      domain: rawDomain,
      token,
      registeredAt: nowStr,
      lastSeen: nowStr,
      status,
      deviceType: deviceSpec,
      isNewAutoDetected: true,
      notes: `Otomatis terdeteksi dari domain ${rawDomain}`,
    };

    const updated = [newEntry, ...licenses];
    localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify(updated));

    addSystemLog({
      type: 'system',
      action: 'Domain Baru Terdeteksi',
      user: 'Auto Detector',
      role: 'developer',
      details: `Aplikasi terdeteksi diakses dari domain baru: ${rawDomain} (NPSN: ${npsn}, ID: ${appId})`,
      status: 'warning',
    });

    return newEntry;
  }
}

/**
 * Mark all auto-detected domain notifications as read
 */
export function markAutoDetectedLicensesAsRead(): void {
  const licenses = getRegisteredLicenses();
  const updated = licenses.map((item) => ({ ...item, isNewAutoDetected: false }));
  localStorage.setItem(REGISTERED_LICENSES_KEY, JSON.stringify(updated));
}


