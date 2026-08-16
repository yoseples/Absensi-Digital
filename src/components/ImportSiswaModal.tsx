import React, { useState } from 'react';
import { FileSpreadsheet, Upload, Download, AlertCircle, CheckCircle2, X, FileText, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Siswa } from '../types';

interface ImportSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSiswa: Siswa[];
  onImportSuccess: (importedData: Siswa[], mode: 'replace' | 'skip') => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

interface ParsedSiswaRow {
  siswa: Siswa;
  isValid: boolean;
  errorReason?: string;
  isDuplicate: boolean;
}

export const ImportSiswaModal: React.FC<ImportSiswaModalProps> = ({
  isOpen,
  onClose,
  existingSiswa,
  onImportSuccess,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSiswaRow[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'replace'>('replace');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Function to download Excel/CSV template
  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    const templateData = [
      {
        'NISN': '0012345678',
        'Nama Lengkap': 'Ahmad Fauzi',
        'Kelas': 'X-A',
        'Jenis Kelamin': 'Laki-laki',
        'Tanggal Lahir': '2008-05-15',
        'Agama': 'Islam',
        'Nama Ayah': 'Budi Fauzi',
        'Nama Ibu': 'Siti Rahma',
        'No HP': '081234567890',
        'Alamat': 'Jl. Medan-Banda Aceh No. 12, Lhoksukon',
      },
      {
        'NISN': '0098765432',
        'Nama Lengkap': 'Nurul Hidayah',
        'Kelas': 'X-B',
        'Jenis Kelamin': 'Perempuan',
        'Tanggal Lahir': '2008-09-20',
        'Agama': 'Islam',
        'Nama Ayah': 'Syamsul Bahri',
        'Nama Ibu': 'Aisyah',
        'No HP': '085298765432',
        'Alamat': 'Desa Matang Ubi, Lhoksukon, Aceh Utara',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for nice appearance
    worksheet['!cols'] = [
      { wch: 15 }, // NISN
      { wch: 25 }, // Nama
      { wch: 12 }, // Kelas
      { wch: 15 }, // JK
      { wch: 15 }, // Tgl Lahir
      { wch: 12 }, // Agama
      { wch: 20 }, // Ayah
      { wch: 20 }, // Ibu
      { wch: 15 }, // No HP
      { wch: 35 }, // Alamat
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'Template_Import_Siswa_SMA_NEGERI.xlsx');
    } else {
      XLSX.writeFile(workbook, 'Template_Import_Siswa_SMA_NEGERI.csv', { bookType: 'csv' });
    }
    onShowToast(`Template ${format.toUpperCase()} berhasil diunduh.`, 'success');
  };

  // Helper to normalize object key names
  const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array of objects
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          onShowToast('File Excel / CSV kosong atau format tidak sesuai.', 'error');
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        const existingNisns = new Set(existingSiswa.map((s) => s.nisn));
        const seenNisnsInFile = new Set<string>();

        const parsed: ParsedSiswaRow[] = rawRows.map((row, idx) => {
          // Flexible key mapping
          let nisn = '';
          let nama = '';
          let kelas = '';
          let jenisKelamin: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
          let tanggalLahir = '2008-01-01';
          let agama = 'Islam';
          let namaAyah = '';
          let namaIbu = '';
          let noHp = '';
          let alamat = '';

          Object.keys(row).forEach((k) => {
            const norm = normalizeKey(k);
            const val = String(row[k] || '').trim();

            if (norm.includes('nisn') || norm === 'nis') nisn = val;
            else if (norm.includes('nama') && !norm.includes('ayah') && !norm.includes('ibu')) nama = val;
            else if (norm.includes('kelas') || norm === 'class') kelas = val;
            else if (norm.includes('jeniskelamin') || norm === 'jk' || norm.includes('gender')) {
              if (val.toLowerCase().startsWith('p') || val.toLowerCase().includes('perem')) {
                jenisKelamin = 'Perempuan';
              } else {
                jenisKelamin = 'Laki-laki';
              }
            } else if (norm.includes('tanggallahir') || norm.includes('tgllahir') || norm === 'birthdate') {
              if (val) {
                // Handle date string or Excel timestamp
                if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  tanggalLahir = val;
                } else if (typeof row[k] === 'object' && row[k] instanceof Date) {
                  tanggalLahir = row[k].toISOString().split('T')[0];
                } else {
                  tanggalLahir = val;
                }
              }
            } else if (norm.includes('agama')) agama = val || 'Islam';
            else if (norm.includes('ayah')) namaAyah = val;
            else if (norm.includes('ibu')) namaIbu = val;
            else if (norm.includes('nohp') || norm.includes('hp') || norm.includes('telepon') || norm.includes('wa')) noHp = val;
            else if (norm.includes('alamat')) alamat = val;
          });

          // Check required fields
          let isValid = true;
          let errorReason = '';

          if (!nisn) {
            isValid = false;
            errorReason = 'NISN wajib diisi';
          } else if (!nama) {
            isValid = false;
            errorReason = 'Nama wajib diisi';
          } else if (!kelas) {
            isValid = false;
            errorReason = 'Kelas wajib diisi';
          }

          // Check duplicates
          const isDuplicate = existingNisns.has(nisn) || seenNisnsInFile.has(nisn);
          if (nisn) seenNisnsInFile.add(nisn);

          return {
            siswa: {
              nisn,
              nama,
              kelas,
              jenisKelamin,
              tanggalLahir,
              agama,
              namaAyah,
              namaIbu,
              noHp,
              alamat,
            },
            isValid,
            errorReason,
            isDuplicate,
          };
        });

        setParsedRows(parsed);
        onShowToast(`Berhasil membaca ${parsed.length} baris data siswa.`, 'success');
      } catch (err: any) {
        onShowToast('Gagal membaca file: ' + err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const duplicateCount = parsedRows.filter((r) => r.isValid && r.isDuplicate).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const handleConfirmImport = () => {
    if (validRows.length === 0) {
      onShowToast('Tidak ada data siswa valid untuk di-import.', 'error');
      return;
    }

    const importedSiswa = validRows.map((r) => r.siswa);
    onImportSuccess(importedSiswa, duplicateMode);
    onClose();
    setFile(null);
    setParsedRows([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Import Data Siswa (Excel / CSV)</h3>
              <p className="text-xs text-slate-500">
                Upload berkas Excel (.xlsx/.xls) atau CSV untuk menambah banyak siswa sekaligus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Download Template Box */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                Belum punya format file import?
              </div>
              <p className="text-indigo-700/80 mt-0.5">
                Download contoh format template Excel/CSV yang sudah disesuaikan kolomnya.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Template Excel
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Template CSV
              </button>
            </div>
          </div>

          {/* File Upload Drop Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-indigo-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-sm">
                  {file ? file.name : 'Klik atau seret file Excel / CSV ke sini'}
                </p>
                <p className="text-slate-400 mt-1">
                  Format yang didukung: .xlsx, .xls, .csv (Maksimal 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Duplicate Mode Options */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-700">Penanganan Data NISN Ganda / Sudah Ada:</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
                    <input
                      type="radio"
                      name="dupMode"
                      value="replace"
                      checked={duplicateMode === 'replace'}
                      onChange={() => setDuplicateMode('replace')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Timpa / Update Data Lama
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
                    <input
                      type="radio"
                      name="dupMode"
                      value="skip"
                      checked={duplicateMode === 'skip'}
                      onChange={() => setDuplicateMode('skip')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Lewati (Skip) NISN Ganda
                  </label>
                </div>
              </div>

              {/* Status Stats Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">{validRows.length}</div>
                    <div className="text-[11px]">Siswa Valid Siap Import</div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">{duplicateCount}</div>
                    <div className="text-[11px]">NISN Sudah Ada ({duplicateMode === 'replace' ? 'Akan Ditimpa' : 'Akan Dilewati'})</div>
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">{invalidCount}</div>
                    <div className="text-[11px]">Baris Tidak Valid (Dilewati)</div>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">NISN</th>
                      <th className="p-2">Nama</th>
                      <th className="p-2">Kelas</th>
                      <th className="p-2">JK</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className={!row.isValid ? 'bg-rose-50/50' : row.isDuplicate ? 'bg-amber-50/30' : 'hover:bg-slate-50'}>
                        <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-2 font-mono font-bold text-slate-800">{row.siswa.nisn || '-'}</td>
                        <td className="p-2 font-medium text-slate-800">{row.siswa.nama || '-'}</td>
                        <td className="p-2 text-slate-600">{row.siswa.kelas || '-'}</td>
                        <td className="p-2 text-slate-600">{row.siswa.jenisKelamin}</td>
                        <td className="p-2">
                          {!row.isValid ? (
                            <span className="text-rose-600 font-bold bg-rose-100 px-2 py-0.5 rounded text-[10px]">
                              {row.errorReason}
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                              NISN Ganda
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 50 && (
                  <div className="p-2 text-center text-slate-400 bg-slate-50 text-[11px] border-t border-slate-100">
                    Menampilkan 50 dari {parsedRows.length} baris data...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 font-bold transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={validRows.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className={`px-5 py-2 rounded-xl font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              validRows.length > 0 && !isProcessing
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Proses Import ({validRows.length} Siswa) <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
