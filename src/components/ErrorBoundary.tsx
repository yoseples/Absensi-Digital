import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import { clearSession } from '../services/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });

    // Handle chunk load failures (e.g. after deployment or subfolder path mismatch)
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed')
    ) {
      const storageKey = 'pwa_chunk_reload_count';
      const reloadCount = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
      if (reloadCount < 2) {
        sessionStorage.setItem(storageKey, (reloadCount + 1).toString());
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      clearSession();
      localStorage.removeItem('e_absensi_session');
    } catch (e) {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Terjadi Kesalahan Sistem</h2>
                <p className="text-xs text-slate-400">Gagal memuat tampilan aplikasi</p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 mb-6 font-mono text-xs text-rose-300 break-words max-h-40 overflow-y-auto">
              <div className="flex items-center space-x-1.5 text-slate-400 mb-1.5 text-[11px] font-sans font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Rincian Kendala Kendala Script:</span>
              </div>
              {this.state.error?.toString() || 'Unknown Runtime Error'}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Hal ini biasanya terjadi karena pembaruan skrip pada cPanel, kendala koneksi jaringan, atau path direktori subfolder hosting. Silakan muat ulang atau reset sesi login.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-semibold text-xs border border-slate-700/80 transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Reset Sesi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
