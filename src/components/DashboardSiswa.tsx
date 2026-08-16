import React, { useState, useEffect } from 'react';
import { RefreshCw, LogIn, LogOut, AlertCircle, QrCode, User, Coffee, CheckCircle2, Clock, Camera, Upload, Edit, X, MessageCircle, ExternalLink, Bot, Sparkles, Fingerprint, ScanFace, Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { getAbsensiList, getHariLiburList, getTodayDateString, getSiswaList, updateSiswaProfile, getAppConfig, setBiometricCredential, getBiometricCredentialNisn, clearBiometricCredential } from '../services/storage';
import { UserSession, AbsensiRecord, Siswa } from '../types';

interface DashboardSiswaProps {
  currentUser: UserSession;
  onNavigate: (viewId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const DashboardSiswa: React.FC<DashboardSiswaProps> = ({
  currentUser,
  onNavigate,
  onShowToast,
}) => {
  const [record, setRecord] = useState<AbsensiRecord | null>(null);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayNote, setHolidayNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [studentDetail, setStudentDetail] = useState<Siswa | null>(null);
  const [config, setConfig] = useState(getAppConfig());

  // Biometric & Security States
  const [isBiometricActive, setIsBiometricActive] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Edit photo modal
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [tempPhoto, setTempPhoto] = useState('');

  const loadData = () => {
    setRefreshing(true);
    const today = getTodayDateString();
    const holidays = getHariLiburList();
    const hol = holidays.find((h) => h.tanggal === today);

    if (hol) {
      setIsHoliday(true);
      setHolidayNote(hol.keterangan);
    } else {
      setIsHoliday(false);
      setHolidayNote('');
    }

    const cleanNisn = (currentUser.nisn || '').replace(/^'/, '');
    const allAbs = getAbsensiList();
    const rec = allAbs.find((a) => a.tanggal === today && a.nisn.replace(/^'/, '') === cleanNisn);
    setRecord(rec || null);

    // Fetch student object & config
    const siswaList = getSiswaList();
    const st = siswaList.find((s) => s.nisn.replace(/^'/, '') === cleanNisn);
    setStudentDetail(st || null);
    if (st?.foto) setTempPhoto(st.foto);
    setConfig(getAppConfig());

    // Check Biometric activation status on current device
    const savedBioNisn = getBiometricCredentialNisn();
    setIsBiometricActive(!!savedBioNisn && savedBioNisn.replace(/^'/, '') === cleanNisn);

    setTimeout(() => setRefreshing(false), 200);
  };

  const handleToggleBiometric = () => {
    const cleanNisn = (currentUser.nisn || '').replace(/^'/, '');
    if (!cleanNisn) return;

    if (isBiometricActive) {
      clearBiometricCredential();
      setIsBiometricActive(false);
      onShowToast('Fast Login Biometrik dinonaktifkan di perangkat ini.', 'error');
    } else {
      setBiometricCredential(cleanNisn);
      setIsBiometricActive(true);
      onShowToast(
        '⚡ Fast Login (Sidik Jari / Wajah) BERHASIL Diaktifkan! Sekarang Anda bisa masuk 1-klik di HP ini.',
        'success'
      );
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.nisn) return;
    const cleanNisn = currentUser.nisn.replace(/^'/, '');
    const currentPass = (studentDetail?.password || '123456').trim();

    if (oldPassword.trim() !== currentPass) {
      onShowToast('Password lama tidak sesuai! Default password: 123456', 'error');
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      onShowToast('Password baru minimal 4 karakter!', 'error');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      onShowToast('Konfirmasi password baru tidak cocok!', 'error');
      return;
    }

    const res = updateSiswaProfile(cleanNisn, { password: newPassword.trim() });
    if (res.success) {
      onShowToast('Password login siswa berhasil diperbarui!', 'success');
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadData();
    } else {
      onShowToast(res.message, 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.nisn]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('Ukuran foto maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempPhoto(reader.result as string);
      onShowToast('Foto berhasil dimuat', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = () => {
    if (!currentUser.nisn) return;
    const res = updateSiswaProfile(currentUser.nisn, { foto: tempPhoto });
    if (res.success) {
      onShowToast('Foto profil berhasil diperbarui', 'success');
      setIsPhotoModalOpen(false);
loadData();
    } else {
      onShowToast(res.message, 'error');
    }
  };

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const todayStr = new Date().toLocaleDateString('id-ID', options);
  const firstName = currentUser.nama ? currentUser.nama.split(' ')[0] : 'Siswa';

  const handleManualRefresh = () => {
    loadData();
    onShowToast('Data absensi diperbarui.', 'success');
  };

  // Prepare variables for AI Chatbot Message for Parents
  const parentName = studentDetail?.namaAyah || studentDetail?.namaIbu || 'Orang Tua / Wali';
  const studentName = studentDetail?.nama || currentUser.nama;
  const studentClass = studentDetail?.kelas || currentUser.kelas || '-';
  const schoolName = config.nama_sekolah || 'SEKOLAH';

  const jamMasukStr = record?.jamDatang && record.jamDatang !== '--:--' ? `${record.jamDatang} WIB` : 'Belum Absen Masuk';
  const jamPulangStr = record?.jamPulang && record.jamPulang !== '--:--' ? `${record.jamPulang} WIB` : 'Belum Absen Pulang';

  let aiMessageContent = '';
  if (isHoliday) {
    aiMessageContent = `Halo Bpk/Ibu ${parentName},\n\nInformasi Sekolah: Hari ini (${todayStr}) adalah HARI LIBUR (${holidayNote}). Kegiatan belajar mengajar dan absensi diliburkan.\n\nTerima kasih.\n_${schoolName}_`;
  } else if (record && record.status !== 'Belum Absen') {
    aiMessageContent = `Halo Bpk/Ibu ${parentName},

Informasi Presensi Siswa:
Ananda *${studentName}* (Kelas ${studentClass})

☀️ *Jam Masuk:* ${jamMasukStr}
🏠 *Jam Pulang:* ${jamPulangStr}
📊 *Status:* ${record.status}${record.keterangan ? ` (${record.keterangan})` : ''}

Pesan dari *${schoolName}*: Informasi kehadiran ini tercatat otomatis oleh Sistem E-Absensi Digital. Terima kasih.`;
  } else {
    aiMessageContent = `Halo Bpk/Ibu ${parentName},

Pemberitahuan Presensi:
Ananda *${studentName}* (Kelas ${studentClass}) saat ini belum mencatatkan kehadiran di *${schoolName}* untuk hari ini (${todayStr}).

Mohon perhatiannya, terima kasih.
_${schoolName}_`;
  }

  // Determine card style based on state
  let heroGradient = 'bg-slate-800 shadow-slate-200';
  let badgeStyle = 'bg-rose-500/20 border-rose-500/30 text-rose-200 animate-pulse';
  let badgeText = 'BELUM ABSEN';
  let badgeIcon = <Clock className="w-3.5 h-3.5" />;

  if (isHoliday) {
    heroGradient = 'bg-gradient-to-br from-rose-600 to-red-800 shadow-rose-200';
    badgeStyle = 'bg-white/20 border-white/20 text-white';
    badgeText = 'HARI LIBUR';
    badgeIcon = <Coffee className="w-3.5 h-3.5" />;
  } else if (record && record.status !== 'Belum Absen') {
    if (!record.jamPulang || record.jamPulang === '--:--') {
      heroGradient = 'bg-gradient-to-br from-emerald-600 to-teal-800 shadow-emerald-200';
      badgeStyle = 'bg-white/20 border-white/20 text-white';
      badgeText = 'SEDANG BERLANGSUNG';
      badgeIcon = <Clock className="w-3.5 h-3.5 animate-pulse" />;
    } else {
      heroGradient = 'bg-gradient-to-br from-indigo-600 to-violet-800 shadow-indigo-200';
      badgeStyle = 'bg-white/20 border-white/20 text-white';
      badgeText = 'SELESAI HARI INI';
      badgeIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-end">
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 text-xs font-bold text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg shadow-xs hover:bg-indigo-50 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Hero Card */}
          <div
            className={`relative overflow-hidden rounded-3xl ${heroGradient} p-6 sm:p-8 text-white shadow-xl transition-all duration-500 group`}
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110" />

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <p className="text-slate-300 text-[10px] font-bold tracking-widest uppercase mb-1">
                    {todayStr}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
                    Hai, <span>{firstName}</span>
                  </h2>
                  <p className="text-slate-200 text-xs opacity-90">Semoga harimu menyenangkan!</p>
                </div>

                <div className={`px-4 py-2 rounded-xl backdrop-blur-md border text-xs font-bold shadow-xs flex items-center gap-2 ${badgeStyle}`}>
                  {badgeIcon}
                  <span>{badgeText}</span>
                </div>
              </div>

              {isHoliday ? (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center my-2">
                  <Coffee className="w-10 h-10 mx-auto mb-2 opacity-90" />
                  <p className="text-base font-bold uppercase tracking-wider">{holidayNote}</p>
                  <p className="text-xs opacity-80 mt-1">Tidak ada kegiatan absensi hari ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-slate-200">
                      <LogIn className="w-4 h-4" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Jam Datang</span>
                    </div>
                    <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight">
                      {record?.jamDatang && record.jamDatang !== '--:--' ? record.jamDatang : '--:--'}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-slate-200">
                      <LogOut className="w-4 h-4" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Jam Pulang</span>
                    </div>
                    <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight">
                      {record?.jamPulang && record.jamPulang !== '--:--' ? record.jamPulang : '--:--'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alert if not checked in */}
          {!isHoliday && (!record || record.status === 'Belum Absen') && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 items-start shadow-xs">
              <div className="bg-white p-2 rounded-full text-rose-500 shadow-xs shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-800 mb-0.5">Peringatan Absensi</h4>
                <p className="text-xs font-medium text-rose-700/80 leading-relaxed">
                  Anda belum melakukan scan absensi datang hari ini. Harap tunjukkan QR Card Anda ke pemindai atau guru kelas.
                </p>
              </div>
            </div>
          )}

          {/* AI Chat Bot Message Card for Parents */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2 shrink-0 shadow-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                      Pesan Chat Bot AI Orang Tua
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      AI Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Pemberitahuan otomatis jam masuk &amp; jam pulang siswa untuk Orang Tua
                  </p>
                </div>
              </div>

              {studentDetail?.noHp && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">No. HP Wali</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{studentDetail.noHp}</span>
                </div>
              )}
            </div>

            {/* Attendance Time Summary Pills */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <LogIn className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Jam Masuk</span>
                  <span className="text-sm sm:text-base font-mono font-black text-emerald-300 truncate block">
                    {jamMasukStr}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Jam Pulang</span>
                  <span className="text-sm sm:text-base font-mono font-black text-teal-300 truncate block">
                    {jamPulangStr}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Formatted WhatsApp Message Preview Box */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-indigo-500/20 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Format Pesan WA AI Chatbot
                </span>
                <span className="text-[10px] text-slate-400 italic">Siap dibaca Orang Tua</span>
              </div>
              <div className="text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-line bg-white/5 p-3.5 rounded-xl border border-white/5 select-all">
                {aiMessageContent}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Sidebar & Card Link */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="relative z-10 -mt-2">
              <div className="relative w-20 h-20 bg-white p-1 rounded-full mx-auto shadow-md group">
                {studentDetail?.foto ? (
                  <img
                    src={studentDetail.foto}
                    alt={currentUser.nama}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-2xl">
                    {currentUser.nama.charAt(0)}
                  </div>
                )}
                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition transform hover:scale-110 cursor-pointer"
                  title="Ubah Foto Profil"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="font-bold text-slate-800 text-lg mt-3 truncate">{currentUser.nama}</h3>
              <p className="text-xs font-mono text-slate-500 bg-slate-100 inline-block px-3 py-1 rounded-md mt-1">
                NISN: {currentUser.nisn}
              </p>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <Edit className="w-3 h-3" /> Ubah Foto Profil
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-left">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Kelas</p>
                  <p className="text-sm font-bold text-slate-700">{currentUser.kelas || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Status</p>
                  <p className="text-sm font-bold text-emerald-600">Aktif</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('view-kartu-siswa')}
            className="w-full group relative overflow-hidden rounded-2xl bg-slate-900 p-1 shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="relative bg-slate-900 rounded-[0.9rem] px-5 py-4 flex items-center justify-between transition-all group-hover:bg-slate-800">
              <div className="text-left">
                <h3 className="text-white font-bold text-sm">Kartu Digital</h3>
                <p className="text-slate-400 text-[10px]">Tampilkan QR Code Kartu Pelajar</p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white text-lg">
                <QrCode className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* Card Keamanan & Fast Login Biometrik */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Keamanan & Login Cepat</h4>
                <p className="text-[11px] text-slate-500">Kelola password & akses biometrik</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Biometric Toggle Item */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isBiometricActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Fast Login (Sidik Jari / Wajah)</span>
                    <span className="block text-[10px] text-slate-500">
                      {isBiometricActive ? 'Aktif di HP ini (Login 1-klik)' : 'Belum aktif di HP ini'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBiometric}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isBiometricActive
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  }`}
                >
                  {isBiometricActive ? 'Matikan' : 'Aktifkan'}
                </button>
              </div>

              {/* Ubah Password Button */}
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Ubah Password Login Siswa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL UBAH FOTO PROFIL */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsPhotoModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full z-10 animate-fade-in p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                Ubah Foto Profil Siswa
              </h3>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto w-32 h-32 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md flex items-center justify-center bg-slate-100 relative">
                {tempPhoto ? (
                  <img
                    src={tempPhoto}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 text-xs font-medium">Belum ada foto</div>
                )}
              </div>

              <div>
                <label className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-md">
                  <Upload className="w-4 h-4 inline-block mr-1.5" /> Pilih File Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-2">
                  Format: JPG/PNG, ukuran maks 2MB.
                </p>
              </div>

              {tempPhoto && (
                <button
                  type="button"
                  onClick={() => setTempPhoto('')}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  Hapus Foto Ini
                </button>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition cursor-pointer"
                >
                  Simpan Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UBAH PASSWORD SISWA */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsPasswordModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full z-10 animate-fade-in p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Ubah Password Login Siswa
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Password Saat Ini (Lama)
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Password default: 123456"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Password Baru
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Minimal 4 karakter"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Ketik ulang password baru"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPasswordText ? 'Sembunyikan karakter' : 'Tampilkan karakter'}</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition cursor-pointer"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
