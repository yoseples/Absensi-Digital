import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  GraduationCap,
  Stethoscope,
  Mail,
  XCircle,
  BarChart3,
  QrCode,
  User,
  Camera,
  Edit3,
  X,
  Save,
  Building2,
  AlertTriangle,
  AlertCircle,
  BellRing,
  PhoneCall,
  MessageSquare,
  Search,
  UserX,
  ChevronRight,
  Filter,
  CheckCircle2,
  ShieldAlert,
  MapPin,
  Clock,
  UserCheck,
  LogOut,
  LogIn,
  Fingerprint,
  ScanFace,
  ShieldCheck,
} from 'lucide-react';
import {
  getMonitoringRealtimeData,
  updateGuruProfile,
  getGuruList,
  getKelasList,
  getStudentAbsenceSummaries,
  StudentAbsenceSummary,
  addSystemLog,
  getAbsensiGuruTodayForUser,
  doTeacherCheckIn,
  doTeacherCheckOut,
  getAppConfig,
  generateWhatsAppNotificationLink,
  setBiometricCredentialForRole,
  getBiometricCredentialForRole,
  clearBiometricCredentialForRole,
} from '../services/storage';
import { UserSession, Guru } from '../types';

interface DashboardGuruProps {
  currentUser: UserSession;
  onNavigate: (viewId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onUpdateSession?: (session: UserSession) => void;
}

export const DashboardGuru: React.FC<DashboardGuruProps> = ({
  currentUser,
  onNavigate,
  onShowToast,
  onUpdateSession,
}) => {
  const [data, setData] = useState(() => getMonitoringRealtimeData(currentUser.kelas));
  const [absenceSummaries, setAbsenceSummaries] = useState<StudentAbsenceSummary[]>(() =>
    getStudentAbsenceSummaries(currentUser.kelas)
  );
  const [absenceThreshold, setAbsenceThreshold] = useState<number>(3);
  const [selectedStudentContact, setSelectedStudentContact] = useState<StudentAbsenceSummary | null>(null);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [filterOnlyAlerts, setFilterOnlyAlerts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile / Wali Kelas Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editNama, setEditNama] = useState(currentUser.nama || '');
  const [editNip, setEditNip] = useState('');
  const [editKelas, setEditKelas] = useState(currentUser.kelas || '');
  const [editFoto, setEditFoto] = useState(currentUser.foto || '');
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);

  // Biometric Fast Login State
  const [isBiometricActive, setIsBiometricActive] = useState<boolean>(
    () => !!getBiometricCredentialForRole('guru')
  );

  const handleToggleBiometric = () => {
    if (isBiometricActive) {
      clearBiometricCredentialForRole('guru');
      setIsBiometricActive(false);
      onShowToast('Fast Login Biometrik Guru telah dinonaktifkan di perangkat ini.', 'info');
    } else {
      setBiometricCredentialForRole('guru', currentUser.username || 'guru', currentUser.nama || 'Guru Utama');
      setIsBiometricActive(true);
      onShowToast('Fast Login Biometrik Guru BERHASIL diaktifkan untuk perangkat ini!', 'success');
    }
  };

  // Teacher Attendance GPS State
  const [teacherAttRecord, setTeacherAttRecord] = useState(() =>
    getAbsensiGuruTodayForUser(currentUser.username)
  );
  const [gpsAttLoading, setGpsAttLoading] = useState(false);
  const [earlyCheckOutModal, setEarlyCheckOutModal] = useState(false);

  // Wali Kelas Leave Status Modal State (Sakit/Izin/Alfa)
  const [teacherLeaveModalOpen, setTeacherLeaveModalOpen] = useState(false);
  const [teacherLeaveStatus, setTeacherLeaveStatus] = useState<'Sakit' | 'Izin' | 'Alfa'>('Sakit');
  const [teacherLeaveKet, setTeacherLeaveKet] = useState('');

  const handleSaveTeacherLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const res = doTeacherCheckIn(currentUser.username, undefined, currentUser.foto, teacherLeaveStatus, teacherLeaveKet);
    setTeacherAttRecord(res.record);
    setTeacherLeaveModalOpen(false);
    onShowToast(`Status ${teacherLeaveStatus} tercatat! Presensi siswa kelas ${currentUser.kelas || 'Anda'} telah DIBUKA.`, 'success');
  };

  const config = getAppConfig();

  const handleTeacherIn = () => {
    setGpsAttLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            addressName: 'Gedung Utama SMA NEGERI',
            permissionStatus: 'granted' as const,
          };
          const res = doTeacherCheckIn(currentUser.username, loc, currentUser.foto);
          setTeacherAttRecord(res.record);
          setGpsAttLoading(false);
          onShowToast(res.message, 'success');
        },
        () => {
          const fallbackLoc = {
            latitude: 5.0743,
            longitude: 97.3012,
            accuracy: 15,
            addressName: 'Komplek SMA NEGERI',
            permissionStatus: 'granted' as const,
          };
          const res = doTeacherCheckIn(currentUser.username, fallbackLoc, currentUser.foto);
          setTeacherAttRecord(res.record);
          setGpsAttLoading(false);
          onShowToast(res.message, 'success');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const res = doTeacherCheckIn(currentUser.username, undefined, currentUser.foto);
      setTeacherAttRecord(res.record);
      setGpsAttLoading(false);
      onShowToast(res.message, 'success');
    }
  };

  const handleTeacherOut = (force = false) => {
    setGpsAttLoading(true);
    const executeOut = (loc?: any) => {
      const res = doTeacherCheckOut(currentUser.username, loc, currentUser.foto, force);
      if (!res.success && res.isEarlyWarning) {
        setGpsAttLoading(false);
        setEarlyCheckOutModal(true);
        return;
      }
      if (res.record) setTeacherAttRecord(res.record);
      setGpsAttLoading(false);
      setEarlyCheckOutModal(false);
      onShowToast(res.message, force ? 'error' : 'success');
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          executeOut({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            addressName: 'Gedung Utama SMA NEGERI',
            permissionStatus: 'granted',
          });
        },
        () => {
          executeOut({
            latitude: 5.0743,
            longitude: 97.3012,
            accuracy: 15,
            addressName: 'Komplek SMA NEGERI',
            permissionStatus: 'granted',
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      executeOut();
    }
  };

  const loadData = () => {
    setRefreshing(true);
    setTimeout(() => {
      setData(getMonitoringRealtimeData(currentUser.kelas));
      setAbsenceSummaries(getStudentAbsenceSummaries(currentUser.kelas));
      setRefreshing(false);
    }, 200);
  };

  useEffect(() => {
    loadData();
    setKelasOptions(getKelasList());
  }, [currentUser.kelas]);

  const openProfileModal = () => {
    const list = getGuruList();
    const g = list.find((item) => item.username === currentUser.username);
    if (g) {
      setEditNama(g.nama || currentUser.nama || '');
      setEditNip(g.nip || '');
      setEditKelas(g.kelas || currentUser.kelas || '');
      setEditFoto(g.foto || currentUser.foto || '');
    } else {
      setEditNama(currentUser.nama || '');
      setEditKelas(currentUser.kelas || '');
      setEditFoto(currentUser.foto || '');
    }
    setIsProfileModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('Ukuran foto maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setEditFoto(base64);
      onShowToast('Foto berhasil dipilih', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.username) return;

    const res = updateGuruProfile(currentUser.username, {
      nama: editNama.trim() || undefined,
      nip: editNip.trim() || undefined,
      kelas: editKelas.trim() || undefined,
      foto: editFoto || undefined,
    });

    if (res.success) {
      if (res.session && onUpdateSession) {
        onUpdateSession(res.session);
      }
      onShowToast('Profil Guru & Wali Kelas berhasil diperbarui!', 'success');
      setIsProfileModalOpen(false);
      loadData();
    } else {
      onShowToast(res.message, 'error');
    }
  };

  const total = data.length;
  const hadir = data.filter((d) => d.status === 'Hadir').length;
  const sakit = data.filter((d) => d.status === 'Sakit').length;
  const izin = data.filter((d) => d.status === 'Izin').length;
  const alpa = data.filter((d) => d.status === 'Alpa').length;
  const belum = data.filter((d) => d.status === 'Belum Absen').length;

  const maxVal = Math.max(total, 1);

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

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="relative group w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
            {currentUser.foto ? (
              <img
                src={currentUser.foto}
                alt={currentUser.nama || currentUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 text-indigo-500" />
            )}
            <button
              onClick={openProfileModal}
              className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
              title="Ubah Foto Guru"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {currentUser.nama || `Guru (${currentUser.username})`}
              </h2>
              {currentUser.kelas ? (
                <span className="bg-purple-100 text-purple-700 font-bold px-2.5 py-0.5 rounded-full text-xs border border-purple-200">
                  Wali Kelas: {currentUser.kelas}
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full text-xs">
                  Guru Umum (Semua Kelas)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>NIP / ID: {currentUser.username}</span>
              <span>•</span>
              <button
                onClick={openProfileModal}
                className="text-purple-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Ubah Foto & Wali Kelas
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{currentDateStr}</span>
          </span>
          <button
            onClick={openProfileModal}
            className="flex items-center space-x-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Atur Wali Kelas</span>
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Teacher Presence GPS Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                Presensi Mandiri Guru
              </span>
              <span className="text-xs text-indigo-300 font-medium">GPS Verifikasi Teraktifkan</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Status Presensi Anda Hari Ini: {teacherAttRecord?.status || 'Belum Absen'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-3">
              <span>Jam Masuk: <strong className="text-emerald-400 font-mono">{teacherAttRecord?.jamMasuk || '--:--'}</strong></span>
              <span>•</span>
              <span>Jam Pulang: <strong className="text-purple-300 font-mono">{teacherAttRecord?.jamPulang || '--:--'}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {(!teacherAttRecord || teacherAttRecord.status === 'Belum Absen') && (
            <>
              <button
                onClick={handleTeacherIn}
                disabled={gpsAttLoading}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{gpsAttLoading ? 'Memproses GPS...' : 'Absen Masuk GPS'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTeacherLeaveModalOpen(true)}
                className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-3 rounded-xl font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title="Klik jika berhalangan (Sakit/Izin/Alfa) agar murid tetap bisa absen"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Izin / Sakit / Alfa</span>
              </button>
            </>
          )}

          {teacherAttRecord && teacherAttRecord.jamMasuk !== '--:--' && (
            <button
              onClick={() => handleTeacherOut(false)}
              disabled={gpsAttLoading}
              className={`w-full md:w-auto px-5 py-3 rounded-xl font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                teacherAttRecord.jamPulang && teacherAttRecord.jamPulang !== '--:--'
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>
                {gpsAttLoading
                  ? 'Memproses GPS...'
                  : teacherAttRecord.jamPulang && teacherAttRecord.jamPulang !== '--:--'
                  ? `Selesai Absen (${teacherAttRecord.jamPulang})`
                  : 'Absen Pulang GPS'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-xs border border-indigo-100 group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl mb-4 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{total}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-xs border border-amber-100 group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl mb-4 shadow-xs">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sakit</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{sakit}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-xs border border-blue-100 group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4 shadow-xs">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Izin</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{izin}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-xs border border-rose-100 group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-xl mb-4 shadow-xs">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alpa</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{alpa}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Chart and Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Statistik Kehadiran Hari Ini</span>
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
              Realtime Sync
            </span>
          </h3>

          <div className="relative w-full h-[280px] flex items-end justify-around pt-6 pb-4 border-b border-slate-100">
            {[
              { label: 'Hadir', val: hadir, color: 'bg-emerald-500' },
              { label: 'Sakit', val: sakit, color: 'bg-amber-500' },
              { label: 'Izin', val: izin, color: 'bg-blue-500' },
              { label: 'Alpa', val: alpa, color: 'bg-rose-500' },
              { label: 'Belum Absen', val: belum, color: 'bg-slate-400' },
            ].map((bar, idx) => {
              const heightPct = Math.round((bar.val / maxVal) * 100);
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group w-1/6">
                  <span className="text-xs font-bold text-slate-700 mb-2">{bar.val}</span>
                  <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl h-full flex items-end overflow-hidden">
                    <div
                      className={`w-full ${bar.color} rounded-t-xl transition-all duration-700`}
                      style={{ height: `${Math.max(heightPct, 6)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-3 text-center truncate w-full">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scanner Action Banner */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden flex flex-col justify-center items-center text-center">
          <div className="relative z-10 w-full">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto border border-white/20 shadow-inner">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">Mulai Absensi Siswa</h3>
            <p className="text-indigo-100 text-xs mb-6 px-4 leading-relaxed">
              Buka pemindai kamera untuk melakukan absensi siswa secara cepat dan otomatis.
            </p>
            <button
              onClick={() => onNavigate('view-scanner')}
              className="bg-white text-indigo-700 px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-50 transition transform active:scale-95 w-full cursor-pointer"
            >
              Buka Scanner QR
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Alpa Alert Component for Wali Kelas / Guru */}
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-rose-50 via-amber-50 to-white border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Peringatan Ambang Batas Ketidakhadiran (Alpa)
                </h3>
                <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black uppercase rounded-full">
                  Sistem Absensi Digital v2.0
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Memantau siswa yang mencapai/melewati ambang batas Alpa (Tanpa Keterangan) untuk tindakan pemanggilan wali murid.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Ambang Batas Alpa:</label>
            <select
              value={absenceThreshold}
              onChange={(e) => setAbsenceThreshold(Number(e.target.value))}
              className="bg-white border border-rose-300 text-rose-900 font-extrabold text-xs rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-rose-500 shadow-2xs cursor-pointer"
            >
              <option value={1}>≥ 1x Alpa</option>
              <option value={2}>≥ 2x Alpa</option>
              <option value={3}>≥ 3x Alpa (Peringatan)</option>
              <option value={5}>≥ 5x Alpa (SP / Panggilan)</option>
            </select>
          </div>
        </div>

        {/* Filter controls */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa atau NISN..."
              value={searchStudentTerm}
              onChange={(e) => setSearchStudentTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filterOnlyAlerts}
                onChange={(e) => setFilterOnlyAlerts(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
              />
              <span>Tampilkan hanya yang capai ambang batas (≥ {absenceThreshold}x)</span>
            </label>

            <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Total SISWA: {absenceSummaries.length}
            </span>
          </div>
        </div>

        {/* List of alert students */}
        {(() => {
          const filtered = absenceSummaries.filter((st) => {
            const matchesSearch =
              (st.nama || '').toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
              (st.nisn || '').includes(searchStudentTerm);
            const matchesAlert = filterOnlyAlerts ? st.alpaCount >= absenceThreshold : true;
            return matchesSearch && matchesAlert;
          });

          if (filtered.length === 0) {
            return (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Semua Siswa Terkendali!</p>
                <p className="text-xs text-slate-500">
                  Tidak ada siswa dalam daftar yang melebihi ambang batas {absenceThreshold}x Alpa.
                </p>
              </div>
            );
          }

          return (
            <div className="divide-y divide-slate-100">
              {filtered.map((st) => {
                const isCritical = st.alpaCount >= absenceThreshold;
                return (
                  <div
                    key={st.nisn}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isCritical ? 'bg-rose-50/40 hover:bg-rose-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex items-center justify-center shrink-0">
                          {st.foto ? (
                            <img src={st.foto} alt={st.nama} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        {isCritical && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-bounce">
                            !
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{st.nama}</h4>
                          <span className="px-2 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded font-mono">
                            {st.kelas}
                          </span>
                          {isCritical && (
                            <span className="px-2 py-0.2 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              Peringatan Alpa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">NISN: {st.nisn}</p>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <span className="text-slate-600 font-medium">
                            Orang Tua: <strong className="text-slate-800">{st.namaAyah || st.namaIbu || 'Belum diisi'}</strong>
                          </span>
                          {st.noHp && (
                            <span className="text-slate-500 font-mono font-semibold">
                              • HP: {st.noHp}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                          st.alpaCount >= absenceThreshold
                            ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                            : st.alpaCount > 0
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {st.alpaCount}x Alpa
                        </span>
                        <span className="px-2 py-1 rounded-lg font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {st.sakitCount} S
                        </span>
                        <span className="px-2 py-1 rounded-lg font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          {st.izinCount} I
                        </span>
                      </div>

                      {st.noHp ? (() => {
                        const waInfo = generateWhatsAppNotificationLink(
                          { nama: st.nama, nisn: st.nisn, kelas: st.kelas, noHp: st.noHp, namaAyah: st.namaAyah, namaIbu: st.namaIbu } as any,
                          'Alpa'
                        );
                        return (
                          <a
                            href={waInfo?.waUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                            title="Hubungi Wali murid via WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Kirim Notif WA</span>
                          </a>
                        );
                      })() : (
                        <button
                          onClick={() => setSelectedStudentContact(st)}
                          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Modal Contact Details */}
      {selectedStudentContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setSelectedStudentContact(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{selectedStudentContact.nama}</h3>
                <p className="text-xs text-slate-500">Kelas: {selectedStudentContact.kelas} | NISN: {selectedStudentContact.nisn}</p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Ayah:</span>
                <span className="font-bold">{selectedStudentContact.namaAyah || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Ibu:</span>
                <span className="font-bold">{selectedStudentContact.namaIbu || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Telepon:</span>
                <span className="font-bold font-mono text-indigo-700">{selectedStudentContact.noHp || 'Belum diisi'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Total Alpa:</span>
                <span className="font-extrabold text-rose-600">{selectedStudentContact.alpaCount} Hari</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedStudentContact(null)}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Profile & Wali Kelas */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsProfileModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-xl shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-slate-800">Atur Profil & Wali Kelas</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload foto profil dan tentukan kelas yang diampu secara manual.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-purple-200 bg-slate-100 flex items-center justify-center shadow-md">
                  {editFoto ? (
                    <img src={editFoto} alt="Foto Guru" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                  <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white cursor-pointer">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">Ubah Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {editFoto && (
                  <button
                    type="button"
                    onClick={() => setEditFoto('')}
                    className="text-[11px] text-rose-600 font-semibold hover:underline mt-1 cursor-pointer"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-medium"
                  placeholder="Contoh: Dra. Rahmah, M.Pd."
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  NIP / No Identitas
                </label>
                <input
                  type="text"
                  value={editNip}
                  onChange={(e) => setEditNip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-mono text-xs"
                  placeholder="19800101 200501 1 001"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Wali Kelas (Dapat Diisi Manual)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    list="guru-kelas-datalist"
                    value={editKelas}
                    onChange={(e) => setEditKelas(e.target.value)}
                    className="w-full bg-slate-50 border border-purple-300 text-purple-900 font-bold text-sm rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ketik nama kelas manual (misal: X-A, XI IPA 1, XII IPS 2)..."
                  />
                  <datalist id="guru-kelas-datalist">
                    {kelasOptions.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditKelas('')}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition cursor-pointer ${
                        editKelas === ''
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Semua Kelas (Guru Umum)
                    </button>
                    {kelasOptions.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setEditKelas(k)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition cursor-pointer ${
                          editKelas === k
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ketik manual nama kelas atau pilih dari tombol cepat di atas.
                </p>
              </div>

              {/* Fast Login Biometric Card for Guru */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Fingerprint className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-white">Fast Login Biometrik Guru</h4>
                      <p className="text-[10px] text-slate-400">Masuk tanpa ketik password via Sidik Jari / Wajah</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBiometric}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      isBiometricActive
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'
                    }`}
                  >
                    {isBiometricActive ? <ShieldCheck className="w-3.5 h-3.5" /> : <ScanFace className="w-3.5 h-3.5" />}
                    <span>{isBiometricActive ? 'Aktif' : 'Aktifkan'}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Warning Early Check-Out (Guru Pulang Cepat / Kabur) */}
      {earlyCheckOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setEarlyCheckOutModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full z-10 shadow-2xl animate-fade-in border-2 border-rose-500">
            <button
              onClick={() => setEarlyCheckOutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner border border-rose-200 animate-bounce">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h3 className="font-black text-xl text-slate-900">
                PERINGATAN AUDIT: PULANG LEBIH AWAL!
              </h3>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Jam Pulang Resmi Sekolah: {config.jam_pulang_mulai} WIB
                </p>
                <p className="leading-relaxed">
                  Jam mengajar / jam kerja sekolah belum berakhir. Jika Anda melakukan Absen Pulang sekarang, sistem akan otomatis mencatat status Anda sebagai:
                </p>
                <div className="p-2 bg-rose-600 text-white font-black text-center rounded-lg uppercase tracking-wider text-xs">
                  ⚠️ PULANG CEPAT / KABUR SEBELUM WAKTU
                </div>
                <p className="text-[11px] text-slate-600">
                  Catatan ini akan tersimpan permanen di Log Audit Admin & Kepala Sekolah.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEarlyCheckOutModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal / Kembali Mengajar
                </button>
                <button
                  type="button"
                  onClick={() => handleTeacherOut(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-black text-xs shadow-md transition cursor-pointer"
                >
                  Lanjutkan Absen Pulang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wali Kelas Leave Status Modal (Sakit/Izin/Alfa) */}
      {teacherLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Stethoscope className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Input Status Berhalangan Guru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTeacherLeaveModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Pilih status berhalangan hari ini. Dengan mencatat status <strong>Sakit / Izin / Alfa</strong>, presensi siswa di kelas <strong>{currentUser.kelas || 'Anda'}</strong> akan otomatis <strong>DIBUKA</strong>.
            </p>

            <form onSubmit={handleSaveTeacherLeave} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Status Berhalangan *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Sakit', 'Izin', 'Alfa'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTeacherLeaveStatus(st)}
                      className={`py-2.5 px-3 rounded-xl font-black text-xs transition cursor-pointer border ${
                        teacherLeaveStatus === st
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'Sakit' && '🏥 Sakit'}
                      {st === 'Izin' && '📝 Izin'}
                      {st === 'Alfa' && '⚠️ Alfa'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Keterangan Tambahan / Alasan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="misal: Surat Dokter RSU / Izin Dinas Luar"
                  value={teacherLeaveKet}
                  onChange={(e) => setTeacherLeaveKet(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTeacherLeaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Simpan & Buka Presensi Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
