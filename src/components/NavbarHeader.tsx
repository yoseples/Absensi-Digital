import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  Database,
  Settings,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  MessageCircle,
  Check,
  X,
  Clock,
  ExternalLink,
  Info,
  KeyRound,
  Award,
  Trash2,
  Bot,
  Sparkles,
  Sun,
  Moon,
  SunMoon,
} from 'lucide-react';
import {
  getAppLogo,
  getSchoolName,
  getAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearReadNotifications,
  clearAppCache,
} from '../services/storage';
import { getActivationState } from '../services/activation';
import { checkMySqlConnection } from '../services/api';
import { getThemeMode, setThemeMode, applyTheme, ThemeMode } from '../services/theme';
import { AppNotification } from '../types';

interface NavbarHeaderProps {
  pageTitle: string;
  onToggleSidebar: () => void;
  onOpenMysqlModal?: () => void;
  onOpenDevSettings?: () => void;
  onOpenActivationModal?: () => void;
  onOpenAiBot?: () => void;
  onNavigate?: (viewId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  pageTitle,
  onToggleSidebar,
  onOpenMysqlModal,
  onOpenDevSettings,
  onOpenActivationModal,
  onOpenAiBot,
  onNavigate,
  onShowToast,
}) => {
  const logoUrl = getAppLogo();
  const schoolName = getSchoolName();
  const activationState = getActivationState();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'warning' | 'presensi' | 'system'>('all');
  const notifRef = useRef<HTMLDivElement>(null);

  // Theme Management State
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getThemeMode());
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [themeInfo, setThemeInfo] = useState(() => applyTheme(getThemeMode()));
  const themeRef = useRef<HTMLDivElement>(null);

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const currentDate = new Date().toLocaleDateString('id-ID', options);

  // Theme auto update timer & click outside listener
  useEffect(() => {
    const updateThemeState = () => {
      const mode = getThemeMode();
      const res = applyTheme(mode);
      setThemeInfo(res);
      setThemeModeState(mode);
    };
    updateThemeState();

    // Check every 30 seconds for automatic time change (6 AM light / 6 PM dark)
    const timer = setInterval(updateThemeState, 30000);
    return () => clearInterval(timer);
  }, []);

  // Hide Navbar on Scroll Down, Show on Scroll Up
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScrollTarget = (currentScrollY: number) => {
      const diff = currentScrollY - lastScrollYRef.current;

      // 10px threshold to prevent jittering
      if (Math.abs(diff) > 10) {
        if (currentScrollY > 60 && diff > 0) {
          setIsHeaderVisible(false);
        } else if (diff < 0 || currentScrollY <= 60) {
          setIsHeaderVisible(true);
        }
        lastScrollYRef.current = currentScrollY;
      }
    };

    const handleWindowScroll = () => {
      handleScrollTarget(window.scrollY);
    };

    const scrollContainer = document.querySelector('main .overflow-y-auto');
    const handleContainerScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target) {
        handleScrollTarget(target.scrollTop);
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleContainerScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleContainerScroll);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutsideTheme = (event: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    if (isThemeOpen) {
      document.addEventListener('mousedown', handleClickOutsideTheme);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTheme);
    };
  }, [isThemeOpen]);

  const handleSelectTheme = (selectedMode: ThemeMode) => {
    const res = setThemeMode(selectedMode);
    setThemeModeState(selectedMode);
    setThemeInfo(res);
    setIsThemeOpen(false);

    if (onShowToast) {
      if (selectedMode === 'auto') {
        const modeDesc = res.isNight
          ? 'Mode Gelap (Malam Hari 18:00 - 06:00)'
          : 'Mode Terang (Siang Hari 06:00 - 18:00)';
        onShowToast(`Tema Otomatis Aktif: ${modeDesc}`, 'info');
      } else if (selectedMode === 'dark') {
        onShowToast('Mode Gelap (Malam) Diaktifkan', 'info');
      } else {
        onShowToast('Mode Terang (Siang) Diaktifkan', 'info');
      }
    }
  };

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
    message: 'Memeriksa status database...',
    url: '',
  });

  const checkDb = async () => {
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
    checkDb();
    const interval = setInterval(checkDb, 15000);
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

  // Load notifications
  const refreshNotifications = () => {
    const list = getAppNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    refreshNotifications();
    // Refresh periodically every 15 seconds to catch new attendance records
    const interval = setInterval(refreshNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    const ids = notifications.map((n) => n.id);
    markAllNotificationsAsRead(ids);
    refreshNotifications();
  };

  const handleClearCache = () => {
    clearAppCache();
    refreshNotifications();
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    refreshNotifications();
    if (notif.targetView && onNavigate) {
      onNavigate(notif.targetView);
      setIsNotifOpen(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'warning') return n.type === 'warning';
    if (activeFilter === 'presensi') return n.type === 'presensi';
    if (activeFilter === 'system') return n.type === 'system' || n.type === 'info';
    return true;
  });

  const getIcon = (type: string, iconType?: string) => {
    if (iconType === 'alert' || type === 'warning') {
      return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (iconType === 'check' || type === 'presensi') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (iconType === 'whatsapp') {
      return <MessageCircle className="w-4 h-4 text-teal-600 shrink-0" />;
    }
    if (iconType === 'lock' || type === 'system') {
      return <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />;
    }
    return <Info className="w-4 h-4 text-blue-600 shrink-0" />;
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-3 sm:px-6 border-b border-slate-200/70 dark:border-slate-800/80 shadow-xs supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 transition-all">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg transition-colors focus:outline-none cursor-pointer shrink-0"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={logoUrl}
            alt={schoolName}
            referrerPolicy="no-referrer"
            className="w-7 h-7 object-contain shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none truncate max-w-[130px] sm:max-w-none">{pageTitle}</h2>
            <p className="text-[10px] text-slate-400 font-semibold hidden sm:block mt-0.5 truncate">{schoolName}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {onOpenMysqlModal && (
          <button
            onClick={onOpenMysqlModal}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-extrabold text-[10px] sm:text-xs transition shadow-2xs cursor-pointer border ${
              dbStatus.loading
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                : dbStatus.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
            title={`Status Database Real-time:\n${dbStatus.message}\nURL API: ${dbStatus.url || 'Default'}`}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Database className={`w-3.5 h-3.5 shrink-0 ${dbStatus.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
              <span
                className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                  dbStatus.loading
                    ? 'bg-amber-400 animate-ping'
                    : dbStatus.success
                    ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-200 dark:ring-emerald-900'
                    : 'bg-rose-500 animate-ping ring-2 ring-rose-200 dark:ring-rose-900'
                }`}
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight md:hidden">
              {dbStatus.loading ? 'DB...' : dbStatus.success ? 'MySQL' : 'Offline'}
            </span>
            <span className="hidden md:inline">
              {dbStatus.loading ? 'Cek DB...' : dbStatus.success ? (dbStatus.isCpanelMysql ? 'MySQL Online' : 'DB Hosting') : 'DB Offline'}
            </span>
          </button>
        )}

        {onOpenAiBot && (
          <button
            onClick={onOpenAiBot}
            className="relative w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-teal-600 via-emerald-600 to-teal-500 text-white hover:shadow-md hover:scale-105 transition shadow-2xs cursor-pointer border border-teal-400/50 active:scale-95 group shrink-0"
            title="Tanya AI Chatbot & Kirim Pesan WA Ke Wali Murid"
          >
            <Bot className="w-4 h-4 text-emerald-100 group-hover:rotate-12 transition-transform" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-0.5 -right-0.5 animate-pulse" />
          </button>
        )}

        <div className="text-right hidden lg:block">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Hari ini</p>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{currentDate}</p>
        </div>

        {/* AUTO DARK / LIGHT MODE TOGGLE BUTTON */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setIsThemeOpen((prev) => !prev)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer border ${
              isThemeOpen
                ? 'bg-amber-50 dark:bg-slate-800 border-amber-300 dark:border-amber-500/50 text-amber-600 dark:text-amber-400 ring-2 ring-amber-200 dark:ring-amber-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title={`Mode Tampilan: ${
              themeMode === 'auto'
                ? `Otomatis Waktu (${themeInfo.isNight ? 'Malam - Mode Gelap' : 'Siang - Mode Terang'})`
                : themeMode === 'dark'
                ? 'Mode Gelap (Malam)'
                : 'Mode Terang (Siang)'
            }`}
          >
            {themeMode === 'auto' ? (
              <SunMoon className="w-4 h-4 text-amber-500 animate-pulse" />
            ) : themeMode === 'dark' ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* THEME SELECTOR DROPDOWN POPOVER */}
          {isThemeOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-fade-in text-left p-2 space-y-1">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <SunMoon className="w-3.5 h-3.5 text-amber-500" /> Mode Tampilan
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Waktu Lokal: {themeInfo.isNight ? '🌙 Malam Hari (18:00 - 06:00)' : '☀️ Siang Hari (06:00 - 18:00)'}
                </p>
              </div>

              <button
                onClick={() => handleSelectTheme('auto')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  themeMode === 'auto'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SunMoon className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Otomatis (Waktu)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Siang Mode Terang, Malam Mode Gelap</div>
                  </div>
                </div>
                {themeMode === 'auto' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
              </button>

              <button
                onClick={() => handleSelectTheme('light')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Mode Terang (Siang)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Selalu tampilan cerah</div>
                  </div>
                </div>
                {themeMode === 'light' && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
              </button>

              <button
                onClick={() => handleSelectTheme('dark')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Mode Gelap (Malam)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Selalu tampilan redup & nyaman</div>
                  </div>
                </div>
                {themeMode === 'dark' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            </div>
          )}
        </div>

        {/* NOTIFICATION BELL BUTTON & POPUP CONTAINER */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              refreshNotifications();
              setIsNotifOpen((prev) => !prev);
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer border ${
              isNotifOpen
                ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900/60'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Pemberitahuan & Notifikasi Sistem"
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-indigo-600 animate-pulse' : 'text-slate-600'}`} />
            
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 ring-2 ring-white shadow-xs animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION DROPDOWN POPOVER */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-fade-in text-left">
              {/* Popover Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-none">Pemberitahuan</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua notifikasi dibaca'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClearCache}
                    className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-sky-300 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="Bersihkan cache notifikasi & memori browser"
                  >
                    <Trash2 className="w-3 h-3 text-sky-400" /> Clear Cache
                  </button>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title="Tandai semua telah dibaca"
                    >
                      <Check className="w-3 h-3" /> Tandai Dibaca
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 px-2 py-1.5 text-xs font-bold overflow-x-auto">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                    activeFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                    activeFilter === 'warning'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  ⚠️ Peringatan
                </button>
                <button
                  onClick={() => setActiveFilter('presensi')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                    activeFilter === 'presensi'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                   Presensi
                </button>
                <button
                  onClick={() => setActiveFilter('system')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                    activeFilter === 'system'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  🛡️ Sistem
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-1" />
                    <p className="text-xs font-bold">Tidak ada notifikasi dalam kategori ini</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 transition flex gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 relative ${
                        !notif.read ? 'bg-indigo-50/40 dark:bg-indigo-950/40' : ''
                      }`}
                    >
                      <div className="mt-0.5">{getIcon(notif.type, notif.iconType)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{notif.title}</h4>
                          <span className="text-[9px] font-mono font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-0.5 shrink-0">
                            <Clock className="w-2.5 h-2.5" /> {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal line-clamp-2">{notif.message}</p>

                        {notif.targetView && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 hover:underline">
                            Lihat Detail <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {!notif.read && (
                        <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full shrink-0 my-auto ring-2 ring-indigo-100 dark:ring-indigo-900" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex justify-between items-center text-[10px]">
                <button
                  onClick={() => {
                    clearReadNotifications();
                    refreshNotifications();
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold transition px-2 py-1 rounded cursor-pointer"
                >
                  Reset Riwayat Dibaca
                </button>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-slate-700 dark:text-slate-200 font-extrabold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-3 py-1 rounded-lg transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


