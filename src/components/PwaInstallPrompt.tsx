import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, WifiOff, Sparkles, AppWindow, ArrowRight } from 'lucide-react';
import { getAppLogo, getSchoolName } from '../services/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallPromptProps {
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ onShowToast }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // 1. Check if application is running in Standalone / Installed PWA mode
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      return isStandaloneMedia || isIosStandalone || isAndroidApp;
    };

    setIsStandalone(checkIsStandalone());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // 2. Detect Mobile device
    const ua = window.navigator.userAgent;
    const mobileCheck = /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(ua) || window.innerWidth <= 768;
    setIsMobile(mobileCheck);

    // 3. Detect iOS
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    setIsIos(isIosDevice);

    // 4. Online / Offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      if (onShowToast) onShowToast('Koneksi internet kembali terhubung. 🟢', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (onShowToast) onShowToast('Aplikasi berjalan dalam mode Offline (PWA Cache). 🔴', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 6. Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('[PWA] App successfully installed!');
      setIsStandalone(true);
      if (onShowToast) onShowToast('Aplikasi E-Absensi berhasil dipasang di layar utama!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, [onShowToast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          if (onShowToast) onShowToast('Aplikasi E-Absensi berhasil diinstall ke layar utama!', 'success');
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Error installing PWA:', err);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      if (onShowToast) {
        onShowToast('Gunakan menu browser (titik 3) -> "Tambahkan ke Layar Utama" / "Install Aplikasi".', 'info');
      }
    }
  };

  // If app is running as standalone PWA or dismissed, hide popup (show offline indicator if offline)
  if (isStandalone || dismissed) {
    if (!isOnline) {
      return (
        <div className="fixed bottom-4 left-4 z-50 bg-rose-900 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-2xl flex items-center gap-2.5 animate-bounce border border-rose-700">
          <WifiOff className="w-4 h-4 text-rose-300 animate-pulse" />
          <span>Mode Offline (Cache Aktif)</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* Premium Glowing Dynamic PWA Install Floating Banner */}
      <div className="fixed bottom-14 sm:bottom-6 right-3 sm:right-6 z-40 animate-slide-up max-w-[92vw] sm:max-w-md">
        <div className="relative group">
          {/* Ambient Glow Background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse pointer-events-none" />

          {/* Main Card */}
          <div className="relative bg-slate-950/95 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3">
            {/* Left: App Logo & Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 p-1 border border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
                  <img
                    src={getAppLogo()}
                    alt="App Logo"
                    className="w-full h-full object-contain filter drop-shadow"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-black text-xs sm:text-sm tracking-wide text-white truncate">
                    E-ABSENSI DIGITAL
                  </h4>
                  <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter shrink-0 shadow-xs">
                    App
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate font-medium">
                  {isIos ? 'Pasang di iOS Homescreen' : 'Install Aplikasi di HP/PC'}
                </p>
              </div>
            </div>

            {/* Right: Install Button & Close */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="relative overflow-hidden group/btn px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 shadow-lg transition-all duration-300 flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-300/60"
              >
                <Download className="w-3.5 h-3.5 text-slate-950 animate-bounce shrink-0" />
                <span className="tracking-tight whitespace-nowrap">
                  {isIos ? 'Install iOS' : 'Install Sekarang'}
                </span>
                <Sparkles className="w-3 h-3 text-slate-950 opacity-70 group-hover/btn:rotate-12 transition-transform hidden sm:inline" />
              </button>

              <button
                onClick={() => setDismissed(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-800">
                  <Smartphone className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                    Install di iOS Safari
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    iPhone / iPad Homescreen App
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-600 dark:text-slate-400">
                Untuk memasang aplikasi E-Absensi di iPhone atau iPad Anda:
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs mt-0.5 shadow-xs">
                    1
                  </div>
                  <p className="leading-relaxed">
                    Ketuk tombol <strong>Bagikan / Share</strong>{' '}
                    <Share className="w-4 h-4 inline text-indigo-600 dark:text-indigo-400 mx-0.5" /> di bawah navigasi Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs mt-0.5 shadow-xs">
                    2
                  </div>
                  <p className="leading-relaxed">
                    Gulir opsi ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full mt-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-extrabold text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              Saya Mengerti & Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
