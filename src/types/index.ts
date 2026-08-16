export type Role = 'developer' | 'admin' | 'guru' | 'siswa';

export interface Siswa {
  nama: string;
  nisn: string;
  kelas: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tanggalLahir: string;
  agama: string;
  password?: string;
  biometricEnabled?: boolean;
  namaAyah?: string;
  namaIbu?: string;
  noHp?: string;
  alamat?: string;
  foto?: string;
  waVerified?: boolean;
  waLastSentAt?: string;
}

export interface Guru {
  id?: string;
  username: string;
  password?: string;
  nama?: string;
  nip?: string;
  kelas?: string; // Wali kelas untuk kelas tertentu (kosong = semua kelas, dapat diisi manual)
  kelasDiampu?: string;
  foto?: string; // Foto profil guru (base64 atau URL)
  noHp?: string;
}

export interface AbsensiRecord {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  jamDatang?: string; // HH:mm:ss
  jamPulang?: string; // HH:mm:ss
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Belum Absen';
  keterangan?: string; // e.g. "Tepat Waktu", "Terlambat (15 m)", "Pulang Cepat"
}

export interface AbsensiGuruRecord {
  id: string;
  username: string;
  nip?: string;
  nama: string;
  tanggal: string; // YYYY-MM-DD
  jamMasuk?: string; // HH:mm:ss
  jamPulang?: string; // HH:mm:ss
  statusMasuk?: 'Hadir Tepat Waktu' | 'Terlambat';
  statusPulang?: 'Sah' | 'Pulang Cepat / Kabur' | 'Belum Pulang';
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Alfa' | 'Tugas Luar' | 'Pulang Cepat' | 'Belum Absen';
  keterangan?: string;
  locationMasuk?: SystemLogLocation;
  locationPulang?: SystemLogLocation;
  fotoSelfieMasuk?: string;
  fotoSelfiePulang?: string;
}

export interface HariLibur {
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
}

export interface SystemLogLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  addressName?: string;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unavailable';
}

export interface SystemLog {
  id: string;
  timestamp: string; // Formatted date string or ISO
  type: 'auth' | 'config' | 'database' | 'system' | 'data';
  action: string;
  user: string;
  role: Role;
  details?: string;
  status: 'success' | 'failed' | 'warning' | 'info';
  ipAddress?: string;
  location?: SystemLogLocation;
  deviceInfo?: string;
}

export interface DomainTenantConfig {
  id: string;
  domain: string; // e.g. "sma1.sch.id", "sma2.sch.id", "sma3.sch.id"
  nama_sekolah: string;
  logo_url?: string;
  favicon_url?: string;
  alamat_sekolah?: string;
  telepon_sekolah?: string;
  email_sekolah?: string;
  nama_kepala_sekolah?: string;
  nip_kepala_sekolah?: string;
  firebase_config?: FirebaseAppConfig;
  supabase_config?: SupabaseAppConfig;
}

export interface FirebaseAppConfig {
  enabled: boolean;
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  databaseURL?: string;
}

export interface SupabaseAppConfig {
  enabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  tenantTablePrefix?: string;
  schema?: string;
}

export interface AppConfig {
  nama_sekolah: string;
  npsn?: string;
  alamat_sekolah?: string;
  telepon_sekolah?: string;
  email_sekolah?: string;
  no_whatsapp_pengirim?: string;
  tahun_ajaran?: string;
  semester_aktif?: 'Ganjil' | 'Genap' | string;
  nama_kepala_sekolah?: string;
  nip_kepala_sekolah?: string;
  jam_masuk_mulai: string; // e.g. "06:30"
  jam_masuk_akhir: string; // e.g. "07:15" (batas terlambat)
  jam_pulang_mulai: string; // e.g. "15:00"
  jam_pulang_akhir: string; // e.g. "17:00"
  logo_url?: string; // custom logo URL or base64 data
  favicon_url?: string; // custom favicon URL or base64 data
  login_title?: string; // custom title on login page (Developer only)
  login_subtitle?: string; // custom description on login page (Developer only)
  login_bg_url?: string; // custom background image URL or base64 on login page (Developer only)
  mysql_api_url?: string; // custom base URL for MySQL API
  firebase_config?: FirebaseAppConfig; // custom Firebase Realtime/Firestore config
  supabase_config?: SupabaseAppConfig; // custom Supabase Database config (Total Isolation)
  multi_domain_enabled?: boolean;
  domain_tenants?: DomainTenantConfig[];
  active_tenant_id?: string;
  active_domain?: string;
  activation_token?: string;
  activation_date?: string;
  registered_school?: string;
}

export interface UserSession {
  success: boolean;
  role: Role;
  username?: string;
  nama?: string;
  nip?: string;
  nisn?: string;
  kelas?: string;
  foto?: string;
  token?: string;
  message?: string;
}

export interface FilterReport {
  tanggalMulai: string;
  tanggalAkhir: string;
  kelas?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  date: string;
  type: 'presensi' | 'warning' | 'info' | 'system';
  read: boolean;
  targetView?: string;
  iconType?: 'check' | 'alert' | 'whatsapp' | 'lock' | 'bell' | 'user';
}
