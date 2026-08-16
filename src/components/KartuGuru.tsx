import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, ShieldCheck, UserCheck, MapPin, Clock, Award, QrCode, FileImage, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { captureCanvas } from '../utils/html2canvasHelper';
import { Guru, AbsensiGuruRecord } from '../types';
import { getAppLogo, getSchoolName, getAbsensiGuruTodayForUser } from '../services/storage';

interface KartuGuruProps {
  guru: Guru;
  onClose: () => void;
}

export const KartuGuru: React.FC<KartuGuruProps> = ({ guru, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'kartu' | 'detail'>('kartu');
  const [attRecord, setAttRecord] = useState<AbsensiGuruRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const record = getAbsensiGuruTodayForUser(guru.username);
    setAttRecord(record);
  }, [guru.username]);

  useEffect(() => {
    if (canvasRef.current && activeTab === 'kartu') {
      const qrData = JSON.stringify({
        type: 'guru',
        username: guru.username,
        nip: guru.nip || '-',
        nama: guru.nama || guru.username,
      });

      QRCode.toCanvas(
        canvasRef.current,
        qrData,
        {
          width: 160,
          margin: 1,
          color: {
            dark: '#1e1b4b',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code for guru:', error);
        }
      );
    }
  }, [guru, activeTab]);

  const fileNameBase = `Kartu_Guru_${(guru.nama || guru.username).replace(/\s+/g, '_')}_${guru.nip || guru.username}`;

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await captureCanvas(cardRef.current);
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? 'png' : 'jpg';

      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${fileNameBase}.${ext}`;
              document.body.appendChild(link);
              link.click();
              setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }, 1000);
            } else {
              const image = canvas.toDataURL(mimeType, 0.95);
              const link = document.createElement('a');
              link.href = image;
              link.download = `${fileNameBase}.${ext}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
            setIsExporting(false);
          },
          mimeType,
          0.95
        );
      } else {
        const image = canvas.toDataURL(mimeType, 0.95);
        const link = document.createElement('a');
        link.href = image;
        link.download = `${fileNameBase}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(false);
      }
    } catch (err) {
      console.error('Error exporting image:', err);
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await captureCanvas(cardRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [90, 150],
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileNameBase}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md relative my-8 border border-slate-100">
        {/* Toggle Bar */}
        <div className="bg-slate-900 p-2 flex justify-between items-center border-b border-slate-800">
          <div className="flex bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('kartu')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'kartu'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> Kartu Guru (ID Card)
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'detail'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Detail Profil
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeTab === 'kartu' ? (
          /* TAB 1: KARTU IDENTITAS GURU */
          <div className="p-0">
            {/* Printable & Exportable Container */}
            <div ref={cardRef} className="bg-white">
              {/* Header banner */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white text-center relative overflow-hidden flex flex-col items-center border-b-4 border-amber-400">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/20 shadow-md mb-2 flex items-center justify-center">
                  <img
                    src={getAppLogo()}
                    alt="Logo Sekolah"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain filter drop-shadow-sm"
                  />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 mb-1">
                  KARTU IDENTITAS DEWAN GURU
                </span>
                <h2 className="text-xl font-black tracking-tight">KARTU PRESENSI GURU</h2>
                <p className="text-[11px] tracking-wider uppercase opacity-90 font-bold text-indigo-200">
                  {getSchoolName()}
                </p>
              </div>

              {/* Card Body */}
              <div className="p-6 text-center bg-slate-50 relative">
                {/* Photo & QR flex row */}
                <div className="flex justify-center items-center gap-4 mb-4">
                  {/* Photo */}
                  <div className="w-24 h-30 bg-white rounded-xl shadow-md border-2 border-purple-300 overflow-hidden flex items-center justify-center shrink-0 relative">
                    {guru.foto ? (
                      <img
                        src={guru.foto}
                        alt={guru.nama || guru.username}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 text-indigo-500 flex flex-col items-center justify-center font-bold text-xs p-1">
                        <span className="text-3xl font-black">{guru.username.charAt(0).toUpperCase()}</span>
                        <span className="text-[9px] uppercase mt-1 text-slate-400">Pas Foto</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-purple-900/80 text-white text-[8px] font-bold py-0.5 text-center">
                      GURU RESMI
                    </div>
                  </div>

                  {/* QR Code Canvas */}
                  <div className="bg-white p-2.5 rounded-2xl shadow-md border border-slate-200 shrink-0 flex flex-col items-center">
                    <canvas ref={canvasRef} className="rounded-lg" />
                    <span className="text-[9px] font-mono text-slate-400 mt-1 font-bold">QR VERIFIKASI</span>
                  </div>
                </div>

                <h3 className="text-lg font-black text-slate-900 mb-1 leading-snug">
                  {guru.nama || guru.username}
                </h3>

                <p className="text-purple-700 font-mono font-bold text-xs mb-3 tracking-wider bg-purple-50 inline-block px-3 py-1 rounded-full border border-purple-200">
                  NIP: {guru.nip || '-'}
                </p>

                <div>
                  {guru.kelas ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-100 text-amber-900 rounded-full text-xs font-black shadow-2xs border border-amber-300">
                      <Award className="w-3.5 h-3.5 text-amber-600" /> WALI KELAS {guru.kelas}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-200 text-slate-700 rounded-full text-xs font-bold shadow-2xs">
                      GURU MATA PELAJARAN / PENGAMPU
                    </div>
                  )}
                </div>

                {/* Watermark badge */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <ShieldCheck className="w-3.5 h-3.5" /> Terverifikasi Sistem Presensi GPS
                  </span>
                  <span className="font-mono">VER-GURU-2026</span>
                </div>
              </div>
            </div>

            {/* Download & Export Toolbar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider px-1">
                <span>Opsi Unduh & Cetak Kartu</span>
                {isExporting && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Memproses...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExportImage('png')}
                  disabled={isExporting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <FileImage className="w-3.5 h-3.5" /> PNG
                </button>
                <button
                  onClick={() => handleExportImage('jpeg')}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <FileImage className="w-3.5 h-3.5" /> JPEG
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="bg-rose-600 hover:bg-rose-500 text-white py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => window.print()}
                  disabled={isExporting}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Langsung
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 border border-slate-700 text-slate-300 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Tutup
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: DETAIL PROFIL & STATUS HARI INI */
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-300 overflow-hidden shrink-0 flex items-center justify-center">
                {guru.foto ? (
                  <img src={guru.foto} alt={guru.nama} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-purple-700 text-xl">
                    {guru.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">{guru.nama || guru.username}</h3>
                <p className="text-xs font-mono text-slate-500">NIP: {guru.nip || '-'}</p>
                <p className="text-xs text-purple-700 font-bold mt-0.5">
                  {guru.kelas ? `Wali Kelas ${guru.kelas}` : 'Guru Mata Pelajaran'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] border-b pb-1">
                Informasi Akun & Tugas
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">USERNAME LOGIN</span>
                  <span className="font-mono font-bold text-slate-800">{guru.username}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">STATUS JABATAN</span>
                  <span className="font-bold text-slate-800">
                    {guru.kelas ? `Wali Kelas ${guru.kelas}` : 'Guru Pengampu'}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Today Card */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] border-b pb-1">
                Status Presensi Hari Ini
              </h4>

              {attRecord ? (
                <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-semibold">Status Kehadiran:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-extrabold text-xs uppercase ${
                        attRecord.statusPulang === 'Pulang Cepat / Kabur' || attRecord.status === 'Pulang Cepat'
                          ? 'bg-rose-600 text-white'
                          : attRecord.status === 'Hadir'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {attRecord.statusPulang === 'Pulang Cepat / Kabur'
                        ? '⚠️ PULANG CEPAT'
                        : attRecord.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1 border-t border-indigo-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">JAM MASUK</span>
                      <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {attRecord.jamMasuk || '--:--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">JAM PULANG</span>
                      <span className="font-mono font-bold text-purple-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        {attRecord.jamPulang || '--:--'}
                      </span>
                    </div>
                  </div>

                  {attRecord.locationMasuk && (
                    <div className="pt-2 border-t border-indigo-100 text-[11px]">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-600" /> Lokasi GPS Masuk:
                      </span>
                      <p className="text-slate-800 font-medium italic mt-0.5">
                        {attRecord.locationMasuk.addressName}
                      </p>
                    </div>
                  )}

                  {attRecord.keterangan && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-indigo-100">
                      <strong>Catatan:</strong> {attRecord.keterangan}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-slate-400 italic">
                  Belum ada catatan presensi hari ini.
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Tutup Modal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

