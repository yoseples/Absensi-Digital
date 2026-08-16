import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Sparkles,
  Check,
  Copy,
  Plus,
  Search,
  ListChecks,
  ShieldAlert,
  Globe,
  MessageCircle,
  Trash2,
  Award,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { getAppConfig } from '../services/storage';
import {
  getActivationState,
  generateTokenForAppId,
  generateTokenForTargetDomain,
  activateApplication,
  deactivateApplication,
  RegisteredAppLicense,
  getRegisteredLicenses,
  addRegisteredLicense,
  deleteRegisteredLicense,
  toggleRegisteredLicenseStatus,
  clearAllRegisteredLicenses,
  isMasterLicenseDomain,
  autoDetectAndRegisterDomain,
  markAutoDetectedLicensesAsRead,
} from '../services/activation';
import { UserSession } from '../types';

interface AktivasiKeyGeneratorViewProps {
  currentUser: UserSession;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AktivasiKeyGeneratorView: React.FC<AktivasiKeyGeneratorViewProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [config, setConfig] = useState(() => getAppConfig());
  const [actState, setActState] = useState(() => getActivationState());

  const [genTargetMode, setGenTargetMode] = useState<'domain' | 'appid'>('domain');
  const [genTargetDomainInput, setGenTargetDomainInput] = useState('');
  const [genAppIdInput, setGenAppIdInput] = useState('');
  const [genNpsnInput, setGenNpsnInput] = useState('');
  const [genSchoolNameInput, setGenSchoolNameInput] = useState('');
  const [genNotesInput, setGenNotesInput] = useState('');
  const [generatedResultToken, setGeneratedResultToken] = useState('');
  const [generatedWaPackage, setGeneratedWaPackage] = useState('');
  const [copiedResultToken, setCopiedResultToken] = useState(false);
  const [copiedWaMessage, setCopiedWaMessage] = useState(false);

  const [registeredList, setRegisteredList] = useState<RegisteredAppLicense[]>(() => getRegisteredLicenses());
  const [licenseSearchQuery, setLicenseSearchQuery] = useState('');

  useEffect(() => {
    // Run automatic domain detector on view mount
    autoDetectAndRegisterDomain();

    const currentConfig = getAppConfig();
    setConfig(currentConfig);
    const currentAct = getActivationState();
    setActState(currentAct);
    setGenAppIdInput(currentAct.appId);
    setGenNpsnInput(currentConfig.npsn || '10101234');
    setGenSchoolNameInput(currentConfig.nama_sekolah || 'SMA Negeri 1 Indonesia');
    setGeneratedResultToken(generateTokenForAppId(currentAct.appId, currentConfig.npsn));
    setRegisteredList(getRegisteredLicenses());
  }, []);

  const refreshData = () => {
    autoDetectAndRegisterDomain();
    setActState(getActivationState());
    setRegisteredList(getRegisteredLicenses());
  };

  const newDetectedDomains = registeredList.filter((item) => item.isNewAutoDetected || item.status === 'Pending Activation');

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Aktivasi & Key Generator Lisensi V2.1
              </h2>
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                Aktivasi Terpusat V2.1
              </span>
              <span className="bg-indigo-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider border border-indigo-400/40">
                Developer Panel
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
              Pusat penerbitan Token Lisensi Resmi (KangYos Master Hub), pembuatan paket WhatsApp domain, dan manajemen pendaftaran perangkat instansi sekolah.
            </p>
          </div>
        </div>

        <button
          onClick={refreshData}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 border border-white/10 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-indigo-300" />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* Current Installation Status Box */}
      <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Status Lisensi Perangkat Ini
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              actState.isActivated ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
            }`}
          >
            {actState.isActivated ? 'Full Version' : 'Mode Demo'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
          <div>
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">
              ID UNIK APLIKASI:
            </div>
            <div className="font-mono text-amber-300 font-extrabold text-sm sm:text-base break-all">
              {actState.appId}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">
              NPSN SEKOLAH:
            </div>
            <div className="font-mono text-slate-200 font-extrabold text-sm sm:text-base">
              {config.npsn || '10101234'}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">
              NAMA SEKOLAH REGISTRASI:
            </div>
            <div className="font-bold text-slate-200 text-sm truncate">
              {actState.registeredSchool || config.nama_sekolah}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-300">
            {actState.isActivated
              ? 'Aplikasi telah teraktivasi penuh untuk seluruh perangkat di domain ini.'
              : 'Aplikasi berjalan dalam Mode Demo (dibatasi 10 siswa & 10 guru).'}
          </p>
          {actState.isActivated ? (
            <button
              type="button"
              onClick={() => {
                deactivateApplication('developer');
                setActState(getActivationState());
                onShowToast('Aplikasi berhasil dikembalikan ke Mode Demo.', 'info');
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              Kembalikan ke Mode Demo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const token = generateTokenForAppId(actState.appId, config.npsn);
                activateApplication(token, 'developer');
                setActState(getActivationState());
                onShowToast('Aplikasi berhasil diaktivasi ke Full Version!', 'success');
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shrink-0"
            >
              Aktifkan Instan (Dev Mode)
            </button>
          )}
        </div>
      </div>

      {/* Live Domain Detector & Telemetry Notification Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 space-y-3.5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/40 shrink-0">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-white tracking-wide">
                  Pendeteksi Otomatis Domain (Live Telemetry System)
                </h4>
                <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                  Live Active
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Sistem otomatis mendeteksi domain/hostname URL tempat aplikasi ini dipasang beserta ID Perangkat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-bold bg-slate-950/80 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-amber-300">
              Domain Aktif Saat Ini: {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}
            </span>
          </div>
        </div>

        {/* New Domain Notification Alert Box */}
        {newDetectedDomains.length > 0 && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Notifikasi ({newDetectedDomains.length}) Domain/Perangkat Terdeteksi Mengakses Aplikasi!</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  markAutoDetectedLicensesAsRead();
                  setRegisteredList(getRegisteredLicenses());
                  onShowToast('Notifikasi domain terdeteksi telah ditandai dibaca.', 'info');
                }}
                className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Tandai Dibaca
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {newDetectedDomains.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950/70 rounded-lg border border-amber-500/20 text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-amber-300 truncate">{item.domain || item.appId}</span>
                      <span className="text-slate-400 ml-2 text-[11px]">({item.namaSekolah} - NPSN: {item.npsn})</span>
                    </div>
                  </div>

                  {isMasterLicenseDomain() && (
                    <button
                      type="button"
                      onClick={() => {
                        setGenTargetMode('domain');
                        setGenTargetDomainInput(item.domain || 'domain.com');
                        setGenNpsnInput(item.npsn);
                        setGenSchoolNameInput(item.namaSekolah);
                        const pkg = generateTokenForTargetDomain(item.domain || 'domain.com', item.npsn, item.namaSekolah);
                        setGenAppIdInput(pkg.appId);
                        setGeneratedResultToken(pkg.activationToken);
                        setGeneratedWaPackage(pkg.whatsappMessage);
                        onShowToast(`Domain ${item.domain || item.appId} dimasukkan ke Generator Lisensi!`, 'success');
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-lg transition shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      Terbitkan Lisensi Ini
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generator Form (Only unlocked on Master Hub absen.kangyos.com or localhost dev mode) */}
      {isMasterLicenseDomain() ? (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500 shrink-0" />
                <span>Generator Lisensi Domain Unlimited (KangYos Master Hub)</span>
              </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Terbitkan Token Lisensi Resmi untuk domain sekolah mana saja secara otomatis.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => {
                setGenTargetMode('domain');
                const pkg = generateTokenForTargetDomain(
                  genTargetDomainInput || 'absen.kangyos.com',
                  genNpsnInput,
                  genSchoolNameInput
                );
                setGenAppIdInput(pkg.appId);
                setGeneratedResultToken(pkg.activationToken);
                setGeneratedWaPackage(pkg.whatsappMessage);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                genTargetMode === 'domain'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Input Domain Target
            </button>
            <button
              type="button"
              onClick={() => {
                setGenTargetMode('appid');
                setGeneratedResultToken(generateTokenForAppId(genAppIdInput, genNpsnInput));
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                genTargetMode === 'appid'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Input Direct ID Aplikasi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {genTargetMode === 'domain' ? (
            <div>
              <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Nama Domain Target *</span>
              </label>
              <input
                type="text"
                value={genTargetDomainInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setGenTargetDomainInput(val);
                  const pkg = generateTokenForTargetDomain(val, genNpsnInput, genSchoolNameInput);
                  setGenAppIdInput(pkg.appId);
                  setGeneratedResultToken(pkg.activationToken);
                  setGeneratedWaPackage(pkg.whatsappMessage);
                }}
                placeholder="contoh: sma1kediri.sch.id"
                className="w-full px-3 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 rounded-xl text-xs font-mono font-bold text-indigo-950 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ID Aplikasi Target *
              </label>
              <input
                type="text"
                value={genAppIdInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setGenAppIdInput(val);
                  setGeneratedResultToken(generateTokenForAppId(val, genNpsnInput));
                  setGeneratedWaPackage(
                    `Token Aktivasi Resmi untuk ID ${val}: ${generateTokenForAppId(val, genNpsnInput)}`
                  );
                }}
                placeholder="APP-10101234-XXXXXXXX"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 dark:text-slate-100 dark:bg-slate-800"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              NPSN Sekolah Target *
            </label>
            <input
              type="text"
              value={genNpsnInput}
              onChange={(e) => {
                const val = e.target.value;
                setGenNpsnInput(val);
                if (genTargetMode === 'domain') {
                  const pkg = generateTokenForTargetDomain(genTargetDomainInput, val, genSchoolNameInput);
                  setGenAppIdInput(pkg.appId);
                  setGeneratedResultToken(pkg.activationToken);
                  setGeneratedWaPackage(pkg.whatsappMessage);
                } else {
                  setGeneratedResultToken(generateTokenForAppId(genAppIdInput, val));
                }
              }}
              placeholder="10101234"
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Sekolah *
            </label>
            <input
              type="text"
              value={genSchoolNameInput}
              onChange={(e) => {
                const val = e.target.value;
                setGenSchoolNameInput(val);
                if (genTargetMode === 'domain') {
                  const pkg = generateTokenForTargetDomain(genTargetDomainInput, genNpsnInput, val);
                  setGeneratedWaPackage(pkg.whatsappMessage);
                }
              }}
              placeholder="SMA Negeri 1 Indonesia"
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Output Generated Key Box */}
        <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
              Hasil ID & Token Aktivasi Resmi (Full Version):
            </label>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
              ID: {genAppIdInput || 'APP-10101234-XXXXXXXX'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedResultToken}
              className="flex-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl px-4 py-2.5 font-mono text-base sm:text-lg font-black text-amber-950 dark:text-amber-200 tracking-wider text-center shadow-xs"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedResultToken);
                setCopiedResultToken(true);
                onShowToast('Token berhasil disalin ke clipboard!', 'info');
                setTimeout(() => setCopiedResultToken(false), 2000);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0"
            >
              {copiedResultToken ? <Check className="w-4 h-4 text-emerald-900" /> : <Copy className="w-4 h-4" />}
              <span>{copiedResultToken ? 'Tersalin' : 'Salin Token'}</span>
            </button>
          </div>

          {/* Export Actions */}
          <div className="pt-3 border-t border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-amber-900 dark:text-amber-300">
              Lisensi berlaku penuh untuk seluruh perangkat yang mengakses domain target tersebut.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const msg = generatedWaPackage || `Token Aktivasi: ${generatedResultToken}`;
                  navigator.clipboard.writeText(msg);
                  setCopiedWaMessage(true);
                  onShowToast('Format Pesan WhatsApp berhasil disalin!', 'success');
                  setTimeout(() => setCopiedWaMessage(false), 2000);
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Salin pesan lengkap beserta petunjuk untuk dikirim via WA"
              >
                {copiedWaMessage ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                )}
                <span>{copiedWaMessage ? 'Pesan WA Tersalin' : 'Salin Paket WA'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!genAppIdInput.trim() || !genNpsnInput.trim()) {
                    onShowToast('ID Aplikasi dan NPSN wajib diisi!', 'warning');
                    return;
                  }
                  addRegisteredLicense({
                    appId: genAppIdInput.trim(),
                    npsn: genNpsnInput.trim(),
                    namaSekolah: genSchoolNameInput.trim() || 'Sekolah Terdaftar',
                    token: generatedResultToken,
                    status: 'Aktif',
                    notes: genNotesInput.trim() || `Domain: ${genTargetDomainInput || 'Master Hub'}`,
                  });
                  setRegisteredList(getRegisteredLicenses());
                  onShowToast('Sekolah & Lisensi baru berhasil ditambahkan ke Database Registrasi!', 'success');
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan ke Database</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* Centralized Activator Rule Banner for Client Domains */
        <div className="p-6 bg-slate-900 text-white rounded-2xl border border-amber-500/40 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Pusat Aktivator Resmi Terpusat di absen.kangyos.com</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Aplikasi dipasang pada domain <span className="font-bold text-amber-300 font-mono">{typeof window !== 'undefined' ? window.location.hostname : 'domain klien'}</span>. Generator Token & Key Aktivasi hanya dapat diterbitkan secara resmi melalui portal pengembang di <span className="font-bold text-indigo-400 font-mono">absen.kangyos.com</span>.
              </p>
            </div>
            <a
              href="https://absen.kangyos.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-2 shrink-0 shadow-lg"
            >
              <span>Buka Portal absen.kangyos.com</span>
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
              Petunjuk Aktivasi Versi Penuh (Full Version) untuk Domain Ini:
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <li>Buka website resmi master aktivator di <strong className="text-amber-300">absen.kangyos.com</strong></li>
              <li>Salin ID Aplikasi Unik Domain Ini: <code className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">{actState.appId}</code></li>
              <li>Minta Token Aktivasi Resmi dari Pengembang di <strong className="text-amber-300">absen.kangyos.com</strong></li>
              <li>Masukkan Token yang diberikan ke dalam form masukan di atas lalu klik <strong>Aktifkan Instan</strong>.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Registered Devices & Schools List */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Daftar Device & Sekolah Terregistrasi Resmi</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola status pengaktifan (Deactivate / Reactivate) atau hapus registrasi lisensi.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari sekolah, NPSN, device, atau ID..."
                value={licenseSearchQuery}
                onChange={(e) => setLicenseSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin membersihkan SEMUA data daftar device terregistrasi?')) {
                  clearAllRegisteredLicenses();
                  setRegisteredList([]);
                  onShowToast('Seluruh data daftar device terregistrasi berhasil dibersihkan.', 'success');
                }
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
              title="Bersihkan Semua Data Device Terdaftar"
            >
              <Trash2 className="w-4 h-4" />
              <span>Bersihkan Semua Data</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">ID Lisensi</th>
                <th className="px-4 py-3">Nama Sekolah & NPSN</th>
                <th className="px-4 py-3">ID Device / App Target</th>
                <th className="px-4 py-3">Perangkat</th>
                <th className="px-4 py-3">Token Aktivasi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {registeredList
                .filter((item) => {
                  const q = licenseSearchQuery.toLowerCase();
                  return (
                    item.namaSekolah.toLowerCase().includes(q) ||
                    item.npsn.toLowerCase().includes(q) ||
                    item.appId.toLowerCase().includes(q) ||
                    item.token.toLowerCase().includes(q) ||
                    (item.deviceType && item.deviceType.toLowerCase().includes(q))
                  );
                })
                .map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 font-bold">{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.namaSekolah}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">NPSN: {item.npsn}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {item.appId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.deviceType || 'Web App Client'}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.lastSeen || 'Baru Saja'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 rounded-lg px-2.5 py-1 border border-amber-200 dark:border-amber-900">
                      {item.token}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            toggleRegisteredLicenseStatus(item.id);
                            setRegisteredList(getRegisteredLicenses());
                            const updatedItem = getRegisteredLicenses().find((x) => x.id === item.id);
                            const statusMsg = updatedItem?.status === 'Aktif' ? 'di-Reaktivasi' : 'di-Deaktivasi';
                            onShowToast(`Lisensi ${item.appId} berhasil ${statusMsg}!`, 'info');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            item.status === 'Aktif'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{item.status === 'Aktif' ? 'Deactivate' : 'Aktifkan'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.token);
                            onShowToast(`Token ${item.token} disalin!`, 'info');
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Salin Token"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus registrasi lisensi ${item.namaSekolah}?`)) {
                              deleteRegisteredLicense(item.id);
                              setRegisteredList(getRegisteredLicenses());
                              onShowToast('Lisensi terdaftar berhasil dihapus.', 'info');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Hapus Lisensi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
