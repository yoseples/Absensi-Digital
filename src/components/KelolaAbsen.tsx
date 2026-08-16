import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Plus, Edit, Trash2, Save, X, MessageSquare, Send, Smartphone, CheckCircle2 } from 'lucide-react';
import { getAppConfig, saveAppConfig, getHariLiburList, saveHariLiburList, deleteHariLiburFromStorage } from '../services/storage';
import { AppConfig, HariLibur } from '../types';

interface KelolaAbsenProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onOpenConfirm: (title: string, msg: string, onConfirm: () => void) => void;
}

export const KelolaAbsen: React.FC<KelolaAbsenProps> = ({ onShowToast, onOpenConfirm }) => {
  const [config, setConfig] = useState<AppConfig>(() => getAppConfig());
  const [liburList, setLiburList] = useState<HariLibur[]>(() => getHariLiburList());

  // Form Hari Libur Baru
  const [newLiburDate, setNewLiburDate] = useState('');
  const [newLiburKet, setNewLiburKet] = useState('');

  // Modal Edit Libur
  const [editingLibur, setEditingLibur] = useState<HariLibur | null>(null);
  const [editLiburDate, setEditLiburDate] = useState('');
  const [editLiburKet, setEditLiburKet] = useState('');

  useEffect(() => {
    const cfg = getAppConfig();
    setConfig(cfg);
    setLiburList(getHariLiburList());
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppConfig(config);
    onShowToast('Pengaturan jam operasional & Nomor WA Pengirim berhasil disimpan!', 'success');
  };

  const handleAddLibur = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiburDate || !newLiburKet.trim()) {
      onShowToast('Harap isi Tanggal dan Keterangan Libur.', 'error');
      return;
    }

    let current = getHariLiburList();
    if (current.some((l) => l.tanggal === newLiburDate)) {
      onShowToast('Jadwal libur untuk tanggal ini sudah ada.', 'error');
      return;
    }

    current.push({ tanggal: newLiburDate, keterangan: newLiburKet.trim() });
    current.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    saveHariLiburList(current);

    setLiburList(current);
    setNewLiburDate('');
    setNewLiburKet('');
    onShowToast('Jadwal hari libur ditambahkan', 'success');
  };

  const handleOpenEditLibur = (l: HariLibur) => {
    setEditingLibur(l);
    setEditLiburDate(l.tanggal);
    setEditLiburKet(l.keterangan);
  };

  const handleSaveEditLibur = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLibur) return;

    let current = getHariLiburList();
    current = current.map((l) =>
      l.tanggal === editingLibur.tanggal
        ? { tanggal: editLiburDate, keterangan: editLiburKet.trim() }
        : l
    );

    saveHariLiburList(current);
    setLiburList(current);
    setEditingLibur(null);
    onShowToast('Hari libur berhasil diperbarui', 'success');
  };

  const handleDeleteLibur = (tanggal: string) => {
    onOpenConfirm(
      'Hapus Hari Libur',
      `Hapus jadwal libur pada tanggal ${tanggal}? Siswa akan dapat melakukan absensi pada tanggal tersebut.`,
      async () => {
        await deleteHariLiburFromStorage(tanggal);
        setLiburList(getHariLiburList());
        onShowToast('Jadwal libur berhasil dihapus', 'success');
      }
    );
  };

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Config Jam */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden sticky top-24">
            <div className="p-5 border-b border-slate-100 bg-indigo-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Pengaturan Waktu</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Konfigurasi jam operasional absensi sekolah.
              </p>
            </div>

            <div className="p-5">
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                    Absen Datang
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mulai Buka
                      </label>
                      <input
                        type="time"
                        required
                        value={config.jam_masuk_mulai}
                        onChange={(e) =>
                          setConfig({ ...config, jam_masuk_mulai: e.target.value })
                        }
                        className="w-full border-slate-300 rounded-lg text-xs p-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Batas Terlambat
                      </label>
                      <input
                        type="time"
                        required
                        value={config.jam_masuk_akhir}
                        onChange={(e) =>
                          setConfig({ ...config, jam_masuk_akhir: e.target.value })
                        }
                        className="w-full border-slate-300 rounded-lg text-xs p-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2">
                    * Lewat batas ini status otomatis: <b>Terlambat</b>
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                    Absen Pulang
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mulai Buka
                      </label>
                      <input
                        type="time"
                        required
                        value={config.jam_pulang_mulai}
                        onChange={(e) =>
                          setConfig({ ...config, jam_pulang_mulai: e.target.value })
                        }
                        className="w-full border-slate-300 rounded-lg text-xs p-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tutup Absen
                      </label>
                      <input
                        type="time"
                        required
                        value={config.jam_pulang_akhir}
                        onChange={(e) =>
                          setConfig({ ...config, jam_pulang_akhir: e.target.value })
                        }
                        className="w-full border-slate-300 rounded-lg text-xs p-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2">
                    * Pulang sebelum dibuka: <b>Pulang Cepat</b>
                  </p>
                </div>

                {/* Nomor WA Pengirim (WA Gateway Rules Admin & Dev) */}
                <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Nomor WA Pengirim Otomatis (Gateway)
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Aktif
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nomor WhatsApp Pengirim / Bot Gateway *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 081234567890"
                      value={config.no_whatsapp_pengirim || ''}
                      onChange={(e) =>
                        setConfig({ ...config, no_whatsapp_pengirim: e.target.value })
                      }
                      className="w-full border-emerald-300 bg-white rounded-lg text-xs p-2.5 font-mono focus:ring-emerald-500 focus:border-emerald-500 font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-800 leading-relaxed">
                    * Nomor WA resmi pengirim pesan otomatis untuk notifikasi presensi siswa ke HP orang tua/wali.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      const senderPhone = (config.no_whatsapp_pengirim || '081234567890').replace(/\D/g, '');
                      const formatted = senderPhone.startsWith('0') ? '62' + senderPhone.slice(1) : senderPhone;
                      const msg = encodeURIComponent(`[UJI COBA WA GATEWAY - ${config.nama_sekolah || 'SEKOLAH'}]\nSistem Absensi Otomatis WhatsApp siap digunakan dengan nomor pengirim resmi: ${config.no_whatsapp_pengirim || '081234567890'}.`);
                      window.open(`https://api.whatsapp.com/send?phone=${formatted}&text=${msg}`, '_blank');
                      onShowToast('Membuka tautan uji coba WhatsApp pengirim...', 'success');
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Tes Kirim Pesan WA Pengirim</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Simpan Pengaturan
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Col: Daftar Hari Libur */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-end">
              <div>
                <h3 className="font-bold text-slate-800">Daftar Hari Libur</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Siswa tidak dapat absen pada tanggal yang ditandai libur.
                </p>
              </div>
            </div>

            {/* Form Tambah Libur */}
            <div className="p-5 border-b border-slate-100">
              <form onSubmit={handleAddLibur} className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={newLiburDate}
                    onChange={(e) => setNewLiburDate(e.target.value)}
                    className="w-full border-slate-300 rounded-lg text-sm p-2.5"
                  />
                </div>
                <div className="flex-[2] w-full">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Maulid Nabi / Cuti Bersama"
                    value={newLiburKet}
                    onChange={(e) => setNewLiburKet(e.target.value)}
                    className="w-full border-slate-300 rounded-lg text-sm p-2.5"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition w-full md:w-auto flex items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Tambah
                </button>
              </form>
            </div>

            {/* Table Hari Libur */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="p-4 w-12 text-center">No</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Keterangan</th>
                    <th className="p-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {liburList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                        Belum ada jadwal hari libur.
                      </td>
                    </tr>
                  ) : (
                    liburList.map((item, idx) => (
                      <tr key={item.tanggal} className="hover:bg-slate-50 border-b border-slate-50 transition group">
                        <td className="p-4 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-4 font-mono font-medium text-indigo-700">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', options)}
                        </td>
                        <td className="p-4 font-bold text-slate-700">{item.keterangan}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleOpenEditLibur(item)}
                              className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLibur(item.tanggal)}
                              className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Holiday Modal */}
      {editingLibur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingLibur(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full overflow-hidden z-10 animate-fade-in">
            <button
              onClick={() => setEditingLibur(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-xs">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-xl text-slate-800">Edit Hari Libur</h3>
            </div>

            <form onSubmit={handleSaveEditLibur} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Tanggal
                </label>
                <input
                  type="date"
                  required
                  value={editLiburDate}
                  onChange={(e) => setEditLiburDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">
                  Keterangan
                </label>
                <input
                  type="text"
                  required
                  value={editLiburKet}
                  onChange={(e) => setEditLiburKet(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingLibur(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
