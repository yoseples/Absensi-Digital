import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, FileSpreadsheet, ChevronDown, FileText, MessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getMonitoringRealtimeData,
  saveAbsensiList,
  getAbsensiList,
  getTodayDateString,
  getSiswaList,
  generateWhatsAppNotificationLink,
  getAppConfig,
} from '../services/storage';
import { UserSession, AbsensiRecord } from '../types';

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

interface MonitoringRealtimeProps {
  currentUser: UserSession;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const MonitoringRealtime: React.FC<MonitoringRealtimeProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [data, setData] = useState<AbsensiRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState<number | 'all'>(10);
  const [page, setPage] = useState(1);

  const filterKelas = currentUser.role === 'guru' ? currentUser.kelas : null;

  const reloadData = () => {
    const list = getMonitoringRealtimeData(filterKelas);
    setData(list);
  };

  useEffect(() => {
    reloadData();
  }, [currentUser.role, currentUser.kelas]);

  const filteredData = data.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (item.nama || '').toLowerCase().includes(q);
      const nisnMatch = (item.nisn || '').includes(q);
      const classMatch = (item.kelas || '').toLowerCase().includes(q);
      return nameMatch || nisnMatch || classMatch;
    }
    return true;
  });

  const numericLimit = limit === 'all' ? filteredData.length || 1 : limit;
  const totalPages = Math.ceil(filteredData.length / numericLimit) || 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * numericLimit;
  const paginatedData = filteredData.slice(startIndex, startIndex + numericLimit);

  const handleStatusChange = (
    nisn: string,
    nama: string,
    kelas: string,
    newStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Belum Absen'
  ) => {
    const today = getTodayDateString();
    const cleanNisn = nisn.replace(/^'/, '');
    let allAbs = getAbsensiList();

    let record = allAbs.find((a) => a.tanggal === today && a.nisn.replace(/^'/, '') === cleanNisn);

    if (record) {
      record.status = newStatus;
      if (newStatus === 'Belum Absen') {
        record.jamDatang = '--:--';
        record.jamPulang = '--:--';
        record.keterangan = 'Belum Melakukan Scan';
      }
      const idx = allAbs.findIndex((a) => a.id === record!.id);
      if (idx !== -1) allAbs[idx] = record;
    } else {
      record = {
        id: `att_${today}_${cleanNisn}`,
        nisn,
        nama,
        kelas,
        tanggal: today,
        jamDatang: '--:--',
        jamPulang: '--:--',
        status: newStatus,
        keterangan: newStatus === 'Belum Absen' ? 'Belum Melakukan Scan' : 'Diubah Manual Guru',
      };
      allAbs.push(record);
    }

    saveAbsensiList(allAbs);
    reloadData();
    onShowToast(`Status ${nama} diubah menjadi ${newStatus}`, 'success');
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      onShowToast('Tidak ada data monitoring untuk di-export.', 'error');
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
      'Keterangan Waktu': d.keterangan || '-',
      Status: d.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring Realtime');

    const fileName = `Monitoring_Absensi_${getTodayDateString()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onShowToast('File Excel monitoring berhasil diunduh!', 'success');
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) {
      onShowToast('Tidak ada data monitoring untuk di-export ke PDF.', 'error');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const todayStr = getTodayDateString();

      // Kop Surat Resmi SMA NEGERI
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PEMERINTAH PROVINSI ACEH', pageWidth / 2, 14, { align: 'center' });
      doc.text('DINAS PENDIDIKAN', pageWidth / 2, 19, { align: 'center' });

      doc.setFontSize(15);
      doc.text('SMA NEGERI', pageWidth / 2, 26, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(
        'Jl. Medan - Banda Aceh, Lhoksukon, Kabupaten Aceh Utara, Aceh 24382',
        pageWidth / 2,
        31,
        { align: 'center' }
      );
      doc.text('Website: sman1lhoksukon.sch.id | Email: info@sman1lhoksukon.sch.id', pageWidth / 2, 35, {
        align: 'center',
      });

      // Divider Line
      doc.setLineWidth(0.8);
      doc.line(14, 38, pageWidth - 14, 38);
      doc.setLineWidth(0.2);
      doc.line(14, 39.5, pageWidth - 14, 39.5);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('LAPORAN MONITORING PRESENSI HARIAN', pageWidth / 2, 47, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const filterLabel = filterKelas ? `Kelas: ${filterKelas}` : 'Semua Kelas';
      doc.text(`Tanggal: ${formatDateIndo(todayStr)}   |   ${filterLabel}`, pageWidth / 2, 53, {
        align: 'center',
      });

      // Stats Box
      const totalHadir = filteredData.filter((d) => d.status === 'Hadir').length;
      const totalIzin = filteredData.filter((d) => d.status === 'Izin').length;
      const totalSakit = filteredData.filter((d) => d.status === 'Sakit').length;
      const totalAlpa = filteredData.filter((d) => d.status === 'Alpa').length;
      const totalBelum = filteredData.filter((d) => d.status === 'Belum Absen').length;
      const totalData = filteredData.length;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 57, pageWidth - 28, 12, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${totalData}`, 16, 64.5);
      doc.text(`Hadir: ${totalHadir}`, 48, 64.5);
      doc.text(`Izin: ${totalIzin}`, 80, 64.5);
      doc.text(`Sakit: ${totalSakit}`, 110, 64.5);
      doc.text(`Alpa: ${totalAlpa}`, 140, 64.5);
      doc.text(`Belum: ${totalBelum}`, 168, 64.5);

      // Table
      const tableHead = [
        ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Status', 'Keterangan'],
      ];

      const tableData = filteredData.map((d, index) => [
        index + 1,
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
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left' },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 20 },
          7: { halign: 'left', cellWidth: 28 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // Signature
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      let signatureY = finalY + 12;

      if (signatureY + 35 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        signatureY = 25;
      }

      const todayIndo = formatDateIndo(todayStr);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      doc.text('Mengetahui,', 20, signatureY);
      doc.text('Kepala SMA NEGERI,', 20, signatureY + 5);
      doc.line(20, signatureY + 25, 75, signatureY + 25);
      doc.setFont('helvetica', 'bold');
      doc.text('NIP. .....................................', 20, signatureY + 30);

      doc.setFont('helvetica', 'normal');
      doc.text(`Lhoksukon, ${todayIndo}`, pageWidth - 20, signatureY, { align: 'right' });
      doc.text('Guru Wali Kelas / Pembina,', pageWidth - 20, signatureY + 5, { align: 'right' });
      doc.line(pageWidth - 75, signatureY + 25, pageWidth - 20, signatureY + 25);
      doc.setFont('helvetica', 'bold');
      doc.text('NIP. .....................................', pageWidth - 20, signatureY + 30, { align: 'right' });

      doc.save(`Monitoring_Absensi_${todayStr}.pdf`);
      onShowToast('Laporan PDF Monitoring berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      onShowToast(`Gagal membuat PDF: ${err?.message || 'Error'}`, 'error');
    }
  };

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const currentDateStr = new Date().toLocaleDateString('id-ID', options);

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
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-slate-50/30">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-0.5">Monitoring Kehadiran</h3>
            <p className="text-xs text-slate-500 font-medium">
              Data Realtime: <span className="text-indigo-600 font-bold">{currentDateStr}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-700 transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Export ke File Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              onClick={exportToPDF}
              className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-rose-700 transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Unduh Laporan PDF"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={() => {
                reloadData();
                onShowToast('Data monitoring diperbarui.', 'success');
              }}
              className="bg-white text-slate-600 border border-slate-200 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold shadow-xs hover:bg-slate-50 hover:text-indigo-600 transition cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 font-bold hidden sm:inline">Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  const val = e.target.value;
                  setLimit(val === 'all' ? 'all' : parseInt(val));
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 w-full sm:w-auto"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">Semua</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 font-bold w-full sm:w-auto shadow-xs"
            >
              <option value="">Semua Status</option>
              <option value="Hadir">Hadir (Hijau)</option>
              <option value="Sakit">Sakit (Kuning)</option>
              <option value="Izin">Izin (Biru)</option>
              <option value="Alpa">Alpa (Merah)</option>
              <option value="Belum Absen">Belum Absen (Abu)</option>
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
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg block w-full pl-9 p-2 transition-all"
              placeholder="Cari Nama / Kelas..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold">
              <tr>
                <th className="p-2.5 sm:p-4 text-center w-8 sm:w-12">No</th>
                <th className="p-2.5 sm:p-4 whitespace-nowrap">Siswa</th>
                <th className="p-2.5 sm:p-4 text-center whitespace-nowrap">Kelas</th>
                <th className="p-2.5 sm:p-4 text-center whitespace-nowrap">Jam Datang</th>
                <th className="p-2.5 sm:p-4 text-center whitespace-nowrap">Jam Pulang</th>
                <th className="p-2.5 sm:p-4 text-center whitespace-nowrap">Keterangan Waktu</th>
                <th className="p-2.5 sm:p-4 text-center whitespace-nowrap">Status Kehadiran</th>
                <th className="p-2.5 sm:p-4 text-center whitespace-nowrap">Notif WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 sm:p-12 text-center text-slate-400 italic bg-white">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                (() => {
                  const allSiswaList = getSiswaList();
                  const appCfg = getAppConfig();
                  return paginatedData.map((d, idx) => {
                    let ketStyle = 'text-slate-400 font-mono text-[11px]';
                    const ketText = d.keterangan || '-';

                    if (ketText.includes('Terlambat')) {
                      ketStyle =
                        'text-rose-600 font-bold bg-rose-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-rose-100 text-[10px]';
                    } else if (ketText.includes('Pulang Cepat')) {
                      ketStyle =
                        'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-amber-100 text-[10px]';
                    } else if (ketText === 'Tepat Waktu') {
                      ketStyle = 'text-emerald-600 font-bold text-[10px]';
                    }

                    return (
                      <tr key={d.nisn} className="hover:bg-slate-50 border-b border-slate-50 transition group">
                        <td className="p-2.5 sm:p-4 text-center text-slate-400 text-xs">
                          {startIndex + idx + 1}
                        </td>

                        <td className="p-2.5 sm:p-4">
                          <div className="font-bold text-xs sm:text-sm text-slate-900">{d.nama}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 font-mono">{d.nisn}</div>
                        </td>

                        <td className="p-2.5 sm:p-4 text-center whitespace-nowrap">
                          <span className="inline-block whitespace-nowrap bg-indigo-50 text-indigo-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold border border-indigo-100">
                            {d.kelas}
                          </span>
                        </td>

                        <td className="p-4 text-center text-xs font-mono text-slate-600">
                          {d.jamDatang || '--:--'}
                        </td>

                        <td className="p-4 text-center text-xs font-mono text-slate-600">
                          {d.jamPulang || '--:--'}
                        </td>

                        <td className="p-4 text-center align-middle">
                          <span className={`${ketStyle} inline-block whitespace-nowrap`}>
                            {ketText}
                          </span>
                        </td>

                        <td className="p-4 text-center relative">
                          <div className="relative inline-block">
                            <select
                              value={d.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  d.nisn,
                                  d.nama,
                                  d.kelas,
                                  e.target.value as any
                                )
                              }
                              className={`text-xs font-bold py-1.5 px-3 rounded-lg border-0 focus:ring-2 focus:ring-indigo-500 shadow-xs appearance-none text-center pr-7 ${getStatusColor(
                                d.status
                              )} cursor-pointer`}
                            >
                              <option value="Belum Absen">Belum Absen</option>
                              <option value="Hadir">Hadir</option>
                              <option value="Izin">Izin</option>
                              <option value="Sakit">Sakit</option>
                              <option value="Alpa">Alpa</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                          </div>
                        </td>

                        <td className="p-4 text-center whitespace-nowrap">
                          {(() => {
                            const student = allSiswaList.find(
                              (s) => s.nisn.replace(/^'/, '') === d.nisn.replace(/^'/, '')
                            );
                            if (!student || !student.noHp || d.status === 'Belum Absen') {
                              return <span className="text-[10px] text-slate-300 italic">-</span>;
                            }
                            const waType = (ketText.includes('Terlambat') ? 'Terlambat' : d.status) as any;
                            const waInfo = generateWhatsAppNotificationLink(
                              student,
                              waType,
                              d.jamDatang !== '--:--' ? d.jamDatang : undefined,
                              d.keterangan,
                              appCfg.nama_sekolah,
                              d.tanggal
                            );
                            if (!waInfo) return <span className="text-[10px] text-slate-300 italic">-</span>;

                            return (
                              <a
                                href={waInfo.waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                title={`Kirim pesan WA ke Orang Tua (${student.nama})`}
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Kirim WA</span>
                              </a>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500">
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
    </div>
  );
};
