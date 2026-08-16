import React, { useState, useEffect } from 'react';
import { X, Save, Building, Image as ImageIcon, Calendar, Clock, RotateCcw, ShieldAlert, Upload, Check, RefreshCw, FileText, KeyRound, Copy, ShieldCheck, Award, Sparkles, Plus, Trash2, School, Tag, ListChecks, Search, Globe, Server, Download, Code, HelpCircle, Layers, CheckCircle2, ExternalLink, MessageCircle, Send, Fingerprint, ScanFace } from 'lucide-react';
import { getAppConfig, saveAppConfig, clearAppCache, resetAppConfig, setActiveTestingDomain, getActiveTestingDomain, setBiometricCredentialForRole, getBiometricCredentialForRole, clearBiometricCredentialForRole } from '../services/storage';
import { 
  getActivationState, 
  generateTokenForAppId, 
  generateTokenForTargetDomain,
  isMasterLicenseDomain,
  activateApplication, 
  deactivateApplication,
  RegisteredAppLicense,
  getRegisteredLicenses,
  addRegisteredLicense,
  deleteRegisteredLicense,
  toggleRegisteredLicenseStatus
} from '../services/activation';
import { AppConfig, DomainTenantConfig } from '../types';

interface PengaturanDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onConfigUpdated?: () => void;
  currentUserRole?: string;
}

export const PengaturanDeveloperModal: React.FC<PengaturanDeveloperModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onConfigUpdated,
  currentUserRole = 'developer',
}) => {
  const isDeveloper = currentUserRole === 'developer';
  const [activeTab, setActiveTab] = useState<'sekolah' | 'branding' | 'login_screen' | 'akademik' | 'absensi' | 'sistem' | 'cpanel'>('sekolah');
  const [config, setConfig] = useState<AppConfig>(() => getAppConfig());
  const [activeTestingDomain, setTestingDomainState] = useState<string | null>(() => getActiveTestingDomain());
  const [cpanelDomainInput, setCpanelDomainInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Activation generator & registered licenses states
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

  // Registered Licenses List state
  const [registeredList, setRegisteredList] = useState<RegisteredAppLicense[]>(() => getRegisteredLicenses());
  const [licenseSearchQuery, setLicenseSearchQuery] = useState('');

  // Biometric Fast Login State for Developer
  const [isDevBiometricActive, setIsDevBiometricActive] = useState<boolean>(
    () => !!getBiometricCredentialForRole('developer')
  );

  const handleToggleDevBiometric = () => {
    if (isDevBiometricActive) {
      clearBiometricCredentialForRole('developer');
      setIsDevBiometricActive(false);
      onShowToast('Fast Login Biometrik Developer telah dinonaktifkan di perangkat ini.', 'info');
    } else {
      setBiometricCredentialForRole('developer', 'developer', 'Developer / Super Admin');
      setIsDevBiometricActive(true);
      onShowToast('Fast Login Biometrik Developer BERHASIL diaktifkan untuk perangkat ini!', 'success');
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!isDeveloper) {
        setActiveTab('sekolah');
      }
      const currentConfig = getAppConfig();
      setConfig(currentConfig);
      const currentAct = getActivationState();
      setActState(currentAct);
      setGenAppIdInput(currentAct.appId);
      setGenNpsnInput(currentConfig.npsn || '10101234');
      setGenSchoolNameInput(currentConfig.nama_sekolah || 'SMA Negeri 1 Indonesia');
      setGeneratedResultToken(generateTokenForAppId(currentAct.appId, currentConfig.npsn));
      setRegisteredList(getRegisteredLicenses());
      if (typeof window !== 'undefined' && !cpanelDomainInput) {
        setCpanelDomainInput(window.location.origin);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof AppConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'favicon_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('Ukuran gambar maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        handleChange(field, base64);
        onShowToast(`Gambar ${field === 'logo_url' ? 'logo' : 'favicon'} berhasil dimuat!`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };



  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      saveAppConfig(config);
      onShowToast('Pengaturan aplikasi berhasil disimpan & diperbarui!', 'success');
      if (onConfigUpdated) onConfigUpdated();
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 300);
    } catch {
      setIsSaving(false);
      onShowToast('Gagal menyimpan pengaturan aplikasi.', 'error');
    }
  };

  const handleResetDefault = () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan semua pengaturan ke default awal?')) {
      const defaultConfig = resetAppConfig();
      setConfig(defaultConfig);
      onShowToast('Pengaturan berhasil dikembalikan ke default.', 'success');
      if (onConfigUpdated) onConfigUpdated();
    }
  };

  const handleClearCache = () => {
    clearAppCache();
    onShowToast('Cache aplikasi & storage browser berhasil dibersihkan!', 'success');
    if (onConfigUpdated) onConfigUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">
                  {isDeveloper ? 'Pengaturan Aplikasi E-Absensi' : 'Pengaturan Sekolah'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  isDeveloper ? 'bg-amber-400 text-slate-950' : 'bg-blue-600 text-white'
                }`}>
                  {isDeveloper ? 'Developer Panel' : 'Akses Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isDeveloper
                  ? 'Kelola identitas sekolah, logo branding, akademik, & aturan absensi.'
                  : 'Kelola identitas sekolah, logo, tahun ajaran, & jam operasional.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50/50">
          {/* Tabs Navigation */}
          <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-2 md:p-3 shrink-0 overflow-x-auto scrollbar-hide flex md:flex-col gap-1.5 md:gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('sekolah')}
              className={`w-auto md:w-full shrink-0 whitespace-nowrap flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                activeTab === 'sekolah'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4 shrink-0" />
              <span>Identitas Sekolah</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={`w-auto md:w-full shrink-0 whitespace-nowrap flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                activeTab === 'branding'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>Logo & Favicon</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('akademik')}
              className={`w-auto md:w-full shrink-0 whitespace-nowrap flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                activeTab === 'akademik'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Tahun Ajaran & Kepala Sekolah</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('absensi')}
              className={`w-auto md:w-full shrink-0 whitespace-nowrap flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                activeTab === 'absensi'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Jam Operasional Absensi</span>
            </button>

            {isDeveloper && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('login_screen')}
                  className={`w-auto md:w-full shrink-0 whitespace-nowrap flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                    activeTab === 'login_screen'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Custom Tampilan Login</span>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    Dev Only
                  </span>
                </button>



                <button
                  type="button"
                  onClick={() => setActiveTab('sistem')}
                  className={`w-auto md:w-full shrink-0 whitespace-nowrap flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                    activeTab === 'sistem'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Reset & Opsi Sistem</span>
                </button>



                <button
                  type="button"
                  onClick={() => setActiveTab('cpanel')}
                  className={`w-auto md:w-full shrink-0 whitespace-nowrap flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                    activeTab === 'cpanel'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Panduan cPanel & Open Graph</span>
                </button>
              </>
            )}
          </div>

          {/* Tab Content Form */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'sekolah' && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-slate-800">Profil & Profil Sekolah</h4>
                  <p className="text-xs text-slate-500">Informasi ini akan ditampilkan pada kop surat laporan, kartu pelajar, dan antarmuka aplikasi.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sekolah / Instansi *</label>
                    <input
                      type="text"
                      required
                      value={config.nama_sekolah || ''}
                      onChange={(e) => handleChange('nama_sekolah', e.target.value)}
                      placeholder="Contoh: SMA NEGERI"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">NPSN (Nomor Pokok Sekolah Nasional)</label>
                    <input
                      type="text"
                      value={config.npsn || ''}
                      onChange={(e) => handleChange('npsn', e.target.value)}
                      placeholder="Contoh: 10101234"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon Sekolah</label>
                    <input
                      type="text"
                      value={config.telepon_sekolah || ''}
                      onChange={(e) => handleChange('telepon_sekolah', e.target.value)}
                      placeholder="Contoh: (0645) 91234"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap Sekolah</label>
                    <textarea
                      rows={2}
                      value={config.alamat_sekolah || ''}
                      onChange={(e) => handleChange('alamat_sekolah', e.target.value)}
                      placeholder="Contoh: Jl. Perintis Kemerdekaan No. 1, Lhoksukon, Aceh Utara"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi Sekolah</label>
                    <input
                      type="email"
                      value={config.email_sekolah || ''}
                      onChange={(e) => handleChange('email_sekolah', e.target.value)}
                      placeholder="Contoh: info@sman1lhoksukon.sch.id"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 p-4 bg-emerald-50/90 rounded-2xl border border-emerald-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Nomor WA Pengirim Otomatis (Rules Developer & Admin)</span>
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-600 text-white flex items-center gap-1">
                        <Check className="w-3 h-3" /> Gateway Aktif
                      </span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={config.no_whatsapp_pengirim || ''}
                        onChange={(e) => handleChange('no_whatsapp_pengirim', e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-mono font-bold text-emerald-950"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Nomor pengirim resmi yang digunakan sistem untuk mengirim pesan otomatis presensi ke WhatsApp orang tua/wali siswa.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const senderPhone = (config.no_whatsapp_pengirim || '081234567890').replace(/\D/g, '');
                          const formatted = senderPhone.startsWith('0') ? '62' + senderPhone.slice(1) : senderPhone;
                          const msg = encodeURIComponent(`[UJI COBA WA GATEWAY - ${config.nama_sekolah || 'SEKOLAH'}]\nSistem Absensi Otomatis WhatsApp siap digunakan dengan nomor pengirim: ${config.no_whatsapp_pengirim || '081234567890'}.`);
                          window.open(`https://api.whatsapp.com/send?phone=${formatted}&text=${msg}`, '_blank');
                          onShowToast('Membuka tautan tes WhatsApp pengirim...', 'success');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-2xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Tes Gateway WA</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-slate-800">Logo Sekolah & Favicon</h4>
                  <p className="text-xs text-slate-500">Unggah file logo sekolah baru atau gunakan URL gambar untuk mengubah tampilan aplikasi dan kartu tautan WhatsApp.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Config */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Logo Sekolah Utama</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                        <img
                          src={config.logo_url || '/logo.png'}
                          alt="Preview Logo"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'logo_url')}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">Format PNG, JPG, WebP. Maksimal 2MB.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Atau Gunakan URL Gambar Logo</label>
                      <input
                        type="text"
                        value={config.logo_url || ''}
                        onChange={(e) => handleChange('logo_url', e.target.value)}
                        placeholder="https://domain.com/logo.png"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Favicon Config */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Favicon Tab Browser</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                        <img
                          src={config.favicon_url || config.logo_url || '/logo.png'}
                          alt="Preview Favicon"
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File Favicon</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'favicon_url')}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">Ikon kecil tab browser (16x16 atau 32x32).</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Atau Gunakan URL Favicon</label>
                      <input
                        type="text"
                        value={config.favicon_url || ''}
                        onChange={(e) => handleChange('favicon_url', e.target.value)}
                        placeholder="https://domain.com/favicon.png"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Pratinjau Tautan WhatsApp / Open Graph Preview Card */}
                <div className="p-4 bg-emerald-950/5 border border-emerald-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        WA
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Pratinjau Tautan Media Sosial (WhatsApp Card)</h5>
                        <p className="text-[11px] text-slate-500">Simulasi tampilan tautan aplikasi saat dibagikan di WhatsApp, Telegram, atau Facebook.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? window.location.href : '';
                        navigator.clipboard.writeText(url);
                        onShowToast('Tautan aplikasi berhasil disalin!', 'success');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Link Aplikasi</span>
                    </button>
                  </div>

                  {/* Simulated WhatsApp Chat Bubble */}
                  <div className="max-w-md mx-auto bg-[#efeae2] p-3.5 rounded-xl border border-slate-300 shadow-sm font-sans">
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200/80 shadow-2xs">
                      {/* Image Thumbnail */}
                      <div className="w-full h-44 bg-slate-100 flex items-center justify-center p-4 border-b border-slate-100 relative overflow-hidden">
                        <img
                          src={
                            config.logo_url && config.logo_url.startsWith('data:image/')
                              ? '/api/app-logo'
                              : config.logo_url || '/logo.png'
                          }
                          alt="Open Graph Thumbnail"
                          className="max-h-full max-w-full object-contain drop-shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                        <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs">
                          Open Graph Image (512x512)
                        </span>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-3 bg-slate-50/90 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                          {typeof window !== 'undefined' ? window.location.hostname : 'sekolah.sch.id'}
                        </div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">
                          E-Absensi {config.nama_sekolah || 'SMA NEGERI'}
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                          Sistem Absensi Digital, Presensi QR Code & GPS {config.nama_sekolah || 'SMA NEGERI'}.{config.alamat_sekolah ? ` Alamat: ${config.alamat_sekolah}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="mt-1.5 flex justify-end">
                      <span className="text-[10px] text-slate-500 font-mono">10:00 AM • Dibagikan</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Injeksi Server-Side Meta Aktif (Express Node Server)
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      Server secara otomatis menyuntikkan tag <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-amber-800">og:title</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-amber-800">og:description</code>, dan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-amber-800">og:image</code> dengan URL HTTPS absolut saat bot scraper WhatsApp mengunjungi link ini.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isDeveloper && activeTab === 'login_screen' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>Kustomisasi Halaman Login (Khusus Developer)</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Atur judul nama sistem, deskripsi platform, dan gambar latar belakang (background) pada layar login aplikasi.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider shrink-0 shadow-2xs">
                    🔒 Developer Access Only
                  </span>
                </div>

                {/* Live Banner Preview Card */}
                <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 overflow-hidden relative border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Pratinjau Tampilan Login (Live Preview)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Simulasi Banner Kiri</span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden min-h-[180px] p-5 flex flex-col justify-between border border-white/10 group">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                      style={{
                        backgroundImage: `url('${config.login_bg_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop'}')`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-indigo-900/60 to-indigo-900/40" />

                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center p-1 border border-white/30">
                          <img src={config.logo_url || '/logo.png'} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{config.nama_sekolah || 'SMA NEGERI'}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                        {config.login_title || 'Sistem Absensi Digital'}
                      </h3>
                      <p className="text-xs text-indigo-100 max-w-md line-clamp-2">
                        {config.login_subtitle || 'Platform manajemen kehadiran siswa yang terintegrasi, real-time, dan mudah digunakan.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="space-y-4">
                  {/* 1. Judul / Nama Halaman Login */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Judul / Nama Aplikasi pada Halaman Login
                    </label>
                    <input
                      type="text"
                      value={config.login_title || ''}
                      onChange={(e) => handleChange('login_title', e.target.value)}
                      placeholder="e.g. Sistem Absensi Digital v2.0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                    <p className="text-[11px] text-slate-500">
                      Teks judul utama yang tampil besar di sebelah kanan logo pada banner login.
                    </p>
                  </div>

                  {/* 2. Deskripsi Halaman Login */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Deskripsi Singkat Platform Login
                    </label>
                    <textarea
                      rows={2}
                      value={config.login_subtitle || ''}
                      onChange={(e) => handleChange('login_subtitle', e.target.value)}
                      placeholder="e.g. Platform manajemen kehadiran siswa yang terintegrasi, real-time, dan mudah digunakan."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                    <p className="text-[11px] text-slate-500">
                      Teks penjelasan/deskripsi di bawah judul utama pada layar login.
                    </p>
                  </div>

                  {/* 3. Gambar Background Login */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Gambar Latar Belakang (Background Banner)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleChange('login_bg_url', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop')}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Reset ke Gambar Bawaan
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-32 h-20 rounded-xl border border-slate-300 bg-slate-100 shrink-0 overflow-hidden relative group">
                        <img
                          src={config.login_bg_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop'}
                          alt="Preview Background"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop';
                          }}
                        />
                      </div>
                      <div className="space-y-2 flex-1 w-full">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File Background (Base64)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 3 * 1024 * 1024) {
                                onShowToast('Ukuran berkas gambar maksimal 3MB', 'error');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const b64 = evt.target?.result as string;
                                if (b64) {
                                  handleChange('login_bg_url', b64);
                                  onShowToast('Gambar background berhasil diunggah!', 'success');
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">Format PNG, JPG, WebP. Maksimal 3MB.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Atau Tempel URL Gambar Latar Belakang
                      </label>
                      <input
                        type="text"
                        value={config.login_bg_url || ''}
                        onChange={(e) => handleChange('login_bg_url', e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>

                    {/* Preset background picker */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 block">⚡ Pilihan Background Siap Pakai (Preset):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { name: 'Sekolah Modern', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop' },
                          { name: 'Gedung Kampus', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2670&auto=format&fit=crop' },
                          { name: 'Perpustakaan Digital', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2670&auto=format&fit=crop' },
                          { name: 'Gelombang Modern', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2670&auto=format&fit=crop' },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              handleChange('login_bg_url', preset.url);
                              onShowToast(`Background "${preset.name}" dipilih!`, 'info');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-amber-500 bg-slate-50 text-left transition flex items-center gap-2 group cursor-pointer"
                          >
                            <img src={preset.url} alt={preset.name} className="w-7 h-7 rounded object-cover shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate group-hover:text-amber-600">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'akademik' && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-slate-800">Tahun Ajaran & Pengesahan Laporan</h4>
                  <p className="text-xs text-slate-500">Konfigurasi periode akademik dan data Kepala Sekolah penanda tangan rekap absensi.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran Aktif *</label>
                    <input
                      type="text"
                      required
                      value={config.tahun_ajaran || '2025/2026'}
                      onChange={(e) => handleChange('tahun_ajaran', e.target.value)}
                      placeholder="Contoh: 2025/2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Semester Aktif *</label>
                    <select
                      value={config.semester_aktif || 'Ganjil'}
                      onChange={(e) => handleChange('semester_aktif', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kepala Sekolah *</label>
                    <input
                      type="text"
                      required
                      value={config.nama_kepala_sekolah || ''}
                      onChange={(e) => handleChange('nama_kepala_sekolah', e.target.value)}
                      placeholder="Contoh: Drs. H. Azhari, M.Pd."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={config.nip_kepala_sekolah || ''}
                      onChange={(e) => handleChange('nip_kepala_sekolah', e.target.value)}
                      placeholder="Contoh: 19680512 199403 1 004"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'absensi' && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-slate-800">Jam Operasional & Toleransi Keterlambatan</h4>
                  <p className="text-xs text-slate-500">Tentukan jendela waktu scan QR absensi datang dan pulang sekolah.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                    <h5 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">Absen Masuk (Datang)</h5>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Masuk Dibuka</label>
                      <input
                        type="time"
                        required
                        value={config.jam_masuk_mulai || '06:30'}
                        onChange={(e) => handleChange('jam_masuk_mulai', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Jam Masuk (Lewat = Terlambat)</label>
                      <input
                        type="time"
                        required
                        value={config.jam_masuk_akhir || '07:15'}
                        onChange={(e) => handleChange('jam_masuk_akhir', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-200 space-y-3">
                    <h5 className="font-bold text-xs text-sky-950 uppercase tracking-wider">Absen Kepulangan (Pulang)</h5>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Pulang Dibuka</label>
                      <input
                        type="time"
                        required
                        value={config.jam_pulang_mulai || '15:00'}
                        onChange={(e) => handleChange('jam_pulang_mulai', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Jam Pulang</label>
                      <input
                        type="time"
                        required
                        value={config.jam_pulang_akhir || '17:00'}
                        onChange={(e) => handleChange('jam_pulang_akhir', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                  <h5 className="font-bold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Nomor WhatsApp Pengirim / Gateway Notifikasi Absensi</span>
                  </h5>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WA Pengirim Resmi (Nomor Admin/Sekolah)</label>
                    <input
                      type="text"
                      value={config.no_whatsapp_pengirim || ''}
                      onChange={(e) => handleChange('no_whatsapp_pengirim', e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-mono bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nomor ini merupakan sender WhatsApp resmi sekolah untuk otomatisasi notifikasi berita kehadiran (Hadir, Terlambat, Izin/Sakit, Alpha, Pulang) ke orang tua murid.
                    </p>
                  </div>
                </div>
              </div>
            )}



            {activeTab === 'sistem' && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-slate-800">Pemeliharaan & Keamanan Sistem</h4>
                  <p className="text-xs text-slate-500">Akses cepat login biometrik, bersihkan cache tersimpan, atau kembalikan konfigurasi default.</p>
                </div>

                {/* Biometric Fast Login Developer Card */}
                <div className="p-4 bg-slate-900 text-white rounded-xl border border-indigo-500/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Fingerprint className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-white">Fast Login Biometrik Developer</h5>
                      <p className="text-[11px] text-slate-400">Masuk sebagai Developer via Sidik Jari / Wajah tanpa mengetik password.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleDevBiometric}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isDevBiometricActive
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'
                    }`}
                  >
                    {isDevBiometricActive ? <ShieldCheck className="w-4 h-4" /> : <ScanFace className="w-4 h-4" />}
                    <span>{isDevBiometricActive ? 'Aktif' : 'Aktifkan'}</span>
                  </button>
                </div>

                {/* Clear Cache Card */}
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm text-sky-950 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-sky-600" />
                      <span>Bersihkan Cache & Storage Aplikasi</span>
                    </h5>
                    <p className="text-xs text-sky-800 mt-0.5 leading-relaxed">
                      Menghapus memori cache browser, temporary notification status, serta menyegarkan meta tag dan favicon Open Graph secara langsung agar data paling baru ditampilkan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Clear Cache Now</span>
                  </button>
                </div>

                {/* Reset Default Card */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm text-amber-950">Kembalikan Pengaturan ke Default</h5>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Ini akan mereset nama sekolah, logo, dan jam operasional ke bawaan default sistem tanpa menghapus data siswa atau absensi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Settings</span>
                  </button>
                </div>
              </div>
              )}

            {activeTab === 'cpanel' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <span>Panduan Hosting cPanel & Solusi Link Preview WhatsApp</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Sebab utama Open Graph tidak bekerja di cPanel static hosting & panduan konfigurasi lengkap agar kartu pratinjau WhatsApp muncul sempurna.
                  </p>
                </div>

                {/* Main Explanation Box */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-3">
                  <h5 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Mengapa Pratinjau WhatsApp Tidak Muncul Setelah Diupload ke cPanel?</span>
                  </h5>
                  <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                    <p>
                      <strong>1. WhatsApp Bot Scraper Tidak Mengeksekusi JavaScript:</strong> Saat aplikasi di-upload dalam bentuk file statis (folder <code className="bg-amber-100 px-1 rounded text-amber-900 font-mono">dist</code>) ke Apache cPanel, bot WhatsApp hanya membaca file HTML mentah (<code className="bg-amber-100 px-1 rounded text-amber-900 font-mono">index.html</code>) secara langsung tanpa menjalankan script React.
                    </p>
                    <p>
                      <strong>2. URL Gambar Wajib HTTPS Absolut:</strong> WhatsApp menolak meta tag <code className="bg-amber-100 px-1 rounded text-amber-900 font-mono">og:image</code> yang berupa URL relatif (seperti <code className="bg-amber-100 px-1 rounded text-amber-900 font-mono">/logo.png</code>) atau data URI base64. URL gambar harus berupa HTTPS lengkap, contoh: <code className="bg-amber-100 px-1 rounded text-amber-900 font-mono">https://domainsekolah.sch.id/logo.png</code>.
                    </p>
                  </div>
                </div>

                {/* Domain Configurator for Code Generation */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Masukkan URL Domain Sekolah di cPanel Anda:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={cpanelDomainInput}
                      onChange={(e) => setCpanelDomainInput(e.target.value)}
                      placeholder="https://sekolah.sch.id"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onShowToast('Domain cPanel dikonfigurasi untuk generator kode.', 'info');
                      }}
                      className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>

                {/* Solusi 1: Meta Tag index.html Siap Pakai */}
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                        Solusi 1: Kode Meta Tags index.html cPanel (Paling Mudah)
                      </h5>
                      <p className="text-[11px] text-slate-600">
                        Salin kode meta ini dan letakkan di dalam tag <code className="font-mono text-emerald-800">&lt;head&gt;</code> file <code className="font-mono text-emerald-800">index.html</code> Anda di cPanel.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const domain = cpanelDomainInput.trim().replace(/\/$/, '') || 'https://sekolah.sch.id';
                        const ogCode = `<meta property="og:type" content="website" />
<meta property="og:title" content="E-Absensi ${config.nama_sekolah || 'SMA NEGERI'}" />
<meta property="og:description" content="Sistem Absensi Digital, Presensi QR Code & GPS ${config.nama_sekolah || 'SMA NEGERI'}." />
<meta property="og:url" content="${domain}/" />
<meta property="og:image" content="${domain}/logo.png" />
<meta property="og:image:secure_url" content="${domain}/logo.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="512" />
<meta property="og:image:height" content="512" />
<meta property="og:site_name" content="E-Absensi ${config.nama_sekolah || 'SMA NEGERI'}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="E-Absensi ${config.nama_sekolah || 'SMA NEGERI'}" />
<meta name="twitter:description" content="Sistem Absensi Digital, Presensi QR Code & GPS ${config.nama_sekolah || 'SMA NEGERI'}." />
<meta name="twitter:image" content="${domain}/logo.png" />`;
                        navigator.clipboard.writeText(ogCode);
                        onShowToast('Kode Meta Tags Open Graph cPanel berhasil disalin!', 'success');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode Meta</span>
                    </button>
                  </div>

                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
{`<meta property="og:type" content="website" />
<meta property="og:title" content="E-Absensi ${config.nama_sekolah || 'SMA NEGERI'}" />
<meta property="og:description" content="Sistem Absensi Digital, Presensi QR Code & GPS ${config.nama_sekolah || 'SMA NEGERI'}." />
<meta property="og:url" content="${cpanelDomainInput.trim().replace(/\/$/, '') || 'https://sekolah.sch.id'}/" />
<meta property="og:image" content="${cpanelDomainInput.trim().replace(/\/$/, '') || 'https://sekolah.sch.id'}/logo.png" />
<meta property="og:image:secure_url" content="${cpanelDomainInput.trim().replace(/\/$/, '') || 'https://sekolah.sch.id'}/logo.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="512" />
<meta property="og:image:height" content="512" />
<meta property="og:site_name" content="E-Absensi ${config.nama_sekolah || 'SMA NEGERI'}" />`}
                  </pre>
                </div>

                {/* Solusi File .htaccess cPanel */}
                <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-sky-950 uppercase tracking-wider">
                        File .htaccess Wajib untuk cPanel Apache
                      </h5>
                      <p className="text-[11px] text-slate-600">
                        Memastikan SPA routing berjalan lancar (tidak 404 saat refresh) dan header gambar logo diizinkan untuk crawler WhatsApp.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const htCode = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Jika file atau direktori benar-benar ada, layani langsung
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Alihkan semua URL SPA lainnya ke index.html
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(png|jpg|jpeg|gif|ico|svg)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "public, max-age=86400"
  </FilesMatch>
</IfModule>`;
                        navigator.clipboard.writeText(htCode);
                        onShowToast('Isi file .htaccess cPanel berhasil disalin!', 'success');
                      }}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin .htaccess</span>
                    </button>
                  </div>

                  <pre className="p-3 bg-slate-900 text-sky-300 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
{`<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ index.html [L]
</IfModule>`}
                  </pre>
                </div>

                {/* Panduan Deploy Apache Static Web Hosting (Tanpa Node.js) */}
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3">
                  <h5 className="font-bold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Panduan Deploy cPanel Basis Apache / HTML Static (Tanpa Node.js)</span>
                  </h5>
                  <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                    <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1.5">
                      <p className="font-bold text-emerald-900">Cara 1: Upload Langsung via cPanel File Manager (Paling Mudah)</p>
                      <ol className="list-decimal list-inside text-slate-600 text-[11px] space-y-1">
                        <li>Download ZIP dari AI Studio / Ekstrak source code dari GitHub di komputer Anda.</li>
                        <li>Buka Terminal komputer Anda lalu jalankan perintah build static: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-900">npm run build</code></li>
                        <li>Hasil build akan tercipta di dalam folder <code className="font-mono bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-bold">dist/</code> (berisi index.html, assets, dan file .htaccess).</li>
                        <li>Compress/ZIP isi dari folder <code className="font-mono bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-bold">dist/</code> tersebut.</li>
                        <li>Buka <strong>cPanel &gt; File Manager &gt; public_html</strong> (atau folder subdomain Anda).</li>
                        <li>Upload ZIP isi <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">dist/</code> tersebut, lalu Ekstrak di cPanel. Done!</li>
                      </ol>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1.5">
                      <p className="font-bold text-emerald-900">Cara 2: Otomatis via GitHub Actions (CI/CD ke cPanel FTP)</p>
                      <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-1">
                        <li>Push source code proyek ke akun GitHub Anda.</li>
                        <li>Setup GitHub Action dengan <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">SamKirkland/FTP-Deploy-Action</code> yang meng-upload folder <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">dist/</code> ke FTP cPanel setiap kali ada commit baru.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action Footer inside Form */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
