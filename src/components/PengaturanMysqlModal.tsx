import React, { useState, useEffect } from 'react';
import { Database, Download, CheckCircle2, AlertCircle, RefreshCw, X, Copy, Check, Server, FileCode, Globe, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, checkMySqlConnection } from '../services/api';
import { addSystemLog, getAppConfig, saveAppConfig } from '../services/storage';

interface PengaturanMysqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const PengaturanMysqlModal: React.FC<PengaturanMysqlModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const [apiUrl, setApiUrlInput] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ checked: boolean; success: boolean; message: string; details?: any }>({
    checked: false,
    success: false,
    message: '',
  });

  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'php' | 'guide'>('config');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    const res = await checkMySqlConnection();
    setStatus({
      checked: true,
      success: res.success,
      message: res.message,
      details: res.details,
    });
    setTesting(false);
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
      details: `Mengubah Endpoint URL PHP MySQL cPanel menjadi terpusat: ${apiUrl || 'Auto Domain (/api)'}`,
    });
    onShowToast('URL Base API MySQL berhasil disimpan & disinkronkan ke seluruh browser', 'success');
    handleTestConnection();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-w-3xl w-full z-10 animate-fade-in flex flex-col max-h-[92vh] sm:max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg leading-tight truncate">Integrasi MySQL & cPanel Hosting</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Konfigurasi koneksi database MySQL & Panduan deployment ke cPanel
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
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'config'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4 shrink-0" /> Uji & URL API
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'sql'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 shrink-0" /> Download SQL Schema
          </button>
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
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {/* TAB 1: CONFIG & TEST */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  status.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                {status.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm">
                      {status.success ? 'Koneksi MySQL Terhubung' : 'Mode Offline / LocalStorage Active'}
                    </h4>
                    <button
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                      {testing ? 'Menguji...' : 'Uji Koneksi'}
                    </button>
                  </div>
                  <p className="text-xs opacity-80 mt-1">
                    {status.message ||
                      'Aplikasi secara otomatis siap bekerja dengan MySQL cPanel backend (/api/) atau menyimpan data secara lokal.'}
                  </p>
                  {status.details && (
                    <div className="mt-2 text-[11px] font-mono bg-white/80 p-2 rounded-lg border border-slate-200">
                      DB: {status.details.database} | Server: {status.details.server}
                    </div>
                  )}
                </div>
              </div>

              {/* Endpoint URL Config */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Base URL API Backend MySQL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrlInput(e.target.value)}
                    placeholder="Contoh: https://domainsekolah.sch.id/api atau /api"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSaveApiUrl}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-md"
                  >
                    Simpan URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Gunakan <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/api</code> jika
                  file backend PHP ditempatkan dalam folder <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">public_html/api/</code> di domain yang sama.
                </p>
              </div>

              {/* Summary Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-2">
                    1
                  </div>
                  <h5 className="font-bold text-xs text-slate-800">Import File SQL</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Download file <code className="font-mono text-indigo-600">database.sql</code> dan import via phpMyAdmin cPanel.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-2">
                    2
                  </div>
                  <h5 className="font-bold text-xs text-slate-800">Upload File API PHP</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Upload folder <code className="font-mono text-indigo-600">api/</code> ke <code className="font-mono">public_html/api/</code> dan sesuaikan <code className="font-mono">config.php</code>.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-2">
                    3
                  </div>
                  <h5 className="font-bold text-xs text-slate-800">Upload Build React</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Upload isi folder <code className="font-mono text-indigo-600">dist/</code> hasil build ke <code className="font-mono">public_html/</code> cPanel Anda.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SQL SCHEMA DOWNLOAD */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-indigo-950">
                    Skema Database MySQL Siap Import (cPanel)
                  </h4>
                  <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
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

          {/* TAB 3: FILE API PHP */}
          {activeTab === 'php' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-slate-800">File Konfigurasi PHP (`api/config.php`)</h4>
                <button
                  onClick={() => copyToClipboard(sampleConfigPhp, 'config.php')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-300"
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

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-800">💡 Lokasi File API dalam Project:</p>
                <ul className="list-disc pl-5 text-slate-600 space-y-1">
                  <li><code className="font-mono font-bold text-indigo-600">/public/api/config.php</code> - Koneksi PDO MySQL</li>
                  <li><code className="font-mono font-bold text-indigo-600">/public/api/auth.php</code> - Handler Login & Registrasi Siswa</li>
                  <li><code className="font-mono font-bold text-indigo-600">/public/api/siswa.php</code> - CRUD Data Siswa & Foto</li>
                  <li><code className="font-mono font-bold text-indigo-600">/public/api/guru.php</code> - CRUD Data Guru</li>
                  <li><code className="font-mono font-bold text-indigo-600">/public/api/absensi.php</code> - Scan QR Absensi & Laporan</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: STEP BY STEP CPANEL GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Buat Database MySQL di cPanel</h5>
                    <p className="text-slate-500 mt-0.5">
                      Masuk ke cPanel &gt; menu <b>MySQL® Databases</b>. Buat database baru (contoh:{' '}
                      <code className="bg-slate-100 px-1 font-mono">user_absensi</code>) dan user database,
                      lalu beri hak akses (ALL PRIVILEGES).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Import Schema database.sql</h5>
                    <p className="text-slate-500 mt-0.5">
                      Buka <b>phpMyAdmin</b> di cPanel, pilih database yang baru dibuat, lalu klik tab <b>Import</b>.{' '}
                      Pilih file <code className="bg-slate-100 px-1 font-mono">database.sql</code> yang diunduh lalu klik <b>Go</b>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Upload Folder API PHP & Edit config.php</h5>
                    <p className="text-slate-500 mt-0.5">
                      Di <b>File Manager cPanel</b>, buka folder <code className="bg-slate-100 px-1 font-mono">public_html</code>.
                      Pastikan folder <code className="bg-slate-100 px-1 font-mono">api/</code> berisi file PHP berada di dalam <code className="bg-slate-100 px-1 font-mono">public_html/api/</code>.
                      Edit file <code className="bg-slate-100 px-1 font-mono">config.php</code> dan isi <code className="font-mono">$db_name</code>, <code className="font-mono">$db_user</code>, dan <code className="font-mono">$db_pass</code> sesuai cPanel Anda.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Upload Build Static React (dist)</h5>
                    <p className="text-slate-500 mt-0.5">
                      Upload seluruh file di dalam folder <code className="bg-slate-100 px-1 font-mono">dist/</code> (seperti <code className="font-mono">index.html</code>, <code className="font-mono">assets/</code>) langsung ke <code className="bg-slate-100 px-1 font-mono">public_html/</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Aplikasi secara otomatis mendukung API MySQL cPanel & LocalStorage.
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl font-bold hover:bg-black transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
