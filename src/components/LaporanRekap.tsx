import React, { useState, useEffect } from 'react';
import { Search, FileSpreadsheet, Calendar, Filter, Loader2, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAbsensiReport, getKelasList, getTodayDateString, getAppConfig } from '../services/storage';
import { AbsensiRecord } from '../types';

interface LaporanRekapProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = months[parseInt(parts[1], 10) - 1] || parts[1];
    const day = parseInt(parts[2], 10);
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

export const LaporanRekap: React.FC<LaporanRekapProps> = ({ onShowToast }) => {
  const today = getTodayDateString();
  const [fStart, setFStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [fEnd, setFEnd] = useState(today);
  const [fKelas, setFKelas] = useState('');
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);

  const [reportData, setReportData] = useState<AbsensiRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState<number | 'all'>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setKelasOptions(getKelasList());
  }, []);

  const handleApplyFilter = () => {
    if (!fStart || !fEnd) {
      onShowToast('Pilih tanggal mulai dan tanggal akhir.', 'error');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    setTimeout(() => {
      const records = getAbsensiReport({
        tanggalMulai: fStart,
        tanggalAkhir: fEnd,
        kelas: fKelas,
      });
      setReportData(records);
      setLoading(false);
      setPage(1);
    }, 300);
  };

  const filteredData = reportData.filter((item) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        (item.nama || '').toLowerCase().includes(q) ||
        (item.nisn || '').includes(q) ||
        (item.kelas || '').toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const numericLimit = limit === 'all' ? filteredData.length || 1 : limit;
  const totalPages = Math.ceil(filteredData.length / numericLimit) || 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * numericLimit;
  const paginatedData = filteredData.slice(startIndex, startIndex + numericLimit);

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      onShowToast('Tidak ada data rekap untuk di-export.', 'error');
      return;
    }

    const exportRows = filteredData.map((d, idx) => ({
      No: idx + 1,
      Tanggal: d.tanggal,
      NISN: d.nisn,
      Nama: d.nama,
      Kelas: d.kelas,
      'Jam Datang': d.jamDatang || '--:--',
      'Jam Pulang': d.jamPulang || '--:--',
      Keterangan: d.keterangan || '-',
      Status: d.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Kehadiran');

    const fileName = `Laporan_Absensi_${fStart}_s-d_${fEnd}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onShowToast('File Excel Laporan berhasil diunduh!', 'success');
  };

  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      onShowToast('Tidak ada data rekap untuk di-export ke PDF.', 'error');
      return;
    }

    try {
      const cfg = getAppConfig();
      const schoolName = cfg.nama_sekolah || 'SMA NEGERI';
      const address = cfg.alamat_sekolah || 'Jl. Perintis Kemerdekaan No. 1, Lhoksukon, Aceh Utara';
      const email = cfg.email_sekolah || 'info@sman1lhoksukon.sch.id';
      const headmaster = cfg.nama_kepala_sekolah || 'Drs. H. Azhari, M.Pd.';
      const nipHeadmaster = cfg.nip_kepala_sekolah || '19680512 199403 1 004';

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // 1. Kop Surat Resmi Sekolah
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PEMERINTAH PROVINSI / DINAS PENDIDIKAN', pageWidth / 2, 14, { align: 'center' });

      doc.setFontSize(14);
      doc.text(schoolName.toUpperCase(), pageWidth / 2, 22, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(address, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Email: ${email} | Tahun Ajaran: ${cfg.tahun_ajaran || '2025/2026'} (${cfg.semester_aktif || 'Ganjil'})`, pageWidth / 2, 33, {
        align: 'center',
      });

      // Garis Pembatas Kop Surat
      doc.setLineWidth(0.8);
      doc.line(14, 37, pageWidth - 14, 37);
      doc.setLineWidth(0.2);
      doc.line(14, 38.5, pageWidth - 14, 38.5);

      // 2. Judul Laporan & Informasi Filter
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('LAPORAN REKAPITULASI KEHADIRAN SISWA', pageWidth / 2, 47, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const strPeriode = `Periode: ${formatDateIndo(fStart)} s/d ${formatDateIndo(fEnd)}`;
      const strKelas = fKelas ? `Kelas: ${fKelas}` : 'Kelas: Semua Kelas';
      doc.text(`${strPeriode}   |   ${strKelas}`, pageWidth / 2, 53, { align: 'center' });

      // Ringkasan Statistik
      const totalHadir = filteredData.filter((d) => d.status === 'Hadir').length;
      const totalIzin = filteredData.filter((d) => d.status === 'Izin').length;
      const totalSakit = filteredData.filter((d) => d.status === 'Sakit').length;
      const totalAlpa = filteredData.filter((d) => d.status === 'Alpa').length;
      const totalData = filteredData.length;
      const persenHadir = totalData > 0 ? Math.round((totalHadir / totalData) * 100) : 0;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 57, pageWidth - 28, 12, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Data: ${totalData}`, 18, 64.5);
      doc.text(`Hadir: ${totalHadir} (${persenHadir}%)`, 60, 64.5);
      doc.text(`Izin: ${totalIzin}`, 108, 64.5);
      doc.text(`Sakit: ${totalSakit}`, 138, 64.5);
      doc.text(`Alpa: ${totalAlpa}`, 168, 64.5);

      // 3. Tabel Data Absensi
      const tableHead = [
        ['No', 'Tanggal', 'NISN', 'Nama Siswa', 'Kelas', 'Datang', 'Pulang', 'Status', 'Keterangan'],
      ];

      const tableData = filteredData.map((d, index) => [
        index + 1,
        d.tanggal,
        d.nisn,
        d.nama,
        d.kelas,
        d.jamDatang || '--:--',
        d.jamPulang || '--:--',
        d.status,
        d.keterangan || '-',
      ]);

      autoTable(doc, {
        startY: 72,
        head: tableHead,
        body: tableData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.5,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [30, 41, 59], // Slate 800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 22 },
          2: { halign: 'center', cellWidth: 24 },
          3: { halign: 'left' },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 16 },
          6: { halign: 'center', cellWidth: 16 },
          7: { halign: 'center', cellWidth: 18 },
          8: { halign: 'left', cellWidth: 24 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 7) {
            const val = String(data.cell.raw);
            if (val === 'Hadir') {
              data.cell.styles.textColor = [16, 185, 129];
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Izin') {
              data.cell.styles.textColor = [37, 99, 235];
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Sakit') {
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Alpa') {
              data.cell.styles.textColor = [225, 29, 72];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      // 4. Lembar Pengesahan Tanda Tangan
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      let signatureY = finalY + 12;

      if (signatureY + 35 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        signatureY = 25;
      }

      const todayIndo = formatDateIndo(getTodayDateString());

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Kiri: Kepala Sekolah
      doc.text('Mengetahui,', 20, signatureY);
      doc.text(`Kepala Sekolah,`, 20, signatureY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(headmaster, 20, signatureY + 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`NIP. ${nipHeadmaster}`, 20, signatureY + 28);

      // Kanan: Wali Kelas / Guru
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${todayIndo}`, pageWidth - 20, signatureY, { align: 'right' });
      doc.text('Guru Wali Kelas / Pembina,', pageWidth - 20, signatureY + 5, { align: 'right' });
      doc.line(pageWidth - 75, signatureY + 23, pageWidth - 20, signatureY + 23);
      doc.setFont('helvetica', 'bold');
      doc.text('NIP. .....................................', pageWidth - 20, signatureY + 28, { align: 'right' });

      // Simpan File PDF
      const fileName = `Laporan_Absensi_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${fStart}_sd_${fEnd}.pdf`;
      doc.save(fileName);
      onShowToast('Laporan PDF berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      onShowToast(`Gagal membuat PDF: ${err?.message || 'Error tidak diketahui'}`, 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hadir':
        return 'bg-emerald-100 text-emerald-700';
      case 'Izin':
        return 'bg-blue-100 text-blue-700';
      case 'Sakit':
        return 'bg-amber-100 text-amber-700';
      case 'Alpa':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-slate-800">Laporan Kehadiran Siswa</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekap data absensi siswa berdasarkan periode tanggal dan kelas.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={fStart}
                onChange={(e) => setFStart(e.target.value)}
                className="w-full border-slate-300 rounded-lg text-xs p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={fEnd}
                onChange={(e) => setFEnd(e.target.value)}
                className="w-full border-slate-300 rounded-lg text-xs p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Filter Kelas
              </label>
              <select
                value={fKelas}
                onChange={(e) => setFKelas(e.target.value)}
                className="w-full border-slate-300 rounded-lg text-xs p-2.5 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">Semua Kelas</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
              <button
                onClick={handleApplyFilter}
                className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs shadow-xs hover:bg-indigo-700 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 shrink-0" /> Cari Data
              </button>

              <button
                onClick={handleExportExcel}
                className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs shadow-xs hover:bg-emerald-700 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                title="Export ke File Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" /> Export Excel
              </button>

              <button
                onClick={handleExportPDF}
                className="flex-1 sm:flex-none bg-rose-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs shadow-xs hover:bg-rose-700 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                title="Unduh Laporan Format PDF untuk Dicetak"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" /> Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* State Content */}
        {!hasSearched ? (
          <div className="text-center p-16 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mb-4 text-4xl">
              <Calendar className="w-10 h-10" />
            </div>
            <h4 className="font-bold text-slate-800 text-lg">Menunggu Filter</h4>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
              Silakan pilih rentang tanggal mulai dan akhir, lalu klik tombol <b>Cari Data</b>.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center p-16 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h4 className="font-bold text-slate-800">Sedang Memproses...</h4>
            <p className="text-slate-500 text-xs mt-1">Mengambil data absensi</p>
          </div>
        ) : (
          <div>
            {/* Table Filter Controls */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold">Tampilkan</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLimit(val === 'all' ? 'all' : parseInt(val));
                    setPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="all">Semua</option>
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
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg block w-full pl-9 p-2"
                  placeholder="Cari Siswa / Kelas..."
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="p-4 text-center w-12">No</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Nama Siswa</th>
                    <th className="p-4 text-center">Kelas</th>
                    <th className="p-4 text-center">Jam Datang</th>
                    <th className="p-4 text-center">Jam Pulang</th>
                    <th className="p-4 text-center">Keterangan</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-sm">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                        Tidak ada data rekap ditemukan untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((d, idx) => (
                      <tr key={`${d.id}_${idx}`} className="hover:bg-slate-50 border-b border-slate-50 transition">
                        <td className="p-4 text-center text-slate-500 text-xs">
                          {startIndex + idx + 1}
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600 font-mono">
                          {d.tanggal}
                        </td>
                        <td className="p-4 font-bold text-slate-900 text-sm">{d.nama}</td>
                        <td className="p-4 text-center">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700">
                            {d.kelas}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs font-mono text-slate-600">
                          {d.jamDatang || '--:--'}
                        </td>
                        <td className="p-4 text-center text-xs font-mono text-slate-600">
                          {d.jamPulang || '--:--'}
                        </td>
                        <td className="p-4 text-center text-xs text-slate-500 font-medium">
                          {d.keterangan || '-'}
                        </td>
                        <td className="p-4 text-center text-xs">
                          <span className={`${getStatusColor(d.status)} px-2.5 py-1 rounded-md font-bold`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500">
              <span>
                Menampilkan {filteredData.length > 0 ? startIndex + 1 : 0} -{' '}
                {Math.min(startIndex + numericLimit, filteredData.length)} dari{' '}
                {filteredData.length} data
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
        )}
      </div>
    </div>
  );
};
