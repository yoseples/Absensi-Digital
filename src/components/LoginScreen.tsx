import React, { useState } from 'react';
import {
  School,
  GraduationCap,
  UserCheck,
  ArrowRight,
  IdCard,
  Lock,
  User,
  AlertTriangle,
  UserPlus,
  Camera,
  Upload,
  X,
  MapPin,
  Compass,
  ShieldAlert,
  Navigation,
  Fingerprint,
  ScanFace,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  authenticateUser,
  authenticateBiometricFastLogin,
  getBiometricCredentialNisn,
  getBiometricCredentialForRole,
  registerSiswa,
  registerGuru,
  getKelasList,
  getAppLogo,
  getSchoolName,
  getAppConfig,
  addSystemLog,
  clearSession,
} from '../services/storage';
import { getActivationState } from '../services/activation';
import { UserSession, Siswa, SystemLogLocation } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const appConfig = getAppConfig();
  const loginTitle = appConfig.login_title || 'Sistem Absensi Digital';
  const loginSubtitle = appConfig.login_subtitle || 'Platform manajemen kehadiran siswa yang terintegrasi, real-time, dan mudah digunakan.';
  const loginBgUrl = appConfig.login_bg_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop';

  const [tab, setTab] = useState<'siswa' | 'admin'>('siswa');
  const [nisn, setNisn] = useState('');
  const [siswaPassword, setSiswaPassword] = useState('');
  const [showSiswaPassword, setShowSiswaPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsBlockedModal, setGpsBlockedModal] = useState(false);
  const [gpsLoadingStatus, setGpsLoadingStatus] = useState<string>('');

  // Self-Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regNama, setRegNama] = useState('');
  const [regNisn, setRegNisn] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regKelas, setRegKelas] = useState('X-A');
  const [regJenisKelamin, setRegJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [regTanggalLahir, setRegTanggalLahir] = useState('2008-01-01');
  const [regAgama, setRegAgama] = useState('Islam');
  const [regNoHp, setRegNoHp] = useState('');
  const [regAlamat, setRegAlamat] = useState('');
  const [regFoto, setRegFoto] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleRegPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setRegError('Ukuran foto maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRegFoto(reader.result as string);
      setRegError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);

    setTimeout(() => {
      const newSiswa: Siswa = {
        nama: regNama.trim(),
        nisn: regNisn.trim(),
        kelas: regKelas.trim(),
        jenisKelamin: regJenisKelamin,
        tanggalLahir: regTanggalLahir,
        agama: regAgama,
        password: regPassword.trim() || '123456',
        noHp: regNoHp.trim(),
        alamat: regAlamat.trim(),
        foto: regFoto.trim() || undefined,
      };

      const res = registerSiswa(newSiswa);
      setRegLoading(false);

      if (res.success && res.session) {
        setIsRegisterOpen(false);
        onLoginSuccess(res.session);
      } else {
        setRegError(res.message);
      }
    }, 400);
  };

  // Self-Registration Guru Modal State
  const [isRegisterGuruOpen, setIsRegisterGuruOpen] = useState(false);
  const [regGuruNama, setRegGuruNama] = useState('');
  const [regGuruNip, setRegGuruNip] = useState('');
  const [regGuruUsername, setRegGuruUsername] = useState('');
  const [regGuruPassword, setRegGuruPassword] = useState('123456');
  const [showRegGuruPassword, setShowRegGuruPassword] = useState(false);
  const [regGuruKelas, setRegGuruKelas] = useState('');
  const [regGuruNoHp, setRegGuruNoHp] = useState('');
  const [regGuruFoto, setRegGuruFoto] = useState('');
  const [regGuruError, setRegGuruError] = useState('');
  const [regGuruLoading, setRegGuruLoading] = useState(false);

  const handleRegGuruPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setRegGuruError('Ukuran foto maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRegGuruFoto(reader.result as string);
      setRegGuruError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterGuruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegGuruError('');
    setRegGuruLoading(true);

    setTimeout(() => {
      const res = registerGuru({
        nama: regGuruNama.trim(),
        nip: regGuruNip.trim() || undefined,
        username: regGuruUsername.trim() || regGuruNip.trim(),
        password: regGuruPassword.trim() || '123456',
        kelas: regGuruKelas.trim() || undefined,
        noHp: regGuruNoHp.trim() || undefined,
        foto: regGuruFoto.trim() || undefined,
      });
      setRegGuruLoading(false);

      if (res.success && res.session) {
        setIsRegisterGuruOpen(false);
        onLoginSuccess(res.session);
      } else {
        setRegGuruError(res.message);
      }
    }, 400);
  };

  const obtainLocation = (): Promise<{
    location?: SystemLogLocation;
    error?: string;
    isDenied?: boolean;
  }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          location: { permissionStatus: 'unavailable' },
          error: 'Perangkat Anda tidak mendukung pemindaian GPS lokasi.',
        });
        return;
      }

      setGpsLoadingStatus('Meminta izin & memindai lokasi GPS perangkat...');

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = Math.round(pos.coords.accuracy);

          resolve({
            location: {
              latitude: lat,
              longitude: lng,
              accuracy: accuracy,
              addressName: `Lat: ${lat.toFixed(5)}, Long: ${lng.toFixed(5)}`,
              permissionStatus: 'granted',
            },
          });
        },
        (err) => {
          const isDenied = err.code === err.PERMISSION_DENIED;
          let errMsg = 'Gagal mengakses lokasi GPS perangkat.';
          if (isDenied) {
            errMsg = 'Akses lokasi GPS perangkat ditolak oleh pengguna.';
          }
          resolve({
            location: { permissionStatus: isDenied ? 'denied' : 'unavailable' },
            error: errMsg,
            isDenied,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setGpsBlockedModal(false);
    setLoading(true);

    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const browserName = userAgent.includes('Chrome')
      ? 'Chrome'
      : userAgent.includes('Safari')
      ? 'Safari'
      : userAgent.includes('Firefox')
      ? 'Firefox'
      : 'Browser';
    const deviceInfo = `${browserName} / ${isMobile ? 'Mobile' : 'Desktop'}`;

    // Request GPS location
    const locResult = await obtainLocation();
    setGpsLoadingStatus('');

    // Pre-check credentials if attempting Guru login
    const isAttemptingGuru =
      tab === 'admin' &&
      username.trim().toLowerCase() !== 'admin' &&
      username.trim().toLowerCase() !== 'developer' &&
      username.trim().toLowerCase() !== 'dev' &&
      username.trim().toLowerCase() !== 'superadmin';

    // Strictly block Guru if GPS permission was denied
    if (isAttemptingGuru && locResult.isDenied) {
      setLoading(false);
      addSystemLog({
        type: 'auth',
        action: 'Login Guru Ditolak (Izin GPS Ditolak)',
        user: username || 'guru',
        role: 'guru',
        status: 'failed',
        details: 'LOGIN DIBLOKIR: Guru menolak izin lokasi GPS pada perangkat.',
        location: { permissionStatus: 'denied' },
        deviceInfo,
      });
      setGpsBlockedModal(true);
      setErrorMessage('Login Ditolak: Akses lokasi GPS wajib diizinkan untuk akun Guru!');
      return;
    }

    let res: UserSession;
    if (tab === 'siswa') {
      res = authenticateUser(undefined, siswaPassword, nisn, locResult.location, deviceInfo);
    } else {
      res = authenticateUser(username, password, undefined, locResult.location, deviceInfo);
    }

    // Double-check if authenticated role turned out to be Guru and GPS was denied
    if (res.success && res.role === 'guru' && locResult.isDenied) {
      clearSession();
      setLoading(false);
      addSystemLog({
        type: 'auth',
        action: 'Login Guru Dibatalkan (Wajib GPS)',
        user: username,
        role: 'guru',
        status: 'failed',
        details: 'LOGIN DIBATALKAN: Role pengguna adalah Guru, tetapi akses GPS tidak diberikan.',
        location: { permissionStatus: 'denied' },
        deviceInfo,
      });
      setGpsBlockedModal(true);
      setErrorMessage('Login Ditolak: Guru WAJIB mengizinkan lokasi GPS untuk dapat login.');
      return;
    }

    setLoading(false);
    if (res.success) {
      onLoginSuccess(res);
    } else {
      setErrorMessage(res.message || 'Login gagal.');
    }
  };

  const handleBiometricFastLoginRole = async (targetRole: 'admin' | 'siswa' | 'guru' | 'developer') => {
    setErrorMessage('');
    setLoading(true);

    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const browserName = userAgent.includes('Chrome')
      ? 'Chrome'
      : userAgent.includes('Safari')
      ? 'Safari'
      : userAgent.includes('Firefox')
      ? 'Firefox'
      : 'Browser';
    const deviceInfo = `${browserName} / ${isMobile ? 'Mobile' : 'Desktop'}`;

    const locResult = await obtainLocation();

    const bioResult = await authenticateBiometricFastLogin(targetRole, locResult.location, deviceInfo);
    setLoading(false);

    if (bioResult.success && bioResult.session) {
      onLoginSuccess(bioResult.session);
    } else {
      setErrorMessage(
        bioResult.message ||
          `Fast Login Biometrik (${targetRole.toUpperCase()}) belum diaktifkan untuk perangkat ini. Silakan masuk secara manual lalu aktifkan Biometrik di profil.`
      );
    }
  };

  const handleSmartFastLogin = (overrideRole?: 'admin' | 'siswa' | 'guru' | 'developer') => {
    if (overrideRole) {
      handleBiometricFastLoginRole(overrideRole);
      return;
    }

    // Smart detection: check which role has a saved biometric credential on this device
    const hasSiswa = !!getBiometricCredentialForRole('siswa');
    const hasAdmin = !!getBiometricCredentialForRole('admin');
    const hasGuru = !!getBiometricCredentialForRole('guru');
    const hasDev = !!getBiometricCredentialForRole('developer');

    if (tab === 'siswa') {
      if (hasSiswa) {
        handleBiometricFastLoginRole('siswa');
      } else if (hasAdmin) {
        handleBiometricFastLoginRole('admin');
      } else if (hasGuru) {
        handleBiometricFastLoginRole('guru');
      } else if (hasDev) {
        handleBiometricFastLoginRole('developer');
      } else {
        handleBiometricFastLoginRole('siswa');
      }
    } else {
      if (hasAdmin) {
        handleBiometricFastLoginRole('admin');
      } else if (hasGuru) {
        handleBiometricFastLoginRole('guru');
      } else if (hasDev) {
        handleBiometricFastLoginRole('developer');
      } else if (hasSiswa) {
        handleBiometricFastLoginRole('siswa');
      } else {
        handleBiometricFastLoginRole('admin');
      }
    }
  };

  const setDemoCreds = (type: 'siswa' | 'admin' | 'guru' | 'developer') => {
    setErrorMessage('');
    if (type === 'siswa') {
      setTab('siswa');
      setNisn('1234567890');
      setSiswaPassword('123456');
    } else if (type === 'developer') {
      setTab('admin');
      setUsername('developer');
      setPassword('dev123');
    } else if (type === 'admin') {
      setTab('admin');
      setUsername('admin');
      setPassword('admin123');
    } else if (type === 'guru') {
      setTab('admin');
      setUsername('guru1');
      setPassword('123456');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-900 font-sans text-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col lg:flex-row animate-fade-in my-8">
        {/* Left Branding Banner */}
        <div className="w-full lg:w-5/12 relative p-8 lg:p-10 flex flex-col justify-between text-white overflow-hidden group min-h-[320px] lg:min-h-[480px]">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
            style={{
              backgroundImage: `url('${loginBgUrl}')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/60 to-indigo-900/40" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg p-1.5 shrink-0">
                <img
                  src={getAppLogo()}
                  alt="Logo SMA NEGERI"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>
              <span className="font-bold tracking-wider text-xs sm:text-sm uppercase opacity-90">
                {getSchoolName()}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[11px] font-black uppercase rounded-md shadow-xs">
                v2.1
              </span>
              <span className="text-xs text-indigo-200 font-semibold tracking-wide uppercase">Rilis Resmi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-4 text-white drop-shadow-sm">
              {loginTitle}
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed max-w-xs opacity-90">
              {loginSubtitle}
            </p>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex gap-2 mb-4">
              <span className="h-1 w-8 bg-white rounded-full" />
              <span className="h-1 w-2 bg-white/30 rounded-full" />
              <span className="h-1 w-2 bg-white/30 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-indigo-200">
              <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 font-bold">
                v2.1
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
                Secure QR Login
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="w-full lg:w-7/12 bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-12 flex flex-col justify-center relative">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Selamat Datang Kembali</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Silakan masuk ke akun Anda</p>
            </div>

            {/* Quick Demo Fill Pill Buttons - Only shown when app is NOT activated */}
            {!getActivationState().isActivated && (
              <div className="mb-6 p-2.5 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-xl">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wide">
                  ⚡ Akun Demo Instan:
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDemoCreds('admin')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white text-slate-800 dark:text-slate-200 font-semibold rounded-md border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
                  >
                    Admin (admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoCreds('guru')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-purple-700 dark:text-purple-300 font-semibold rounded-md border border-purple-200 dark:border-purple-800 shadow-xs transition cursor-pointer"
                  >
                    Guru (guru1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoCreds('siswa')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 font-semibold rounded-md border border-indigo-200 dark:border-indigo-800 shadow-xs transition cursor-pointer"
                  >
                    Siswa (1234567890)
                  </button>
                </div>
              </div>
            )}

            {/* Switch Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl flex mb-6 border border-slate-200 dark:border-slate-700 relative">
              <button
                type="button"
                onClick={() => {
                  setTab('siswa');
                  setErrorMessage('');
                }}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  tab === 'siswa'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-4 h-4" /> Siswa
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('admin');
                  setErrorMessage('');
                }}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  tab === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Guru / Admin
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {tab === 'siswa' ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 ml-1">
                      NISN Siswa
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                        <IdCard className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        required
                        value={nisn}
                        onChange={(e) => setNisn(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 font-mono"
                        placeholder="Masukkan Nomor Induk Siswa"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 ml-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Password Siswa
                      </label>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Default: 123456
                      </span>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showSiswaPassword ? 'text' : 'password'}
                        required
                        value={siswaPassword}
                        onChange={(e) => setSiswaPassword(e.target.value)}
                        className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                        placeholder="Masukkan password siswa (default: 123456)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSiswaPassword(!showSiswaPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showSiswaPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 ml-1">
                      Username
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                        placeholder="Username akun"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 ml-1">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* GPS Geolocation Notice */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-[11px]">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Pelacakan Lokasi GPS:</span>
                  <span className="text-slate-600 dark:text-slate-400 ml-1">
                    {tab === 'admin'
                      ? 'Wajib diizinkan untuk akun Guru/Wali Kelas.'
                      : 'Merekam koordinat lokasi untuk audit presensi.'}
                  </span>
                </div>
              </div>

              {gpsLoadingStatus && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold rounded-xl flex items-center gap-2 animate-pulse">
                  <Compass className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>{gpsLoadingStatus}</span>
                </div>
              )}

              {/* Action Row: Fast Login (Left) + Login Submit (Right) */}
              <div className="flex items-center gap-3 pt-2">
                {/* Fast Login Square Button on the LEFT */}
                <button
                  type="button"
                  onClick={() => handleSmartFastLogin()}
                  disabled={loading}
                  title="Fast Login Biometrik (Sidik Jari / Wajah)"
                  className="h-14 w-14 shrink-0 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1464D2] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 active:scale-95 border border-blue-500/20"
                >
                  <ScanFace className="w-8 h-8 text-white" />
                </button>

                {/* Primary Login Button on the RIGHT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1464D2] text-white font-extrabold rounded-2xl shadow-md transition-all transform active:scale-[0.99] text-lg sm:text-xl flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60 border border-blue-500/20"
                >
                  <span>{loading ? 'Memproses...' : 'Login'}</span>
                </button>
              </div>
            </form>

            {/* Registration Action Buttons: Registrasi Siswa & Registrasi Guru */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700/60">
              <p className="text-[11px] font-bold text-center text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">
                Belum Memiliki Akun? Registrasi Mandiri
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Registrasi Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRegisterGuruOpen(true)}
                  className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
                >
                  <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Registrasi Guru</span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-5 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 animate-fade-in">
                <div className="p-2 bg-rose-100 rounded-full text-rose-600 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-700">Akses Ditolak</h4>
                  <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REGISTRASI MANDIRI SISWA MODAL */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
            onClick={() => setIsRegisterOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full z-10 animate-fade-in my-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5" /> Registrasi Mandiri Siswa
                </h3>
                <p className="text-xs opacity-90 mt-1">
                  Isi formulir untuk membuat profil dan kartu pelajar digital Anda.
                </p>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Photo Upload Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    {regFoto ? (
                      <img
                        src={regFoto}
                        alt="Preview Foto"
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-200 text-slate-500 flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
                        <Camera className="w-8 h-8 opacity-60" />
                        <span className="text-[9px] font-bold mt-1">Foto Siswa</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Foto Profil (Opsional)
                    </label>
                    <p className="text-xs text-slate-500">
                      Upload foto formal Anda (maksimal 2MB).
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                      <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-xs">
                        <Upload className="w-3.5 h-3.5" /> Pilih Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleRegPhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {regFoto && (
                        <button
                          type="button"
                          onClick={() => setRegFoto('')}
                          className="bg-rose-100 text-rose-700 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Contoh: Muhammad Farhan"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      NISN (Sebagai ID Login) *
                    </label>
                    <input
                      type="number"
                      required
                      value={regNisn}
                      onChange={(e) => setRegNisn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="10 digit NISN"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Kelas *
                    </label>
                    <select
                      value={regKelas}
                      onChange={(e) => setRegKelas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {getKelasList().map((k) => (
                        <option key={k} value={k}>
                          Kelas {k}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Password Login Siswa
                    </label>
                    <span className="text-[10px] text-slate-500">Opsional (default: 123456)</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 pr-10 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Buat password akun Anda (min. 6 karakter)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={regJenisKelamin}
                      onChange={(e) => setRegJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Agama
                    </label>
                    <select
                      value={regAgama}
                      onChange={(e) => setRegAgama(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Khonghucu">Khonghucu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={regNoHp}
                    onChange={(e) => setRegNoHp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3"
                    placeholder="081234567890"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Alamat Rumah
                  </label>
                  <textarea
                    rows={2}
                    value={regAlamat}
                    onChange={(e) => setRegAlamat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3"
                    placeholder="Alamat domisili tempat tinggal"
                  />
                </div>

                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                    {regError}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs shadow-lg hover:from-indigo-700 hover:to-purple-700 transition cursor-pointer disabled:opacity-60"
                  >
                    {regLoading ? 'DAFTAR...' : 'DAFTAR & MASUK'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRASI MANDIRI GURU MODAL */}
      {isRegisterGuruOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
            onClick={() => setIsRegisterGuruOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full z-10 animate-fade-in my-6 border border-purple-100 dark:border-purple-900/40">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <UserCheck className="w-5 h-5" /> Registrasi Mandiri Guru & Wali Kelas
                </h3>
                <p className="text-xs opacity-90 mt-1">
                  Isi formulir untuk membuat akun Pendidik / Wali Kelas Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterGuruOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleRegisterGuruSubmit} className="space-y-4">
                {/* Photo Upload Box */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    {regGuruFoto ? (
                      <img
                        src={regGuruFoto}
                        alt="Preview Foto Guru"
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                        <Camera className="w-8 h-8 opacity-60" />
                        <span className="text-[9px] font-bold mt-1">Foto Guru</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Foto Profil Guru (Opsional)
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload foto formal Anda (maksimal 2MB).
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                      <label className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-xs">
                        <Upload className="w-3.5 h-3.5" /> Pilih Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleRegGuruPhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {regGuruFoto && (
                        <button
                          type="button"
                          onClick={() => setRegGuruFoto('')}
                          className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={regGuruNama}
                    onChange={(e) => setRegGuruNama(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                    placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Username Login *
                    </label>
                    <input
                      type="text"
                      required
                      value={regGuruUsername}
                      onChange={(e) => setRegGuruUsername(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                      placeholder="Contoh: guru_aminah"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      NIP (Opsional)
                    </label>
                    <input
                      type="text"
                      value={regGuruNip}
                      onChange={(e) => setRegGuruNip(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                      placeholder="19800520..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegGuruPassword ? 'text' : 'password'}
                      required
                      value={regGuruPassword}
                      onChange={(e) => setRegGuruPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl p-3 pr-10 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                      placeholder="Minimal 6 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegGuruPassword(!showRegGuruPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegGuruPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Wali Kelas (Opsional)
                    </label>
                    <select
                      value={regGuruKelas}
                      onChange={(e) => setRegGuruKelas(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl p-3"
                    >
                      <option value="">Guru Umum (Tanpa Wali Kelas)</option>
                      {getKelasList().map((k) => (
                        <option key={k} value={k}>
                          Wali Kelas {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      No. WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      value={regGuruNoHp}
                      onChange={(e) => setRegGuruNoHp(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl p-3"
                      placeholder="081234567890"
                    />
                  </div>
                </div>

                {regGuruError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{regGuruError}</span>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterGuruOpen(false)}
                    className="flex-1 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={regGuruLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg hover:from-purple-700 hover:to-indigo-700 transition cursor-pointer disabled:opacity-60"
                  >
                    {regGuruLoading ? 'DAFTAR...' : 'DAFTAR & MASUK'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* GPS Blocked Modal */}
      {gpsBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setGpsBlockedModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs animate-bounce">
                <MapPin className="w-8 h-8" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase rounded-full border border-rose-200">
                  Keamanan Sistem v2.1
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Akses Lokasi GPS Ditolak!</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sesuai kebijakan keamanan <strong className="text-slate-900">Sistem Absensi Digital v2.1</strong>, akun <strong className="text-rose-600">Guru / Wali Kelas WAJIB mengizinkan lokasi GPS</strong> pada perangkat ini saat login.
                </p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left space-y-2 text-xs text-rose-950">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Mengapa Lokasi Diperlukan?</span>
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-1 text-slate-700">
                  <li>Pelacakan riwayat login lokasi terpusat di panel Admin.</li>
                  <li>Memastikan Guru/Wali Kelas berada di lokasi sah.</li>
                  <li>Mencegah kecurangan & penggunaan akun pihak lain.</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-600" />
                  Cara Mengaktifkan Lokasi:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                  <li>Klik ikon gembok / info di sebelah kiri URL di browser.</li>
                  <li>Ubah izin <strong>Lokasi (Location)</strong> menjadi <strong>Izinkan (Allow)</strong>.</li>
                  <li>Coba klik tombol <strong>MASUK APLIKASI</strong> kembali.</li>
                </ol>
              </div>

              <button
                onClick={() => setGpsBlockedModal(false)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                SAYA MENGERTI
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="absolute bottom-4 text-slate-500 text-xs font-medium opacity-70">
        © 2026 {getSchoolName()}. Sistem Absensi Digital v2.1 (Aktivasi Terpusat)
      </p>
    </div>
  );
};
