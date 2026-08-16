import React, { useState, useEffect } from 'react';
import { 
  Clock, RefreshCw, Users, Check, Stethoscope, Send, X, BarChart3, QrCode, 
  GraduationCap, FileText, CalendarX, Database, ShieldAlert, Settings, KeyRound, 
  Award, ArrowRight, Search, Filter, ChevronRight, UserCheck, UserX, AlertCircle, Eye, Trash2,
  Fingerprint, ScanFace, ShieldCheck
} from 'lucide-react';
import { getMonitoringRealtimeData, getGuruList, getAbsensiGuruList, getTodayDateString, getKelasList, clearAppCache, setBiometricCredentialForRole, getBiometricCredentialForRole, clearBiometricCredentialForRole } from '../services/storage';
import { getActivationState, DEMO_LIMITS } from '../services/activation';
import { checkMySqlConnection } from '../services/api';
import { UserSession, AbsensiRecord, AbsensiGuruRecord } from '../types';

interface DashboardAdminProps {
  onNavigate: (viewId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  currentUser?: UserSession;
  onOpenActivationModal?: () => void;
  onOpenMysqlModal?: () => void;
}

export const DashboardAdmin: React.FC<DashboardAdminProps> = ({ onNavigate, onShowToast, currentUser, onOpenActivationModal, onOpenMysqlModal }) => {
  const [data, setData] = useState(() => getMonitoringRealtimeData());
  const [refreshing, setRefreshing] = useState(false);
  const isDeveloper = currentUser?.role === 'developer';
  const activeRole: 'admin' | 'developer' = isDeveloper ? 'developer' : 'admin';
  const activationState = getActivationState();

  // Biometric Fast Login State
  const [isBiometricActive, setIsBiometricActive] = useState<boolean>(
    () => !!getBiometricCredentialForRole(activeRole)
  );

  const handleToggleBiometric = () => {
    if (isBiometricActive) {
      clearBiometricCredentialForRole(activeRole);
      setIsBiometricActive(false);
      onShowToast(`Fast Login Biometrik ${activeRole.toUpperCase()} telah dinonaktifkan di perangkat ini.`, 'info');
    } else {
      setBiometricCredentialForRole(
        activeRole,
        currentUser?.username || activeRole,
        currentUser?.nama || (isDeveloper ? 'Developer / Super Admin' : 'Administrator Sekolah')
      );
      setIsBiometricActive(true);
      onShowToast(`Fast Login Biometrik ${activeRole.toUpperCase()} BERHASIL diaktifkan untuk perangkat ini!`, 'success');
    }
  };

  // Database connection status state
  const [dbStatus, setDbStatus] = useState<{
    loading: boolean;
    success: boolean;
    isCpanelMysql: boolean;
    message: string;
    url: string;
  }>({
    loading: true,
    success: false,
    isCpanelMysql: false,
    message: 'Memeriksa status koneksi database...',
    url: '',
  });

  const handleTestDb = async () => {
    setDbStatus((prev) => ({ ...prev, loading: true }));
    const res = await checkMySqlConnection();
    setDbStatus({
      loading: false,
      success: res.success,
      isCpanelMysql: res.isCpanelMysql,
      message: res.message,
      url: res.url,
    });
  };

  useEffect(() => {
    handleTestDb();
    const interval = setInterval(handleTestDb, 15000);
    const handleDbStatusChanged = (e: any) => {
      if (e.detail) {
        setDbStatus({
          loading: false,
          success: e.detail.success,
          isCpanelMysql: e.detail.isCpanelMysql,
          message: e.detail.message,
          url: e.detail.url,
        });
      }
    };
    window.addEventListener('db_status_changed', handleDbStatusChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('db_status_changed', handleDbStatusChanged);
    };
  }, []);

  // Student category modal detail states
  const [selectedStudentCategory, setSelectedStudentCategory] = useState<'Total' | 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Belum Absen' | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  // Teacher attendance list & filter states
  const [teacherFilterStatus, setTeacherFilterStatus] = useState<'Semua' | 'Hadir' | 'Tidak Hadir' | 'Sakit' | 'Izin' | 'Belum Absen'>('Semua');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

  const loadData = () => {
    setRefreshing(true);
    setTimeout(() => {
      setData(getMonitoringRealtimeData());
      setRefreshing(false);
    }, 200);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto refresh data after 10 minutes (600,000 ms) of user inactivity
  useEffect(() => {
    const IDLE_TIME_LIMIT = 10 * 60 * 1000; // 10 minutes
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        loadData();
        handleTestDb();
        if (onShowToast) {
          onShowToast('Data diperbarui otomatis karena 10 menit tidak ada aktivitas', 'info');
        }
        resetIdleTimer();
      }, IDLE_TIME_LIMIT);
    };

    resetIdleTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer));

    return () => {
      clearTimeout(idleTimer);
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, []);

  const total = data.length;
  const hadir = data.filter((d) => d.status === 'Hadir').length;
  const sakit = data.filter((d) => d.status === 'Sakit').length;
  const izin = data.filter((d) => d.status === 'Izin').length;
  const alpa = data.filter((d) => d.status === 'Alpa').length;
  const belum = data.filter((d) => d.status === 'Belum Absen').length;

  const maxVal = Math.max(total, 1);
  const availableClasses = getKelasList();

  // Teacher attendance data calculation
  const allGuru = getGuruList().filter((g) => (g.username || g.nip || '').toLowerCase() !== 'developer'); // exclude dev account
  const todayStr = getTodayDateString();
  const todayGuruRecords = getAbsensiGuruList().filter((r) => r.tanggal === todayStr);

  const teacherAttendanceList = allGuru.map((guru) => {
    const guruUser = (guru.username || guru.nip || '').toLowerCase();
    const record = todayGuruRecords.find((r) => (r.username || r.nip || '').toLowerCase() === guruUser);
    let status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Alfa' | 'Tugas Luar' | 'Pulang Cepat' | 'Belum Absen' = 'Belum Absen';
    let keterangan = 'Belum Melakukan Absen GPS Hari Ini';
    let jamMasuk = '--:--';
    let jamPulang = '--:--';

    if (record) {
      status = record.status;
      jamMasuk = record.jamMasuk || '--:--';
      jamPulang = record.jamPulang || '--:--';
      if (record.keterangan && record.keterangan.trim() !== '') {
        keterangan = record.keterangan;
      } else {
        keterangan = status === 'Hadir' ? 'Hadir & Mengajar' : `Status: ${status}`;
      }
    }

    return {
      guru,
      record,
      status,
      keterangan,
      jamMasuk,
      jamPulang,
    };
  });

  const totalGuruCount = teacherAttendanceList.length;
  const guruHadirCount = teacherAttendanceList.filter((t) => t.status === 'Hadir' || t.status === 'Pulang Cepat').length;
  const guruTidakHadirCount = totalGuruCount - guruHadirCount;
  const guruSakitCount = teacherAttendanceList.filter((t) => t.status === 'Sakit').length;
  const guruIzinCount = teacherAttendanceList.filter((t) => t.status === 'Izin').length;
  const guruBelumCount = teacherAttendanceList.filter((t) => t.status === 'Belum Absen' || t.status === 'Alpa').length;

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const currentDateStr = new Date().toLocaleDateString('id-ID', options);

  const handleManualRefresh = () => {
    loadData();
    onShowToast('Statistik Dashboard diperbarui.', 'success');
  };

  const handleClearCache = () => {
    clearAppCache();
    loadData();
    onShowToast('Cache aplikasi & storage browser berhasil dibersihkan!', 'success');
  };

  // Filtered student list for modal view
  const filteredStudentsForModal = data.filter((item) => {
    // Category match
    if (selectedStudentCategory === 'Hadir' && item.status !== 'Hadir') return false;
    if (selectedStudentCategory === 'Sakit' && item.status !== 'Sakit') return false;
    if (selectedStudentCategory === 'Izin' && item.status !== 'Izin') return false;
    if (selectedStudentCategory === 'Alpa' && item.status !== 'Alpa') return false;
    if (selectedStudentCategory === 'Belum Absen' && item.status !== 'Belum Absen') return false;

    // Search match
    if (studentSearchQuery.trim() !== '') {
      const q = studentSearchQuery.toLowerCase();
      const matchName = (item.nama || '').toLowerCase().includes(q);
      const matchNisn = (item.nisn || '').toLowerCase().includes(q);
      const matchKelas = (item.kelas || '').toLowerCase().includes(q);
      if (!matchName && !matchNisn && !matchKelas) return false;
    }

    // Class match
    if (studentClassFilter && item.kelas !== studentClassFilter) return false;

    return true;
  });

  // Filtered teacher list
  const filteredTeachers = teacherAttendanceList.filter((item) => {
    if (teacherFilterStatus === 'Hadir' && item.status !== 'Hadir' && item.status !== 'Pulang Cepat') return false;
    if (teacherFilterStatus === 'Tidak Hadir' && (item.status === 'Hadir' || item.status === 'Pulang Cepat')) return false;
    if (teacherFilterStatus === 'Sakit' && item.status !== 'Sakit') return false;
    if (teacherFilterStatus === 'Izin' && item.status !== 'Izin') return false;
    if (teacherFilterStatus === 'Belum Absen' && item.status !== 'Belum Absen' && item.status !== 'Alpa') return false;

    if (teacherSearchQuery.trim() !== '') {
      const q = teacherSearchQuery.toLowerCase();
      const matchNama = (item.guru?.nama || item.guru?.username || item.guru?.nip || '').toLowerCase().includes(q);
      const matchNip = (item.guru?.nip || '').toLowerCase().includes(q);
      const matchKelas = (item.guru?.kelas || item.guru?.kelasDiampu || '').toLowerCase().includes(q);
      const matchKet = (item.keterangan || '').toLowerCase().includes(q);
      if (!matchNama && !matchNip && !matchKelas && !matchKet) return false;
    }

    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isDeveloper ? 'Dashboard Developer' : 'Dashboard Admin'}
            </h2>
            {isDeveloper && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 border border-amber-300 shadow-xs tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-slate-950" /> Developer Tier
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isDeveloper
              ? 'Pusat kontrol penuh sistem, manajemen database cPanel, dan data absensi.'
              : 'Pusat kontrol data absensi sekolah.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold bg-white text-slate-600 px-3 py-2 rounded-lg border border-slate-200 shadow-xs flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateStr}</span>
          </span>
          <button
            onClick={handleClearCache}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3.5 py-2 rounded-lg shadow-xs hover:bg-slate-50 hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
            title="Bersihkan cache browser, notifikasi, & memori aplikasi"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Cache</span>
          </button>
        </div>
      </div>

      {/* Large Quick Scan Absensi Banner */}
      <div
        onClick={() => onNavigate('view-scanner')}
        className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white p-4 sm:p-5 rounded-2xl shadow-md hover:shadow-xl border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all transform active:scale-[0.99] cursor-pointer group animate-fade-in"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-white/25 transition">
            <QrCode className="w-6 h-6 text-emerald-200 animate-pulse" />
          </div>
          <div>
            <h4 className="font-black text-base sm:text-lg text-white flex items-center gap-2 tracking-tight">
              <span>Pemindai Scan Absensi Siswa & Guru (Real-time)</span>
            </h4>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              Klik di sini untuk membuka kamera pemindai QR Code & Barcode kartu absensi secara cepat.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('view-scanner');
          }}
          className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-emerald-950 font-black px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md shrink-0 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-emerald-600" />
          <span>BUKA SCANNER SEKARANG</span>
          <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>



      {/* Metric Cards Grid (Clickable: 2x2 layout on mobile for Hadir, Sakit, Izin, Alpa) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Siswa (Full Width on Mobile) */}
        <button
          onClick={() => {
            setSelectedStudentCategory('Total');
            setStudentSearchQuery('');
            setStudentClassFilter('');
          }}
          className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-indigo-100 hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer active:scale-[0.98]"
        >
          <div className="absolute right-0 top-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Siswa
            </p>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3 h-3" /> Detail
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <h3 className="text-2xl font-bold text-slate-800">{total}</h3>
            <div className="text-indigo-500 bg-indigo-50 p-2.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </button>

        {/* Hadir */}
        <button
          onClick={() => {
            setSelectedStudentCategory('Hadir');
            setStudentSearchQuery('');
            setStudentClassFilter('');
          }}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-emerald-100 hover:border-emerald-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer active:scale-[0.98]"
        >
          <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Hadir
            </p>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3 h-3" /> Detail
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{hadir}</h3>
            <div className="text-emerald-500 bg-emerald-50 p-2 sm:p-2.5 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </button>

        {/* Sakit */}
        <button
          onClick={() => {
            setSelectedStudentCategory('Sakit');
            setStudentSearchQuery('');
            setStudentClassFilter('');
          }}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-amber-100 hover:border-amber-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer active:scale-[0.98]"
        >
          <div className="absolute right-0 top-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Sakit
            </p>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3 h-3" /> Detail
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{sakit}</h3>
            <div className="text-amber-500 bg-amber-50 p-2 sm:p-2.5 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </button>

        {/* Izin */}
        <button
          onClick={() => {
            setSelectedStudentCategory('Izin');
            setStudentSearchQuery('');
            setStudentClassFilter('');
          }}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer active:scale-[0.98]"
        >
          <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Izin
            </p>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3 h-3" /> Detail
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{izin}</h3>
            <div className="text-blue-500 bg-blue-50 p-2 sm:p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </button>

        {/* Alpa */}
        <button
          onClick={() => {
            setSelectedStudentCategory('Alpa');
            setStudentSearchQuery('');
            setStudentClassFilter('');
          }}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-rose-100 hover:border-rose-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer active:scale-[0.98]"
        >
          <div className="absolute right-0 top-0 w-16 h-16 bg-rose-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Alpa
            </p>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3 h-3" /> Detail
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{alpa}</h3>
            <div className="text-rose-500 bg-rose-50 p-2 sm:p-2.5 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </button>
      </div>

      {/* Main Grid: Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Grafik Statistik Kehadiran Hari Ini</span>
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-medium">
              Realtime Sync
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="relative w-full h-[300px] flex items-end justify-around pt-8 pb-4 border-b border-slate-100">
            {[
              { label: 'Hadir', val: hadir, color: 'bg-emerald-500', bgHover: 'hover:bg-emerald-600', cat: 'Hadir' as const },
              { label: 'Sakit', val: sakit, color: 'bg-amber-500', bgHover: 'hover:bg-amber-600', cat: 'Sakit' as const },
              { label: 'Izin', val: izin, color: 'bg-blue-500', bgHover: 'hover:bg-blue-600', cat: 'Izin' as const },
              { label: 'Alpa', val: alpa, color: 'bg-rose-500', bgHover: 'hover:bg-rose-600', cat: 'Alpa' as const },
              { label: 'Belum Absen', val: belum, color: 'bg-slate-400', bgHover: 'hover:bg-slate-500', cat: 'Belum Absen' as const },
            ].map((bar, idx) => {
              const heightPct = Math.round((bar.val / maxVal) * 100);
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedStudentCategory(bar.cat);
                    setStudentSearchQuery('');
                    setStudentClassFilter('');
                  }}
                  className="flex flex-col items-center h-full justify-end group w-1/6 cursor-pointer focus:outline-none"
                  title={`Klik untuk lihat list siswa ${bar.label}`}
                >
                  <span className="text-xs font-bold text-slate-700 mb-2 opacity-90 group-hover:scale-110 group-hover:text-indigo-600 transition-all">
                    {bar.val}
                  </span>
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl h-full flex items-end overflow-hidden group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all">
                    <div
                      className={`w-full ${bar.color} ${bar.bgHover} rounded-t-xl transition-all duration-700`}
                      style={{ height: `${Math.max(heightPct, 6)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-3 text-center truncate w-full group-hover:text-slate-800">
                    {bar.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-around text-xs text-slate-500 mt-4 pt-2">
            <span className="flex items-center gap-1.5 font-medium cursor-pointer hover:text-emerald-700" onClick={() => setSelectedStudentCategory('Hadir')}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Hadir ({hadir})
            </span>
            <span className="flex items-center gap-1.5 font-medium cursor-pointer hover:text-amber-700" onClick={() => setSelectedStudentCategory('Sakit')}>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Sakit ({sakit})
            </span>
            <span className="flex items-center gap-1.5 font-medium cursor-pointer hover:text-blue-700" onClick={() => setSelectedStudentCategory('Izin')}>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Izin ({izin})
            </span>
            <span className="flex items-center gap-1.5 font-medium cursor-pointer hover:text-rose-700" onClick={() => setSelectedStudentCategory('Alpa')}>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Alpa ({alpa})
            </span>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center text-sm gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Akses Cepat</span>
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => onNavigate('open-dev-settings')}
                className="w-full flex items-center p-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all group text-left cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center mr-3 group-hover:scale-110 transition shrink-0 shadow-sm">
                  <Settings className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <span>Pengaturan Sekolah & Branding</span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                      isDeveloper ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
                    }`}>
                      {isDeveloper ? 'Developer' : 'Admin'}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-800">
                    {isDeveloper
                      ? 'Nama Sekolah, Logo, Multi-Domain & Sistem'
                      : 'Identitas Sekolah, Logo, Tahun Ajaran & Jam'}
                  </div>
                </div>
              </button>

              {isDeveloper && (
                <>
                  <button
                    onClick={() => onNavigate('open-mysql-modal')}
                    className="w-full flex items-center p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition-all group text-left cursor-pointer shadow-2xs"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center mr-3 group-hover:scale-110 transition shrink-0 shadow-sm">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <span>Database MySQL (cPanel)</span>
                        <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-extrabold uppercase rounded">Developer</span>
                      </div>
                      <div className="text-[10px] text-indigo-700">Konfigurasi hosting & endpoint PHP</div>
                    </div>
                  </button>
                </>
              )}

              <button
                onClick={() => onNavigate('view-system-logs')}
                className="w-full flex items-center p-3 rounded-xl border border-slate-300 bg-slate-900 hover:bg-slate-800 text-white transition-all group text-left cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center mr-3 group-hover:scale-110 transition shrink-0 shadow-sm font-bold">
                  <ShieldAlert className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                    <span>Log Sistem & Audit Trail</span>
                    <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-extrabold uppercase rounded">
                      {isDeveloper ? 'Developer' : 'Admin'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300">Riwayat otentikasi & perubahan sistem</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('view-scanner')}
                className="w-full flex items-center p-3 rounded-xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 group-hover:scale-110 transition shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-700">Scan Absensi</div>
                  <div className="text-[10px] text-slate-400">Mode scanner kamera</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('view-data-siswa')}
                className="w-full flex items-center p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:scale-110 transition shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-700">Data Siswa</div>
                  <div className="text-[10px] text-slate-400">Kelola database siswa</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('view-rekap-absensi')}
                className="w-full flex items-center p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 group-hover:scale-110 transition shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-700">Laporan</div>
                  <div className="text-[10px] text-slate-400">Export & rekap data</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('view-kelola-absen')}
                className="w-full flex items-center p-3 rounded-xl border border-slate-100 hover:bg-rose-50 hover:border-rose-200 transition-all group text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mr-3 group-hover:scale-110 transition shrink-0">
                  <CalendarX className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-700">Hari Libur & Jam Operasional</div>
                  <div className="text-[10px] text-slate-400">Pengaturan jadwal sekolah</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION: DATA KEHADIRAN GURU HARI INI */}
      {/* ==================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Data Kehadiran Guru Hari Ini</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi presensi GPS dan alasan ketidakhadiran tenaga pengajar / dewan guru.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg">
              {totalGuruCount} Akun Guru Terdaftar
            </span>
          </div>
        </div>

        {/* Teacher Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card Total Guru */}
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Total Guru</p>
              <h4 className="text-2xl font-black text-indigo-950 mt-1">{totalGuruCount}</h4>
              <p className="text-[11px] text-indigo-600 font-medium">Pengajar Aktif Sekolah</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card Guru Hadir */}
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Guru Hadir</p>
              <h4 className="text-2xl font-black text-emerald-950 mt-1">{guruHadirCount}</h4>
              <p className="text-[11px] text-emerald-600 font-medium">Presensi Masuk Berhasil</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Card Guru Tidak Hadir */}
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Guru Tidak Hadir</p>
              <h4 className="text-2xl font-black text-amber-950 mt-1">{guruTidakHadirCount}</h4>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold">
                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">Sakit: {guruSakitCount}</span>
                <span className="bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded">Izin: {guruIzinCount}</span>
                <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded">Belum: {guruBelumCount}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Teacher Search & Status Tabs Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'Semua', label: `Semua (${totalGuruCount})` },
              { id: 'Hadir', label: `Hadir (${guruHadirCount})` },
              { id: 'Tidak Hadir', label: `Tidak Hadir (${guruTidakHadirCount})` },
              { id: 'Sakit', label: `Sakit (${guruSakitCount})` },
              { id: 'Izin', label: `Izin (${guruIzinCount})` },
              { id: 'Belum Absen', label: `Belum Absen (${guruBelumCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTeacherFilterStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  teacherFilterStatus === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru / NIP..."
              value={teacherSearchQuery}
              onChange={(e) => setTeacherSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* Teacher Attendance Table with Absence Reasons */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3.5 py-3">Nama Guru & NIP</th>
                <th className="px-3.5 py-3">Wali Kelas</th>
                <th className="px-3.5 py-3">Jam Masuk</th>
                <th className="px-3.5 py-3">Jam Pulang</th>
                <th className="px-3.5 py-3 text-center">Status</th>
                <th className="px-3.5 py-3">Keterangan / Alasan Ketidakhadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTeachers.map(({ guru, status, keterangan, jamMasuk, jamPulang }) => (
                <tr key={guru.username} className="hover:bg-slate-50/80 transition">
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      {guru.foto ? (
                        <img src={guru.foto} alt={guru.nama} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {(guru.nama || guru.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{guru.nama || guru.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIP: {guru.nip || 'Belum diisi'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3">
                    {guru.kelas ? (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-bold border border-indigo-100">
                        {guru.kelas}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Guru Pengajar</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold text-slate-700">{jamMasuk}</td>
                  <td className="px-3.5 py-3 font-mono font-bold text-slate-700">{jamPulang}</td>
                  <td className="px-3.5 py-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        status === 'Hadir' || status === 'Pulang Cepat'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : status === 'Sakit'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : status === 'Izin'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    {status === 'Sakit' ? (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium text-xs flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Alasan Sakit: <strong>{keterangan}</strong></span>
                      </div>
                    ) : status === 'Izin' ? (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-medium text-xs flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Alasan Izin: <strong>{keterangan}</strong></span>
                      </div>
                    ) : status === 'Alpa' || status === 'Belum Absen' ? (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Alasan: <strong className="text-slate-800">{keterangan}</strong></span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{keterangan}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                    Tidak ada data guru yang sesuai dengan filter/pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Database Status Widget Banner (Placed at Very Bottom of Page) */}
      <div className={`p-3.5 sm:p-4 rounded-2xl shadow-xs border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mt-6 ${
        dbStatus.loading
          ? 'bg-slate-50 border-slate-200 text-slate-700'
          : dbStatus.success
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border-emerald-200 text-emerald-950'
          : 'bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-rose-500/10 border-rose-200 text-rose-950'
      }`}>
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 w-full md:w-auto">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 ${
            dbStatus.success
              ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
              : 'bg-rose-100 border-rose-300 text-rose-700'
          }`}>
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
                  dbStatus.loading ? 'bg-amber-400 animate-ping' : dbStatus.success ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'
                }`} />
                <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-tight shrink-0">
                  Status Database Real-time:
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                dbStatus.success ? 'bg-emerald-200/90 text-emerald-950' : 'bg-rose-200/90 text-rose-950'
              }`}>
                {dbStatus.loading ? 'Memeriksa...' : dbStatus.success ? (dbStatus.isCpanelMysql ? 'MySQL cPanel ONLINE' : 'DATABASE HOSTING AKTIF') : 'TERPUTUS / OFFLINE'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1 sm:mt-0.5 font-medium leading-snug break-words sm:truncate">
              {dbStatus.message} • <span className="font-mono text-[9px] sm:text-[10px] text-slate-500">Endpoint: {dbStatus.url || '/api/ (Local Express)'}</span>
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex items-center gap-2 pt-2 md:pt-0 border-t md:border-0 border-slate-200/70 shrink-0">
          <button
            onClick={handleTestDb}
            disabled={dbStatus.loading}
            className="flex-1 md:flex-initial justify-center px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Tes koneksi ulang secara langsung"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${dbStatus.loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="sm:hidden">Tes Ulang</span>
            <span className="hidden sm:inline">Tes Ulang Connection</span>
          </button>
          {isDeveloper && (
            <button
              onClick={() => {
                if (onOpenMysqlModal) {
                  onOpenMysqlModal();
                } else {
                  onNavigate('open-mysql-modal');
                }
              }}
              className="flex-1 md:flex-initial justify-center px-3 py-1.5 rounded-xl font-extrabold text-[11px] sm:text-xs bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Atur URL Endpoint MySQL cPanel"
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Atur MySQL</span>
              <span className="hidden sm:inline">Atur MySQL cPanel</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL DETAIL KATEGORI SISWA */}
      {/* ==================================================== */}
      {selectedStudentCategory !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2 text-white">
                    <span>List Siswa Kategori: {selectedStudentCategory}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
                      {filteredStudentsForModal.length} Siswa
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Daftar siswa sesuai filter kategori presensi hari ini ({currentDateStr})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentCategory(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Quick Filter Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'Total', label: `Total (${total})` },
                  { id: 'Hadir', label: `Hadir (${hadir})` },
                  { id: 'Sakit', label: `Sakit (${sakit})` },
                  { id: 'Izin', label: `Izin (${izin})` },
                  { id: 'Alpa', label: `Alpa (${alpa})` },
                  { id: 'Belum Absen', label: `Belum (${belum})` },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedStudentCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedStudentCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">Semua Kelas</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>

                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama / NISN..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Student Table */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 rounded-l-lg">No</th>
                    <th className="px-3 py-2.5">Nama Siswa</th>
                    <th className="px-3 py-2.5">NISN & Kelas</th>
                    <th className="px-3 py-2.5">Jam Datang</th>
                    <th className="px-3 py-2.5">Jam Pulang</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 rounded-r-lg">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudentsForModal.map((student, index) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2.5 font-bold text-slate-400">{index + 1}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">{student.nama}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-slate-600 text-[11px]">{student.nisn}</div>
                        <div className="text-[10px] text-slate-500 font-bold">Kelas {student.kelas}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-700">{student.jamDatang || '--:--'}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-700">{student.jamPulang || '--:--'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            student.status === 'Hadir'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : student.status === 'Sakit'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : student.status === 'Izin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : student.status === 'Alpa'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-medium">{student.keterangan || '-'}</td>
                    </tr>
                  ))}
                  {filteredStudentsForModal.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                        Tidak ada siswa dalam kategori/pencarian ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0 text-xs text-slate-500">
              <span>Menampilkan {filteredStudentsForModal.length} dari {total} total siswa</span>
              <button
                type="button"
                onClick={() => setSelectedStudentCategory(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

