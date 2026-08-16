import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Search, Edit, Trash2, X, UserCheck, Camera, Upload, User as UserIcon, QrCode, Eye, CreditCard } from 'lucide-react';
import { getGuruList, saveGuruList, deleteGuruFromStorage, getKelasList } from '../services/storage';
import { saveGuruToApi, deleteGuruFromApi } from '../services/api';
import { getActivationState, DEMO_LIMITS } from '../services/activation';
import { Guru } from '../types';
import { KartuGuru } from './KartuGuru';

interface DataGuruProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  onOpenActivationModal?: () => void;
}

export const DataGuru: React.FC<DataGuruProps> = ({ onShowToast, onOpenConfirm, onOpenActivationModal }) => {
  const [guruList, setGuruList] = useState<Guru[]>(() => getGuruList());
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [limit, setLimit] = useState<number | 'all'>(10);
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
  const [selectedGuruForKartu, setSelectedGuruForKartu] = useState<Guru | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formFoto, setFormFoto] = useState('');

  const reloadData = () => {
    setGuruList(getGuruList());
    setKelasOptions(getKelasList());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const filteredData = guruList.filter((item) => {
    // Sembunyikan akun developer dari direktori guru & wali kelas
    if (item.username === 'developer') return false;
    if (classFilter && item.kelas !== classFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        (item.username || '').toLowerCase().includes(q) ||
        (item.nama || '').toLowerCase().includes(q) ||
        (item.nip || '').toLowerCase().includes(q) ||
        (item.kelas || item.kelasDiampu || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const numericLimit = limit === 'all' ? filteredData.length || 1 : limit;
  const totalPages = Math.ceil(filteredData.length / numericLimit) || 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * numericLimit;
  const paginatedData = filteredData.slice(startIndex, startIndex + numericLimit);

  const openAddModal = () => {
    setEditingGuru(null);
    setFormUsername('');
    setFormPassword('123456');
    setFormNama('');
    setFormNip('');
    setFormKelas('');
    setFormFoto('');
    setIsModalOpen(true);
  };

  const openEditModal = (g: Guru) => {
    setEditingGuru(g);
    setFormUsername(g.username || '');
    setFormPassword(g.password || '123456');
    setFormNama(g.nama || '');
    setFormNip(g.nip || '');
    setFormKelas(g.kelas || g.kelasDiampu || '');
    setFormFoto(g.foto || '');
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('Ukuran foto maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setFormFoto(base64);
      onShowToast('Foto berhasil diunggah!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveGuru = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = formUsername.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanPassword = formPassword.trim();
    const cleanNama = formNama.trim();
    const cleanNip = formNip.trim().replace(/[^0-9]/g, '');
    const cleanKelas = formKelas.trim();

    if (!cleanUsername || !cleanPassword) {
      onShowToast('Harap isi Username dan Password.', 'error');
      return;
    }

    if (!cleanNama) {
      onShowToast('Harap isi Nama Lengkap & Gelar Guru.', 'error');
      return;
    }

    const updatedGuru: Guru = {
      id: editingGuru ? editingGuru.id || String(Date.now()) : String(Date.now()),
      username: cleanUsername,
      password: cleanPassword,
      nama: cleanNama,
      nip: cleanNip || undefined,
      kelas: cleanKelas || undefined,
      kelasDiampu: cleanKelas || undefined,
      foto: formFoto || undefined,
    };

    let currentList = getGuruList();

    if (editingGuru) {
      const targetUsername = (editingGuru.username || '').toLowerCase();
      if (targetUsername && targetUsername !== cleanUsername) {
        deleteGuruFromApi(targetUsername).catch(() => {});
        if (editingGuru.nip) {
          deleteGuruFromApi(editingGuru.nip).catch(() => {});
        }
      }
      currentList = currentList.map((g) =>
        (g.username || '').toLowerCase() === targetUsername ? updatedGuru : g
      );
      saveGuruList(currentList);
      saveGuruToApi(updatedGuru).catch(() => {});
      onShowToast('Akun guru berhasil diperbarui', 'success');
    } else {
      // Check duplicate username (case-insensitive)
      if (
        currentList.some(
          (g) => (g.username || '').toLowerCase() === cleanUsername.toLowerCase()
        )
      ) {
        onShowToast('Username tersebut sudah digunakan.', 'error');
        return;
      }
      // Check duplicate NIP if NIP is provided
      if (cleanNip) {
        if (currentList.some((g) => g.nip && g.nip.trim() === cleanNip)) {
          onShowToast('NIP tersebut sudah terdaftar.', 'error');
          return;
        }
      }

      currentList.push(updatedGuru);
      saveGuruList(currentList);
      saveGuruToApi(updatedGuru).catch(() => {});
      onShowToast('Akun guru berhasil ditambahkan', 'success');
    }

    setIsModalOpen(false);
    reloadData();
  };

  const handleDeleteGuru = (username: string) => {
    if (username === 'admin' || username === 'developer') {
      onShowToast('Akun utama admin / developer tidak dapat dihapus.', 'error');
      return;
    }

    const guruItem = guruList.find((g) => g.username === username || g.nip === username);
    const targetNip = guruItem?.nip || username;

    onOpenConfirm(
      'Hapus Akun Guru',
      `Hapus akun guru "${username}"? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        await deleteGuruFromStorage(targetNip);
        reloadData();
        onShowToast('Akun guru berhasil dihapus', 'success');
      }
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Manajemen Guru & Wali Kelas</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                reloadData();
                onShowToast('Data guru diperbarui.', 'success');
              }}
              className="bg-white text-slate-600 border border-slate-200 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-slate-50 hover:text-purple-600 transition cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={openAddModal}
              className="bg-purple-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-purple-700 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" /> Tambah Guru
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  const val = e.target.value;
                  setLimit(val === 'all' ? 'all' : parseInt(val));
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">Semua</option>
              </select>
            </div>

            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 w-full sm:w-40 font-bold shadow-xs"
            >
              <option value="">Semua Kelas</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
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
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 p-2"
              placeholder="Cari Username..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
              <tr>
                <th className="p-2 sm:p-3 text-center w-8 sm:w-12">No</th>
                <th className="p-2 sm:p-3 hidden sm:table-cell">Foto</th>
                <th className="p-2 sm:p-3">Nama & NIP</th>
                <th className="p-2 sm:p-3 hidden md:table-cell">Username</th>
                <th className="p-2 sm:p-3 whitespace-nowrap">Wali Kelas</th>
                <th className="p-2 sm:p-3 hidden md:table-cell">Password</th>
                <th className="p-2 sm:p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Data guru tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((guru, idx) => (
                  <tr
                    key={guru.username}
                    className="hover:bg-slate-50 transition border-b border-slate-50 group"
                  >
                    <td className="p-2 sm:p-3 text-center text-slate-500 text-xs sm:text-sm">
                      {startIndex + idx + 1}
                    </td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                        {guru.foto ? (
                          <img
                            src={guru.foto}
                            alt={guru.nama || guru.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="font-bold text-slate-800 text-xs sm:text-sm">
                        {guru.nama || guru.username}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {guru.nip && <span className="text-[10px] text-slate-400 font-mono">NIP: {guru.nip}</span>}
                        <span className="text-[10px] text-slate-400 font-mono md:hidden">@{guru.username}</span>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 hidden md:table-cell font-semibold text-slate-700 text-xs font-mono">{guru.username}</td>
                    <td className="p-2 sm:p-3 text-xs text-slate-600 whitespace-nowrap">
                      {guru.kelas ? (
                        <span className="inline-block whitespace-nowrap bg-purple-100 text-purple-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold border border-purple-200">
                          {guru.kelas}
                        </span>
                      ) : (
                        <span className="inline-block whitespace-nowrap text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] sm:text-xs italic">
                          Guru Umum
                        </span>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 hidden md:table-cell text-sm text-slate-400 font-mono">••••••••</td>
                    <td className="p-2 sm:p-3 text-center">
                      <div className="flex justify-center items-center space-x-1 sm:space-x-1.5">
                        <button
                          onClick={() => setSelectedGuruForKartu(guru)}
                          className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                          title="Lihat Kartu Presensi & Detail Guru"
                        >
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">Kartu</span>
                        </button>
                        <button
                          onClick={() => openEditModal(guru)}
                          className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                          title="Edit Data Guru"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {guru.username !== 'admin' && (
                          <button
                            onClick={() => handleDeleteGuru(guru.username)}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
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

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full overflow-hidden z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-xs">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-xl text-slate-800">
                {editingGuru ? 'Edit Data Guru' : 'Tambah Data Guru'}
              </h3>
            </div>

            <form onSubmit={handleSaveGuru} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center justify-center mb-2">
                <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-purple-200 bg-slate-100 flex items-center justify-center shadow-md">
                  {formFoto ? (
                    <img src={formFoto} alt="Preview Guru" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-slate-400" />
                  )}
                  <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white cursor-pointer">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">Ubah Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {formFoto && (
                  <button
                    type="button"
                    onClick={() => setFormFoto('')}
                    className="text-[11px] text-rose-600 font-semibold hover:underline mt-1 cursor-pointer"
                  >
                    Hapus Foto
                  </button>
                )}
                <p className="text-[10px] text-slate-400 mt-1">Upload Foto Profil Guru (Max 2MB)</p>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                  placeholder="Contoh: Dra. Rahmah, M.Pd."
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  NIP (Opsional)
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-mono text-xs"
                  placeholder="19800101 200501 1 001"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Username Login
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingGuru && editingGuru.username === 'admin'}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                  placeholder="Username"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Password
                </label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-mono"
                  placeholder="Password"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Wali Kelas (Dapat Diisi Manual)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    list="kelas-datalist"
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5 font-bold text-purple-700 placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Ketik manual (misal: X-A, XI IPA 1, XII IPS 2) atau pilih..."
                  />
                  <datalist id="kelas-datalist">
                    {kelasOptions.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormKelas('')}
                      className={`text-[11px] px-2 py-1 rounded-md border font-semibold cursor-pointer transition ${
                        formKelas === ''
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Semua Kelas (Guru Umum)
                    </button>
                    {kelasOptions.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFormKelas(k)}
                        className={`text-[11px] px-2 py-1 rounded-md border font-semibold cursor-pointer transition ${
                          formKelas === k
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Guru/Wali Kelas dapat mengetikkan nama kelas secara manual atau memilih opsi yang tersedia.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kartu Guru Modal */}
      {selectedGuruForKartu && (
        <KartuGuru
          guru={selectedGuruForKartu}
          onClose={() => setSelectedGuruForKartu(null)}
        />
      )}
    </div>
  );
};
