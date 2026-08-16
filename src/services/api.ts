// API Client Service for MySQL cPanel Integration

const API_KEY_STORAGE = 'e_absensi_mysql_api_url';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(API_KEY_STORAGE);
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/$/, '');
    }

    // Automatically detect origin domain with /api suffix
    const origin = window.location.origin;
    if (origin && origin !== 'null' && origin !== 'file://') {
      return `${origin.replace(/\/$/, '')}/api`;
    }
  }

  // Default relative API path
  return '/api';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = url.trim().replace(/\/$/, '');
  if (!cleaned) {
    localStorage.removeItem(API_KEY_STORAGE);
  } else {
    localStorage.setItem(API_KEY_STORAGE, cleaned);
  }
}

async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error(`Server memberikan respon kosong (HTTP status ${res.status}). Pastikan file PHP/Node API berjalan dan URL benar.`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    if (text.trim().startsWith('<')) {
      throw new Error(`Server mengembalikan HTML (Error ${res.status}). Cek apakah URL API valid atau terdapat error PHP/Node.`);
    }
    throw new Error(`Format respon dari server bukan JSON yang valid.`);
  }
}

import { runFullDiagnostic } from './diagnostic';

export async function checkMySqlConnection(): Promise<{ success: boolean; isCpanelMysql: boolean; message: string; url: string; latencyMs?: number | null; details?: any }> {
  const report = await runFullDiagnostic();
  const result = {
    success: report.overallStatus === 'online' || report.overallStatus === 'degraded',
    isCpanelMysql: report.isCpanelMysql,
    message: report.overallStatus === 'online' 
      ? 'Koneksi MySQL cPanel Aktif & Submerged' 
      : report.overallStatus === 'degraded' 
        ? 'Koneksi Terhubung Sebagian' 
        : 'Terputus dari MySQL cPanel / Server API',
    url: report.baseUrl,
    latencyMs: report.overallLatencyMs,
    details: {
      database: report.databaseName,
      server: report.serverSoftware,
      status: report.overallStatus
    }
  };
  notifyDbStatusChange(result);
  return result;
}

function notifyDbStatusChange(status: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('db_status_changed', { detail: status }));
  }
}

// Fetch Siswa from MySQL API
export async function fetchSiswaFromApi(): Promise<any[] | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/siswa.php`);
    if (!res.ok) return null;
    const data = await parseJsonResponse(res);
    if (data.status === 'success' && Array.isArray(data.data)) {
      return data.data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Save or Update Siswa in MySQL API
export async function saveSiswaToApi(siswa: any): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/siswa.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siswa)
    });
    const data = await parseJsonResponse(res);
    return data.status === 'success';
  } catch (e) {
    return false;
  }
}

// Delete Siswa from MySQL API
export async function deleteSiswaFromApi(nisn: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/siswa.php?nisn=${encodeURIComponent(nisn)}`, {
      method: 'DELETE'
    });
    const data = await parseJsonResponse(res);
    return data.status === 'success';
  } catch (e) {
    return false;
  }
}

// Fetch Guru from MySQL API
export async function fetchGuruFromApi(): Promise<any[] | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/guru.php`);
    if (!res.ok) return null;
    const data = await parseJsonResponse(res);
    if (data.status === 'success' && Array.isArray(data.data)) {
      return data.data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Save or Update Guru in MySQL API
export async function saveGuruToApi(guru: any): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/guru.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guru)
    });
    const data = await parseJsonResponse(res);
    return data.status === 'success';
  } catch (e) {
    return false;
  }
}

// Delete Guru from MySQL API
export async function deleteGuruFromApi(nipOrUsername: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/guru.php?nip=${encodeURIComponent(nipOrUsername)}`, {
      method: 'DELETE'
    });
    const data = await parseJsonResponse(res);
    return data.status === 'success';
  } catch (e) {
    return false;
  }
}

