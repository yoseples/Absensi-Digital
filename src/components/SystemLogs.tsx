import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  RotateCw,
  Trash2,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  KeyRound,
  Settings,
  Database,
  Terminal,
  UserCheck,
  Activity,
  PlusCircle,
  MapPin,
  ExternalLink,
  Globe,
  Smartphone,
  Compass,
  X,
} from 'lucide-react';
import { SystemLog, UserSession } from '../types';
import { getSystemLogs, clearSystemLogs, addSystemLog, clearAppCache } from '../services/storage';

interface SystemLogsProps {
  currentUser: UserSession;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ currentUser, onShowToast }) => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [selectedGpsLog, setSelectedGpsLog] = useState<SystemLog | null>(null);

  const loadLogs = () => {
    const data = getSystemLogs();
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClear = () => {
    clearSystemLogs();
    loadLogs();
    setIsConfirmClearOpen(false);
    onShowToast('Seluruh riwayat log sistem berhasil dibersihkan!', 'success');
  };

  const handleClearAppCache = () => {
    clearAppCache();
    loadLogs();
    onShowToast('Cache aplikasi & storage browser berhasil dibersihkan!', 'success');
  };

  const handleSimulateLog = () => {
    addSystemLog({
      type: 'system',
      action: 'Simulasi Pemeriksaan Audit Log',
      user: currentUser.username || 'developer',
      role: currentUser.role,
      status: 'info',
      details: 'Pengujian perekaman audit log manual oleh Developer.',
    });
    loadLogs();
    onShowToast('Log tes berhasil ditambahkan!', 'info');
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      onShowToast('Tidak ada data log untuk diunduh.', 'error');
      return;
    }

    const headers = ['ID', 'Waktu', 'Kategori', 'Aksi / Event', 'User', 'Role', 'Status', 'Detail'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      l.type,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.user}"`,
      l.role,
      l.status,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `system_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Export log CSV berhasil diunduh!', 'success');
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.location?.addressName && log.location.addressName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.deviceInfo && log.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesType = true;
    if (typeFilter === 'gps') {
      matchesType = !!log.location || log.type === 'auth';
    } else if (typeFilter !== 'all') {
      matchesType = log.type === typeFilter;
    }

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate stats
  const totalLogs = logs.length;
  const authLogs = logs.filter((l) => l.type === 'auth').length;
  const configLogs = logs.filter((l) => l.type === 'config').length;
  const failedAuths = logs.filter((l) => l.type === 'auth' && l.status === 'failed').length;

  const getTypeBadge = (type: SystemLog['type']) => {
    switch (type) {
      case 'auth':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <KeyRound className="w-3 h-3" />
            Otentikasi
          </span>
        );
      case 'config':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Settings className="w-3 h-3" />
            Pengaturan
          </span>
        );
      case 'database':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Database className="w-3 h-3" />
            Database
          </span>
        );
      case 'data':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <UserCheck className="w-3 h-3" />
            Kelola Data
          </span>
        );
      case 'system':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Terminal className="w-3 h-3" />
            Sistem
          </span>
        );
    }
  };

  const getStatusBadge = (status: SystemLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Sukses
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Gagal
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Peringatan
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Info className="w-3 h-3 text-sky-600" />
            Informasi
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase rounded-md shadow-xs">
                Developer Panel
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Audit Trail ID: #{currentUser.role.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-white">
              <ShieldAlert className="w-7 h-7 text-amber-400 shrink-0" />
              Log Sistem & Audit Trail
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Memantau riwayat otentikasi login, perubahan konfigurasi identitas sekolah, endpoint MySQL, serta seluruh aktivitas sistem E-Absensi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <button
              onClick={handleSimulateLog}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer shadow-xs"
              title="Tambah log tes manual"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Simulasi Log</span>
            </button>

            <button
              onClick={loadLogs}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer shadow-xs"
              title="Perbarui daftar log"
            >
              <RotateCw className="w-4 h-4 text-sky-400" />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleClearAppCache}
              className="flex items-center gap-1.5 bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-700/80 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Bersihkan cache browser, notifikasi & memori aplikasi"
            >
              <Trash2 className="w-4 h-4 text-sky-400" />
              <span>Clear Cache</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex items-center gap-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/80 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Bersihkan Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalLogs}</div>
            <div className="text-xs font-medium text-slate-500">Total Log Terekam</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{authLogs}</div>
            <div className="text-xs font-medium text-slate-500">Event Otentikasi</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{configLogs}</div>
            <div className="text-xs font-medium text-slate-500">Perubahan Konfigurasi</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">{failedAuths}</div>
            <div className="text-xs font-medium text-slate-500">Login Gagal (Security)</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan aksi, username, atau detail log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="success">Sukses</option>
                <option value="failed">Gagal</option>
                <option value="info">Informasi</option>
                <option value="warning">Peringatan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'Semua Kategori' },
            { id: 'gps', label: '📍 Tracking GPS Login' },
            { id: 'auth', label: 'Otentikasi / Login' },
            { id: 'config', label: 'Pengaturan Sekolah' },
            { id: 'database', label: 'MySQL / Database' },
            { id: 'data', label: 'Kelola Data' },
            { id: 'system', label: 'Sistem' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setTypeFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === cat.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Daftar Audit Trail ({filteredLogs.length} Entri)
          </span>
          <span className="text-[11px] font-medium text-slate-400">Diurutkan dari yang terbaru</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-semibold text-sm">Tidak ada log sistem yang cocok dengan kriteria filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 text-xs font-bold">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Aksi / Event</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Lokasi GPS & Perangkat</th>
                  <th className="py-3 px-4">Detail Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filteredLogs.map((log) => {
                  const hasGps = log.location?.latitude && log.location?.longitude;
                  const isDenied = log.location?.permissionStatus === 'denied';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap font-medium">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{getTypeBadge(log.type)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{log.action}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{log.user}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px] uppercase font-bold border border-slate-200">
                            {log.role}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasGps ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedGpsLog(log)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
                              title="Klik untuk melihat peta lokasi detail"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {log.location?.latitude?.toFixed(4)}, {log.location?.longitude?.toFixed(4)}
                              </span>
                            </button>
                            <a
                              href={`https://maps.google.com/?q=${log.location?.latitude},${log.location?.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-indigo-600 transition"
                              title="Buka di Google Maps"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : isDenied ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <MapPin className="w-3 h-3 text-rose-500" />
                            GPS Ditolak
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Tidak Ada GPS</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md break-words font-sans">
                        {log.details || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Peta GPS Login */}
      {selectedGpsLog && selectedGpsLog.location?.latitude && selectedGpsLog.location?.longitude && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <button
              onClick={() => setSelectedGpsLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase rounded-md border border-emerald-200">
                  Riwayat Login GPS Terverifikasi
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedGpsLog.user} ({selectedGpsLog.role.toUpperCase()})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Waktu Login</span>
                <p className="font-mono font-bold text-slate-800">{selectedGpsLog.timestamp}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Perangkat / Browser</span>
                <p className="font-bold text-slate-800 truncate">{selectedGpsLog.deviceInfo || 'Browser Desktop / Mobile'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Koordinat GPS</span>
                <p className="font-mono font-bold text-emerald-700">
                  {selectedGpsLog.location.latitude}, {selectedGpsLog.location.longitude}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Akurasi Lokasi</span>
                <p className="font-bold text-slate-800">
                  ±{selectedGpsLog.location.accuracy || 15} meter
                </p>
              </div>
            </div>

            {/* Google Maps Preview Embed */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-52 bg-slate-100 relative">
              <iframe
                title="Peta Lokasi Login Guru"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                src={`https://maps.google.com/maps?q=${selectedGpsLog.location.latitude},${selectedGpsLog.location.longitude}&z=15&output=embed`}
                className="w-full h-full"
              ></iframe>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <a
                href={`https://maps.google.com/?q=${selectedGpsLog.location.latitude},${selectedGpsLog.location.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Compass className="w-4 h-4" /> Buka Google Maps Lengkap
              </a>
              <button
                onClick={() => setSelectedGpsLog(null)}
                className="py-3 px-5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Bersihkan Riwayat Log?</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Tindakan ini akan menghapus seluruh catatan audit trail dan log otentikasi lokal dari sistem. Data tidak dapat dikembalikan setelah dihapus.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs cursor-pointer"
              >
                Ya, Hapus Semua Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
