import React, { useState, useEffect } from 'react';
import {
  Database,
  Flame,
  Zap,
  Server,
  Download,
  FileCode,
  Globe,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, checkMySqlConnection } from '../services/api';
import { getFirebaseConfig, saveFirebaseConfig, checkFirebaseConnection, getActiveDomainSlug } from '../services/firebase';
import { getSupabaseConfig, saveSupabaseConfig, checkSupabaseConnection } from '../services/supabase';
import { addSystemLog, getAppConfig, saveAppConfig, getActiveTestingDomain } from '../services/storage';
import { FirebaseAppConfig, SupabaseAppConfig } from '../types';

interface PengaturanMysqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type DatabaseTab = 'firebase' | 'supabase' | 'mysql' | 'sql' | 'php' | 'guide' | 'priority';

export const PengaturanMysqlModal: React.FC<PengaturanMysqlModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<DatabaseTab>('firebase');
  const [activeTestingDomain] = useState<string | null>(() => getActiveTestingDomain());

  // === MySQL cPanel State ===
  const [apiUrl, setApiUrlInput] = useState(getApiBaseUrl());
  const [mysqlTesting, setMysqlTesting] = useState(false);
  const [mysqlStatus, setMysqlStatus] = useState<{ checked: boolean; success: boolean; message: string; details?: any }>({
    checked: false,
    success: false,
    message: '',
  });

  // === Firebase State ===
  const [fbConfig, setFbConfig] = useState<FirebaseAppConfig>(() => getFirebaseConfig());
  const [fbTesting, setFbTesting] = useState(false);
  const [fbStatus, setFbStatus] = useState<{ checked: boolean; success: boolean; message: string; projectId?: string }>({
    checked: false,
    success: false,
    message: '',
  });

  // === Supabase State ===
  const [sbConfig, setSbConfig] = useState<SupabaseAppConfig>(() => getSupabaseConfig());
  const [sbTesting, setSbTesting] = useState(false);
  const [sbStatus, setSbStatus] = useState<{ checked: boolean; success: boolean; message: string; domainSlug?: string }>({
    checked: false,
    success: false,
    message: '',
  });

  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFbConfig(getFirebaseConfig());
      setSbConfig(getSupabaseConfig());
      setApiUrlInput(getApiBaseUrl());
      handleTestMysql();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // === MySQL Handlers ===
  const handleTestMysql = async () => {
    setMysqlTesting(true);
    const res = await checkMySqlConnection();
    setMysqlStatus({
      checked: true,
      success: res.success,
      message: res.message,
      details: res.details,
    });
    setMysqlTesting(false);
  };

  const handleSaveApiUrl = () => {
    setApiBaseUrl(apiUrl);
    const currentCfg = getAppConfig();
    saveAppConfig({
      ...currentCfg,
      mysql_api_url: apiUrl,
    });
    addSystemLog({
      type: 'database',
      action: 'Pembaruan Endpoint API MySQL cPanel Terpusat',
      user: 'developer',
      role: 'developer',
      status: 'success',
      details: `Mengubah Endpoint URL PHP MySQL cPanel menjadi: ${apiUrl || 'Auto Domain (/api)'}`,
    });
    onShowToast('URL Base API MySQL berhasil disimpan & disinkronkan', 'success');
    handleTestMysql();
  };

  const handleDownloadSql = () => {
    fetch('/database.sql')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('File database.sql tidak ditemukan.');
        }
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'database_absensi_sekolah.sql';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onShowToast('File database_absensi_sekolah.sql berhasil diunduh!', 'success');
      })
      .catch((err) => {
        onShowToast(`Gagal mengunduh file database.sql: ${err.message}`, 'error');
      });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    onShowToast(`Skrip ${label} disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const sampleConfigPhp = `<?php
// config.php - Masukkan ke folder public_html/api/ di cPanel
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit();
}

$db_host = "localhost";
$db_name = "nama_db_cpanel"; // Contoh: user_absensi
$db_user = "user_db_cpanel"; // Contoh: user_admin
$db_pass = "password_db_anda";

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Gagal terhubung ke MySQL: " . $e->getMessage()]);
    exit();
}
?>`;

  const activeDomainSlug = getActiveDomainSlug(activeTestingDomain || undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full z-10 animate-fade-in flex flex-col max-h-[92vh] sm:max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight truncate">Database</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Multi-Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Kelola integrasi Firebase (Utama), Supabase (Kedua) & MySQL cPanel (Ketiga)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 sm:px-6 gap-1 sm:gap-2 pt-3 overflow-x-auto scrollbar-hide shrink-0">
          {/* TAB: FIREBASE */}
          <button
            onClick={() => setActiveTab('firebase')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'firebase'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Firebase</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-extrabold">
              Prioritas 1
            </span>
          </button>

          {/* TAB: SUPABASE */}
          <button
            onClick={() => setActiveTab('supabase')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'supabase'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Supabase</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
              Prioritas 2
            </span>
          </button>

          {/* TAB: MYSQL */}
          <button
            onClick={() => setActiveTab('mysql')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'mysql'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>MySQL (cPanel)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
              Prioritas 3
            </span>
          </button>

          {/* TAB: SQL SCHEMA */}
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'sql'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 shrink-0" /> Skema SQL
          </button>

          {/* TAB: PHP API */}
          <button
            onClick={() => setActiveTab('php')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'php'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4 shrink-0" /> File API PHP
          </button>

          {/* TAB: GUIDE */}
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'guide'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" /> Panduan cPanel
          </button>

          {/* TAB: PRIORITY OVERVIEW */}
          <button
            onClick={() => setActiveTab('priority')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'priority'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Alur Prioritas</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {/* ========================================================================= */}
          {/* TAB 1: FIREBASE (PRIORITAS 1) */}
          {/* ========================================================================= */}
          {activeTab === 'firebase' && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span>Integrasi Firebase Firestore & Realtime Database</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold">
                      Prioritas Utama (1)
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Sinkronisasi cloud presensi tercepat dengan realtime multi-device & listener instan.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    fbConfig.enabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {fbConfig.enabled ? '🟢 Fitur Aktif' : '⚪ Dinonaktifkan'}
                </span>
              </div>

              {/* Multi-Tenant Per-Domain Info Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>Firebase Database Multi-Tenant per Domain Sekolah</span>
                  </span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono">
                    Path: tenants/{activeDomainSlug}/*
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Setiap domain sekolah memiliki lingkungan database Firebase terisolasi di path{' '}
                  <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">
                    tenants/{activeDomainSlug}/
                  </code>
                  . Data tersimpan aman dan terpisah dari sekolah lain.
                </p>
              </div>

              {/* Enable Switch */}
              <div className="p-4 bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-orange-950 dark:text-orange-200 block">
                    Status Sync Firebase (Prioritas Utama):
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Jika diaktifkan, data presensi akan ter-sync otomatis ke Firestore & Realtime Database pertama kali.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...fbConfig, enabled: !fbConfig.enabled };
                    setFbConfig(updated);
                    saveFirebaseConfig(updated);
                    onShowToast(`Sync Firebase ${updated.enabled ? 'Diaktifkan' : 'Dinonaktifkan'}!`, 'info');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    fbConfig.enabled
                      ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                      : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {fbConfig.enabled ? 'Nonaktifkan' : 'Aktifkan Sync'}
                </button>
              </div>

              {/* Status Alert Box */}
              {fbStatus.checked && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    fbStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                  }`}
                >
                  {fbStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{fbStatus.success ? 'Koneksi Firebase Berhasil!' : 'Koneksi Gagal / Belum Siap'}</div>
                    <div className="text-[11px] mt-0.5">{fbStatus.message}</div>
                  </div>
                </div>
              )}

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    API Key (apiKey) *
                  </label>
                  <input
                    type="text"
                    value={fbConfig.apiKey || ''}
                    onChange={(e) => setFbConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="AIzaSyXXXXXXXXXXXXXXXX"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project ID (projectId) *
                  </label>
                  <input
                    type="text"
                    value={fbConfig.projectId || ''}
                    onChange={(e) => setFbConfig((prev) => ({ ...prev, projectId: e.target.value }))}
                    placeholder="e-absensi-digital-v2"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Auth Domain (authDomain)
                  </label>
                  <input
                    type="text"
                    value={fbConfig.authDomain || ''}
                    onChange={(e) => setFbConfig((prev) => ({ ...prev, authDomain: e.target.value }))}
                    placeholder="e-absensi.firebaseapp.com"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    App ID (appId)
                  </label>
                  <input
                    type="text"
                    value={fbConfig.appId || ''}
                    onChange={(e) => setFbConfig((prev) => ({ ...prev, appId: e.target.value }))}
                    placeholder="1:1234567890:web:abcdef123456"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Database URL (Realtime DB)
                  </label>
                  <input
                    type="text"
                    value={fbConfig.databaseURL || ''}
                    onChange={(e) => setFbConfig((prev) => ({ ...prev, databaseURL: e.target.value }))}
                    placeholder="https://project-id-default-rtdb.firebaseio.com"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Storage Bucket
                  </label>
                  <input
                    type="text"
                    value={fbConfig.storageBucket || ''}
                    onChange={(e) => setFbConfig((prev) => ({ ...prev, storageBucket: e.target.value }))}
                    placeholder="project-id.appspot.com"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setFbTesting(true);
                    saveFirebaseConfig(fbConfig);
                    const res = await checkFirebaseConnection();
                    setFbStatus({ checked: true, success: res.success, message: res.message, projectId: res.projectId });
                    setFbTesting(false);
                    if (res.success) {
                      onShowToast('Koneksi Firebase Firestore BERHASIL!', 'success');
                    } else {
                      onShowToast(res.message, 'error');
                    }
                  }}
                  disabled={fbTesting}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fbTesting ? 'animate-spin' : ''}`} />
                  <span>Uji & Simpan Koneksi Firebase</span>
                </button>

                <p className="text-[11px] text-slate-500 italic">
                  Konfigurasi tersimpan otomatis dan terisolasi per domain sekolah.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SUPABASE (PRIORITAS 2) */}
          {/* ========================================================================= */}
          {activeTab === 'supabase' && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-600" />
                    <span>Integrasi Supabase Database (Metode Isolasi Total)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                      Prioritas Kedua (2)
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Koneksikan ke Supabase PostgreSQL dengan isolasi data terpisah secara ketat per domain sekolah.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    sbConfig.enabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {sbConfig.enabled ? '🟢 Fitur Aktif' : '⚪ Dinonaktifkan'}
                </span>
              </div>

              {/* Multi-Tenant Per-Domain Info Banner */}
              <div className="p-4 bg-emerald-950 text-emerald-100 rounded-xl space-y-2 border border-emerald-800">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Metode Isolasi Total Domain Supabase</span>
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono">
                    Filter RLS: tenant_domain = eq.{activeDomainSlug}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200 leading-relaxed">
                  Setiap domain sekolah terisolasi secara total di dalam PostgreSQL menggunakan kolom{' '}
                  <code className="bg-emerald-900 text-emerald-300 px-1 py-0.5 rounded font-mono">tenant_domain</code>{' '}
                  dan tabel terpartisi. Tidak ada risiko kebocoran data antar-sekolah.
                </p>
              </div>

              {/* Enable Switch */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200 block">
                    Status Sync Supabase (Prioritas Kedua):
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Jika diaktifkan, data presensi akan ter-sync otomatis ke Supabase PostgreSQL & Realtime Client.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...sbConfig, enabled: !sbConfig.enabled };
                    setSbConfig(updated);
                    saveSupabaseConfig(updated);
                    onShowToast(`Sync Supabase ${updated.enabled ? 'Diaktifkan' : 'Dinonaktifkan'}!`, 'info');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    sbConfig.enabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {sbConfig.enabled ? 'Nonaktifkan' : 'Aktifkan Sync'}
                </button>
              </div>

              {/* Status Alert Box */}
              {sbStatus.checked && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    sbStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                  }`}
                >
                  {sbStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{sbStatus.success ? 'Koneksi Supabase Berhasil!' : 'Koneksi Gagal / Belum Siap'}</div>
                    <div className="text-[11px] mt-0.5">{sbStatus.message}</div>
                  </div>
                </div>
              )}

              {/* Input Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supabase Project URL (supabaseUrl) *
                  </label>
                  <input
                    type="text"
                    value={sbConfig.supabaseUrl || ''}
                    onChange={(e) => setSbConfig((prev) => ({ ...prev, supabaseUrl: e.target.value }))}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supabase Anon / Public Key (supabaseAnonKey) *
                  </label>
                  <textarea
                    rows={2}
                    value={sbConfig.supabaseAnonKey || ''}
                    onChange={(e) => setSbConfig((prev) => ({ ...prev, supabaseAnonKey: e.target.value }))}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tenant Table Prefix (Opsional)
                  </label>
                  <input
                    type="text"
                    value={sbConfig.tenantTablePrefix || 'tenant_'}
                    onChange={(e) => setSbConfig((prev) => ({ ...prev, tenantTablePrefix: e.target.value }))}
                    placeholder="tenant_"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setSbTesting(true);
                    saveSupabaseConfig(sbConfig);
                    const res = await checkSupabaseConnection();
                    setSbStatus({ checked: true, success: res.success, message: res.message, domainSlug: res.domainSlug });
                    setSbTesting(false);
                    if (res.success) {
                      onShowToast('Koneksi Supabase PostgreSQL BERHASIL!', 'success');
                    } else {
                      onShowToast(res.message, 'error');
                    }
                  }}
                  disabled={sbTesting}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sbTesting ? 'animate-spin' : ''}`} />
                  <span>Uji & Simpan Koneksi Supabase</span>
                </button>

                <p className="text-[11px] text-slate-500 italic">
                  Konfigurasi Supabase tersimpan otomatis dan terisolasi per domain.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MYSQL CPANEL (PRIORITAS 3) */}
          {/* ========================================================================= */}
          {activeTab === 'mysql' && (
            <div className="space-y-6 animate-fade-in">
              {/* Status Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  mysqlStatus.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                }`}
              >
                {mysqlStatus.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm">
                      {mysqlStatus.success ? 'Koneksi MySQL Terhubung' : 'Mode Offline / LocalStorage Active'}
                    </h4>
                    <button
                      onClick={handleTestMysql}
                      disabled={mysqlTesting}
                      className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${mysqlTesting ? 'animate-spin' : ''}`} />
                      {mysqlTesting ? 'Menguji...' : 'Uji Koneksi'}
                    </button>
                  </div>
                  <p className="text-xs opacity-80 mt-1">
                    {mysqlStatus.message ||
                      'Aplikasi secara otomatis siap bekerja dengan MySQL cPanel backend (/api/) atau menyimpan data secara lokal.'}
                  </p>
                  {mysqlStatus.details && (
                    <div className="mt-2 text-[11px] font-mono bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      DB: {mysqlStatus.details.database} | Server: {mysqlStatus.details.server}
                    </div>
                  )}
                </div>
              </div>

              {/* Endpoint URL Config */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Base URL API Backend MySQL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrlInput(e.target.value)}
                    placeholder="Contoh: https://domainsekolah.sch.id/api atau /api"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    onClick={handleSaveApiUrl}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-md"
                  >
                    Simpan URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gunakan <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">/api</code> jika
                  file backend PHP ditempatkan dalam folder <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">public_html/api/</code> di domain yang sama.
                </p>
              </div>

              {/* Summary Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-2">
                    1
                  </div>
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Import File SQL</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Download file <code className="font-mono text-indigo-600 dark:text-indigo-400">database.sql</code> dan import via phpMyAdmin cPanel.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-2">
                    2
                  </div>
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Upload File API PHP</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Upload folder <code className="font-mono text-indigo-600 dark:text-indigo-400">api/</code> ke <code className="font-mono">public_html/api/</code> dan sesuaikan <code className="font-mono">config.php</code>.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-2">
                    3
                  </div>
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Upload Build React</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Upload isi folder <code className="font-mono text-indigo-600 dark:text-indigo-400">dist/</code> hasil build ke <code className="font-mono">public_html/</code> cPanel Anda.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SQL SCHEMA DOWNLOAD */}
          {/* ========================================================================= */}
          {activeTab === 'sql' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-5 rounded-2xl flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                    Skema Database MySQL Siap Import (cPanel)
                  </h4>
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1 leading-relaxed">
                    File ini berisi struktur tabel lengkap: <code className="font-mono">siswa</code>,{' '}
                    <code className="font-mono">guru</code>, <code className="font-mono">admin</code>,{' '}
                    <code className="font-mono">absensi</code>, <code className="font-mono">hari_libur</code>, dan{' '}
                    <code className="font-mono">pengaturan_jam</code> beserta sampel data awal.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                <div>
                  <div className="font-bold text-xs font-mono">database_absensi_sekolah.sql</div>
                  <div className="text-[10px] text-slate-400">MySQL / MariaDB Dump File - 5.2 KB</div>
                </div>
                <button
                  onClick={handleDownloadSql}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" /> Download .SQL File
                </button>
              </div>

              <div className="bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
                <pre>{`-- File SQL Siap Import di phpMyAdmin / cPanel / Hostinger
-- (Query CREATE DATABASE & USE sudah dihapus agar tidak menyebabkan Error #1044)

-- 1. Tabel Admin
CREATE TABLE IF NOT EXISTS \`admin\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`nama\` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Guru, Siswa, Absensi, Hari Libur, Pengaturan Jam ...`}</pre>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: FILE API PHP */}
          {/* ========================================================================= */}
          {activeTab === 'php' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  File Konfigurasi PHP (`api/config.php`)
                </h4>
                <button
                  onClick={() => copyToClipboard(sampleConfigPhp, 'config.php')}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  {copiedScript === 'config.php' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Salin Code
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 max-h-64">
                <pre>{sampleConfigPhp}</pre>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200">💡 Lokasi File API dalam Project:</p>
                <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 space-y-1">
                  <li>
                    <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">/public/api/config.php</code> - Koneksi PDO MySQL
                  </li>
                  <li>
                    <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">/public/api/auth.php</code> - Handler Login & Registrasi Siswa
                  </li>
                  <li>
                    <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">/public/api/siswa.php</code> - CRUD Data Siswa & Foto
                  </li>
                  <li>
                    <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">/public/api/guru.php</code> - CRUD Data Guru
                  </li>
                  <li>
                    <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">/public/api/absensi.php</code> - Scan QR Absensi & Laporan
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: PANDUAN CPANEL */}
          {/* ========================================================================= */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Buat Database MySQL di cPanel</h5>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Masuk ke cPanel &gt; menu <b>MySQL® Databases</b>. Buat database baru (contoh:{' '}
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">user_absensi</code>) dan user database,
                      lalu beri hak akses (ALL PRIVILEGES).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Import Schema database.sql</h5>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Buka <b>phpMyAdmin</b> di cPanel, pilih database yang baru dibuat, lalu klik tab <b>Import</b>.{' '}
                      Pilih file <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">database.sql</code> yang diunduh lalu klik <b>Go</b>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Upload Folder API PHP & Edit config.php</h5>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Di <b>File Manager cPanel</b>, buka folder <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">public_html</code>.
                      Pastikan folder <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">api/</code> berisi file PHP berada di dalam <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">public_html/api/</code>.
                      Edit file <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">config.php</code> dan isi <code className="font-mono">$db_name</code>, <code className="font-mono">$db_user</code>, dan <code className="font-mono">$db_pass</code> sesuai cPanel Anda.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Upload Build Static React (dist)</h5>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload seluruh file di dalam folder <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">dist/</code> (seperti <code className="font-mono">index.html</code>, <code className="font-mono">assets/</code>) langsung ke <code className="bg-slate-100 dark:bg-slate-800 px-1 font-mono">public_html/</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: ALUR PRIORITAS SINKRONISASI */}
          {/* ========================================================================= */}
          {activeTab === 'priority' && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span>Hierarki & Urutan Prioritas Penyimpanan Database</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Jika semua database dikonfigurasi, sistem memprioritaskan alur penyimpanan data sebagai berikut:
                </p>
              </div>

              {/* Visual Flow Cards */}
              <div className="space-y-3">
                {/* 1. Firebase */}
                <div className="p-4 rounded-2xl border-2 border-orange-400 bg-orange-50/70 dark:bg-orange-950/40 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-extrabold text-sm text-orange-950 dark:text-orange-200 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>Firebase Firestore & Realtime Database</span>
                      </h5>
                      <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Pilihan Utama
                      </span>
                    </div>
                    <p className="text-xs text-orange-900/80 dark:text-orange-300 mt-1 leading-relaxed">
                      Dieksekusi <b>pertama kali</b> secara instan. Menjamin seluruh perangkat (HP guru, display monitoring, kartu siswa) langsung ter-update dalam hitungan milidetik secara realtime tanpa reload.
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center -my-1 text-slate-400">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </div>

                {/* 2. Supabase */}
                <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span>Supabase PostgreSQL (Isolasi Total Domain)</span>
                      </h5>
                      <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Pilihan Kedua
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900/80 dark:text-emerald-300 mt-1 leading-relaxed">
                      Dieksekusi <b>kedua</b> untuk persistensi database relasional PostgreSQL di cloud dengan isolasi ketat RLS per domain sekolah (<code className="font-mono">tenant_domain</code>).
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center -my-1 text-slate-400">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </div>

                {/* 3. MySQL cPanel */}
                <div className="p-4 rounded-2xl border-2 border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
                    3
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                        <Server className="w-4 h-4 text-indigo-500" />
                        <span>MySQL Hosting cPanel / Backend PHP API</span>
                      </h5>
                      <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Pilihan Ketiga
                      </span>
                    </div>
                    <p className="text-xs text-indigo-900/80 dark:text-indigo-300 mt-1 leading-relaxed">
                      Dieksekusi <b>ketiga</b> secara non-blocking (asynchronous fire-and-forget) ke server hosting cPanel Anda tanpa memperlambat kecepatan UI ataupun sinkronisasi cloud utama.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            ⚡ Urutan sync aktif: <b>Firebase (1) → Supabase (2) → MySQL (3)</b>.
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white px-5 py-2 rounded-xl font-bold transition cursor-pointer shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
