import React from 'react';
import {
  QrCode,
  Home,
  Users,
  GraduationCap,
  ClipboardList,
  CalendarDays,
  Eye,
  IdCard,
  LogOut,
  Database,
  Settings,
  ShieldAlert,
  UserCheck,
  KeyRound,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { UserSession } from '../types';
import { getAppLogo, getSchoolName } from '../services/storage';
import { getActivationState } from '../services/activation';

interface SidebarProps {
  currentUser: UserSession;
  activeView: string;
  onNavigate: (viewId: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onToggleMobile: () => void;
  onOpenActivationModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onLogout,
  isOpen,
  onToggleMobile,
  onOpenActivationModal,
}) => {
  const name = currentUser.nama || currentUser.username || 'User';
  const role = currentUser.role || 'siswa';
  const initial = name.charAt(0).toUpperCase();
  const activationState = getActivationState();

  const getMenuItems = () => {
    if (role === 'developer') {
      return [
        { id: 'view-admin-dashboard', label: 'Dashboard', icon: Home },
        { id: 'view-data-siswa', label: 'Data Siswa', icon: GraduationCap },
        { id: 'view-data-guru', label: 'Data Guru', icon: Users },
        { id: 'view-absensi-guru', label: 'Absensi Guru', icon: UserCheck },
        { id: 'view-rekap-absensi', label: 'Laporan', icon: ClipboardList },
        { id: 'view-kelola-absen', label: 'Kelola Absen', icon: CalendarDays },
        { id: 'view-scanner', label: 'Scan Absensi', icon: QrCode },
        { id: 'open-dev-settings', label: 'Pengaturan Sekolah', icon: Settings },
        { id: 'open-mysql-modal', label: 'Database', icon: Database },
        { id: 'view-system-logs', label: 'Log Sistem & Audit', icon: ShieldAlert },
        { id: 'view-aktivasi-keygenerator', label: 'Aktivasi & Key Generator', icon: KeyRound },
      ];
    }
    if (role === 'admin') {
      return [
        { id: 'view-admin-dashboard', label: 'Dashboard', icon: Home },
        { id: 'view-data-siswa', label: 'Data Siswa', icon: GraduationCap },
        { id: 'view-data-guru', label: 'Data Guru', icon: Users },
        { id: 'view-absensi-guru', label: 'Absensi Guru', icon: UserCheck },
        { id: 'view-rekap-absensi', label: 'Laporan', icon: ClipboardList },
        { id: 'view-kelola-absen', label: 'Kelola Absen', icon: CalendarDays },
        { id: 'view-scanner', label: 'Scan Absensi', icon: QrCode },
        { id: 'open-dev-settings', label: 'Pengaturan Sekolah', icon: Settings },
        { id: 'open-mysql-modal', label: 'Database', icon: Database },
        { id: 'view-system-logs', label: 'Log Sistem & Audit', icon: ShieldAlert },
      ];
    }
    if (role === 'guru') {
      return [
        { id: 'view-guru-dashboard', label: 'Dashboard', icon: Home },
        { id: 'view-absensi-guru', label: 'Absensi Guru', icon: UserCheck },
        { id: 'view-monitoring', label: 'Monitoring', icon: Eye },
        { id: 'view-rekap-absensi', label: 'Laporan', icon: ClipboardList },
        { id: 'view-scanner', label: 'Scan Absensi', icon: QrCode },
      ];
    }
    // Siswa
    return [
      { id: 'view-siswa-dashboard', label: 'Dashboard', icon: Home },
      { id: 'view-kartu-siswa', label: 'Kartu Saya', icon: IdCard },
    ];
  };


  const menuItems = getMenuItems();

  return (
    <>
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 text-white transform ${
          isOpen ? 'translate-x-0 w-64 max-w-[82vw]' : '-translate-x-full md:translate-x-0 md:w-20'
        } transition-all duration-300 ease-in-out flex flex-col h-full shadow-2xl border-r border-indigo-900/30`}
        style={{ backgroundColor: 'rgb(26, 25, 103)' }}
      >
        {/* Header Branding */}
        <div className="h-16 flex items-center justify-start px-6 border-b border-indigo-900/50 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none" />
          <div className="flex items-center space-x-3 relative z-10 w-full">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shadow-lg shrink-0">
              <img
                src={getAppLogo()}
                alt="Logo SMA NEGERI"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
            </div>
            {isOpen && (
              <div className="sidebar-label transition-opacity duration-300 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-sm tracking-wide text-white">ABSENSI DIGITAL</h1>
                  <span className="text-[8px] font-black bg-amber-400 text-slate-950 px-1 py-0.2 rounded">v2.0</span>
                </div>
                <p className="text-[9px] text-indigo-200 uppercase tracking-wider font-semibold truncate max-w-[140px]">
                  {getSchoolName()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 overflow-hidden">
          <div
            className={`flex items-center ${
              isOpen ? 'space-x-3 p-3 bg-black/20 border border-white/10' : 'justify-center p-0 bg-transparent border-transparent'
            } rounded-xl transition-all duration-300 overflow-hidden`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm shadow-inner shrink-0 text-white overflow-hidden">
              {currentUser.foto ? (
                <img
                  src={currentUser.foto}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            {isOpen && (
              <div className="sidebar-label transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                <p className="font-semibold text-xs truncate text-white max-w-[120px]">{name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                      role === 'developer'
                        ? 'bg-amber-400 text-slate-950 border border-amber-300 font-black'
                        : 'bg-indigo-800 text-indigo-100 border border-indigo-700'
                    }`}
                  >
                    {role === 'developer' ? 'Developer' : role}
                  </span>
                  {currentUser.kelas && (
                    <span className="text-[9px] font-bold text-cyan-300 truncate">
                      ({currentUser.kelas})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-1 pb-4 scrollbar-hide text-sm">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 768) {
                    onToggleMobile();
                  }
                }}
                className={`w-full flex items-center ${
                  isOpen ? 'space-x-3 px-4' : 'justify-center px-0'
                } py-3 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                {isOpen && (
                  <span className="sidebar-label font-medium transition-opacity duration-300 text-xs">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* License Activation Banner */}
        {onOpenActivationModal && (
          <div className="px-3 py-2 border-t border-indigo-950/60 bg-slate-950/40">
            <button
              onClick={() => {
                onOpenActivationModal();
                if (window.innerWidth < 768) onToggleMobile();
              }}
              className={`w-full flex items-center ${
                isOpen ? 'justify-between px-3 py-2' : 'justify-center p-2'
              } rounded-xl border ${
                activationState.isActivated
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/50'
              } transition cursor-pointer text-left group`}
              title="Status Lisensi Aplikasi"
            >
              <div className="flex items-center gap-2 min-w-0">
                {activationState.isActivated ? (
                  <Award className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                ) : (
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                )}
                {isOpen && (
                  <div className="min-w-0">
                    <div className="font-bold text-[11px] truncate flex items-center gap-1">
                      <span>{activationState.isActivated ? 'Full Version' : 'Mode Demo'}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {activationState.isActivated ? 'Teraktivasi Resmi' : 'Klik untuk Aktivasi'}
                    </div>
                  </div>
                )}
              </div>
              {isOpen && !activationState.isActivated && (
                <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded shrink-0 uppercase tracking-tight">
                  Aktifkan
                </span>
              )}
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="p-4 border-t border-indigo-900/50 bg-black/10">
          <button
            onClick={onLogout}
            className={`flex items-center ${
              isOpen ? 'space-x-3 justify-start px-4' : 'justify-center px-0'
            } text-red-300 hover:text-white hover:bg-red-500/20 w-full p-2.5 rounded-lg transition duration-200 group overflow-hidden whitespace-nowrap`}
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform text-sm" />
            {isOpen && <span className="sidebar-label font-medium text-xs">Keluar Aplikasi</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        onClick={onToggleMobile}
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
    </>
  );
};
