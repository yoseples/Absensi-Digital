import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Database,
  Wifi,
  WifiOff,
  Clock,
  RefreshCw,
  Settings,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Server,
  X,
  Gauge,
  Info,
  ExternalLink,
  Flame,
  Zap,
} from 'lucide-react';
import { getFirebaseConfig } from '../services/firebase';
import { getSupabaseConfig } from '../services/supabase';
import {
  runFullDiagnostic,
  subscribeDiagnostic,
  getLastDiagnosticReport,
  FullDiagnosticReport,
} from '../services/diagnostic';
import { UserSession } from '../types';
import { syncPullFromServer } from '../services/storage';

interface AdminFooterProps {
  currentUser: UserSession;
  onOpenMysqlModal?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function AdminFooter({ currentUser, onOpenMysqlModal, onShowToast }: AdminFooterProps) {
  const [report, setReport] = useState<FullDiagnosticReport | null>(() => getLastDiagnosticReport());
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to diagnostic updates and auto run every 20s
  useEffect(() => {
    const unsubscribe = subscribeDiagnostic((newReport) => {
      setReport(newReport);
    });

    // Run initial test if not present
    if (!report) {
      runFullDiagnostic();
    }

    const interval = setInterval(() => {
      runFullDiagnostic();
    }, 20000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncPullFromServer();
      await runFullDiagnostic();
      if (onShowToast) onShowToast('Diagnostik & sinkronisasi data berhasil diperbarui', 'success');
    } catch (e) {
      if (onShowToast) onShowToast('Gagal memperbarui diagnostik koneksi', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getLatencyBadge = (latency: number | null) => {
    if (latency === null) return { text: '-- ms', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: 'Menguji' };
    if (latency < 100) return { text: `${latency} ms`, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', label: 'Sangat Cepat' };
    if (latency < 300) return { text: `${latency} ms`, color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800', label: 'Normal' };
    return { text: `${latency} ms`, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800', label: 'Latensi Tinggi' };
  };

  const status = report?.overallStatus || 'checking';
  const latencyInfo = getLatencyBadge(report?.overallLatencyMs ?? null);

  return (
    <>
      {/* Sticky Bottom Admin Footer */}
      <footer className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-3 sm:px-5 py-1.5 sm:py-2 z-30 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-[11px] sm:text-xs">
          
          {/* Left Brand / Role Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 dark:text-slate-400 min-w-0">
            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 truncate">
              <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">MySQL Real-time</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
              Role: <strong className="capitalize text-slate-600 dark:text-slate-300">{currentUser.role}</strong>
            </span>
          </div>

          {/* Right Status Indicator & Diagnostic Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Firebase Status Badge */}
            {getFirebaseConfig().enabled && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 font-bold text-[10px]" title="Firebase Firestore Realtime Sync Active">
                <Flame className="w-3 h-3 text-orange-500 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Firebase Realtime</span>
              </span>
            )}

            {/* Supabase Status Badge */}
            {getSupabaseConfig().enabled && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]" title="Supabase PostgreSQL Total Isolation Active">
                <Zap className="w-3 h-3 text-emerald-500 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Supabase Realtime</span>
              </span>
            )}
            
            {/* Online / Offline Status Button */}
            <button
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border transition-all hover:opacity-90 active:scale-95 shadow-2xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-[10px] sm:text-xs"
              title="Klik untuk membuka laporan diagnostik lengkap"
            >
              {/* Pulsing Dot */}
              <span className="relative flex h-2.5 w-2.5">
                {status === 'online' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </>
                ) : status === 'degraded' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </>
                ) : status === 'offline' ? (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 animate-pulse"></span>
                )}
              </span>

              {/* Status Text */}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {status === 'online' && 'MySQL Online'}
                {status === 'degraded' && 'Koneksi Terbatas'}
                {status === 'offline' && 'MySQL Offline / Standalone'}
                {status === 'checking' && 'Memeriksa Server...'}
              </span>

              {/* Latency Pill */}
              <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold border ${latencyInfo.color}`}>
                ⚡ {latencyInfo.text}
              </span>
            </button>

            {/* Diagnostic Details Button */}
            <button
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Diagnostik</span>
            </button>

            {/* MySQL Setup Modal Button for Developer */}
            {currentUser.role === 'developer' && onOpenMysqlModal && (
              <button
                onClick={onOpenMysqlModal}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-medium transition-colors"
                title="Buka Pengaturan URL MySQL cPanel"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Konfig MySQL</span>
              </button>
            )}

            {/* Refresh / Re-test Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Uji ulang koneksi & sinkronisasi data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
          </div>
        </div>
      </footer>

      {/* Diagnostic Detail Modal */}
      <AnimatePresence>
        {isDiagnosticModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Diagnostik Koneksi MySQL cPanel
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pemantauan latensi server & ketersediaan endpoint API realtime
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDiagnosticModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Status Hero Card */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    status === 'online'
                      ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50'
                      : status === 'degraded'
                      ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50'
                      : 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {status === 'online' ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : status === 'degraded' ? (
                      <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {status === 'online' && 'Terhubung - Server MySQL Online'}
                          {status === 'degraded' && 'Terhubung Sebagian (Beberapa Endpoint Error)'}
                          {status === 'offline' && 'Terputus dari MySQL cPanel'}
                          {status === 'checking' && 'Sedang Menguji Koneksi...'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        URL API Base: <code className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{report?.baseUrl || '/api'}</code>
                      </p>
                    </div>
                  </div>

                  {/* Latency Gauge Card */}
                  <div className="flex flex-col items-end sm:items-end justify-center w-full sm:w-auto bg-white/80 dark:bg-slate-900/80 p-2.5 px-4 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Latensi Server</span>
                    </div>
                    <div className="text-lg font-mono font-extrabold text-slate-900 dark:text-white">
                      {report?.overallLatencyMs !== null ? `${report?.overallLatencyMs} ms` : '-- ms'}
                    </div>
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                      {latencyInfo.label}
                    </span>
                  </div>
                </div>

                {/* Database & Server Details */}
                {report && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Database Active:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">
                        {report.databaseName || 'Stand-Alone Local / Default'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Server Engine:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5 truncate">
                        {report.serverSoftware || 'Standard Web Server'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Endpoint Checklist */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center justify-between">
                    <span>Hasil Pengujian Endpoint API cPanel</span>
                    <span className="text-xs font-normal text-slate-500">
                      Total {report?.tests.length || 0} Test API
                    </span>
                  </h4>

                  <div className="space-y-2.5">
                    {report?.tests.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {t.status === 'ok' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : t.status === 'pending' ? (
                            <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {t.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              {t.endpoint}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                              t.status === 'ok'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold'
                            }`}
                          >
                            {t.status === 'ok' ? '200 OK' : 'ERROR'}
                          </span>
                          <span className="font-mono text-slate-600 dark:text-slate-300 text-xs min-w-[50px] text-right font-medium">
                            {t.latencyMs !== null ? `${t.latencyMs} ms` : '--'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Scale Legend */}
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-300">
                    <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Panduan Kategori Latensi Server:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                    <div>🚀 <strong>&lt; 100 ms</strong>: Sangat Cepat</div>
                    <div>⚡ <strong>100 - 300 ms</strong>: Normal</div>
                    <div>⚠️ <strong>&gt; 300 ms</strong>: Latensi Tinggi</div>
                    <div>❌ <strong>Offline</strong>: Terputus / Local</div>
                  </div>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500">
                  Otomatis diuji setiap 20 detik
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {currentUser.role === 'developer' && onOpenMysqlModal && (
                    <button
                      onClick={() => {
                        setIsDiagnosticModalOpen(false);
                        onOpenMysqlModal();
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Konfig URL MySQL</span>
                    </button>
                  )}

                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Uji Ulang Sekarang</span>
                  </button>

                  <button
                    onClick={() => setIsDiagnosticModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
