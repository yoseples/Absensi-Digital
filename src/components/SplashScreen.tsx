import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  ShieldCheck,
  Zap,
  Sparkles,
  Wifi,
  Battery,
  Signal,
  CheckCircle2,
  Building2,
  QrCode,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { getSchoolName, getAppLogo } from '../services/storage';

interface SplashScreenProps {
  onComplete: () => void;
  isManualPreview?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isManualPreview = false,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const schoolName = getSchoolName() || 'SMA NEGERI';
  const logoUrl = getAppLogo() || '/logo.png';

  const loadingSteps = [
    { title: 'Inisialisasi Sistem...', subtitle: 'Menghubungkan ke layanan E-Absensi' },
    { title: 'Memuat Data Sekolah...', subtitle: 'Sinkronisasi profil & konfigurasi presensi' },
    { title: 'Menyiapkan Scanner QR & GPS...', subtitle: 'Validasi modul kehadiran terenkripsi' },
    { title: 'Memeriksa Keamanan Sesi...', subtitle: 'Melindungi data siswa dan guru' },
    { title: 'Sistem Siap Digunakan!', subtitle: 'Selamat datang di E-Absensi Digital' }
  ];

  useEffect(() => {
    // Hide HTML fallback splash screen if still present
    const fallbackEl = document.getElementById('splash-fallback');
    if (fallbackEl) {
      fallbackEl.style.opacity = '0';
      setTimeout(() => {
        fallbackEl.remove();
      }, 400);
    }

    // Capped loading duration (1.8s total so it loads quickly & never exceeds max 5s)
    const duration = isManualPreview ? 2500 : 1800; // 1.8 seconds total duration
    const intervalTime = 30;
    const totalSteps = duration / intervalTime;
    let stepCount = 0;

    // Safety fallback timer to strictly enforce maximum 5 seconds display
    const maxSafetyTimer = setTimeout(() => {
      onComplete();
    }, 5000);

    const timer = setInterval(() => {
      stepCount++;
      const currentProgress = Math.min(Math.round((stepCount / totalSteps) * 100), 100);
      setProgress(currentProgress);

      // Update status steps based on progress percent
      if (currentProgress < 25) setStatusIndex(0);
      else if (currentProgress < 50) setStatusIndex(1);
      else if (currentProgress < 75) setStatusIndex(2);
      else if (currentProgress < 95) setStatusIndex(3);
      else setStatusIndex(4);

      if (stepCount >= totalSteps) {
        clearInterval(timer);
        clearTimeout(maxSafetyTimer);
        setTimeout(() => {
          onComplete();
        }, 200);
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
      clearTimeout(maxSafetyTimer);
    };
  }, [isManualPreview, onComplete]);

  // Current time for mobile status bar
  const now = new Date();
  const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans cursor-pointer"
    >
      {/* Background Animated Gradient Mesh & Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-[90px]"></div>
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-96 bg-cyan-500/15 rounded-full blur-[120px]"></div>
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        ></div>
      </div>

      {/* Top Mobile Status Bar Emulation */}
      <div className="relative z-10 px-6 pt-3 pb-2 flex items-center justify-between text-xs text-slate-400 font-medium tracking-wider">
        <div className="flex items-center space-x-2">
          <span>{timeString}</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <div className="flex items-center space-x-1 border border-slate-700 rounded px-1 py-0.5 text-[10px]">
            <span>100%</span>
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Skip Button (Top Right) */}
      <div className="relative z-10 px-6 pt-1 flex justify-end">
        <button
          onClick={onComplete}
          className="group flex items-center space-x-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-800 backdrop-blur-md transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <span>Lewati</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Central Branding & Native Card Area */}
      <div className="relative z-10 my-auto px-6 flex flex-col items-center text-center">
        {/* Native App Pill Tag */}
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/10 via-indigo-500/20 to-blue-500/10 border border-blue-500/30 px-4 py-1.5 rounded-full text-xs font-semibold text-blue-300 mb-8 backdrop-blur-xl shadow-inner"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>NATIVE MOBILE PWA APPS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span className="text-[11px] text-blue-200/80 font-mono">v2.0</span>
        </motion.div>

        {/* Logo Container with Glowing Ring Effect */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative mb-8 group"
        >
          {/* Outer Pulse Rings */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl opacity-40 blur-xl group-hover:opacity-60 transition duration-700 animate-pulse"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-2xl opacity-75 blur-sm"></div>

          {/* Core Logo Wrapper */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-slate-900/90 border border-slate-700/80 rounded-2xl flex items-center justify-center p-4 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <img
              src={logoUrl}
              alt={schoolName}
              className="w-full h-full object-contain drop-shadow-md transform group-hover:scale-105 transition duration-500"
              onError={(e) => {
                // Fallback icon if logo image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Fallback building icon */}
            <Building2 className="w-14 h-14 text-blue-400 hidden group-has-[img[style*='display: none']]:block" />
          </div>

          {/* Small Verified Badge */}
          <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-950">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </motion.div>

        {/* Title & School Metadata */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-2 max-w-sm"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
            E-ABSENSI DIGITAL
          </h1>
          <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest flex items-center justify-center space-x-1.5">
            <Building2 className="w-4 h-4 text-blue-400/80" />
            <span>{schoolName}</span>
          </p>
          <p className="text-xs text-slate-400 font-normal">
            Sistem Presensi QR Code, Geolocation GPS & Laporan Realtime
          </p>
        </motion.div>
      </div>

      {/* Bottom Loading Progress & Footer */}
      <div className="relative z-10 px-6 pb-8 pt-4 w-full max-w-md mx-auto">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl shadow-2xl space-y-3">
          {/* Progress Percent & Step Status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="truncate max-w-[200px] sm:max-w-[240px]">
                {loadingSteps[statusIndex].title}
              </span>
            </div>
            <span className="font-mono font-bold text-blue-400 text-sm">{progress}%</span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeInOut' }}
            />
          </div>

          {/* Subtitle status text */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span className="truncate">{loadingSteps[statusIndex].subtitle}</span>
            <div className="flex items-center space-x-1 text-slate-500 shrink-0">
              <QrCode className="w-3 h-3 text-blue-400" />
              <span>Smart Scanner</span>
            </div>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 px-2">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Koneksi Terenkripsi SSL</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-500">
            <span>Powered by</span>
            <span className="font-semibold text-slate-400">cPanel MySQL</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
