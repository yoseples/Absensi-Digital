import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getStoredSession, clearSession, getSiswaList, applyFavicon, applyAppMetaData, syncPullFromServer, checkServerUpdates } from './services/storage';
import { checkMySqlConnection } from './services/api';
import { applyTheme } from './services/theme';
import { UserSession, Siswa } from './types';
import { LoginScreen } from './components/LoginScreen';
import { NavbarHeader } from './components/NavbarHeader';
import { Sidebar } from './components/Sidebar';
import { Toast, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { SplashScreen } from './components/SplashScreen';

// View & Modal Components
import { DashboardAdmin } from './components/DashboardAdmin';
import { DashboardGuru } from './components/DashboardGuru';
import { DashboardSiswa } from './components/DashboardSiswa';
import { DataSiswa } from './components/DataSiswa';
import { DataGuru } from './components/DataGuru';
import { KelolaAbsen } from './components/KelolaAbsen';
import { MonitoringRealtime } from './components/MonitoringRealtime';
import { LaporanRekap } from './components/LaporanRekap';
import { KartuPelajar } from './components/KartuPelajar';
import { ScannerQR } from './components/ScannerQR';
import { SystemLogs } from './components/SystemLogs';
import { AbsensiGuruView } from './components/AbsensiGuruView';
import { AktivasiKeyGeneratorView } from './components/AktivasiKeyGeneratorView';

import { PengaturanMysqlModal } from './components/PengaturanMysqlModal';
import { PengaturanDeveloperModal } from './components/PengaturanDeveloperModal';
import { ModalAktivasi } from './components/ModalAktivasi';
import { AiWaBotModal } from './components/AiWaBotModal';
import { AdminFooter } from './components/AdminFooter';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => getStoredSession());
  const [activeView, setActiveView] = useState<string>('view-admin-dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSplashScreen, setShowSplashScreen] = useState(false);

  // Modals
  const [isMysqlModalOpen, setIsMysqlModalOpen] = useState(false);
  const [isDevSettingsModalOpen, setIsDevSettingsModalOpen] = useState(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isAiBotOpen, setIsAiBotOpen] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);


  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Target Student for Digital Card View
  const [qrStudentTarget, setQrStudentTarget] = useState<Siswa | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Set initial default view according to user role, apply theme, favicon & metadata, and sync database
  useEffect(() => {
    applyAppMetaData();
    applyTheme();

    // Auto pull central database & check connection
    syncPullFromServer().then(() => {
      checkMySqlConnection();
    });

    if (currentUser) {
      if (currentUser.role === 'developer' || currentUser.role === 'admin') setActiveView('view-admin-dashboard');
      else if (currentUser.role === 'guru') setActiveView('view-scanner');
      else setActiveView('view-siswa-dashboard');
    }
  }, [currentUser?.role]);

  // Periodic check for central server updates every 3 seconds and on focus/online/visibility change
  useEffect(() => {
    const handleCheck = () => {
      checkServerUpdates();
    };

    handleCheck();
    const interval = setInterval(handleCheck, 3000);

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleCheck();
      }
    };

    window.addEventListener('visibilitychange', handleFocusOrVisibility);
    window.addEventListener('focus', handleFocusOrVisibility);
    window.addEventListener('online', handleCheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.removeEventListener('focus', handleFocusOrVisibility);
      window.removeEventListener('online', handleCheck);
    };
  }, []);

  // Listen for real-time hosting database updates from other browsers/devices/tabs
  useEffect(() => {
    const handleDataSynced = () => {
      setConfigVersion((prev) => prev + 1);
    };
    window.addEventListener('app_data_synced', handleDataSynced);
    window.addEventListener('storage', handleDataSynced);

    return () => {
      window.removeEventListener('app_data_synced', handleDataSynced);
      window.removeEventListener('storage', handleDataSynced);
    };
  }, []);

  // Auto-logout after 30 minutes (1800000 ms) of user inactivity
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout;
    let lastActivity = Date.now();

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivity >= INACTIVITY_LIMIT) {
        clearSession();
        setCurrentUser(null);
        setQrStudentTarget(null);
        showToast('Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 30 menit. Silakan login kembali demi keamanan.', 'error');
      } else {
        timeoutId = setTimeout(checkInactivity, INACTIVITY_LIMIT - (now - lastActivity));
      }
    };

    const resetTimer = () => {
      lastActivity = Date.now();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkInactivity, INACTIVITY_LIMIT);
    };

    const handleActivity = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastActivity >= INACTIVITY_LIMIT) {
          checkInactivity();
        } else {
          resetTimer();
        }
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'visibilitychange'];

    resetTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [currentUser]);

  const handleLoginSuccess = (session: UserSession) => {
    setCurrentUser(session);
    if (session.role === 'guru') {
      setActiveView('view-scanner');
    } else if (session.role === 'developer' || session.role === 'admin') {
      setActiveView('view-admin-dashboard');
    } else {
      setActiveView('view-siswa-dashboard');
    }
    showToast(`Selamat datang kembali, ${session.nama || session.username}!`, 'success');
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setQrStudentTarget(null);
    showToast('Anda telah keluar dari aplikasi.', 'info');
  };

  const handleViewQRCard = (student: Siswa) => {
    setQrStudentTarget(student);
    setActiveView('view-kartu-siswa');
  };

  const getPageTitle = () => {
    switch (activeView) {
      case 'view-admin-dashboard':
      case 'view-guru-dashboard':
      case 'view-siswa-dashboard':
        return 'Dashboard';
      case 'view-data-siswa':
        return 'Direktori Siswa';
      case 'view-data-guru':
        return 'Manajemen Guru';
      case 'view-absensi-guru':
        return 'Presensi & Deteksi Guru Pulang Cepat';
      case 'view-kelola-absen':
        return 'Hari Libur & Jam Operasional';
      case 'view-monitoring':
        return 'Monitoring Realtime';
      case 'view-rekap-absensi':
        return 'Laporan Kehadiran';
      case 'view-scanner':
        return 'Scan Absensi QR';
      case 'view-kartu-siswa':
        return 'Kartu Pelajar Digital';
      case 'view-system-logs':
        return 'Log Sistem & Audit Trail';
      case 'view-aktivasi-keygenerator':
        return 'Aktivasi & Key Generator';
      default:
        return 'Dashboard';
    }
  };

  // Get student data for student role
  const getLoggedInStudent = (): Siswa => {
    if (!currentUser) {
      return {
        nama: 'Siswa',
        nisn: '1234567890',
        kelas: 'X-A',
        jenisKelamin: 'Laki-laki',
        tanggalLahir: '2008-01-01',
        agama: 'Islam',
      };
    }
    if (qrStudentTarget) return qrStudentTarget;
    const cleanNisn = (currentUser.nisn || '').replace(/^'/, '');
    const list = getSiswaList();
    const found = list.find((s) => s.nisn.replace(/^'/, '') === cleanNisn);
    return (
      found || {
        nama: currentUser.nama || 'Siswa',
        nisn: cleanNisn || '1234567890',
        kelas: currentUser.kelas || 'X-A',
        jenisKelamin: 'Laki-laki',
        tanggalLahir: '2008-01-01',
        agama: 'Islam',
      }
    );
  };

  return (
    <>
      {/* Custom Native Mobile Splash Screen */}
      <AnimatePresence>
        {showSplashScreen && (
          <SplashScreen
            onComplete={() => setShowSplashScreen(false)}
          />
        )}
      </AnimatePresence>

      {!currentUser ? (
        <>
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
          <Toast toasts={toasts} onDismiss={dismissToast} />
        </>
      ) : (
        <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar
        key={`sidebar_${configVersion}`}
        currentUser={currentUser}
        activeView={activeView}
        onNavigate={(viewId) => {
          if (viewId === 'open-mysql-modal') {
            setIsMysqlModalOpen(true);
            return;
          }
          if (viewId === 'open-dev-settings') {
            setIsDevSettingsModalOpen(true);
            return;
          }
          setActiveView(viewId);
          if (viewId !== 'view-kartu-siswa') setQrStudentTarget(null);
        }}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onToggleMobile={() => setIsSidebarOpen((prev) => !prev)}
        onOpenActivationModal={() => setIsActivationModalOpen(true)}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${
          isSidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        <NavbarHeader
          key={`navbar_${configVersion}`}
          pageTitle={getPageTitle()}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenMysqlModal={currentUser.role === 'developer' || currentUser.role === 'admin' ? () => setIsMysqlModalOpen(true) : undefined}
          onOpenDevSettings={currentUser.role === 'developer' || currentUser.role === 'admin' ? () => setIsDevSettingsModalOpen(true) : undefined}
          onOpenActivationModal={() => setIsActivationModalOpen(true)}
          onOpenAiBot={() => setIsAiBotOpen(true)}
          onNavigate={(v) => setActiveView(v)}
          onShowToast={showToast}
        />


        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-20 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
                {activeView === 'view-admin-dashboard' && (
                  <DashboardAdmin
                    key={`admin_dash_${configVersion}`}
                    currentUser={currentUser}
                    onNavigate={(v) => {
                      if (v === 'open-mysql-modal') {
                        setIsMysqlModalOpen(true);
                        return;
                      }
                      if (v === 'open-dev-settings') {
                        if (currentUser?.role === 'developer' || currentUser?.role === 'admin') {
                          setIsDevSettingsModalOpen(true);
                        }
                        return;
                      }
                      setActiveView(v);
                    }}
                    onShowToast={showToast}
                    onOpenActivationModal={() => setIsActivationModalOpen(true)}
                    onOpenMysqlModal={currentUser?.role === 'developer' ? () => setIsMysqlModalOpen(true) : undefined}
                  />
                )}

                {activeView === 'view-guru-dashboard' && (
                  <DashboardGuru
                    key={`guru_dash_${configVersion}`}
                    currentUser={currentUser}
                    onNavigate={(v) => setActiveView(v)}
                    onShowToast={showToast}
                    onUpdateSession={(updatedSession) => setCurrentUser(updatedSession)}
                  />
                )}

                {activeView === 'view-siswa-dashboard' && (
                  <DashboardSiswa
                    key={`siswa_dash_${configVersion}`}
                    currentUser={currentUser}
                    onNavigate={(v) => {
                      if (v === 'view-kartu-siswa') {
                        setQrStudentTarget(getLoggedInStudent());
                      }
                      setActiveView(v);
                    }}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'view-data-siswa' && (
                  <DataSiswa
                    key={`siswa_${configVersion}`}
                    onShowToast={showToast}
                    onOpenConfirm={openConfirm}
                    onViewQRCard={handleViewQRCard}
                    onOpenActivationModal={() => setIsActivationModalOpen(true)}
                  />
                )}

                {activeView === 'view-data-guru' && (
                  <DataGuru
                    key={`guru_${configVersion}`}
                    onShowToast={showToast}
                    onOpenConfirm={openConfirm}
                    onOpenActivationModal={() => setIsActivationModalOpen(true)}
                  />
                )}

                {activeView === 'view-absensi-guru' && (
                  <AbsensiGuruView
                    key={`absen_guru_${configVersion}`}
                    currentUser={currentUser}
                    onShowToast={showToast}
                    onOpenConfirm={openConfirm}
                  />
                )}

                {activeView === 'view-kelola-absen' && (
                  <KelolaAbsen key={`kelola_${configVersion}`} onShowToast={showToast} onOpenConfirm={openConfirm} />
                )}

                {activeView === 'view-monitoring' && (
                  <MonitoringRealtime key={`mon_${configVersion}`} currentUser={currentUser} onShowToast={showToast} />
                )}

                {activeView === 'view-rekap-absensi' && (
                  <LaporanRekap key={`rekap_${configVersion}`} onShowToast={showToast} />
                )}

                {activeView === 'view-scanner' && (
                  <ScannerQR
                    currentUser={currentUser}
                    onBack={() => {
                      if (currentUser.role === 'developer' || currentUser.role === 'admin') setActiveView('view-admin-dashboard');
                      else if (currentUser.role === 'guru') setActiveView('view-guru-dashboard');
                      else setActiveView('view-siswa-dashboard');
                    }}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'view-kartu-siswa' && (
                  <KartuPelajar
                    student={getLoggedInStudent()}
                    onClose={() => {
                      if (currentUser.role === 'developer' || currentUser.role === 'admin' || currentUser.role === 'guru') {
                        setActiveView('view-data-siswa');
                      } else {
                        setActiveView('view-siswa-dashboard');
                      }
                    }}
                  />
                )}

                {activeView === 'view-system-logs' && (currentUser.role === 'developer' || currentUser.role === 'admin') && (
                  <SystemLogs key={`logs_${configVersion}`} currentUser={currentUser} onShowToast={showToast} />
                )}

                {activeView === 'view-aktivasi-keygenerator' && currentUser.role === 'developer' && (
                  <AktivasiKeyGeneratorView key={`aktivasi_gen_${configVersion}`} currentUser={currentUser} onShowToast={showToast} />
                )}
              </motion.div>
            </AnimatePresence>
        </div>

        {/* Diagnostic Status Indicator Footer */}
        <AdminFooter
          currentUser={currentUser}
          onOpenMysqlModal={currentUser.role === 'developer' || currentUser.role === 'admin' ? () => setIsMysqlModalOpen(true) : undefined}
          onShowToast={showToast}
        />
      </main>

      {/* PWA Install Prompt Banner & Offline Indicator */}
      <PwaInstallPrompt onShowToast={showToast} />

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Global Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

        {/* Unified Database Configuration Modal (Admin & Developer) */}
        {isMysqlModalOpen && (currentUser.role === 'developer' || currentUser.role === 'admin') && (
          <PengaturanMysqlModal
            isOpen={isMysqlModalOpen}
            onClose={() => setIsMysqlModalOpen(false)}
            onShowToast={showToast}
          />
        )}

        {/* App Settings & Branding Modal (Admin & Developer) */}
        {isDevSettingsModalOpen && (currentUser.role === 'developer' || currentUser.role === 'admin') && (
          <PengaturanDeveloperModal
            isOpen={isDevSettingsModalOpen}
            onClose={() => setIsDevSettingsModalOpen(false)}
            onShowToast={showToast}
            onConfigUpdated={() => setConfigVersion((prev) => prev + 1)}
            currentUserRole={currentUser.role}
            onOpenDatabaseModal={() => setIsMysqlModalOpen(true)}
          />
        )}

        {/* Activation Modal */}
        {isActivationModalOpen && (
          <ModalAktivasi
            isOpen={isActivationModalOpen}
            onClose={() => setIsActivationModalOpen(false)}
            onSuccessActivation={() => setConfigVersion((prev) => prev + 1)}
            onShowToast={showToast}
            currentUserRole={currentUser?.role}
          />
        )}

        {/* AI Chatbot WhatsApp Modal */}
        {isAiBotOpen && (
          <AiWaBotModal
            isOpen={isAiBotOpen}
            onClose={() => setIsAiBotOpen(false)}
            onShowToast={showToast}
          />
        )}

        </div>
      )}
    </>
  );
}

