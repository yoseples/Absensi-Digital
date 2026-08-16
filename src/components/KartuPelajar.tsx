import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { captureCanvas } from '../utils/html2canvasHelper';
import { Siswa } from '../types';
import { getAppLogo, getSchoolName } from '../services/storage';

interface KartuPelajarProps {
  student: Siswa;
  onClose: () => void;
}

export const KartuPelajar: React.FC<KartuPelajarProps> = ({ student, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (canvasRef.current && student.nisn) {
      QRCode.toCanvas(
        canvasRef.current,
        student.nisn.replace(/^'/, ''),
        {
          width: 170,
          margin: 1,
          color: {
            dark: '#1f2937',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [student.nisn]);

  const cleanNisn = student.nisn.replace(/^'/, '');
  const fileNameBase = `Kartu_Pelajar_${student.nama.replace(/\s+/g, '_')}_${cleanNisn}`;

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
        format: [90, 145],
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
    <div className="flex justify-center items-center h-full py-8 animate-slide-up">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm relative transform hover:scale-[1.01] transition duration-300 border border-slate-100">
        
        {/* Printable & Exportable Container */}
        <div ref={cardRef} className="bg-white">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl p-1 border border-white/30 shadow-md mb-2 flex items-center justify-center">
              <img
                src={getAppLogo()}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">KARTU PELAJAR</h2>
            <p className="text-xs tracking-[0.2em] uppercase opacity-90 mt-0.5 font-bold">
              {getSchoolName()}
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6 text-center bg-slate-50">
            {/* Photo & QR flex row */}
            <div className="flex justify-center items-center gap-4 mb-4">
              {/* Student Photo */}
              <div className="w-24 h-28 bg-white rounded-xl shadow-xs border-2 border-indigo-200 overflow-hidden flex items-center justify-center shrink-0">
                {student.foto ? (
                  <img
                    src={student.foto}
                    alt={student.nama}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-50 text-indigo-400 flex flex-col items-center justify-center font-bold text-xs p-1">
                    <span className="text-2xl">{student.nama.charAt(0)}</span>
                    <span className="text-[9px] uppercase mt-1 text-slate-400">Pas Foto</span>
                  </div>
                )}
              </div>

              {/* QR Code Canvas */}
              <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200 shrink-0">
                <canvas ref={canvasRef} className="mx-auto rounded-lg" />
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1 leading-snug">
              {student.nama}
            </h3>
            <p className="text-indigo-600 font-mono font-bold text-base mb-2 tracking-wider">
              NISN: {cleanNisn}
            </p>
            <span className="inline-block px-4 py-1 bg-slate-200 text-slate-800 rounded-full text-xs font-bold shadow-xs">
              Kelas {student.kelas}
            </span>
          </div>
        </div>

        {/* Download & Export Toolbar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2.5">
          <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider px-1">
            <span>Opsi Unduh & Cetak</span>
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
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
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
    </div>
  );
};

