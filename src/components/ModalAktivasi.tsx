import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, ShieldAlert, Copy, Check, Lock, Sparkles, RefreshCw, X, Award, AlertTriangle, Building2, HelpCircle, Globe, Send, MessageCircle } from 'lucide-react';
import { AppActivationState, getActivationState, activateApplication, generateTokenForAppId, generateTokenForTargetDomain, isMasterLicenseDomain, DEMO_LIMITS } from '../services/activation';

interface ModalAktivasiProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessActivation?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  currentUserRole?: string;
}

export const ModalAktivasi: React.FC<ModalAktivasiProps> = ({
  isOpen,
  onClose,
  onSuccessActivation,
  onShowToast,
  currentUserRole = 'admin',
}) => {
  const [activationState, setActivationState] = useState<AppActivationState>(getActivationState());
  const [tokenInput, setTokenInput] = useState('');
  const [copiedAppId, setCopiedAppId] = useState(false);
  const [copiedDevToken, setCopiedDevToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedDevToken, setGeneratedDevToken] = useState('');

  // Domain Generator Quick Tool inside Modal
  const [targetDomainInput, setTargetDomainInput] = useState('');
  const [targetNpsnInput, setTargetNpsnInput] = useState('10101234');
  const [targetSchoolInput, setTargetSchoolInput] = useState('');
  const [quickGenAppId, setQuickGenAppId] = useState('');
  const [quickGenToken, setQuickGenToken] = useState('');
  const [quickGenWa, setQuickGenWa] = useState('');
  const [copiedQuickToken, setCopiedQuickToken] = useState(false);
  const [copiedQuickWa, setCopiedQuickWa] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const state = getActivationState();
      setActivationState(state);
      setTokenInput('');
      setGeneratedDevToken(generateTokenForAppId(state.appId));

      if (typeof window !== 'undefined') {
        const curHost = window.location.hostname;
        setTargetDomainInput(curHost);
        const pkg = generateTokenForTargetDomain(curHost, '10101234', 'Sekolah Pemesan');
        setQuickGenAppId(pkg.appId);
        setQuickGenToken(pkg.activationToken);
        setQuickGenWa(pkg.whatsappMessage);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyAppId = () => {
    navigator.clipboard.writeText(activationState.appId);
    setCopiedAppId(true);
    onShowToast('ID Aplikasi berhasil disalin ke clipboard!', 'info');
    setTimeout(() => setCopiedAppId(false), 2500);
  };

  const handleCopyDevToken = () => {
    navigator.clipboard.writeText(generatedDevToken);
    setCopiedDevToken(true);
    onShowToast('Token Aktivasi berhasil disalin!', 'info');
    setTimeout(() => setCopiedDevToken(false), 2500);
  };

  const handleAutoFillDevToken = () => {
    setTokenInput(generatedDevToken);
    onShowToast('Token otomatis terisi ke dalam kolom masukan.', 'info');
  };

  const handleSubmitActivation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const result = activateApplication(tokenInput, currentUserRole);
      setIsSubmitting(false);

      if (result.success) {
        setActivationState(getActivationState());
        onShowToast(result.message, 'success');
        if (onSuccessActivation) onSuccessActivation();
      } else {
        onShowToast(result.message, 'error');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <KeyRound className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white leading-tight flex items-center gap-2">
                <span>Aktivasi Lisensi Aplikasi V2.1</span>
                <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black uppercase rounded">V2.1</span>
              </h3>
              <p className="text-xs text-slate-400">Status Lisensi & Sistem Aktivasi Terpusat V2.1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm">
          {/* Status Card */}
          {activationState.isActivated ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm sm:text-base">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Aplikasi Teraktivasi (Full Version)</span>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Aplikasi E-Absensi berjalan dalam **Versi Penuh** tanpa batasan jumlah siswa, guru, maupun laporan export.
              </p>
              {activationState.activatedAt && (
                <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-emerald-700">
                  <div><span className="font-semibold">Tanggal Aktivasi:</span> {activationState.activatedAt}</div>
                  {activationState.registeredSchool && (
                    <div><span className="font-semibold">Sekolah:</span> {activationState.registeredSchool}</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm sm:text-base">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Status: Mode Demo (Terbatas)</span>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Belum Aktif
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Saat ini aplikasi Anda berstatus **Demo**. Untuk membuka seluruh fitur tanpa batasan, silakan masukkan **Token Aktivasi** resmi.
              </p>
              
              {/* Demo Limits Checklist */}
              <div className="p-3 bg-white/80 rounded-lg border border-amber-200 text-xs space-y-1.5 text-slate-700">
                <div className="font-bold text-amber-900 text-[11px] uppercase tracking-wider mb-1">Batasan Mode Demo:</div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Maksimal **{DEMO_LIMITS.MAX_SISWA} Siswa** pada database</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Maksimal **{DEMO_LIMITS.MAX_GURU} Akun Guru / Wali Kelas**</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Laporan Export Excel & PDF memiliki batas pratinjau</span>
                </div>
              </div>
            </div>
          )}

          {/* App Device ID Box */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>ID Unik Aplikasi (Kode Hardware Device)</span>
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={activationState.appId}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs sm:text-sm font-bold text-slate-800 shadow-2xs select-all text-center tracking-wider"
              />
              <button
                type="button"
                onClick={handleCopyAppId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Salin ID Aplikasi"
              >
                {copiedAppId ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedAppId ? 'Tersalin' : 'Salin ID'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Salin Kode ID Unik di atas lalu kirimkan kepada Vendor/Pengembang untuk menerbitkan **Token Aktivasi** khusus instalasi ini.
            </p>
          </div>

          {/* Activation Form */}
          {!activationState.isActivated && (
            <form onSubmit={handleSubmitActivation} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Masukkan Token / Key Aktivasi</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="EABS-XXXX-XXXX-XXXX-XXXX"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-sm sm:text-base font-bold text-slate-900 tracking-wider text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500 uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !tokenInput.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Award className="w-4 h-4 text-slate-950" />
                )}
                <span>Aktivasikan ke Versi Penuh</span>
              </button>
            </form>
          )}

          {/* Master Domain Generator Helper (Only on absen.kangyos.com or localhost) */}
          {isMasterLicenseDomain() && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 mt-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Generator Lisensi Domain Unlimited (KangYos Master Hub)</span>
                </span>
                <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                  absen.kangyos.com
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-normal">
                Ketik nama domain target pemesan di bawah untuk menghasilkan ID Aplikasi & Token Lisensi Domain resmi dalam 1 klik:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Globe className="w-3 h-3 text-indigo-400" /> Nama Domain Target
                  </label>
                  <input
                    type="text"
                    value={targetDomainInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetDomainInput(val);
                      const pkg = generateTokenForTargetDomain(val, targetNpsnInput, targetSchoolInput || 'Sekolah Pemesan');
                      setQuickGenAppId(pkg.appId);
                      setQuickGenToken(pkg.activationToken);
                      setQuickGenWa(pkg.whatsappMessage);
                    }}
                    placeholder="misal: sma1kediri.sch.id"
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    NPSN Sekolah Target
                  </label>
                  <input
                    type="text"
                    value={targetNpsnInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetNpsnInput(val);
                      const pkg = generateTokenForTargetDomain(targetDomainInput, val, targetSchoolInput || 'Sekolah Pemesan');
                      setQuickGenAppId(pkg.appId);
                      setQuickGenToken(pkg.activationToken);
                      setQuickGenWa(pkg.whatsappMessage);
                    }}
                    placeholder="10101234"
                    className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-xs font-bold rounded-lg px-2.5 py-1.5 focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Generated Result */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>Target App ID: <strong className="text-indigo-400">{quickGenAppId}</strong></span>
                  <span className="text-emerald-400 font-bold">Unlimited Domain</span>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-900 border border-slate-700 text-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-mono font-black tracking-wider text-center select-all">
                    {quickGenToken}
                  </code>
                  
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(quickGenToken);
                      setCopiedQuickToken(true);
                      onShowToast('Token Aktivasi berhasil disalin!', 'info');
                      setTimeout(() => setCopiedQuickToken(false), 2000);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    {copiedQuickToken ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedQuickToken ? 'Tersalin' : 'Salin Token'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(quickGenWa);
                      setCopiedQuickWa(true);
                      onShowToast('Pesan WhatsApp siap kirim berhasil disalin!', 'success');
                      setTimeout(() => setCopiedQuickWa(false), 2000);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition cursor-pointer shrink-0"
                    title="Salin Pesan WhatsApp Lengkap"
                  >
                    {copiedQuickWa ? <Check className="w-4 h-4 text-emerald-300" /> : <MessageCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Butuh bantuan lisensi? Hubungi Tim Support</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
