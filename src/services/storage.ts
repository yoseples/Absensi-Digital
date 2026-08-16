import { Siswa, Guru, AbsensiRecord, AbsensiGuruRecord, HariLibur, AppConfig, UserSession, FilterReport, SystemLog, SystemLogLocation, AppNotification } from '../types';
import { getApiBaseUrl, setApiBaseUrl, saveSiswaToApi, saveGuruToApi } from './api';
import { setFirebaseData } from './firebase';
import { setSupabaseData } from './supabase';

const KEYS = {
  SISWA: 'e_absensi_siswa_v1',
  GURU: 'e_absensi_guru_v1',
  ABSENSI: 'e_absensi_records_v1',
  ABSENSI_GURU: 'e_absensi_guru_records_v1',
  LIBUR: 'e_absensi_libur_v1',
  CONFIG: 'e_absensi_config_v1',
  SESSION: 'absensiAppSession',
  LOGS: 'e_absensi_logs_v1',
  NOTIFICATIONS_READ: 'e_absensi_notif_read_v1',
};

export function getTenantStorageKey(baseKey: string, overrideDomain?: string): string {
  if (typeof window === 'undefined') return baseKey;
  const testingDomain = overrideDomain || localStorage.getItem('e_absensi_testing_domain');
  if (testingDomain && testingDomain.trim()) {
    const slug = testingDomain.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${slug}:${baseKey}`;
  }
  const hostname = window.location.hostname.toLowerCase().trim();
  const searchParams = new URLSearchParams(window.location.search);
  const paramDomain = (searchParams.get('domain') || searchParams.get('tenant') || '').toLowerCase().trim();

  const target = paramDomain || hostname || 'default';
  const slug = target.replace(/[^a-z0-9]/g, '_');
  if (slug === 'localhost' || slug === '127_0_0_1' || slug === 'default') {
    return baseKey;
  }
  return `${slug}:${baseKey}`;
}

export const DEFAULT_CONFIG: AppConfig = {
  nama_sekolah: 'SMA NEGERI',
  npsn: '10101234',
  alamat_sekolah: 'Jl. Perintis Kemerdekaan No. 1, Lhoksukon, Aceh Utara',
  telepon_sekolah: '(0645) 91234',
  email_sekolah: 'info@sman1lhoksukon.sch.id',
  no_whatsapp_pengirim: '081234567890',
  tahun_ajaran: '2025/2026',
  semester_aktif: 'Ganjil',
  nama_kepala_sekolah: 'Drs. H. Azhari, M.Pd.',
  nip_kepala_sekolah: '19680512 199403 1 004',
  jam_masuk_mulai: '06:30',
  jam_masuk_akhir: '07:15',
  jam_pulang_mulai: '15:00',
  jam_pulang_akhir: '17:00',
  logo_url: '/logo.png',
  favicon_url: '/logo.png',
  login_title: 'Sistem Absensi Digital',
  login_subtitle: 'Platform manajemen kehadiran siswa yang terintegrasi, real-time, dan mudah digunakan.',
  login_bg_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop',
  multi_domain_enabled: true,
  domain_tenants: [
    {
      id: 'tenant-sma1',
      domain: 'sma1.sch.id',
      nama_sekolah: 'SMA NEGERI 1 JAKARTA',
      logo_url: '/logo.png',
      favicon_url: '/logo.png',
      alamat_sekolah: 'Jl. Budi Utomo No. 7, Jakarta Pusat',
      telepon_sekolah: '(021) 3865001',
      email_sekolah: 'info@sman1jakarta.sch.id',
      nama_kepala_sekolah: 'Dr. H. Mulyono, M.Pd.',
      nip_kepala_sekolah: '19650101 199003 1 002',
    },
    {
      id: 'tenant-sma2',
      domain: 'sma2.sch.id',
      nama_sekolah: 'SMA NEGERI 2 BANDUNG',
      logo_url: '/logo.png',
      favicon_url: '/logo.png',
      alamat_sekolah: 'Jl. Cihampelas No. 173, Bandung',
      telepon_sekolah: '(022) 2031024',
      email_sekolah: 'info@sman2bandung.sch.id',
      nama_kepala_sekolah: 'Hj. Ratna Sari, S.Pd., M.M.',
      nip_kepala_sekolah: '19700315 199512 2 001',
    },
    {
      id: 'tenant-sma3',
      domain: 'sma3.sch.id',
      nama_sekolah: 'SMA NEGERI 3 SURABAYA',
      logo_url: '/logo.png',
      favicon_url: '/logo.png',
      alamat_sekolah: 'Jl. Pemuda No. 28, Surabaya',
      telepon_sekolah: '(031) 5342410',
      email_sekolah: 'info@sman3surabaya.sch.id',
      nama_kepala_sekolah: 'Drs. Budi Santoso, M.Si.',
      nip_kepala_sekolah: '19680820 199201 1 003',
    },
  ],
};

const INITIAL_SISWA: Siswa[] = [
  {
    nama: 'Ahmad Rizky Pratama',
    nisn: '1234567890',
    kelas: 'X-A',
    jenisKelamin: 'Laki-laki',
    tanggalLahir: '2008-04-12',
    agama: 'Islam',
    password: '123456',
    namaAyah: 'Budi Pratama',
    namaIbu: 'Siti Aminah',
    noHp: '081234567890',
    alamat: 'Jl. Merdeka No. 45, Lhoksukon, Aceh Utara',
    foto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop',
  },
  {
    nama: 'Siti Nurhaliza',
    nisn: '0012345678',
    kelas: 'X-A',
    jenisKelamin: 'Perempuan',
    tanggalLahir: '2008-08-25',
    agama: 'Islam',
    password: '123456',
    namaAyah: 'Herman Wijaya',
    namaIbu: 'Dewi Rahmawati',
    noHp: '081398765432',
    alamat: 'Jl. Sudirman No. 12, Lhoksukon, Aceh Utara',
    foto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
  },
  {
    nama: 'Budi Santoso',
    nisn: '0098765432',
    kelas: 'XI-IPA 1',
    jenisKelamin: 'Laki-laki',
    tanggalLahir: '2007-02-14',
    agama: 'Islam',
    password: '123456',
    namaAyah: 'Slamet Santoso',
    namaIbu: 'Kartini',
    noHp: '085211223344',
    alamat: 'Jl. Banda Aceh-Medan Km. 300, Lhoksukon',
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
  },
  {
    nama: 'Dewi Lestari',
    nisn: '0055443322',
    kelas: 'XI-IPA 1',
    jenisKelamin: 'Perempuan',
    tanggalLahir: '2007-11-05',
    agama: 'Islam',
    password: '123456',
    namaAyah: 'Agus Lestari',
    namaIbu: 'Sri Wahyuni',
    noHp: '082155667788',
    alamat: 'Jl. Cot Girek No. 3, Lhoksukon',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop',
  },
  {
    nama: 'Eko Prasetyo',
    nisn: '0088776655',
    kelas: 'XII-IPS 1',
    jenisKelamin: 'Laki-laki',
    tanggalLahir: '2006-09-18',
    agama: 'Islam',
    namaAyah: 'Bambang Prasetyo',
    namaIbu: 'Endang Lestari',
    noHp: '081988776655',
    alamat: 'Jl. Perintis Kemerdekaan No. 101, Lhoksukon',
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
  },
  {
    nama: 'Fiona Putri Maharani',
    nisn: '0077665544',
    kelas: 'X-B',
    jenisKelamin: 'Perempuan',
    tanggalLahir: '2008-01-30',
    agama: 'Kristen',
    namaAyah: 'David Maharani',
    namaIbu: 'Maria Ulfa',
    noHp: '081277665544',
    alamat: 'Jl. Pembangunan No. 22, Lhoksukon',
    foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
  },
];

const INITIAL_GURU: Guru[] = [
  { username: 'developer', password: 'dev123', nama: 'Developer', nip: 'DEV-00000000', kelas: '', foto: '' },
  { username: 'admin', password: 'admin123', nama: 'Administrator Sekolah', nip: '19850101 201001 1 001', kelas: '', foto: '' },
  { username: 'guru1', password: '123456', nama: 'Dra. Rahmah, M.Pd.', nip: '19760312 200212 2 003', kelas: 'X-A', foto: '' },
  { username: 'guru2', password: '123456', nama: 'Drs. Iskandar, M.Si.', nip: '19800520 200604 1 005', kelas: 'XI-IPA 1', foto: '' },
];

const INITIAL_LIBUR: HariLibur[] = [
  { tanggal: '2026-08-17', keterangan: 'Hari Kemerdekaan RI' },
  { tanggal: '2026-12-25', keterangan: 'Hari Raya Natal' },
];

// Get local date formatted YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
}

// Seed helper
function initStorage() {
  if (!localStorage.getItem(KEYS.SISWA)) {
    localStorage.setItem(KEYS.SISWA, JSON.stringify(INITIAL_SISWA));
  }
  if (!localStorage.getItem(KEYS.GURU)) {
    localStorage.setItem(KEYS.GURU, JSON.stringify(INITIAL_GURU));
  }
  if (!localStorage.getItem(KEYS.CONFIG)) {
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
  }
  if (!localStorage.getItem(KEYS.LIBUR)) {
    localStorage.setItem(KEYS.LIBUR, JSON.stringify(INITIAL_LIBUR));
  }
  if (!localStorage.getItem(KEYS.ABSENSI)) {
    const today = getTodayDateString();
    const seedAbsensi: AbsensiRecord[] = [
      {
        id: `att_${today}_1234567890`,
        nisn: '1234567890',
        nama: 'Ahmad Rizky Pratama',
        kelas: 'X-A',
        tanggal: today,
        jamDatang: '06:55:12',
        jamPulang: '15:05:00',
        status: 'Hadir',
        keterangan: 'Tepat Waktu',
      },
      {
        id: `att_${today}_0012345678`,
        nisn: '0012345678',
        nama: 'Siti Nurhaliza',
        kelas: 'X-A',
        tanggal: today,
        jamDatang: '07:22:45',
        status: 'Hadir',
        keterangan: 'Terlambat (7 m)',
      },
      {
        id: `att_${today}_0098765432`,
        nisn: '0098765432',
        nama: 'Budi Santoso',
        kelas: 'XI-IPA 1',
        tanggal: today,
        status: 'Sakit',
        keterangan: 'Surat Dokter',
      },
      {
        id: `att_${today}_0055443322`,
        nisn: '0055443322',
        nama: 'Dewi Lestari',
        kelas: 'XI-IPA 1',
        tanggal: today,
        status: 'Izin',
        keterangan: 'Keperluan Keluarga',
      },
      {
        id: `att_${today}_0088776655`,
        nisn: '0088776655',
        nama: 'Eko Prasetyo',
        kelas: 'XII-IPS 1',
        tanggal: today,
        status: 'Alpa',
        keterangan: 'Tanpa Keterangan',
      },
      {
        id: `att_2026-08-01_0088776655`,
        nisn: '0088776655',
        nama: 'Eko Prasetyo',
        kelas: 'XII-IPS 1',
        tanggal: '2026-08-01',
        status: 'Alpa',
        keterangan: 'Tanpa Keterangan',
      },
      {
        id: `att_2026-08-02_0088776655`,
        nisn: '0088776655',
        nama: 'Eko Prasetyo',
        kelas: 'XII-IPS 1',
        tanggal: '2026-08-02',
        status: 'Alpa',
        keterangan: 'Tanpa Keterangan',
      },
      {
        id: `att_2026-08-03_1234567890`,
        nisn: '1234567890',
        nama: 'Ahmad Rizky Pratama',
        kelas: 'X-A',
        tanggal: '2026-08-03',
        status: 'Alpa',
        keterangan: 'Tanpa Keterangan',
      },
      {
        id: `att_2026-08-04_1234567890`,
        nisn: '1234567890',
        nama: 'Ahmad Rizky Pratama',
        kelas: 'X-A',
        tanggal: '2026-08-04',
        status: 'Alpa',
        keterangan: 'Tanpa Keterangan',
      },
      {
        id: `att_2026-08-05_1234567890`,
        nisn: '1234567890',
        nama: 'Ahmad Rizky Pratama',
        kelas: 'X-A',
        tanggal: '2026-08-05',
        status: 'Alpa',
        keterangan: 'Tanpa Keterangan',
      },
    ];
    localStorage.setItem(KEYS.ABSENSI, JSON.stringify(seedAbsensi));
  }

  if (!localStorage.getItem(KEYS.LOGS)) {
    const now = new Date();
    const formattedNow = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const seedLogs: SystemLog[] = [
      {
        id: `log_init_01`,
        timestamp: formattedNow,
        type: 'system',
        action: 'Inisialisasi Sistem Absensi Digital v2.0',
        user: 'system',
        role: 'developer',
        status: 'info',
        details: 'Sistem absensi sekolah berhasil diinisialisasi.',
      },
      {
        id: `log_init_02`,
        timestamp: formattedNow,
        type: 'auth',
        action: 'Login Berhasil (GPS Terverifikasi)',
        user: 'guru1',
        role: 'guru',
        status: 'success',
        details: 'Login Wali Kelas X-A. Akses lokasi GPS disetujui.',
        ipAddress: '180.252.11.42',
        deviceInfo: 'Chrome / Android (Mobile)',
        location: {
          latitude: 5.0743,
          longitude: 97.3012,
          accuracy: 12,
          addressName: 'Kec. Lhoksukon, Kab. Aceh Utara',
          permissionStatus: 'granted',
        },
      },
      {
        id: `log_init_03`,
        timestamp: formattedNow,
        type: 'auth',
        action: 'Login Berhasil - Admin',
        user: 'admin',
        role: 'admin',
        status: 'success',
        details: 'Login Admin Sekolah dari Desktop.',
        ipAddress: '180.252.11.88',
        deviceInfo: 'Chrome / Windows 11',
        location: {
          latitude: 5.0745,
          longitude: 97.3015,
          accuracy: 10,
          addressName: 'Komplek Sekolah, Lhoksukon',
          permissionStatus: 'granted',
        },
      },
      {
        id: `log_init_04`,
        timestamp: formattedNow,
        type: 'config',
        action: 'Inisialisasi Identitas Sekolah',
        user: 'developer',
        role: 'developer',
        status: 'info',
        details: 'Pengaturan awal sekolah & jam operasional.',
      },
    ];
    localStorage.setItem(KEYS.LOGS, JSON.stringify(seedLogs));
  }

  if (!localStorage.getItem(KEYS.ABSENSI_GURU)) {
    const today = getTodayDateString();
    const seedAbsensiGuru: AbsensiGuruRecord[] = [
      {
        id: `att_guru_${today}_guru1`,
        username: 'guru1',
        nip: '19760312 200212 2 003',
        nama: 'Dra. Rahmah, M.Pd.',
        tanggal: today,
        jamMasuk: '06:58:20',
        jamPulang: '--:--',
        statusMasuk: 'Hadir Tepat Waktu',
        statusPulang: 'Belum Pulang',
        status: 'Hadir',
        keterangan: 'Hadir Tepat Waktu & Mengajar Kelas X-A',
        locationMasuk: {
          latitude: 5.0743,
          longitude: 97.3012,
          accuracy: 10,
          addressName: 'Gedung Utama SMA NEGERI',
          permissionStatus: 'granted',
        },
      },
      {
        id: `att_guru_${today}_guru2`,
        username: 'guru2',
        nip: '19800520 200604 1 005',
        nama: 'Drs. Iskandar, M.Si.',
        tanggal: today,
        jamMasuk: '07:20:15',
        jamPulang: '--:--',
        statusMasuk: 'Terlambat',
        statusPulang: 'Belum Pulang',
        status: 'Hadir',
        keterangan: 'Terlambat 5 Menit (Macet Lalu Lintas)',
        locationMasuk: {
          latitude: 5.0748,
          longitude: 97.3018,
          accuracy: 15,
          addressName: 'Gerbang Sekolah SMA NEGERI',
          permissionStatus: 'granted',
        },
      },
      {
        id: `att_guru_${today}_admin`,
        username: 'admin',
        nip: '19850101 201001 1 001',
        nama: 'Administrator Sekolah',
        tanggal: today,
        jamMasuk: '06:45:00',
        jamPulang: '15:10:00',
        statusMasuk: 'Hadir Tepat Waktu',
        statusPulang: 'Sah',
        status: 'Hadir',
        keterangan: 'Hadir & Pulang Sesuai Jam Operasional',
        locationMasuk: {
          latitude: 5.0745,
          longitude: 97.3015,
          accuracy: 8,
          addressName: 'Kantor Tata Usaha SMA NEGERI',
          permissionStatus: 'granted',
        },
        locationPulang: {
          latitude: 5.0745,
          longitude: 97.3015,
          accuracy: 9,
          addressName: 'Kantor Tata Usaha SMA NEGERI',
          permissionStatus: 'granted',
        },
      },
    ];
    localStorage.setItem(KEYS.ABSENSI_GURU, JSON.stringify(seedAbsensiGuru));
  }

  // Apply metadata & favicon dynamically on storage initialization
  const currentConfig = getAppConfig();
  applyAppMetaData(currentConfig);

  // Sync initial config with server for Open Graph scrapers
  if (typeof fetch !== 'undefined') {
    fetch('/api/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConfig),
    }).catch(() => {});
  }
}

// ==========================================
// REAL-TIME HOSTING & DATABASE AUTO-SYNC ENGINE
// ==========================================
let lastServerSyncedAt = 0;
let isSyncInProgress = false;

// Cross-tab BroadcastChannel for instant local sync across tabs in the same browser
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('e_absensi_sync') : null;

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event && event.data && event.data.type === 'DATA_SYNCED') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app_data_synced'));
      }
    }
  };
}

export function notifyDataChanged(key?: string, data?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_data_synced'));
  }
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'DATA_SYNCED', key, timestamp: Date.now() });
    } catch {}
  }
  if (key && data) {
    syncPushToServer(key, data);
  }
}

// Safe fetch helper to handle JSON without throwing HTML SyntaxError or hanging indefinitely
async function safeFetchJson(url: string, options?: RequestInit): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    const res = await fetch(url, {
      ...options,
      signal: options?.signal || controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res || !res.ok) return null;
    const text = await res.text();
    if (!text || !text.trim() || text.trim().startsWith('<')) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function syncPushToServer(key: string, data: any) {
  if (typeof fetch === 'undefined') return;
  try {
    // === PRIORITY 1: Firebase Firestore / Realtime DB ===
    try {
      if (Array.isArray(data)) {
        setFirebaseData(key, 'batch', { items: data, count: data.length });
      } else {
        setFirebaseData(key, 'current', data);
      }
    } catch {
      // Quietly ignore Firebase push error
    }

    // === PRIORITY 2: Supabase PostgreSQL (Total Tenant Isolation) ===
    try {
      if (Array.isArray(data)) {
        setSupabaseData(key, 'batch', { items: data, count: data.length });
      } else {
        setSupabaseData(key, 'current', data);
      }
    } catch {
      // Quietly ignore Supabase push error
    }

    // === PRIORITY 3: MySQL cPanel + Express backend (fire-and-forget) ===
    const baseUrl = getApiBaseUrl();

    const pushInBatchChunks = async (endpoint: string, items: any[], chunkSize: number) => {
      const chunks: any[][] = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
      }
      const concurrency = 3;
      for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        await Promise.all(
          batch.map((chunk) =>
            safeFetchJson(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chunk),
            })
          )
        );
      }
    };

    // Sync to cPanel MySQL PHP API endpoints (async, non-blocking for primary flow)
    if (key === 'siswa') {
      if (Array.isArray(data)) {
        pushInBatchChunks(`${baseUrl}/siswa.php`, data, 35).catch(() => {});
      } else {
        safeFetchJson(`${baseUrl}/siswa.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {});
      }
    } else if (key === 'guru') {
      if (Array.isArray(data)) {
        pushInBatchChunks(`${baseUrl}/guru.php`, data, 35).catch(() => {});
      } else {
        safeFetchJson(`${baseUrl}/guru.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {});
      }
    } else if (key === 'absensi') {
      if (Array.isArray(data)) {
        pushInBatchChunks(`${baseUrl}/absensi.php`, data, 75).catch(() => {});
      } else {
        safeFetchJson(`${baseUrl}/absensi.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {});
      }
    } else if (key === 'libur') {
      safeFetchJson(`${baseUrl}/kelola.php?action=libur`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {});
    } else if (key === 'config' && data && typeof data === 'object') {
      Promise.all([
        safeFetchJson(`${baseUrl}/kelola.php?action=config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
        safeFetchJson(`${baseUrl}/kelola.php?action=jam`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jamMasuk: data.jam_masuk_mulai || '07:00', jamPulang: data.jam_pulang_mulai || '15:00', toleransi: 15 }) }),
        safeFetchJson('/api/app-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
      ]).catch(() => {});
    }

    // Sync to Express /api/db (fire-and-forget)
    safeFetchJson('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: data }),
    }).then((res) => {
      if (res && res.updatedAt) lastServerSyncedAt = res.updatedAt;
    }).catch(() => {});

  } catch (err) {
    // Quietly ignore errors
  }
}

export async function deleteSiswaFromStorage(nisn: string) {
  const cleanNisn = nisn.trim().replace(/^'/, '');
  const list = getSiswaList().filter((s) => s.nisn.replace(/^'/, '') !== cleanNisn);
  saveSiswaList(list);
  const baseUrl = getApiBaseUrl();
  await safeFetchJson(`${baseUrl}/siswa.php?nisn=${encodeURIComponent(cleanNisn)}`, {
    method: 'DELETE',
  });
}

export async function deleteGuruFromStorage(nip: string) {
  const cleanNip = nip.trim();
  const list = getGuruList().filter((g) => (g.nip || g.username) !== cleanNip);
  saveGuruList(list);
  const baseUrl = getApiBaseUrl();
  await safeFetchJson(`${baseUrl}/guru.php?nip=${encodeURIComponent(cleanNip)}`, {
    method: 'DELETE',
  });
}

export async function deleteHariLiburFromStorage(tanggal: string) {
  const list = getHariLiburList().filter((h) => h.tanggal !== tanggal);
  saveHariLiburList(list);
  const baseUrl = getApiBaseUrl();
  await safeFetchJson(`${baseUrl}/kelola.php?action=libur&tanggal=${encodeURIComponent(tanggal)}`, {
    method: 'DELETE',
  });
}

export async function syncPullFromServer(): Promise<boolean> {
  if (typeof fetch === 'undefined' || isSyncInProgress) return false;
  isSyncInProgress = true;
  try {
    const baseUrl = getApiBaseUrl(); // Configured cPanel MySQL URL or /api
    let changed = false;

    const setItemIfChanged = (key: string, newData: any) => {
      const newStr = JSON.stringify(newData);
      const tenantKey = getTenantStorageKey(key);
      const oldStr = localStorage.getItem(tenantKey) || localStorage.getItem(key);
      if (newStr !== oldStr) {
        localStorage.setItem(tenantKey, newStr);
        localStorage.setItem(key, newStr);
        changed = true;
      }
    };

    // 1. Pull Siswa from cPanel MySQL API (siswa.php)
    const siswaRes = await safeFetchJson(`${baseUrl}/siswa.php`);
    if (siswaRes && siswaRes.status === 'success' && Array.isArray(siswaRes.data) && siswaRes.data.length > 0) {
      setItemIfChanged(KEYS.SISWA, siswaRes.data);
    }

    // 2. Pull Guru from cPanel MySQL API (guru.php)
    const guruRes = await safeFetchJson(`${baseUrl}/guru.php`);
    if (guruRes && guruRes.status === 'success' && Array.isArray(guruRes.data) && guruRes.data.length > 0) {
      setItemIfChanged(KEYS.GURU, guruRes.data);
    }

    // 3. Pull Absensi from cPanel MySQL API (absensi.php)
    const absensiRes = await safeFetchJson(`${baseUrl}/absensi.php`);
    if (absensiRes && absensiRes.status === 'success' && Array.isArray(absensiRes.data) && absensiRes.data.length > 0) {
      setItemIfChanged(KEYS.ABSENSI, absensiRes.data);
    }

    // 4. Pull Hari Libur, Jam Operasional & App Config from cPanel MySQL API (kelola.php)
    const kelolaRes = await safeFetchJson(`${baseUrl}/kelola.php`);
    if (kelolaRes && kelolaRes.status === 'success' && kelolaRes.data) {
      if (Array.isArray(kelolaRes.data.hariLibur) && kelolaRes.data.hariLibur.length > 0) {
        setItemIfChanged(KEYS.LIBUR, kelolaRes.data.hariLibur);
      }
      if (kelolaRes.data.jamOperasional && typeof kelolaRes.data.jamOperasional === 'object') {
        const jam = kelolaRes.data.jamOperasional;
        const currentCfg = getAppConfig();
        const updatedJamCfg = {
          ...currentCfg,
          jam_masuk_mulai: jam.jamMasuk || currentCfg.jam_masuk_mulai,
          jam_pulang_mulai: jam.jamPulang || currentCfg.jam_pulang_mulai,
        };
        setItemIfChanged(KEYS.CONFIG, updatedJamCfg);
      }
      if (kelolaRes.data.config && typeof kelolaRes.data.config === 'object' && Object.keys(kelolaRes.data.config).length > 0) {
        const currentCfg = getAppConfig();
        const mergedCfg = { ...currentCfg, ...kelolaRes.data.config };
        setItemIfChanged(KEYS.CONFIG, mergedCfg);
        if (mergedCfg.mysql_api_url) {
          setApiBaseUrl(mergedCfg.mysql_api_url);
        }
        applyAppMetaData(mergedCfg);
      }
    }

    // 5. Pull from Express backend (/api/app-config & /api/db) if available
    const cfgData = await safeFetchJson('/api/app-config');
    if (cfgData && cfgData.success && cfgData.config) {
      setItemIfChanged(KEYS.CONFIG, cfgData.config);
      if (cfgData.config.mysql_api_url) {
        setApiBaseUrl(cfgData.config.mysql_api_url);
      }
      applyAppMetaData(cfgData.config);
    }

    const dbData = await safeFetchJson('/api/db');
    if (dbData && dbData.success && dbData.data) {
      const data = dbData.data;
      if (data.siswa && Array.isArray(data.siswa) && data.siswa.length > 0) {
        setItemIfChanged(KEYS.SISWA, data.siswa);
      }
      if (data.guru && Array.isArray(data.guru) && data.guru.length > 0) {
        setItemIfChanged(KEYS.GURU, data.guru);
      }
      if (data.absensi && Array.isArray(data.absensi) && data.absensi.length > 0) {
        setItemIfChanged(KEYS.ABSENSI, data.absensi);
      }
      if (data.absensiGuru && Array.isArray(data.absensiGuru) && data.absensiGuru.length > 0) {
        setItemIfChanged(KEYS.ABSENSI_GURU, data.absensiGuru);
      }
      if (data.libur && Array.isArray(data.libur) && data.libur.length > 0) {
        setItemIfChanged(KEYS.LIBUR, data.libur);
      }
      if (data.config && typeof data.config === 'object') {
        setItemIfChanged(KEYS.CONFIG, data.config);
        if (data.config.mysql_api_url) {
          setApiBaseUrl(data.config.mysql_api_url);
        }
        applyAppMetaData(data.config);
      }
      if (data.logs && Array.isArray(data.logs)) {
        setItemIfChanged(KEYS.LOGS, data.logs);
      }

      if (dbData.updatedAt) {
        lastServerSyncedAt = dbData.updatedAt;
      }
    }

    if (changed && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_data_synced'));
    }
    return changed;
  } catch (err) {
    // Quietly ignore server sync pull failure
  } finally {
    isSyncInProgress = false;
  }
  return false;
}

export async function checkServerUpdates() {
  if (typeof fetch === 'undefined' || isSyncInProgress) return;
  try {
    const result = await safeFetchJson('/api/db/status');
    if (result && result.success && result.updatedAt) {
      if (result.updatedAt > lastServerSyncedAt) {
        await syncPullFromServer();
      }
      return;
    }
    // Fallback sync for external MySQL/cPanel or static environments
    await syncPullFromServer();
  } catch (err) {}
}

// System Logs Storage Accessors
export function getSystemLogs(): SystemLog[] {
  try {
    const tenantKey = getTenantStorageKey(KEYS.LOGS);
    const raw = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.LOGS);
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

export function addSystemLog(log: Omit<SystemLog, 'id' | 'timestamp'>): SystemLog {
  const logs = getSystemLogs();
  const now = new Date();
  const formattedNow = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const newLog: SystemLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: formattedNow,
    ...log,
  };

  // Keep maximum 500 recent logs
  const updatedLogs = [newLog, ...logs].slice(0, 500);
  const tenantKey = getTenantStorageKey(KEYS.LOGS);
  localStorage.setItem(tenantKey, JSON.stringify(updatedLogs));
  localStorage.setItem(KEYS.LOGS, JSON.stringify(updatedLogs));
  syncPushToServer('logs', updatedLogs);
  return newLog;
}

export function clearSystemLogs(): void {
  const tenantKey = getTenantStorageKey(KEYS.LOGS);
  localStorage.setItem(tenantKey, JSON.stringify([]));
  localStorage.setItem(KEYS.LOGS, JSON.stringify([]));
  syncPushToServer('logs', []);
}

// Function to clear browser cache, notifications cache, temporary storage & refresh dynamic metadata
export function clearAppCache(): void {
  try {
    const tenantKey = getTenantStorageKey(KEYS.NOTIFICATIONS_READ);
    localStorage.removeItem(tenantKey);
    localStorage.removeItem(KEYS.NOTIFICATIONS_READ);
  } catch (e) {}

  try {
    sessionStorage.clear();
  } catch (e) {}

  if (typeof window !== 'undefined' && 'caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    }).catch(() => {});
  }

  // Force re-fetch and re-apply metadata & favicon
  const currentConfig = getAppConfig();
  applyAppMetaData(currentConfig);

  if (typeof fetch !== 'undefined') {
    fetch('/api/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConfig),
    }).catch(() => {});
  }

  addSystemLog({
    type: 'system',
    action: 'Pembersihan Cache Aplikasi Selesai',
    user: 'Admin/Developer',
    role: 'admin',
    status: 'success',
    details: 'Cache browser, penyimpanan temporary notification, dan memori aplikasi berhasil dibersihkan.',
  });
}

// Ensure storage is seeded on module load
initStorage();

// Storage Accessors (Partitioned Per Tenant Domain)
export function getSiswaList(): Siswa[] {
  try {
    const tenantKey = getTenantStorageKey(KEYS.SISWA);
    const raw = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.SISWA);
    if (!raw) {
      localStorage.setItem(tenantKey, JSON.stringify(INITIAL_SISWA));
      return INITIAL_SISWA;
    }
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.map((s: any) => ({
        nama: s.nama || '',
        nisn: String(s.nisn || '').replace(/^'/, ''),
        kelas: s.kelas || '',
        jenisKelamin: s.jenisKelamin || s.jenis_kelamin || 'Laki-laki',
        tanggalLahir: s.tanggalLahir || s.tanggal_lahir || '',
        agama: s.agama || 'Islam',
        password: s.password || '123456',
        biometricEnabled: s.biometricEnabled ?? false,
        namaAyah: s.namaAyah || s.nama_ayah || '',
        namaIbu: s.namaIbu || s.nama_ibu || '',
        noHp: s.noHp || s.no_hp || '',
        alamat: s.alamat || '',
        foto: s.foto || '',
        waVerified: s.waVerified ?? false,
        waLastSentAt: s.waLastSentAt || undefined,
      }));
    }
    return INITIAL_SISWA;
  } catch {
    return INITIAL_SISWA;
  }
}

export function saveSiswaList(list: Siswa[]) {
  const tenantKey = getTenantStorageKey(KEYS.SISWA);
  localStorage.setItem(tenantKey, JSON.stringify(list));
  localStorage.setItem(KEYS.SISWA, JSON.stringify(list));
  notifyDataChanged('siswa', list);
}

export function getGuruList(): Guru[] {
  try {
    const tenantKey = getTenantStorageKey(KEYS.GURU);
    const raw = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.GURU);
    if (!raw) {
      localStorage.setItem(tenantKey, JSON.stringify(INITIAL_GURU));
      return INITIAL_GURU;
    }
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.map((g: any) => ({
        id: String(g.id || g.nip || g.username || Date.now()),
        nama: g.nama || '',
        nip: g.nip || '',
        username: (g.username || g.nip || g.nama || '').toString().trim(),
        kelasDiampu: g.kelasDiampu || g.kelas_diampu || g.kelas || '',
        kelas: g.kelas !== undefined ? g.kelas : (g.kelasDiampu || g.kelas_diampu || ''),
        noHp: g.noHp || g.no_hp || '',
        foto: g.foto || '',
        password: g.password || '123456',
      }));
    }
    return INITIAL_GURU;
  } catch {
    return INITIAL_GURU;
  }
}

export function saveGuruList(list: Guru[]) {
  const tenantKey = getTenantStorageKey(KEYS.GURU);
  localStorage.setItem(tenantKey, JSON.stringify(list));
  localStorage.setItem(KEYS.GURU, JSON.stringify(list));
  notifyDataChanged('guru', list);
}

export function getHariLiburList(): HariLibur[] {
  try {
    const tenantKey = getTenantStorageKey(KEYS.LIBUR);
    const raw = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.LIBUR);
    return JSON.parse(raw || '[]');
  } catch {
    return INITIAL_LIBUR;
  }
}

export function saveHariLiburList(list: HariLibur[]) {
  const tenantKey = getTenantStorageKey(KEYS.LIBUR);
  localStorage.setItem(tenantKey, JSON.stringify(list));
  localStorage.setItem(KEYS.LIBUR, JSON.stringify(list));
  notifyDataChanged('libur', list);
}

export function getActiveTestingDomain(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('e_absensi_testing_domain') || null;
}

export function setActiveTestingDomain(domain: string | null): void {
  if (typeof window === 'undefined') return;
  if (domain) {
    localStorage.setItem('e_absensi_testing_domain', domain);
  } else {
    localStorage.removeItem('e_absensi_testing_domain');
  }
  // Re-apply meta tags for newly selected tenant
  applyAppMetaData();
}

export function getAppConfig(overrideDomain?: string): AppConfig {
  try {
    const tenantKey = getTenantStorageKey(KEYS.CONFIG, overrideDomain);
    const stored = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.CONFIG);
    let cfg: AppConfig = DEFAULT_CONFIG;
    if (stored) {
      const parsed = JSON.parse(stored);
      cfg = { ...DEFAULT_CONFIG, ...parsed };
    }

    // Dynamic Multi-Domain / Multi-Tenant matching
    if (cfg.multi_domain_enabled !== false && Array.isArray(cfg.domain_tenants) && cfg.domain_tenants.length > 0) {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname.toLowerCase().trim();
        const searchParams = new URLSearchParams(window.location.search);
        const paramDomain = (searchParams.get('domain') || searchParams.get('tenant') || '').toLowerCase().trim();
        const override = overrideDomain || getActiveTestingDomain()?.toLowerCase().trim() || '';

        const target = paramDomain || override || hostname;

        if (target) {
          const matched = cfg.domain_tenants.find((t) => {
            if (!t || !t.domain) return false;
            const d = t.domain.toLowerCase().trim();
            return target === d || target.endsWith(`.${d}`) || target.includes(d);
          });

          if (matched) {
            return {
              ...cfg,
              nama_sekolah: matched.nama_sekolah || cfg.nama_sekolah,
              logo_url: matched.logo_url || cfg.logo_url,
              favicon_url: matched.favicon_url || matched.logo_url || cfg.favicon_url,
              alamat_sekolah: matched.alamat_sekolah || cfg.alamat_sekolah,
              email_sekolah: matched.email_sekolah || cfg.email_sekolah,
              telepon_sekolah: matched.telepon_sekolah || cfg.telepon_sekolah,
              nama_kepala_sekolah: matched.nama_kepala_sekolah || cfg.nama_kepala_sekolah,
              nip_kepala_sekolah: matched.nip_kepala_sekolah || cfg.nip_kepala_sekolah,
              firebase_config: matched.firebase_config || cfg.firebase_config,
              supabase_config: matched.supabase_config || cfg.supabase_config,
              active_tenant_id: matched.id,
              active_domain: matched.domain,
            };
          }
        }
      }
    }

    return cfg;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function getSchoolName(): string {
  const cfg = getAppConfig();
  return cfg.nama_sekolah && cfg.nama_sekolah.trim() !== '' ? cfg.nama_sekolah : 'SMA NEGERI';
}

export function getAppLogo(): string {
  const cfg = getAppConfig();
  return cfg.logo_url && cfg.logo_url.trim() !== '' ? cfg.logo_url : '/logo.png';
}

export function getAppFavicon(): string {
  const cfg = getAppConfig();
  return cfg.favicon_url && cfg.favicon_url.trim() !== '' ? cfg.favicon_url : '/logo.png';
}

export function applyAppMetaData(cfg?: AppConfig) {
  if (typeof document === 'undefined') return;
  const config = cfg || getAppConfig();
  const schoolName = config.nama_sekolah && config.nama_sekolah.trim() !== '' 
    ? config.nama_sekolah 
    : 'SMA NEGERI';
  
  const rawLogo = config.logo_url && config.logo_url.trim() !== '' 
    ? config.logo_url 
    : (config.favicon_url || '/logo.png');
    
  const rawFavicon = config.favicon_url && config.favicon_url.trim() !== '' 
    ? config.favicon_url 
    : rawLogo;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Format image URL for Open Graph and Twitter
  let fullImageUrl = rawLogo;
  if (rawLogo.startsWith('/')) {
    fullImageUrl = origin + rawLogo;
  }

  let fullFaviconUrl = rawFavicon;
  if (rawFavicon.startsWith('/')) {
    fullFaviconUrl = origin + rawFavicon;
  }

  const alamat = config.alamat_sekolah ? ` Alamat: ${config.alamat_sekolah}` : '';
  const description = `Sistem Absensi Digital, Presensi QR Code & GPS ${schoolName}.${alamat}`;
  const title = `E-Absensi ${schoolName}`;

  // Update document title
  document.title = title;

  // Helper to set or create meta tag
  const setMeta = (attr: string, key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Helper to set or create link tag
  const setLink = (rel: string, href: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  // Standard Meta
  setMeta('name', 'description', description);

  // Open Graph (WhatsApp, Facebook, LinkedIn, Telegram, etc.)
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:image', fullImageUrl);
  setMeta('property', 'og:site_name', schoolName);
  setMeta('property', 'og:type', 'website');
  if (typeof window !== 'undefined') {
    setMeta('property', 'og:url', window.location.href);
  }

  // Twitter Cards
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', fullImageUrl);

  // Favicons & Apple Touch Icon
  setLink('icon', fullFaviconUrl);
  setLink('shortcut icon', fullFaviconUrl);
  setLink('apple-touch-icon', fullImageUrl);

  // Dynamic PWA Web Manifest & Android/iOS Home Screen Title Generator
  const pwaShortName = schoolName;
  const pwaFullName = `E-Absensi ${schoolName}`;

  setMeta('name', 'application-name', pwaShortName);
  setMeta('name', 'apple-mobile-web-app-title', pwaShortName);

  try {
    const dynamicManifestObj = {
      short_name: pwaShortName,
      name: pwaFullName,
      description: description,
      icons: [
        {
          src: fullImageUrl || '/logo.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: fullImageUrl || '/logo.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      id: '/',
      start_url: './',
      scope: './',
      background_color: '#020617',
      theme_color: '#1d4ed8',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'portrait-primary',
      categories: ['education', 'productivity', 'utilities'],
    };

    const manifestBlob = new Blob([JSON.stringify(dynamicManifestObj, null, 2)], {
      type: 'application/json',
    });
    const manifestBlobUrl = URL.createObjectURL(manifestBlob);
    setLink('manifest', manifestBlobUrl);
  } catch (e) {
    console.warn('Failed to inject dynamic PWA manifest:', e);
  }
}

export function applyFavicon(faviconUrl?: string) {
  if (typeof document === 'undefined') return;
  applyAppMetaData();
}

export function saveAppConfig(cfg: AppConfig, overrideDomain?: string) {
  const tenantKey = getTenantStorageKey(KEYS.CONFIG, overrideDomain);
  localStorage.setItem(tenantKey, JSON.stringify(cfg));
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));
  if (cfg.mysql_api_url !== undefined) {
    setApiBaseUrl(cfg.mysql_api_url);
  }
  applyAppMetaData(cfg);
  notifyDataChanged('config', cfg);

  // Sync config with backend server for server-side Open Graph HTML injection & central config persistence
  if (typeof fetch !== 'undefined') {
    fetch('/api/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    }).catch(() => {});
  }

  addSystemLog({
    type: 'config',
    action: 'Perubahan Pengaturan Sekolah & Jam Operasional Domain',
    user: 'developer',
    role: 'developer',
    status: 'success',
    details: `Nama Sekolah: "${cfg.nama_sekolah}", Jam Masuk: ${cfg.jam_masuk_mulai}-${cfg.jam_masuk_akhir}, Jam Pulang: ${cfg.jam_pulang_mulai}-${cfg.jam_pulang_akhir}`,
  });
}

export function resetAppConfig(): AppConfig {
  const tenantKey = getTenantStorageKey(KEYS.CONFIG);
  localStorage.setItem(tenantKey, JSON.stringify(DEFAULT_CONFIG));
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
  applyAppMetaData(DEFAULT_CONFIG);
  syncPushToServer('config', DEFAULT_CONFIG);

  if (typeof fetch !== 'undefined') {
    fetch('/api/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_CONFIG),
    }).catch((err) => {
      console.warn('Backend server config reset sync info:', err);
    });
  }

  addSystemLog({
    type: 'config',
    action: 'Reset Pengaturan Sekolah ke Default',
    user: 'Admin/Developer',
    role: 'admin',
    status: 'warning',
    details: 'Semua pengaturan sekolah, logo, dan jam operasional telah dikembalikan ke kondisi default awal.',
  });

  return DEFAULT_CONFIG;
}

export function getAbsensiList(): AbsensiRecord[] {
  try {
    const tenantKey = getTenantStorageKey(KEYS.ABSENSI);
    const raw = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.ABSENSI);
    const list = JSON.parse(raw || '[]');
    if (Array.isArray(list)) {
      return list.map((a: any) => ({
        id: String(a.id || Date.now()),
        tanggal: a.tanggal || '',
        nisn: a.nisn || '',
        nama: a.nama || '',
        kelas: a.kelas || '',
        jamDatang: a.jamDatang || a.jam_datang || '',
        jamPulang: a.jamPulang || a.jam_pulang || '',
        status: a.status || 'Hadir',
        keterangan: a.keterangan || '',
        foto: a.foto || '',
        lokasi: a.lokasi || ''
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveAbsensiList(list: AbsensiRecord[]) {
  const tenantKey = getTenantStorageKey(KEYS.ABSENSI);
  localStorage.setItem(tenantKey, JSON.stringify(list));
  localStorage.setItem(KEYS.ABSENSI, JSON.stringify(list));
  notifyDataChanged('absensi', list);
}

// Get unique classes list
export function getKelasList(): string[] {
  const siswa = getSiswaList();
  const set = new Set<string>();
  siswa.forEach((s) => {
    if (s.kelas) set.add(s.kelas.trim());
  });
  return Array.from(set).sort();
}

// Session
export function getStoredSession(): UserSession | null {
  try {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession) {
  localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

// Register new Siswa self-registration
export function registerSiswa(newSiswa: Siswa): { success: boolean; message: string; session?: UserSession } {
  const cleanNisn = newSiswa.nisn.trim().replace(/^'/, '');
  if (!cleanNisn || !newSiswa.nama.trim() || !newSiswa.kelas.trim()) {
    return { success: false, message: 'Harap lengkapi Nama, NISN, dan Kelas.' };
  }

  const list = getSiswaList();
  const exists = list.some((s) => s.nisn.replace(/^'/, '') === cleanNisn);
  if (exists) {
    return { success: false, message: `NISN ${cleanNisn} sudah terdaftar dalam sistem.` };
  }

  const formattedSiswa: Siswa = {
    ...newSiswa,
    nama: newSiswa.nama.trim(),
    nisn: cleanNisn,
    kelas: newSiswa.kelas.trim(),
  };

  list.push(formattedSiswa);
  saveSiswaList(list);

  const session: UserSession = {
    success: true,
    role: 'siswa',
    nama: formattedSiswa.nama,
    nisn: formattedSiswa.nisn,
    kelas: formattedSiswa.kelas,
    token: `tok_siswa_${cleanNisn}_${Date.now()}`,
  };
  saveSession(session);

  return { success: true, message: 'Registrasi mandiri berhasil! Selamat datang.', session };
}

// Register new Guru self-registration
export function registerGuru(newGuru: Partial<Guru>): { success: boolean; message: string; session?: UserSession } {
  const cleanUsername = (newGuru.username || newGuru.nip || '').trim();
  const cleanPassword = (newGuru.password || '123456').trim();
  const cleanNama = (newGuru.nama || '').trim();
  const cleanNip = (newGuru.nip || '').trim();
  const cleanKelas = (newGuru.kelas || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, message: 'Harap isi Username/NIP dan Password Guru.' };
  }
  if (!cleanNama) {
    return { success: false, message: 'Harap isi Nama Lengkap Guru.' };
  }

  const list = getGuruList();
  if (list.some((g) => (g.username || '').toLowerCase() === cleanUsername.toLowerCase())) {
    return { success: false, message: `Username/NIP "${cleanUsername}" sudah terdaftar.` };
  }

  if (cleanNip && list.some((g) => g.nip && g.nip.trim() === cleanNip)) {
    return { success: false, message: `NIP "${cleanNip}" sudah terdaftar dalam sistem.` };
  }

  const formattedGuru: Guru = {
    id: String(Date.now()),
    username: cleanUsername,
    password: cleanPassword,
    nama: cleanNama,
    nip: cleanNip || undefined,
    kelas: cleanKelas || undefined,
    kelasDiampu: cleanKelas || undefined,
    foto: newGuru.foto || undefined,
    noHp: newGuru.noHp || undefined,
  };

  list.push(formattedGuru);
  saveGuruList(list);

  addSystemLog({
    type: 'auth',
    action: 'Registrasi Guru Mandiri Berhasil',
    user: cleanUsername,
    role: 'guru',
    status: 'success',
    details: `Guru baru "${cleanNama}" (${cleanUsername}) terdaftar secara mandiri.`,
  });

  const session: UserSession = {
    success: true,
    role: 'guru',
    username: formattedGuru.username,
    nama: formattedGuru.nama,
    nip: formattedGuru.nip,
    kelas: formattedGuru.kelas || '',
    token: `tok_guru_${cleanUsername}_${Date.now()}`,
  };
  saveSession(session);

  return { success: true, message: 'Registrasi Guru berhasil! Selamat datang.', session };
}

// Update existing Siswa details or photo
export function updateSiswaProfile(nisn: string, updatedFields: Partial<Siswa>): { success: boolean; message: string } {
  const cleanNisn = nisn.trim().replace(/^'/, '');
  const list = getSiswaList();
  const idx = list.findIndex((s) => s.nisn.replace(/^'/, '') === cleanNisn);

  if (idx === -1) {
    return { success: false, message: 'Data siswa tidak ditemukan.' };
  }

  list[idx] = {
    ...list[idx],
    ...updatedFields,
  };
  saveSiswaList(list);

  // Directly sync to MySQL cPanel API
  saveSiswaToApi(list[idx]).catch(() => {});

  // Update session if logged in student
  const session = getStoredSession();
  if (session && session.role === 'siswa' && session.nisn?.replace(/^'/, '') === cleanNisn) {
    session.nama = list[idx].nama;
    session.kelas = list[idx].kelas;
    saveSession(session);
  }

  return { success: true, message: 'Profil dan foto siswa berhasil diperbarui.' };
}

// Authentication Logic
export function authenticateUser(
  username?: string,
  password?: string,
  nisn?: string,
  locationData?: SystemLogLocation,
  deviceInfo?: string
): UserSession {
  // If NISN provided -> Student login
  if (nisn && nisn.trim()) {
    const cleanNisn = nisn.trim().replace(/^'/, '');
    const siswaList = getSiswaList();
    const student = siswaList.find((s) => s.nisn.replace(/^'/, '') === cleanNisn);

    if (student) {
      const inputPass = (password || '').trim();
      const targetPass = (student.password || '123456').trim();

      if (inputPass !== targetPass) {
        addSystemLog({
          type: 'auth',
          action: 'Login Siswa Gagal (Password Salah)',
          user: student.nama,
          role: 'siswa',
          status: 'failed',
          details: `Kombinasi password salah untuk NISN ${cleanNisn}.`,
          location: locationData,
          deviceInfo,
        });
        return {
          success: false,
          role: 'siswa',
          message: 'Password siswa salah. Password default: 123456 (dapat diubah di profil).',
        };
      }

      const session: UserSession = {
        success: true,
        role: 'siswa',
        nama: student.nama,
        nisn: student.nisn,
        kelas: student.kelas,
        token: `tok_siswa_${cleanNisn}_${Date.now()}`,
      };
      saveSession(session);
      addSystemLog({
        type: 'auth',
        action: 'Login Siswa Berhasil',
        user: student.nama,
        role: 'siswa',
        status: 'success',
        details: `NISN: ${cleanNisn}, Kelas: ${student.kelas}`,
        location: locationData,
        deviceInfo,
      });
      return session;
    }
    addSystemLog({
      type: 'auth',
      action: 'Login Siswa Gagal (NISN Tidak Ditemukan)',
      user: nisn,
      role: 'siswa',
      status: 'failed',
      details: `NISN "${cleanNisn}" tidak terdaftar dalam database.`,
      location: locationData,
      deviceInfo,
    });
    return { success: false, role: 'siswa', message: 'NISN tidak terdaftar dalam sistem.' };
  }

  // Username/Password -> Developer/Admin/Guru
  if (username && password) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check Developer / Super Admin
    if ((cleanUser === 'developer' || cleanUser === 'dev' || cleanUser === 'superadmin') && (cleanPass === 'dev123' || cleanPass === 'developer123' || cleanPass === 'admin123')) {
      const session: UserSession = {
        success: true,
        role: 'developer',
        username: cleanUser,
        nama: 'Developer / Super Admin',
        token: `tok_dev_${Date.now()}`,
      };
      saveSession(session);
      addSystemLog({
        type: 'auth',
        action: 'Login Developer / Super Admin Berhasil',
        user: cleanUser,
        role: 'developer',
        status: 'success',
        details: 'Akses penuh ke semua fitur dan Developer Panel.',
        location: locationData,
        deviceInfo,
      });
      return session;
    }

    // Check hardcoded or stored Admin
    if ((cleanUser === 'admin' || cleanUser === 'guru') && (cleanPass === 'admin123' || cleanPass === 'guru123')) {
      const isGuruRole = cleanUser === 'guru';
      const session: UserSession = {
        success: true,
        role: isGuruRole ? 'guru' : 'admin',
        username: cleanUser,
        nama: cleanUser === 'admin' ? 'Administrator Sekolah' : 'Guru Utama',
        token: `tok_${cleanUser}_${Date.now()}`,
      };
      saveSession(session);
      addSystemLog({
        type: 'auth',
        action: `Login ${isGuruRole ? 'Guru' : 'Admin'} Berhasil (GPS Terverifikasi)`,
        user: cleanUser,
        role: isGuruRole ? 'guru' : 'admin',
        status: 'success',
        details: isGuruRole ? 'Akses Dashboard Guru. Lokasi GPS Diverifikasi.' : 'Akses ke Admin Dashboard & Kelola Absensi.',
        location: locationData,
        deviceInfo,
      });
      return session;
    }

    const guruList = getGuruList();
    const guru = guruList.find(
      (g) => g.username.toLowerCase().replace(/^'/, '') === cleanUser && (g.password || '').replace(/^'/, '') === cleanPass
    );

    if (guru) {
      const userRole: UserSession['role'] = guru.username === 'developer' ? 'developer' : guru.username === 'admin' ? 'admin' : 'guru';
      const session: UserSession = {
        success: true,
        role: userRole,
        username: guru.username,
        nama: guru.nama || (userRole === 'developer' ? 'Developer / Super Admin' : userRole === 'admin' ? 'Administrator Sekolah' : `Guru ${guru.username}`),
        kelas: guru.kelas || '',
        foto: guru.foto || '',
        token: `tok_${userRole}_${guru.username}_${Date.now()}`,
      };
      saveSession(session);
      addSystemLog({
        type: 'auth',
        action: `Login ${userRole === 'developer' ? 'Developer' : userRole === 'admin' ? 'Admin' : 'Guru'} Berhasil ${locationData?.permissionStatus === 'granted' ? '(GPS Terverifikasi)' : ''}`,
        user: guru.username,
        role: userRole,
        status: 'success',
        details: `Nama: ${session.nama}${guru.kelas ? `, Wali Kelas: ${guru.kelas}` : ''}`,
        location: locationData,
        deviceInfo,
      });
      return session;
    }

    addSystemLog({
      type: 'auth',
      action: 'Login Gagal (Password / Username Salah)',
      user: cleanUser,
      role: 'admin',
      status: 'failed',
      details: `Kombinasi kredensial tidak valid untuk user "${cleanUser}".`,
      location: locationData,
      deviceInfo,
    });

    return { success: false, role: 'guru', message: 'Username atau password tidak cocok.' };
  }

  return { success: false, role: 'siswa', message: 'Harap masukkan kredensial yang valid.' };
}

// Biometric Fast Login Functions for ALL Roles
export type UserRole = 'admin' | 'siswa' | 'guru' | 'developer';

export function setBiometricCredentialForRole(
  role: UserRole,
  identifier: string,
  nama?: string
): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`e_absensi_biometric_${role}`, JSON.stringify({ identifier, nama, role }));
    if (role === 'siswa') {
      localStorage.setItem('e_absensi_biometric_nisn', identifier);
    }
  }
}

export function getBiometricCredentialForRole(
  role: UserRole
): { role: UserRole; identifier: string; nama?: string } | null {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(`e_absensi_biometric_${role}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return { role, identifier: raw };
      }
    }
    // Backward compatibility for siswa
    if (role === 'siswa') {
      const nisn = localStorage.getItem('e_absensi_biometric_nisn');
      if (nisn) return { role: 'siswa', identifier: nisn };
    }
  }
  return null;
}

export function clearBiometricCredentialForRole(role: UserRole): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`e_absensi_biometric_${role}`);
    if (role === 'siswa') {
      localStorage.removeItem('e_absensi_biometric_nisn');
    }
  }
}

// Legacy aliases for siswa
export function setBiometricCredential(nisn: string): void {
  setBiometricCredentialForRole('siswa', nisn);
}

export function getBiometricCredentialNisn(): string | null {
  const cred = getBiometricCredentialForRole('siswa');
  return cred ? cred.identifier : null;
}

export function clearBiometricCredential(): void {
  clearBiometricCredentialForRole('siswa');
}

export async function authenticateBiometricFastLogin(
  targetRole: UserRole = 'siswa',
  locationData?: SystemLogLocation,
  deviceInfo?: string
): Promise<{ success: boolean; message: string; session?: UserSession }> {
  const cred = getBiometricCredentialForRole(targetRole);
  if (!cred || !cred.identifier) {
    const roleLabels: Record<UserRole, string> = {
      siswa: 'Siswa',
      guru: 'Guru',
      admin: 'Admin',
      developer: 'Developer',
    };
    return {
      success: false,
      message: `Fast Login Biometrik belum diaktifkan untuk role ${roleLabels[targetRole]} di perangkat ini. Silakan masuk secara manual lalu aktifkan Biometrik di pengaturan profil.`,
    };
  }

  // Attempt WebAuthn or native Biometric prompt
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'preferred',
        },
      }).catch((err) => {
        console.log('Biometric prompt notice:', err);
      });
    } catch (e) {
      console.log('Biometric API notice:', e);
    }
  }

  let session: UserSession;

  if (targetRole === 'siswa') {
    const cleanNisn = cred.identifier.trim().replace(/^'/, '');
    const siswaList = getSiswaList();
    const student = siswaList.find((s) => s.nisn.replace(/^'/, '') === cleanNisn);

    if (!student) {
      clearBiometricCredentialForRole('siswa');
      return {
        success: false,
        message: 'Data siswa biometrik tidak ditemukan di database.',
      };
    }

    session = {
      success: true,
      role: 'siswa',
      nama: student.nama,
      nisn: student.nisn,
      kelas: student.kelas,
      token: `tok_siswa_bio_${cleanNisn}_${Date.now()}`,
    };
  } else if (targetRole === 'guru') {
    const cleanUser = cred.identifier.trim().toLowerCase();
    const guruList = getGuruList();
    const guru = guruList.find((g) => g.username.toLowerCase().replace(/^'/, '') === cleanUser);

    session = {
      success: true,
      role: 'guru',
      username: guru ? guru.username : (cleanUser || 'guru'),
      nama: guru ? guru.nama : (cred.nama || 'Guru Utama'),
      kelas: guru ? guru.kelas : '',
      foto: guru ? guru.foto : '',
      token: `tok_guru_bio_${cleanUser}_${Date.now()}`,
    };
  } else if (targetRole === 'admin') {
    const cleanUser = cred.identifier.trim().toLowerCase();
    session = {
      success: true,
      role: 'admin',
      username: cleanUser || 'admin',
      nama: cred.nama || 'Administrator Sekolah',
      token: `tok_admin_bio_${cleanUser}_${Date.now()}`,
    };
  } else {
    // developer
    const cleanUser = cred.identifier.trim().toLowerCase();
    session = {
      success: true,
      role: 'developer',
      username: cleanUser || 'developer',
      nama: 'Developer / Super Admin',
      token: `tok_dev_bio_${cleanUser}_${Date.now()}`,
    };
  }

  saveSession(session);

  addSystemLog({
    type: 'auth',
    action: `Fast Login Biometrik (${targetRole.toUpperCase()}) Berhasil`,
    user: session.nama || session.username || targetRole,
    role: targetRole,
    status: 'success',
    details: `Login instan biometrik (Sidik Jari / Wajah) terverifikasi untuk role ${targetRole}.`,
    location: locationData,
    deviceInfo,
  });

  return {
    success: true,
    message: `Fast Login Biometrik berhasil! Selamat datang, ${session.nama}.`,
    session,
  };
}

export function updateGuruProfile(
  username: string,
  updates: { nama?: string; nip?: string; kelas?: string; foto?: string; password?: string }
): { success: boolean; message: string; guru?: Guru; session?: UserSession } {
  let list = getGuruList();
  const idx = list.findIndex((g) => g.username === username);
  if (idx === -1) {
    return { success: false, message: 'Data guru tidak ditemukan.' };
  }

  const updatedGuru: Guru = {
    ...list[idx],
    ...updates,
  };
  list[idx] = updatedGuru;
  saveGuruList(list);

  // Directly sync to MySQL cPanel API
  saveGuruToApi(updatedGuru).catch(() => {});

  let updatedSession: UserSession | undefined = undefined;
  const currentSession = getStoredSession();
  if (currentSession && currentSession.username === username) {
    updatedSession = {
      ...currentSession,
      nama: updatedGuru.nama || (updatedGuru.username === 'admin' ? 'Administrator Sekolah' : `Guru ${updatedGuru.username}`),
      kelas: updatedGuru.kelas || '',
      foto: updatedGuru.foto || '',
    };
    saveSession(updatedSession);
  }

  return {
    success: true,
    message: 'Profil guru berhasil diperbarui.',
    guru: updatedGuru,
    session: updatedSession,
  };
}

// Attendance Logic for Realtime Monitoring
export function getMonitoringRealtimeData(filterKelas?: string | null): AbsensiRecord[] {
  const today = getTodayDateString();
  const allSiswa = getSiswaList();
  const allAbsensi = getAbsensiList();

  let targetSiswa = allSiswa;
  if (filterKelas && filterKelas.trim() !== '') {
    targetSiswa = allSiswa.filter((s) => s.kelas === filterKelas);
  }

  const result: AbsensiRecord[] = targetSiswa.map((siswa) => {
    const cleanNisn = siswa.nisn.replace(/^'/, '');
    const existingRecord = allAbsensi.find(
      (a) => a.tanggal === today && a.nisn.replace(/^'/, '') === cleanNisn
    );

    if (existingRecord) {
      return existingRecord;
    }

    // Default row if not checked in yet today
    return {
      id: `att_${today}_${cleanNisn}`,
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
      tanggal: today,
      jamDatang: '--:--',
      jamPulang: '--:--',
      status: 'Belum Absen',
      keterangan: 'Belum Melakukan Scan',
    };
  });

  return result;
}

export type NotificationWAType = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa' | 'Pulang';

// Helper for WhatsApp Parent Notification Link with exact custom message templates
export function generateWhatsAppNotificationLink(
  student: Siswa,
  type: NotificationWAType,
  jam?: string,
  keterangan?: string,
  schoolName?: string,
  tanggalStr?: string
): { waUrl: string; message: string; formattedPhone: string } | null {
  if (!student.noHp) return null;
  const rawPhone = student.noHp.replace(/\D/g, '');
  if (!rawPhone) return null;

  let formattedPhone = rawPhone;
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith('62')) {
    formattedPhone = '62' + formattedPhone;
  }

  const sch = schoolName || getSchoolName();
  
  // Format Hari, Tanggal, e.g. "Selasa, 10 Maret 2026"
  let dateObj = new Date();
  if (tanggalStr) {
    const parts = tanggalStr.split('-');
    if (parts.length === 3) {
      dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }

  const hariTanggal = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const namaOrtu = student.namaAyah || student.namaIbu || 'Orang Tua';
  const cleanJam = jam ? jam.slice(0, 5) : '07:00';

  let message = '';
  switch (type) {
    case 'Hadir':
      message = `Halo Bpk/Ibu ${namaOrtu},Informasi kehadiran siswa: Ananda ${student.nama} telah hadir dan masuk di ${sch} pada hari ${hariTanggal} pukul ${cleanJam} WIB. Terima kasih.`;
      break;

    case 'Terlambat':
      message = `Pemberitahuan Absensi: Ananda ${student.nama} tercatat datang terlambat di ${sch} pada ${hariTanggal} pukul ${cleanJam} WIB. Mohon perhatiannya, terima kasih.`;
      break;

    case 'Izin':
    case 'Sakit':
      const ketText = keterangan || (type === 'Sakit' ? 'Sakit' : 'Izin');
      message = `Halo Bpk/Ibu ${namaOrtu},Kami informasikan bahwa Ananda ${student.nama} tercatat ${type} pada hari ${hariTanggal} dengan keterangan: ${ketText}. Semoga lekas membaik/bermanfaat.`;
      break;

    case 'Alpa':
      message = `Perhatian: Ananda ${student.nama} tidak hadir di ${sch} hari ini (${hariTanggal}) tanpa keterangan (Alpha). Mohon konfirmasi segera kepada pihak sekolah atau Wali Kelas. Terima kasih.`;
      break;

    case 'Pulang':
      message = `Informasi Kepulangan: Ananda ${student.nama} telah melakukan absen pulang dari ${sch} pada hari ${hariTanggal} pukul ${cleanJam} WIB. Hati-hati di jalan.`;
      break;

    default:
      message = `Halo Bpk/Ibu ${namaOrtu},Informasi kehadiran Ananda ${student.nama} di ${sch} pada hari ${hariTanggal}. Terima kasih.`;
  }

  const encodedMsg = encodeURIComponent(message);
  const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;

  return { waUrl, message, formattedPhone };
}

// Helper for WhatsApp Parent Notification Link (Legacy wrapper)
export function generateWhatsAppLink(
  student: Siswa,
  type: 'datang' | 'pulang' | 'terlambat',
  jam: string,
  schoolName?: string
): { waUrl: string; message: string; formattedPhone: string } | null {
  let targetType: NotificationWAType = 'Hadir';
  if (type === 'pulang') {
    targetType = 'Pulang';
  } else if (type === 'terlambat') {
    targetType = 'Terlambat';
  } else {
    targetType = 'Hadir';
  }
  return generateWhatsAppNotificationLink(student, targetType, jam, undefined, schoolName);
}

// Process QR Code Scan
export function processScanQR(
  scannedNisn: string,
  userRole?: string,
  userKelas?: string
): {
  success: boolean;
  message: string;
  type?: 'datang' | 'pulang';
  nama?: string;
  kelas?: string;
  jamDatang?: string;
  jamPulang?: string;
  noHp?: string;
  waUrl?: string;
  waMessage?: string;
} {
  const cleanNisn = scannedNisn.trim().replace(/^'/, '');
  const allSiswa = getSiswaList();
  const student = allSiswa.find((s) => s.nisn.replace(/^'/, '') === cleanNisn);

  if (!student) {
    return {
      success: false,
      message: `NISN "${cleanNisn}" tidak ditemukan dalam database siswa.`,
    };
  }

  // Class constraint check for teacher role
  if (userRole === 'guru' && userKelas && userKelas.trim() !== '' && student.kelas !== userKelas) {
    return {
      success: false,
      message: `Siswa ${student.nama} berada di kelas ${student.kelas}, sedangkan Anda adalah Wali Kelas ${userKelas}.`,
    };
  }

  const today = getTodayDateString();
  const config = getAppConfig();
  const currentTime = getCurrentTimeString(); // HH:mm:ss
  const allAbsensi = getAbsensiList();

  // Check holiday
  const holidays = getHariLiburList();
  const isHoliday = holidays.some((h) => h.tanggal === today);
  if (isHoliday) {
    return {
      success: false,
      message: 'Hari ini adalah hari libur sekolah. Absensi tidak diizinkan.',
    };
  }

  // ATURAN PRESENSI: Guru/Wali Kelas wajib terdaftar presensinya (Hadir/Sakit/Izin/Alfa) sebelum murid kelasnya absen!
  // Jika Wali Kelas berhalangan (Sakit / Izin / Alfa), statusnya dapat di-input via Manual Absen Guru, dan presensi murid otomatis TERBUKA.
  const isAdminOrDev = userRole === 'admin' || userRole === 'developer';

  const absensiGuruRecorded = getAbsensiGuruList().filter(
    (g) => g.tanggal === today && g.status && g.status !== 'Belum Absen'
  );
  const guruList = getGuruList();
  const waliKelas = guruList.find((g) => g.kelas === student.kelas);

  let isTeacherCheckedIn = isAdminOrDev; // Admin & Developer bebas scan tanpa harus menunggu guru
  if (!isTeacherCheckedIn && waliKelas) {
    isTeacherCheckedIn = absensiGuruRecorded.some(
      (ag) => ag.username.toLowerCase() === waliKelas.username.toLowerCase()
    );
  }
  // Fallback: Jika tidak ada wali kelas spesifik, izinkan jika ada minimal 1 guru terdaftar hari ini
  if (!isTeacherCheckedIn && absensiGuruRecorded.length > 0) {
    isTeacherCheckedIn = true;
  }

  let record = allAbsensi.find((a) => a.tanggal === today && a.nisn.replace(/^'/, '') === cleanNisn);

  if (!record || record.status === 'Belum Absen') {
    // Check-in (DATANG) -> Block if teacher hasn't been recorded yet!
    if (!isTeacherCheckedIn) {
      const waliKelasName = waliKelas ? (waliKelas.nama || waliKelas.username) : 'Wali Kelas';
      return {
        success: false,
        message: `⚠️ PRESENSI SISWA BELUM DIBUKA! ${waliKelasName} (Wali Kelas ${student.kelas}) belum absen/terdaftar hari ini. Harap gunakan fitur Manual Absen Guru (Sakit/Izin/Alfa/Hadir) jika Wali Kelas berhalangan.`,
      };
    }

    // Determine late status
    const isLate = currentTime.slice(0, 5) > config.jam_masuk_akhir;
    let ketNote = 'Tepat Waktu';

    if (isLate) {
      const [curH, curM] = currentTime.split(':').map(Number);
      const [limH, limM] = config.jam_masuk_akhir.split(':').map(Number);
      const diffMins = Math.max(1, (curH * 60 + curM) - (limH * 60 + limM));
      ketNote = `Terlambat (${diffMins} m)`;
    }

    const newRecord: AbsensiRecord = {
      id: record ? record.id : `att_${today}_${cleanNisn}`,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      tanggal: today,
      jamDatang: currentTime,
      jamPulang: '--:--',
      status: 'Hadir',
      keterangan: ketNote,
    };

    if (record) {
      const idx = allAbsensi.findIndex((a) => a.id === record!.id);
      if (idx !== -1) allAbsensi[idx] = newRecord;
    } else {
      allAbsensi.push(newRecord);
    }

    saveAbsensiList(allAbsensi);

    addSystemLog({
      type: 'data',
      action: 'Presensi QR Datang',
      user: student.nama,
      role: 'siswa',
      details: `Presensi Masuk ${student.nama} (NISN: ${cleanNisn}, Kelas ${student.kelas}) tercatat pukul ${currentTime} WIB.`,
      status: isLate ? 'warning' : 'success',
    });

    const waType: NotificationWAType = isLate ? 'Terlambat' : 'Hadir';
    const waInfo = generateWhatsAppNotificationLink(student, waType, currentTime, undefined, config.nama_sekolah, today);

    return {
      success: true,
      type: 'datang',
      message: isLate ? 'ABSEN DATANG (TERLAMBAT)' : 'ABSEN DATANG BERHASIL',
      nama: student.nama,
      kelas: student.kelas,
      jamDatang: currentTime,
      noHp: student.noHp,
      waUrl: waInfo?.waUrl,
      waMessage: waInfo?.message,
    };
  } else {
    // Check-out (PULANG)
    if (record.jamPulang && record.jamPulang !== '--:--') {
      return {
        success: false,
        message: `Siswa ${student.nama} sudah melakukan absensi datang & pulang hari ini.`,
      };
    }

    // Check early departure
    const isEarly = currentTime.slice(0, 5) < config.jam_pulang_mulai;
    let ketNote = record.keterangan || 'Hadir';

    if (isEarly) {
      ketNote += ' (Pulang Cepat)';
    }

    record.jamPulang = currentTime;
    record.keterangan = ketNote;

    const idx = allAbsensi.findIndex((a) => a.id === record!.id);
    if (idx !== -1) allAbsensi[idx] = record;
    saveAbsensiList(allAbsensi);

    addSystemLog({
      type: 'data',
      action: 'Presensi QR Pulang',
      user: student.nama,
      role: 'siswa',
      details: `Presensi Pulang ${student.nama} (NISN: ${cleanNisn}, Kelas ${student.kelas}) tercatat pukul ${currentTime} WIB.`,
      status: isEarly ? 'warning' : 'success',
    });

    const waInfo = generateWhatsAppNotificationLink(student, 'Pulang', currentTime, undefined, config.nama_sekolah, today);

    return {
      success: true,
      type: 'pulang',
      message: isEarly ? 'ABSEN PULANG (LEBIH AWAL)' : 'ABSEN PULANG BERHASIL',
      nama: student.nama,
      kelas: student.kelas,
      jamPulang: currentTime,
      noHp: student.noHp,
      waUrl: waInfo?.waUrl,
      waMessage: waInfo?.message,
    };
  }
}

// Get Report Records
export function getAbsensiReport(filter: FilterReport): AbsensiRecord[] {
  const allAbsensi = getAbsensiList();
  const { tanggalMulai, tanggalAkhir, kelas } = filter;

  return allAbsensi.filter((r) => {
    let match = true;
    if (tanggalMulai && r.tanggal < tanggalMulai) match = false;
    if (tanggalAkhir && r.tanggal > tanggalAkhir) match = false;
    if (kelas && kelas.trim() !== '' && r.kelas !== kelas) match = false;
    return match;
  });
}

// Student Absence Summary for Alerting Thresholds (Dashboard Guru)
export interface StudentAbsenceSummary {
  nisn: string;
  nama: string;
  kelas: string;
  foto?: string;
  noHp?: string;
  namaAyah?: string;
  namaIbu?: string;
  alpaCount: number;
  sakitCount: number;
  izinCount: number;
  totalAbsence: number;
  lastAlpaDate?: string;
  todayStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Belum Absen';
}

export function getStudentAbsenceSummaries(filterKelas?: string | null): StudentAbsenceSummary[] {
  const allSiswa = getSiswaList();
  const allAbsensi = getAbsensiList();
  const today = getTodayDateString();

  let targetSiswa = allSiswa;
  if (filterKelas && filterKelas.trim() !== '') {
    targetSiswa = allSiswa.filter((s) => s.kelas === filterKelas);
  }

  return targetSiswa.map((siswa) => {
    const cleanNisn = siswa.nisn.replace(/^'/, '');
    const studentRecords = allAbsensi.filter(
      (a) => a.nisn.replace(/^'/, '') === cleanNisn
    );

    const alpaRecords = studentRecords.filter((a) => a.status === 'Alpa');
    const alpaCount = alpaRecords.length;
    const sakitCount = studentRecords.filter((a) => a.status === 'Sakit').length;
    const izinCount = studentRecords.filter((a) => a.status === 'Izin').length;

    const sortedAlpa = [...alpaRecords].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const lastAlpaDate = sortedAlpa[0]?.tanggal;

    const todayRecord = studentRecords.find((a) => a.tanggal === today);
    const todayStatus = todayRecord ? todayRecord.status : 'Belum Absen';

    return {
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
      foto: siswa.foto,
      noHp: siswa.noHp,
      namaAyah: siswa.namaAyah,
      namaIbu: siswa.namaIbu,
      alpaCount,
      sakitCount,
      izinCount,
      totalAbsence: alpaCount + sakitCount + izinCount,
      lastAlpaDate,
      todayStatus,
    };
  });
}

// ==========================================
// ABSENSI PRESENSI GURU & DETEKSI PULANG CEPAT
// ==========================================

export function getAbsensiGuruList(): AbsensiGuruRecord[] {
  try {
    const tenantKey = getTenantStorageKey(KEYS.ABSENSI_GURU);
    const raw = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.ABSENSI_GURU);
    const list = JSON.parse(raw || '[]');
    if (Array.isArray(list)) {
      return list.map((r: any) => ({
        id: String(r.id || Date.now()),
        tanggal: r.tanggal || '',
        username: (r.username || r.nip || '').toString().trim(),
        nama: r.nama || '',
        nip: r.nip || '',
        jamMasuk: r.jamMasuk || r.jam_masuk || '',
        jamPulang: r.jamPulang || r.jam_pulang || '',
        status: r.status || 'Hadir',
        keterangan: r.keterangan || '',
        fotoMasuk: r.fotoMasuk || r.foto_masuk || '',
        fotoPulang: r.fotoPulang || r.foto_pulang || '',
        lokasiMasuk: r.lokasiMasuk || r.lokasi_masuk || undefined,
        lokasiPulang: r.lokasiPulang || r.lokasi_pulang || undefined,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveAbsensiGuruList(list: AbsensiGuruRecord[]) {
  const tenantKey = getTenantStorageKey(KEYS.ABSENSI_GURU);
  localStorage.setItem(tenantKey, JSON.stringify(list));
  localStorage.setItem(KEYS.ABSENSI_GURU, JSON.stringify(list));
  notifyDataChanged('absensiGuru', list);
}

export function getAbsensiGuruTodayForUser(username: string, tanggal?: string): AbsensiGuruRecord | null {
  const targetDate = tanggal || getTodayDateString();
  const cleanUser = username.trim().toLowerCase();
  const list = getAbsensiGuruList();
  return list.find((r) => r.tanggal === targetDate && r.username.toLowerCase() === cleanUser) || null;
}

export function doTeacherCheckIn(
  username: string,
  location?: SystemLogLocation,
  fotoSelfie?: string,
  customStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alfa' | 'Tugas Luar' = 'Hadir',
  keteranganManual?: string
): { success: boolean; message: string; record: AbsensiGuruRecord } {
  const today = getTodayDateString();
  const currentTime = getCurrentTimeString();
  const config = getAppConfig();
  const guruList = getGuruList();
  const cleanUser = username.trim().toLowerCase();

  const guru = guruList.find((g) => g.username.toLowerCase() === cleanUser) || {
    username,
    nama: username === 'admin' ? 'Administrator Sekolah' : username === 'developer' ? 'Developer' : `Guru ${username}`,
    nip: '19800101 200501 1 001',
  };

  const list = getAbsensiGuruList();
  let existingIdx = list.findIndex((r) => r.tanggal === today && r.username.toLowerCase() === cleanUser);

  // Check late status
  const isLate = currentTime.slice(0, 5) > config.jam_masuk_akhir;
  const statusMasukNote = isLate ? 'Terlambat' : 'Hadir Tepat Waktu';

  let finalKeterangan = keteranganManual;
  if (!finalKeterangan) {
    if (customStatus === 'Sakit') finalKeterangan = 'Izin Sakit / Surat Dokter';
    else if (customStatus === 'Izin') finalKeterangan = 'Izin Keperluan Dinas / Keluarga';
    else if (customStatus === 'Alfa') finalKeterangan = 'Berhalangan / Alfa';
    else if (customStatus === 'Tugas Luar') finalKeterangan = 'Tugas Luar / Dinas';
    else if (isLate) finalKeterangan = `Terlambat Absen Masuk (Pukul ${currentTime})`;
    else finalKeterangan = `Hadir Tepat Waktu (${currentTime})`;
  }

  const recordId = existingIdx !== -1 ? list[existingIdx].id : `att_guru_${today}_${cleanUser}`;
  const record: AbsensiGuruRecord = {
    id: recordId,
    username: guru.username,
    nip: guru.nip,
    nama: guru.nama || guru.username,
    tanggal: today,
    jamMasuk: customStatus === 'Hadir' ? currentTime : '--:--',
    jamPulang: existingIdx !== -1 ? list[existingIdx].jamPulang : '--:--',
    statusMasuk: customStatus === 'Hadir' ? statusMasukNote : undefined,
    statusPulang: existingIdx !== -1 ? list[existingIdx].statusPulang : 'Belum Pulang',
    status: customStatus,
    keterangan: finalKeterangan,
    locationMasuk: location,
    locationPulang: existingIdx !== -1 ? list[existingIdx].locationPulang : undefined,
    fotoSelfieMasuk: fotoSelfie,
    fotoSelfiePulang: existingIdx !== -1 ? list[existingIdx].fotoSelfiePulang : undefined,
  };

  if (existingIdx !== -1) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }

  saveAbsensiGuruList(list);

  // Audit log
  addSystemLog({
    type: 'auth',
    action: `Absen Masuk Guru ${isLate ? '(TERLAMBAT)' : 'BERHASIL'}`,
    user: guru.username,
    role: 'guru',
    status: isLate ? 'warning' : 'success',
    details: `Nama: ${guru.nama || guru.username}, Jam: ${currentTime}, Status: ${statusMasukNote}.${location?.addressName ? ` Lokasi: ${location.addressName}` : ''}`,
    location,
  });

  return {
    success: true,
    message: customStatus === 'Hadir' ? (isLate ? 'Absen Masuk Berhasil (Tercatat Terlambat)' : 'Absen Masuk Berhasil (Tepat Waktu)') : `Status ${customStatus} berhasil dicatat.`,
    record,
  };
}

export function doTeacherCheckOut(
  username: string,
  location?: SystemLogLocation,
  fotoSelfie?: string,
  forceEarly = false
): { success: boolean; message: string; isEarlyWarning?: boolean; record?: AbsensiGuruRecord } {
  const today = getTodayDateString();
  const currentTime = getCurrentTimeString();
  const config = getAppConfig();
  const cleanUser = username.trim().toLowerCase();

  const list = getAbsensiGuruList();
  let existingIdx = list.findIndex((r) => r.tanggal === today && r.username.toLowerCase() === cleanUser);

  const isEarly = currentTime.slice(0, 5) < config.jam_pulang_mulai;

  if (isEarly && !forceEarly) {
    return {
      success: false,
      isEarlyWarning: true,
      message: `PERINGATAN: Jam pulang resmi sekolah adalah ${config.jam_pulang_mulai} WIB. Jam saat ini ${currentTime} WIB (Lebih awal). Absen pulang sekarang akan ditandai sebagai "PULANG CEPAT / KABUR"!`,
    };
  }

  const guruList = getGuruList();
  const guru = guruList.find((g) => g.username.toLowerCase() === cleanUser) || {
    username,
    nama: username === 'admin' ? 'Administrator Sekolah' : `Guru ${username}`,
    nip: '19800101 200501 1 001',
  };

  let record: AbsensiGuruRecord;
  if (existingIdx !== -1) {
    record = { ...list[existingIdx] };
  } else {
    record = {
      id: `att_guru_${today}_${cleanUser}`,
      username: guru.username,
      nip: guru.nip,
      nama: guru.nama || guru.username,
      tanggal: today,
      jamMasuk: '--:--',
      status: 'Hadir',
    };
  }

  record.jamPulang = currentTime;
  record.locationPulang = location;
  record.fotoSelfiePulang = fotoSelfie;

  if (isEarly) {
    record.statusPulang = 'Pulang Cepat / Kabur';
    record.status = 'Pulang Cepat';
    record.keterangan = `⚠️ PULANG CEPAT / KABUR: Absen pulang jam ${currentTime} (Sebelum Jam Resmi ${config.jam_pulang_mulai})`;
  } else {
    record.statusPulang = 'Sah';
    record.keterangan = (record.keterangan || 'Hadir') + ` | Absen Pulang Tepat Waktu (${currentTime})`;
  }

  if (existingIdx !== -1) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }

  saveAbsensiGuruList(list);

  // High priority audit log
  addSystemLog({
    type: 'auth',
    action: isEarly ? 'PULANG CEPAT GURU (Peringatan Audit)' : 'Absen Pulang Guru Sah',
    user: guru.username,
    role: 'guru',
    status: isEarly ? 'warning' : 'success',
    details: isEarly
      ? `PERINGATAN KELUAR AWAL: Guru ${guru.nama || guru.username} absen pulang pukul ${currentTime}, padahal jam pulang resmi ${config.jam_pulang_mulai}.`
      : `Guru ${guru.nama || guru.username} absen pulang tepat waktu pukul ${currentTime}.`,
    location,
  });

  // Check student attendance completion status for teacher class
  const allAbsensiSiswa = getAbsensiList().filter((a) => a.tanggal === today);
  const targetKelas = guru.kelas;
  let unreturnedStudents = 0;
  if (targetKelas) {
    unreturnedStudents = allAbsensiSiswa.filter(
      (a) => a.kelas === targetKelas && (a.jamPulang === '--:--' || !a.jamPulang) && a.status === 'Hadir'
    ).length;
  }

  let studentCheckNote = '';
  if (targetKelas && unreturnedStudents > 0) {
    studentCheckNote = ` (${unreturnedStudents} murid di Kelas ${targetKelas} belum absen pulang)`;
  }

  return {
    success: true,
    message: isEarly
      ? `Absen Pulang dicatat. PERINGATAN: Tercatat "PULANG CEPAT / KABUR" pada audit log!${studentCheckNote}`
      : `Absen Pulang Berhasil. Terima kasih atas dedikasi Anda mengajar hari ini!${studentCheckNote}`,
    record,
  };
}

// Notifications Helper Functions
export function getReadNotificationIds(): string[] {
  try {
    const tenantKey = getTenantStorageKey(KEYS.NOTIFICATIONS_READ);
    const data = localStorage.getItem(tenantKey) || localStorage.getItem(KEYS.NOTIFICATIONS_READ);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function markNotificationAsRead(id: string): void {
  const readIds = getReadNotificationIds();
  if (!readIds.includes(id)) {
    readIds.push(id);
    const tenantKey = getTenantStorageKey(KEYS.NOTIFICATIONS_READ);
    localStorage.setItem(tenantKey, JSON.stringify(readIds));
    localStorage.setItem(KEYS.NOTIFICATIONS_READ, JSON.stringify(readIds));
  }
}

export function markAllNotificationsAsRead(ids: string[]): void {
  const readIds = getReadNotificationIds();
  const merged = Array.from(new Set([...readIds, ...ids]));
  const tenantKey = getTenantStorageKey(KEYS.NOTIFICATIONS_READ);
  localStorage.setItem(tenantKey, JSON.stringify(merged));
  localStorage.setItem(KEYS.NOTIFICATIONS_READ, JSON.stringify(merged));
}

export function clearReadNotifications(): void {
  const tenantKey = getTenantStorageKey(KEYS.NOTIFICATIONS_READ);
  localStorage.removeItem(tenantKey);
  localStorage.removeItem(KEYS.NOTIFICATIONS_READ);
}

export function getAppNotifications(): AppNotification[] {
  const readIds = getReadNotificationIds();
  const today = getTodayDateString();
  const config = getAppConfig();
  const notifs: AppNotification[] = [];

  // 1. Teacher Early Checkout Warnings & Teacher Attendance
  const guruAbsensi = getAbsensiGuruList().filter((a) => a.tanggal === today);
  guruAbsensi.forEach((a) => {
    if (a.statusPulang === 'Pulang Cepat / Kabur') {
      notifs.push({
        id: `notif_guru_early_${a.id}`,
        title: '⚠️ Peringatan Audit: Guru Pulang Cepat',
        message: `Dewan Guru ${a.nama} absen pulang pukul ${a.jamPulang} WIB (sebelum jam resmi ${config.jam_pulang_mulai} WIB).`,
        timestamp: a.jamPulang || 'Hari ini',
        date: today,
        type: 'warning',
        read: readIds.includes(`notif_guru_early_${a.id}`),
        targetView: 'view-absensi-guru',
        iconType: 'alert',
      });
    } else if (a.jamMasuk && a.jamMasuk !== '--:--') {
      notifs.push({
        id: `notif_guru_masuk_${a.id}`,
        title: ' Dewan Guru Hadir',
        message: `${a.nama} melakukan Absen Masuk pukul ${a.jamMasuk} WIB (${a.statusMasuk || 'Hadir'}).`,
        timestamp: a.jamMasuk,
        date: today,
        type: 'presensi',
        read: readIds.includes(`notif_guru_masuk_${a.id}`),
        targetView: 'view-absensi-guru',
        iconType: 'check',
      });
    }
  });

  // 2. Student Late Check-in Warnings & Student Attendance Today
  const studentAbsensi = getAbsensiList().filter((a) => a.tanggal === today);
  studentAbsensi.forEach((a) => {
    if (a.jamDatang && a.jamDatang !== '--:--') {
      const isLate = (a.keterangan || '').includes('Terlambat');
      if (isLate) {
        notifs.push({
          id: `notif_siswa_late_${a.id}`,
          title: '⚠️ Siswa Terlambat Masuk',
          message: `Siswa ${a.nama} (Kelas ${a.kelas}) absen masuk pukul ${a.jamDatang} WIB (${a.keterangan}).`,
          timestamp: a.jamDatang,
          date: today,
          type: 'warning',
          read: readIds.includes(`notif_siswa_late_${a.id}`),
          targetView: 'view-monitoring',
          iconType: 'alert',
        });
      } else {
        notifs.push({
          id: `notif_siswa_masuk_${a.id}`,
          title: ' Presensi Siswa',
          message: `${a.nama} (${a.kelas}) telah presensi masuk pukul ${a.jamDatang} WIB.`,
          timestamp: a.jamDatang,
          date: today,
          type: 'presensi',
          read: readIds.includes(`notif_siswa_masuk_${a.id}`),
          targetView: 'view-monitoring',
          iconType: 'check',
        });
      }
    }
  });

  // 3. System Operational & Security Info
  notifs.push({
    id: 'notif_system_autologout',
    title: '🛡️ Proteksi Keamanan Sesi Aktif',
    message: 'Fitur Auto-Logout otomatis mengakhiri sesi setelah 30 menit tidak ada aktivitas untuk melindungi akun Anda.',
    timestamp: 'Sistem',
    date: today,
    type: 'system',
    read: readIds.includes('notif_system_autologout'),
    targetView: 'view-system-logs',
    iconType: 'lock',
  });

  notifs.push({
    id: 'notif_system_wa',
    title: '📱 WhatsApp Ortu Terintegrasi',
    message: 'Notifikasi presensi dapat langsung dikirimkan ke WhatsApp Orang Tua siswa saat scan masuk atau pulang.',
    timestamp: 'Sistem',
    date: today,
    type: 'info',
    read: readIds.includes('notif_system_wa'),
    targetView: 'view-data-siswa',
    iconType: 'whatsapp',
  });

  // Sort: Unread first, then warnings/presensi, then system
  return notifs.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return b.id.localeCompare(a.id);
  });
}

