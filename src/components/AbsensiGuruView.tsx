import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Calendar,
  Filter,
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  UserX,
  Camera,
  X,
  Plus
} from 'lucide-react';
import {
  getAbsensiGuruList,
  saveAbsensiGuruList,
  getGuruList,
  getAppConfig,
  getTodayDateString,
  getCurrentTimeString,
  doTeacherCheckIn,
  doTeacherCheckOut,
  addSystemLog
} from '../services/storage';
import { AbsensiGuruRecord, Guru, UserSession, SystemLogLocation } from '../types';

interface AbsensiGuruViewProps {
  currentUser: UserSession;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenConfirm?: (title: string, msg: string, onConfirm: () => void) => void;
}

export const AbsensiGuruView: React.FC<AbsensiGuruViewProps> = ({
  currentUser,
  onShowToast,
  onOpenConfirm,
}) => {
  const [targetDate, setTargetDate] = useState<string>(() => getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [records, setRecords] = useState<AbsensiGuruRecord[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);

  // Modals
  const [selectedLocation, setSelectedLocation] = useState<{
    nama: string;
    type: 'Masuk' | 'Pulang';
    location?: SystemLogLocation;
    foto?: string;
    jam?: string;
  } | null>(null);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualUsername, setManualUsername] = useState('');
  const [manualStatus, setManualStatus] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Pulang Cepat'>('Hadir');
  const [manualKet, setManualKet] = useState('');

  const config = getAppConfig();

  const loadData = () => {
    const allGuru = getGuruList().filter((g) => g.username !== 'developer'); // filter out dev system account
    setGuruList(allGuru);

    const allRecords = getAbsensiGuruList();
    setRecords(allRecords);
  };

  useEffect(() => {
    loadData();
  }, [targetDate]);

  // Merge guru list with records for selected date
  const combinedData = guruList.map((guru) => {
    const guruUser = (guru.username || guru.nip || '').toLowerCase();
    const record = records.find(
      (r) => r.tanggal === targetDate && (r.username || r.nip || '').toLowerCase() === guruUser
    );

    if (record) {
      return {
        ...record,
        foto: guru.foto,
        nama: guru.nama || guru.username || guru.nip,
        nip: guru.nip || '-',
      };
    }

    // Default missing record row
    return {
      id: `att_guru_missing_${targetDate}_${guru.username || guru.nip}`,
      username: guru.username || guru.nip || '',
      nip: guru.nip || '-',
      nama: guru.nama || guru.username || guru.nip || 'Guru',
      tanggal: targetDate,
      jamMasuk: '--:--',
      jamPulang: '--:--',
      status: 'Belum Absen' as const,
      statusMasuk: undefined,
      statusPulang: 'Belum Pulang' as const,
      keterangan: 'Belum Melakukan Absensi',
      foto: guru.foto,
    };
  });

  const filteredData = combinedData.filter((item) => {
    if (statusFilter && statusFilter.trim() !== '') {
      if (statusFilter === 'Pulang Cepat') {
        if (item.statusPulang !== 'Pulang Cepat / Kabur' && item.status !== 'Pulang Cepat') return false;
      } else if (statusFilter === 'Terlambat') {
        if (item.statusMasuk !== 'Terlambat') return false;
      } else if (item.status !== statusFilter) {
        return false;
      }
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        (item.nama || '').toLowerCase().includes(q) ||
        (item.username || '').toLowerCase().includes(q) ||
        (item.nip || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate statistics
  const totalGuru = guruList.length;
  const countHadir = combinedData.filter((d) => d.status === 'Hadir' || d.status === 'Pulang Cepat').length;
  const countTerlambat = combinedData.filter((d) => d.statusMasuk === 'Terlambat').length;
  const countPulangCepat = combinedData.filter(
    (d) => d.statusPulang === 'Pulang Cepat / Kabur' || d.status === 'Pulang Cepat'
  ).length;
  const countBelumAbsen = combinedData.filter((d) => d.status === 'Belum Absen').length;
  const countSakitIzin = combinedData.filter((d) => d.status === 'Sakit' || d.status === 'Izin').length;

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUsername) {
      onShowToast('Pilih guru terlebih dahulu.', 'error');
      return;
    }

    const selectedGuru = guruList.find((g) => g.username === manualUsername);
    if (!selectedGuru) return;

    const allRecords = getAbsensiGuruList();
    let idx = allRecords.findIndex(
      (r) => r.tanggal === targetDate && r.username.toLowerCase() === manualUsername.toLowerCase()
    );

    const currentTime = getCurrentTimeString();
    let updatedRecord: AbsensiGuruRecord;

    if (idx !== -1) {
      updatedRecord = {
        ...allRecords[idx],
        status: manualStatus,
        keterangan: manualKet || `Diperbarui manual oleh ${currentUser.nama || currentUser.username}`,
      };
      if (manualStatus === 'Pulang Cepat') {
        updatedRecord.statusPulang = 'Pulang Cepat / Kabur';
      }
      allRecords[idx] = updatedRecord;
    } else {
      updatedRecord = {
        id: `att_guru_${targetDate}_${manualUsername}`,
        username: selectedGuru.username,
        nip: selectedGuru.nip,
        nama: selectedGuru.nama || selectedGuru.username,
        tanggal: targetDate,
        jamMasuk: manualStatus === 'Hadir' ? currentTime : '--:--',
        jamPulang: manualStatus === 'Pulang Cepat' ? currentTime : '--:--',
        status: manualStatus,
        statusPulang: manualStatus === 'Pulang Cepat' ? 'Pulang Cepat / Kabur' : 'Belum Pulang',
        keterangan: manualKet || `Diinput manual oleh ${currentUser.nama || currentUser.username}`,
      };
      allRecords.push(updatedRecord);
    }

    saveAbsensiGuruList(allRecords);
    loadData();
    setIsManualModalOpen(false);
    onShowToast(`Absensi guru ${selectedGuru.nama} berhasil diperbarui`, 'success');

    addSystemLog({
      type: 'data',
      action: 'Update Manual Absensi Guru',
      user: currentUser.username || 'admin',
      role: currentUser.role,
      status: 'info',
      details: `Admin memperbarui absensi guru "${selectedGuru.nama}" (${manualUsername}) pada tanggal ${targetDate} menjadi "${manualStatus}".`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Title */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                Presensi & Disiplin Guru
              </span>
              <span className="text-xs text-indigo-200">Jam Pulang Resmi: {config.jam_pulang_mulai} WIB</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Monitoring Absensi & Deteksi Guru Pulang Cepat
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
              Sistem pencatatan kehadiran guru berbasis GPS. Memastikan tidak ada dewan guru yang mendahului pulang atau meninggalkan jam mengajar sebelum waktunya.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Input Manual
            </button>
            <button
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Laporan
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Guru */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Guru</p>
            <h3 className="text-lg font-black text-slate-800">{totalGuru} Guru</h3>
          </div>
        </div>

        {/* Hadir */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hadir</p>
            <h3 className="text-lg font-black text-emerald-600">{countHadir} Guru</h3>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terlambat</p>
            <h3 className="text-lg font-black text-amber-600">{countTerlambat} Guru</h3>
          </div>
        </div>

        {/* WARNING: Pulang Cepat / Kabur */}
        <div className="bg-rose-50 rounded-xl p-4 border-2 border-rose-300 shadow-xs flex items-center gap-3 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold shadow-md animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-800 uppercase tracking-wider flex items-center gap-1">
              Pulang Cepat <AlertTriangle className="w-3 h-3 text-rose-600" />
            </p>
            <h3 className="text-lg font-black text-rose-700">{countPulangCepat} Guru</h3>
          </div>
        </div>

        {/* Belum Absen */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-bold">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belum Absen</p>
            <h3 className="text-lg font-black text-slate-700">{countBelumAbsen} Guru</h3>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-slate-500">Tanggal:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent border-0 font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold">
            <Filter className="w-4 h-4 text-purple-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat Masuk</option>
              <option value="Pulang Cepat">⚠️ PULANG CEPAT / KABUR</option>
              <option value="Sakit">Sakit</option>
              <option value="Izin">Izin</option>
              <option value="Belum Absen">Belum Absen</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
            placeholder="Cari Nama / NIP Guru..."
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">
              Daftar Presensi Guru Tanggal {targetDate}
            </h3>
          </div>
          <button
            onClick={() => {
              loadData();
              onShowToast('Data diperbarui', 'info');
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center w-12">No</th>
                <th className="p-3.5">Nama & NIP Guru</th>
                <th className="p-3.5">Jam Masuk (GPS)</th>
                <th className="p-3.5">Jam Pulang (GPS)</th>
                <th className="p-3.5 text-center">Status Kehadiran</th>
                <th className="p-3.5">Keterangan / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Tidak ada data presensi guru untuk kriteria pencarian ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const isPulangCepat =
                    item.statusPulang === 'Pulang Cepat / Kabur' || item.status === 'Pulang Cepat';
                  const isTerlambat = item.statusMasuk === 'Terlambat';

                  return (
                    <tr
                      key={item.username}
                      className={`hover:bg-slate-50 transition ${
                        isPulangCepat ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {item.foto ? (
                              <img src={item.foto} alt={item.nama} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-slate-500 text-xs">{item.nama.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{item.nama}</div>
                            <div className="text-[10px] text-slate-400 font-mono">NIP: {item.nip}</div>
                          </div>
                        </div>
                      </td>

                      {/* Jam Masuk */}
                      <td className="p-3.5">
                        {item.jamMasuk && item.jamMasuk !== '--:--' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold font-mono text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              {item.jamMasuk}
                              {isTerlambat && (
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-extrabold border border-amber-300">
                                  Terlambat
                                </span>
                              )}
                            </div>
                            {item.locationMasuk && (
                              <button
                                onClick={() =>
                                  setSelectedLocation({
                                    nama: item.nama,
                                    type: 'Masuk',
                                    location: item.locationMasuk,
                                    foto: item.fotoSelfieMasuk,
                                    jam: item.jamMasuk,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                              >
                                <MapPin className="w-3 h-3 text-indigo-500" /> Location GPS
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">--:--</span>
                        )}
                      </td>

                      {/* Jam Pulang */}
                      <td className="p-3.5">
                        {item.jamPulang && item.jamPulang !== '--:--' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold font-mono text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-purple-600" />
                              {item.jamPulang}
                              {isPulangCepat && (
                                <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-2.5 h-2.5" /> PULANG CEPAT
                                </span>
                              )}
                            </div>
                            {item.locationPulang && (
                              <button
                                onClick={() =>
                                  setSelectedLocation({
                                    nama: item.nama,
                                    type: 'Pulang',
                                    location: item.locationPulang,
                                    foto: item.fotoSelfiePulang,
                                    jam: item.jamPulang,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                              >
                                <MapPin className="w-3 h-3 text-indigo-500" /> Location GPS
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum Pulang</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {isPulangCepat ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> PULANG CEPAT
                          </span>
                        ) : item.status === 'Hadir' ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                            Hadir
                          </span>
                        ) : item.status === 'Sakit' ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                            Sakit
                          </span>
                        ) : item.status === 'Izin' ? (
                          <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                            Izin
                          </span>
                        ) : item.status === 'Alpa' ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                            Alpa
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-xs font-medium">
                            Belum Absen
                          </span>
                        )}
                      </td>

                      {/* Keterangan */}
                      <td className="p-3.5 text-slate-600 text-xs">
                        {item.keterangan || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPS Detail Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedLocation(null)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full z-10 shadow-2xl animate-fade-in">
            <button
              onClick={() => setSelectedLocation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  Verifikasi GPS Absen {selectedLocation.type}
                </h3>
                <p className="text-xs text-slate-500">{selectedLocation.nama}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Jam Catatan:</span>
                <span className="font-bold font-mono">{selectedLocation.jam} WIB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Koordinat GPS:</span>
                <span className="font-bold font-mono">
                  {selectedLocation.location?.latitude?.toFixed(5)}, {selectedLocation.location?.longitude?.toFixed(5)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Akurasi:</span>
                <span className="font-bold text-emerald-600">
                  ± {selectedLocation.location?.accuracy || 10} meter
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Alamat Terdeteksi:</span>
                <p className="font-semibold text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
                  {selectedLocation.location?.addressName || 'Kec. Lhoksukon, Kab. Aceh Utara'}
                </p>
              </div>
            </div>

            {selectedLocation.foto && (
              <div className="mt-4">
                <span className="text-xs font-bold text-slate-500 block mb-1">Foto Bukti Selfie:</span>
                <img
                  src={selectedLocation.foto}
                  alt="Selfie"
                  className="w-full h-40 object-cover rounded-xl border border-slate-200 shadow-sm"
                />
              </div>
            )}

            <button
              onClick={() => setSelectedLocation(null)}
              className="mt-5 w-full bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-slate-900 transition cursor-pointer"
            >
              Tutup Detail GPS
            </button>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsManualModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full z-10 shadow-2xl animate-fade-in">
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" /> Input / Koreksi Manual Absensi Guru
            </h3>

            <form onSubmit={handleManualSave} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1 font-bold text-slate-600">Pilih Guru</label>
                <select
                  required
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  <option value="">-- Pilih Nama Guru --</option>
                  {guruList.map((g) => (
                    <option key={g.username} value={g.username}>
                      {g.nama || g.username} (NIP: {g.nip || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-600">Status Kehadiran</label>
                <select
                  value={manualStatus}
                  onChange={(e) =>
                    setManualStatus(e.target.value as 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Pulang Cepat')
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  <option value="Hadir">Hadir (Sesuai Jam)</option>
                  <option value="Sakit">Sakit / Surat Dokter</option>
                  <option value="Izin">Izin Dinas / Keperluan</option>
                  <option value="Alpa">Alpa (Tanpa Keterangan)</option>
                  <option value="Pulang Cepat">⚠️ PULANG CEPAT / KABUR</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-600">Keterangan / Alasan</label>
                <textarea
                  value={manualKet}
                  onChange={(e) => setManualKet(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="Contoh: Izin mendampingi lomba OSN / Mengikuti rapat Dinas..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold cursor-pointer hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-bold shadow-md cursor-pointer hover:bg-purple-700"
                >
                  Simpan Absensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
