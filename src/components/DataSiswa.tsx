import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  QrCode,
  X,
  UserCheck,
  User,
  MapPin,
  Users as UsersIcon,
  Camera,
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  AlertCircle,
  PhoneOff,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  Smartphone,
  Check,
} from 'lucide-react';
import { getSiswaList, saveSiswaList, deleteSiswaFromStorage, getKelasList, getAppConfig } from '../services/storage';
import { saveSiswaToApi, deleteSiswaFromApi } from '../services/api';
import { getActivationState, DEMO_LIMITS } from '../services/activation';
import { Siswa } from '../types';
import { ImportSiswaModal } from './ImportSiswaModal';

interface DataSiswaProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  onViewQRCard: (student: Siswa) => void;
  onOpenActivationModal?: () => void;
}

export const DataSiswa: React.FC<DataSiswaProps> = ({
  onShowToast,
  onOpenConfirm,
  onViewQRCard,
  onOpenActivationModal,
}) => {
  const [siswaList, setSiswaList] = useState<Siswa[]>(() => getSiswaList());
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [waFilter, setWaFilter] = useState<'all' | 'verified' | 'unverified' | 'none'>('all');
  const [limit, setLimit] = useState<number | 'all'>(10);
  const [page, setPage] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [viewingSiswa, setViewingSiswa] = useState<Siswa | null>(null);

  const handleImportSuccess = (importedList: Siswa[], mode: 'replace' | 'skip') => {
    const activation = getActivationState();
    let currentList = getSiswaList();
    let addedCount = 0;
    let updatedCount = 0;
    let limitReached = false;

    for (const newItem of importedList) {
      const existingIdx = currentList.findIndex((s) => s.nisn === newItem.nisn);
      if (existingIdx !== -1) {
        if (mode === 'replace') {
          currentList[existingIdx] = {
            ...currentList[existingIdx],
            ...newItem,
          };
          updatedCount++;
        }
      } else {
        if (!activation.isActivated && currentList.length >= DEMO_LIMITS.MAX_SISWA) {
          limitReached = true;
          break;
        }
        currentList.push(newItem);
        addedCount++;
      }
    }

    saveSiswaList(currentList);
    reloadData();
    if (limitReached) {
      onShowToast(
        `Import sebagian berhasil (${addedCount} ditambahkan). Batas Mode Demo (${DEMO_LIMITS.MAX_SISWA} siswa) tercapai. Aktivasikan ke Full Version untuk UNLIMITED!`,
        'warning'
      );
      if (onOpenActivationModal) onOpenActivationModal();
    } else {
      onShowToast(`Import berhasil! ${addedCount} siswa ditambahkan, ${updatedCount} siswa diperbarui. (Unlimited Mode)`, 'success');
    }
  };

  // Form Fields
  const [formNama, setFormNama] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formPassword, setFormPassword] = useState('123456');
  const [formJenisKelamin, setFormJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [formTanggalLahir, setFormTanggalLahir] = useState('');
  const [formAgama, setFormAgama] = useState('Islam');
  const [formNamaAyah, setFormNamaAyah] = useState('');
  const [formNamaIbu, setFormNamaIbu] = useState('');
  const [formNoHp, setFormNoHp] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formFoto, setFormFoto] = useState('');
  const [formWaVerified, setFormWaVerified] = useState(false);

  const reloadData = () => {
    const list = getSiswaList();
    setSiswaList(list);
    setKelasOptions(getKelasList());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Summary Statistics
  const totalSiswa = siswaList.length;
  const waVerifiedCount = siswaList.filter((s) => s.waVerified).length;
  const waUnverifiedCount = siswaList.filter((s) => s.noHp && s.noHp.trim() !== '' && !s.waVerified).length;
  const waMissingCount = siswaList.filter((s) => !s.noHp || s.noHp.trim() === '').length;

  // Toggle WA Verification Status
  const handleToggleWaVerified = (siswa: Siswa) => {
    const newVerified = !siswa.waVerified;
    const currentList = getSiswaList();
    const updatedList = currentList.map((s) => {
      if (s.nisn === siswa.nisn) {
        return {
          ...s,
          waVerified: newVerified,
        };
      }
      return s;
    });

    saveSiswaList(updatedList);
    reloadData();
    if (viewingSiswa?.nisn === siswa.nisn) {
      setViewingSiswa((prev) => (prev ? { ...prev, waVerified: newVerified } : null));
    }
    onShowToast(
      `Status WhatsApp ${siswa.nama} diubah menjadi: ${newVerified ? 'Terverifikasi 💚' : 'Belum Terverifikasi ⚠️'}.`,
      newVerified ? 'success' : 'info'
    );
  };

  // Send Activation Message via WhatsApp
  const handleSendActivationWA = (siswa: Siswa, autoVerify = true) => {
    if (!siswa.noHp || !siswa.noHp.trim()) {
      onShowToast(`Nomor HP/WhatsApp untuk siswa ${siswa.nama} belum diisi.`, 'error');
      return;
    }

    const cleanPhone = siswa.noHp.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }

    const config = getAppConfig();
    const schoolName = config.nama_sekolah || 'SEKOLAH';
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://presensi-digital.sch.id';

    const nowStr = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg = `*PESAN AKTIVASI AKUN PRESENSI SISWA DIGITAL*
_${schoolName}_

Yth. Bapak/Ibu Orang Tua / Wali dari *${siswa.nama}*
(Kelas ${siswa.kelas} - NISN: ${siswa.nisn})

Berikut rincian aktivasi akun dan Kartu Digital Presensi Otomatis:

📌 *Nama Siswa:* ${siswa.nama}
📌 *NISN:* ${siswa.nisn}
📌 *Kelas:* ${siswa.kelas}
📌 *No. WA Terdaftar:* ${siswa.noHp}
📌 *Status Akun:* ${autoVerify ? 'TERVERIFIKASI AKTIF ✅' : 'PENDING AKTIVASI'}

Aplikasi Presensi dan Laporan Kehadiran dapat diakses di:
${appUrl}

Kartu Presensi QR Digital siswa dapat langsung digunakan untuk Scan Masuk & Pulang. Apabila memerlukan bantuan, mohon hubungi pihak sekolah/Wali Kelas.

Terima kasih.
_Sistem Absensi Digital - ${schoolName}_`;

    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;

    // Open WhatsApp URL
    window.open(waUrl, '_blank');

    // Update timestamp & status in storage
    const currentList = getSiswaList();
    const updatedList = currentList.map((s) => {
      if (s.nisn === siswa.nisn) {
        return {
          ...s,
          waLastSentAt: nowStr,
          waVerified: autoVerify ? true : (s.waVerified ?? true),
        };
      }
      return s;
    });

    saveSiswaList(updatedList);
    reloadData();

    if (viewingSiswa?.nisn === siswa.nisn) {
      setViewingSiswa((prev) => (prev ? { ...prev, waLastSentAt: nowStr, waVerified: true } : null));
    }

    onShowToast(
      `Membuka WhatsApp untuk mengirim ulang pesan aktivasi ke ${siswa.noHp}. Status terverifikasi!`,
      'success'
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('Ukuran foto maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormFoto(reader.result as string);
      onShowToast('Foto berhasil dimuat', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Filtered and Search logic
  const filteredData = siswaList.filter((item) => {
    if (classFilter && item.kelas !== classFilter) return false;
    if (waFilter === 'verified' && !item.waVerified) return false;
    if (waFilter === 'unverified' && (item.waVerified || !item.noHp || item.noHp.trim() === '')) return false;
    if (waFilter === 'none' && item.noHp && item.noHp.trim() !== '') return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (item.nama || '').toLowerCase().includes(q);
      const nisnMatch = (item.nisn || '').includes(q);
      const classMatch = (item.kelas || '').toLowerCase().includes(q);
      const phoneMatch = item.noHp?.includes(q);
      return nameMatch || nisnMatch || classMatch || !!phoneMatch;
    }
    return true;
  });

  const numericLimit = limit === 'all' ? filteredData.length || 1 : limit;
  const totalPages = Math.ceil(filteredData.length / numericLimit) || 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * numericLimit;
  const paginatedData = filteredData.slice(startIndex, startIndex + numericLimit);

  const openAddModal = () => {
    setEditingSiswa(null);
    setFormNama('');
    setFormNisn('');
    setFormKelas(kelasOptions[0] || 'X-A');
    setFormPassword('123456');
    setFormJenisKelamin('Laki-laki');
    setFormTanggalLahir('2008-01-01');
    setFormAgama('Islam');
    setFormNamaAyah('');
    setFormNamaIbu('');
    setFormNoHp('');
    setFormAlamat('');
    setFormFoto('');
    setFormWaVerified(false);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Siswa) => {
    setEditingSiswa(s);
    setFormNama(s.nama || '');
    setFormNisn((s.nisn || '').replace(/^'/, ''));
    setFormKelas(s.kelas || '');
    setFormPassword(s.password || '123456');
    setFormJenisKelamin(s.jenisKelamin || 'Laki-laki');
    setFormTanggalLahir(s.tanggalLahir || '2008-01-01');
    setFormAgama(s.agama || 'Islam');
    setFormNamaAyah(s.namaAyah || '');
    setFormNamaIbu(s.namaIbu || '');
    setFormNoHp(s.noHp || '');
    setFormAlamat(s.alamat || '');
    setFormFoto(s.foto || '');
    setFormWaVerified(s.waVerified ?? false);
    setIsModalOpen(true);
  };

  const handleSaveSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = formNama.trim();
    const cleanNisn = formNisn.trim().replace(/^'/, '').replace(/[^0-9a-zA-Z]/g, '');
    const cleanKelas = formKelas.trim();

    if (!cleanNama || !cleanNisn || !cleanKelas) {
      onShowToast('Harap isi Nama, NISN, dan Kelas dengan benar.', 'error');
      return;
    }

    // Ensure valid DATE format YYYY-MM-DD
    let cleanTanggalLahir = formTanggalLahir.trim();
    if (!cleanTanggalLahir || !/^\d{4}-\d{2}-\d{2}$/.test(cleanTanggalLahir)) {
      cleanTanggalLahir = '2008-01-01';
    }

    const updatedSiswa: Siswa = {
      nama: cleanNama,
      nisn: cleanNisn,
      kelas: cleanKelas,
      password: formPassword.trim() || '123456',
      jenisKelamin: formJenisKelamin,
      tanggalLahir: cleanTanggalLahir,
      agama: formAgama,
      namaAyah: formNamaAyah.trim(),
      namaIbu: formNamaIbu.trim(),
      noHp: formNoHp.trim(),
      alamat: formAlamat.trim(),
      foto: formFoto.trim() || undefined,
      waVerified: formWaVerified,
      waLastSentAt: editingSiswa?.waLastSentAt,
    };

    let currentList = getSiswaList();

    if (editingSiswa) {
      // Edit
      const targetNisn = (editingSiswa.nisn || '').replace(/^'/, '').trim();
      if (targetNisn && targetNisn !== cleanNisn) {
        deleteSiswaFromApi(targetNisn).catch(() => {});
      }
      currentList = currentList.map((s) =>
        (s.nisn || '').replace(/^'/, '').trim() === targetNisn ? updatedSiswa : s
      );
      saveSiswaList(currentList);
      saveSiswaToApi(updatedSiswa).catch(() => {});
      onShowToast('Data siswa berhasil diperbarui', 'success');
    } else {
      // Check existing NISN
      if (currentList.some((s) => (s.nisn || '').replace(/^'/, '').trim() === cleanNisn)) {
        onShowToast('NISN tersebut sudah terdaftar.', 'error');
        return;
      }
      currentList.push(updatedSiswa);
      saveSiswaList(currentList);
      saveSiswaToApi(updatedSiswa).catch(() => {});
      onShowToast('Siswa baru berhasil ditambahkan', 'success');
    }

    setIsModalOpen(false);
    reloadData();
  };

  const handleDeleteSiswa = (nisn: string, nama: string) => {
    onOpenConfirm(
      'Hapus Data Siswa',
      `Data siswa "${nama}" akan dihapus secara permanen. Lanjutkan?`,
      async () => {
        await deleteSiswaFromStorage(nisn);
        reloadData();
        onShowToast('Data siswa berhasil dihapus', 'success');
      }
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* WhatsApp Verification Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Siswa</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{totalSiswa}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <UsersIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">WA Terverifikasi</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-emerald-800">{waVerifiedCount}</span>
              <span className="text-[10px] font-bold text-emerald-600">
                ({totalSiswa ? Math.round((waVerifiedCount / totalSiswa) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Belum Verifikasi</p>
            <p className="text-lg font-black text-amber-800 mt-0.5">{waUnverifiedCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanpa No. WA</p>
            <p className="text-lg font-black text-slate-600 mt-0.5">{waMissingCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
            <PhoneOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span>Direktori Siswa</span>
              <span className="text-xs font-normal text-slate-500">({filteredData.length} siswa)</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                reloadData();
                onShowToast('Data siswa diperbarui.', 'success');
              }}
              className="bg-white text-slate-600 border border-slate-200 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-slate-50 hover:text-indigo-600 transition cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Import File Excel atau CSV"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Import Excel / CSV</span>
              <span className="sm:hidden">Import</span>
            </button>

            <button
              onClick={openAddModal}
              className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" /> Tambah
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 font-bold whitespace-nowrap">Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  const val = e.target.value;
                  setLimit(val === 'all' ? 'all' : parseInt(val));
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 w-full sm:w-auto"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">Semua</option>
              </select>
            </div>

            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 w-full sm:w-36 font-bold shadow-xs"
            >
              <option value="">Semua Kelas</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <select
              value={waFilter}
              onChange={(e) => {
                setWaFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 w-full sm:w-44 font-bold shadow-xs"
            >
              <option value="all">Semua Status WA</option>
              <option value="verified">🟢 Terverifikasi</option>
              <option value="unverified">🟡 Belum Verifikasi</option>
              <option value="none">⚪ Tanpa Nomor HP</option>
            </select>
          </div>

          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-9 p-2 transition-all"
              placeholder="Cari Nama / NISN / No. HP..."
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
              <tr>
                <th className="p-2 sm:p-3 text-center w-8 sm:w-12">No</th>
                <th className="p-2 sm:p-3">Nama</th>
                <th className="p-2 sm:p-3 hidden md:table-cell">NISN</th>
                <th className="p-2 sm:p-3 whitespace-nowrap">Kelas</th>
                <th className="p-2 sm:p-3">WhatsApp & Status Verification</th>
                <th className="p-2 sm:p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Data siswa tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((siswa, idx) => (
                  <tr
                    key={siswa.nisn}
                    className="hover:bg-slate-50 transition border-b border-slate-50 group"
                  >
                    <td className="p-2 sm:p-3 text-center text-slate-500 text-xs sm:text-sm">
                      {startIndex + idx + 1}
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center">
                        {siswa.foto ? (
                          <img
                            src={siswa.foto}
                            alt={siswa.nama}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-200 mr-2 sm:mr-3 shrink-0 shadow-xs"
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] sm:text-xs font-bold mr-2 sm:mr-3 shrink-0 border border-indigo-200">
                            {siswa.nama.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900">{siswa.nama}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 md:hidden font-mono">
                            {siswa.nisn}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 hidden md:table-cell text-sm text-slate-600 font-mono">
                      {siswa.nisn}
                    </td>
                    <td className="p-2 sm:p-3 whitespace-nowrap">
                      <span className="inline-block whitespace-nowrap px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-50 text-blue-800 border border-blue-200/60 rounded-md text-[10px] sm:text-xs font-bold">
                        {siswa.kelas}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 whitespace-nowrap">
                      {siswa.noHp && siswa.noHp.trim() !== '' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-700">{siswa.noHp}</span>
                            {siswa.waVerified ? (
                              <button
                                onClick={() => handleToggleWaVerified(siswa)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md text-[10px] font-extrabold hover:bg-emerald-100 transition cursor-pointer"
                                title="Status WA Terverifikasi. Klik untuk membatalkan verifikasi"
                              >
                                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Terverifikasi</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleWaVerified(siswa)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-extrabold hover:bg-amber-100 transition cursor-pointer"
                                title="Belum Terverifikasi. Klik untuk tandai Terverifikasi manual"
                              >
                                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Belum Verifikasi</span>
                              </button>
                            )}
                          </div>
                          {siswa.waLastSentAt && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>Aktivasi: {siswa.waLastSentAt}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-md text-[10px]">
                          <PhoneOff className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Tanpa Nomor HP</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <div className="flex justify-center items-center gap-1 sm:gap-1.5">
                        <button
                          onClick={() => handleSendActivationWA(siswa, true)}
                          disabled={!siswa.noHp || !siswa.noHp.trim()}
                          className={`p-1 sm:px-2 sm:py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                            siswa.noHp && siswa.noHp.trim() !== ''
                              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                          title={
                            siswa.noHp && siswa.noHp.trim() !== ''
                              ? 'Kirim Ulang Pesan Aktivasi WA'
                              : 'Siswa tidak memiliki nomor WhatsApp'
                          }
                        >
                          <Send className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden xl:inline text-[11px]">Kirim WA</span>
                        </button>
                        <button
                          onClick={() => setViewingSiswa(siswa)}
                          className="p-1 sm:p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(siswa)}
                          className="p-1 sm:p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSiswa(siswa.nisn, siswa.nama)}
                          className="p-1 sm:p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => onViewQRCard(siswa)}
                          className="p-1 sm:p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                          title="Kartu Digital QR"
                        >
                          <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
          <span>
            Menampilkan {filteredData.length > 0 ? startIndex + 1 : 0} -{' '}
            {Math.min(startIndex + numericLimit, filteredData.length)} dari {filteredData.length}{' '}
            data
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT SISWA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full z-10 animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">
                {editingSiswa ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleSaveSiswa} className="space-y-4">
                {/* Foto Siswa Upload Block */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    {formFoto ? (
                      <img
                        src={formFoto}
                        alt="Foto Preview"
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-200 text-slate-500 flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
                        <Camera className="w-8 h-8 opacity-60" />
                        <span className="text-[9px] font-bold mt-1">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Foto Profil Siswa
                    </label>
                    <p className="text-xs text-slate-500">
                      Upload foto resmi siswa (format JPG/PNG, maks 2MB).
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                        <Upload className="w-3.5 h-3.5" /> Pilih File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {formFoto && (
                        <button
                          type="button"
                          onClick={() => setFormFoto('')}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                      placeholder="Sesuai Akta Kelahiran"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      NISN
                    </label>
                    <input
                      type="number"
                      required
                      disabled={!!editingSiswa}
                      value={formNisn}
                      onChange={(e) => setFormNisn(e.target.value)}
                      className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-mono ${
                        editingSiswa ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="Nomor Induk Siswa"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Kelas
                    </label>
                    <input
                      type="text"
                      required
                      value={formKelas}
                      onChange={(e) => setFormKelas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                      placeholder="Contoh: X-A / XI-IPA 1"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Password Login Siswa
                    </label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-mono"
                      placeholder="Default: 123456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Jenis Kelamin
                    </label>
                    <select
                      value={formJenisKelamin}
                      onChange={(e) =>
                        setFormJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')
                      }
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={formTanggalLahir}
                      onChange={(e) => setFormTanggalLahir(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Agama
                    </label>
                    <select
                      value={formAgama}
                      onChange={(e) => setFormAgama(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Nama Ayah
                    </label>
                    <input
                      type="text"
                      value={formNamaAyah}
                      onChange={(e) => setFormNamaAyah(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      Nama Ibu
                    </label>
                    <input
                      type="text"
                      value={formNamaIbu}
                      onChange={(e) => setFormNamaIbu(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                      No. HP Orangtua
                    </label>
                    <input
                      type="tel"
                      value={formNoHp}
                      onChange={(e) => setFormNoHp(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2 font-mono"
                      placeholder="081234567890"
                    />
                  </div>
                </div>

                {/* WhatsApp Verification Checkbox */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Status Verifikasi WhatsApp</p>
                      <p className="text-[11px] text-emerald-700">Tandai nomor WhatsApp siswa/orang tua sebagai sudah terverifikasi aktif</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formWaVerified}
                      onChange={(e) => setFormWaVerified(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={2}
                    value={formAlamat}
                    onChange={(e) => setFormAlamat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition transform active:scale-95 cursor-pointer"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SISWA DETAIL MODAL */}
      {viewingSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setViewingSiswa(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full z-10 animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex justify-between items-start">
              <div className="flex gap-4 items-center">
                {viewingSiswa.foto ? (
                  <img
                    src={viewingSiswa.foto}
                    alt={viewingSiswa.nama}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30 shadow-inner shrink-0">
                    {viewingSiswa.nama.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{viewingSiswa.nama}</h3>
                  <p className="opacity-90 text-sm flex items-center gap-2 mt-1">
                    <span className="font-mono">{viewingSiswa.nisn}</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">
                      {viewingSiswa.kelas}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSiswa(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              <div>
                <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Data Pribadi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      Jenis Kelamin
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {viewingSiswa.jenisKelamin}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      Tanggal Lahir
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {viewingSiswa.tanggalLahir || '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Agama</p>
                    <p className="text-sm font-bold text-slate-800">
                      {viewingSiswa.agama || '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      No. Handphone
                    </p>
                    <p className="text-sm font-bold text-slate-800 font-mono">
                      {viewingSiswa.noHp || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Status WhatsApp & Pesan Aktivasi
                </h4>
                <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-800">Nomor HP / WhatsApp Orang Tua</p>
                      <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                        {viewingSiswa.noHp || <span className="text-slate-400 italic font-sans font-normal">Belum diisi</span>}
                      </p>
                    </div>
                    <div>
                      {viewingSiswa.waVerified ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-extrabold">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> WhatsApp Terverifikasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-extrabold">
                          <AlertCircle className="w-4 h-4 text-amber-600" /> Belum Terverifikasi
                        </span>
                      )}
                    </div>
                  </div>

                  {viewingSiswa.waLastSentAt && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Terakhir Mengirim Pesan Aktivasi: <strong>{viewingSiswa.waLastSentAt}</strong></span>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-200/60">
                    <button
                      onClick={() => handleSendActivationWA(viewingSiswa, true)}
                      disabled={!viewingSiswa.noHp || !viewingSiswa.noHp.trim()}
                      className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        viewingSiswa.noHp && viewingSiswa.noHp.trim() !== ''
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" /> Kirim Ulang Pesan Aktivasi WA
                    </button>

                    <button
                      onClick={() => handleToggleWaVerified(viewingSiswa)}
                      className="px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      {viewingSiswa.waVerified ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Batalkan Verifikasi</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Tandai Terverifikasi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" /> Data Orang Tua
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Nama Ayah</p>
                    <p className="text-sm font-bold text-slate-800">
                      {viewingSiswa.namaAyah || '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Nama Ibu</p>
                    <p className="text-sm font-bold text-slate-800">
                      {viewingSiswa.namaIbu || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Alamat Lengkap
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 items-start">
                  <User className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {viewingSiswa.alamat || 'Alamat belum diisi.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  const s = viewingSiswa;
                  setViewingSiswa(null);
                  openEditModal(s);
                }}
                className="px-5 py-2.5 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-200 transition flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-4 h-4" /> Edit Data
              </button>
              <button
                onClick={() => setViewingSiswa(null)}
                className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import File Excel / CSV Modal */}
      <ImportSiswaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingSiswa={siswaList}
        onImportSuccess={handleImportSuccess}
        onShowToast={onShowToast}
      />
    </div>
  );
};
