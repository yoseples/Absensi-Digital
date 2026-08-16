import { getApiBaseUrl } from './api';

export interface EndpointTestResult {
  name: string;
  endpoint: string;
  status: 'ok' | 'error' | 'pending';
  latencyMs: number | null;
  message: string;
  httpCode?: number;
}

export interface FullDiagnosticReport {
  overallStatus: 'online' | 'offline' | 'degraded' | 'checking';
  overallLatencyMs: number | null;
  timestamp: number;
  baseUrl: string;
  isCpanelMysql: boolean;
  databaseName?: string;
  serverSoftware?: string;
  tests: EndpointTestResult[];
}

let lastReport: FullDiagnosticReport | null = null;
const listeners: Array<(report: FullDiagnosticReport) => void> = [];

export function subscribeDiagnostic(callback: (report: FullDiagnosticReport) => void): () => void {
  listeners.push(callback);
  if (lastReport) {
    callback(lastReport);
  }
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getLastDiagnosticReport(): FullDiagnosticReport | null {
  return lastReport;
}

function notifyListeners(report: FullDiagnosticReport) {
  lastReport = report;
  listeners.forEach((cb) => cb(report));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cpanel_diagnostic_updated', { detail: report }));
  }
}

export async function runFullDiagnostic(): Promise<FullDiagnosticReport> {
  const baseUrl = getApiBaseUrl();
  const report: FullDiagnosticReport = {
    overallStatus: 'checking',
    overallLatencyMs: null,
    timestamp: Date.now(),
    baseUrl,
    isCpanelMysql: true,
    tests: [
      { name: 'Koneksi MySQL & Config (auth.php)', endpoint: `${baseUrl}/auth.php?action=test`, status: 'pending', latencyMs: null, message: 'Menguji...' },
      { name: 'Akses API Siswa (siswa.php)', endpoint: `${baseUrl}/siswa.php`, status: 'pending', latencyMs: null, message: 'Menguji...' },
      { name: 'Akses API Guru (guru.php)', endpoint: `${baseUrl}/guru.php`, status: 'pending', latencyMs: null, message: 'Menguji...' },
      { name: 'Akses API Presensi (absensi.php)', endpoint: `${baseUrl}/absensi.php`, status: 'pending', latencyMs: null, message: 'Menguji...' },
    ],
  };

  notifyListeners(report);

  const startTimeAll = performance.now();

  // Run tests in parallel for max responsiveness
  const [authTest, siswaTest, guruTest, absensiTest] = await Promise.all([
    testEndpoint('Koneksi MySQL & Config (auth.php)', `${baseUrl}/auth.php?action=test`),
    testEndpoint('Akses API Siswa (siswa.php)', `${baseUrl}/siswa.php`),
    testEndpoint('Akses API Guru (guru.php)', `${baseUrl}/guru.php`),
    testEndpoint('Akses API Presensi (absensi.php)', `${baseUrl}/absensi.php`),
  ]);

  const tests = [authTest, siswaTest, guruTest, absensiTest];
  const totalLatency = Math.round(performance.now() - startTimeAll);

  const okCount = tests.filter((t) => t.status === 'ok').length;
  let overallStatus: 'online' | 'offline' | 'degraded' = 'offline';

  if (okCount === tests.length) {
    overallStatus = 'online';
  } else if (okCount > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'offline';
  }

  let databaseName: string | undefined;
  let serverSoftware: string | undefined;
  let isCpanelMysql = true;

  if (authTest.status === 'ok' && (authTest as any).details) {
    databaseName = (authTest as any).details.database;
    serverSoftware = (authTest as any).details.server;
  }

  // Fallback check to local server
  if (overallStatus === 'offline') {
    try {
      const localStart = performance.now();
      const localRes = await fetch('/api/db/status', { cache: 'no-store' });
      if (localRes.ok) {
        const localLatency = Math.round(performance.now() - localStart);
        overallStatus = 'online';
        isCpanelMysql = false;
        databaseName = 'Local JSON DB';
        serverSoftware = 'Node.js Express Server';
      }
    } catch (e) {}
  }

  const primaryLatency = authTest.latencyMs !== null ? authTest.latencyMs : (tests.find(t => t.latencyMs !== null)?.latencyMs || totalLatency);

  const finalReport: FullDiagnosticReport = {
    overallStatus,
    overallLatencyMs: primaryLatency,
    timestamp: Date.now(),
    baseUrl,
    isCpanelMysql,
    databaseName,
    serverSoftware,
    tests,
  };

  notifyListeners(finalReport);
  return finalReport;
}

async function testEndpoint(name: string, url: string): Promise<EndpointTestResult & { details?: any }> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        name,
        endpoint: url,
        status: 'error',
        latencyMs,
        httpCode: res.status,
        message: `HTTP Error ${res.status}: ${res.statusText || 'Server Error'}`,
      };
    }

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return {
        name,
        endpoint: url,
        status: 'error',
        latencyMs,
        httpCode: res.status,
        message: 'Respon server bukan format JSON (HTML/PHP error)',
      };
    }

    if (json.status === 'success' || Array.isArray(json) || json.status === 'ok') {
      return {
        name,
        endpoint: url,
        status: 'ok',
        latencyMs,
        httpCode: res.status,
        message: json.message || 'Berfungsi Normal',
        details: json.data,
      };
    } else {
      return {
        name,
        endpoint: url,
        status: 'error',
        latencyMs,
        httpCode: res.status,
        message: json.message || 'Respon status bukan success',
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      name,
      endpoint: url,
      status: 'error',
      latencyMs,
      message: err.name === 'AbortError' ? 'Koneksi Timeout (> 6 detik)' : (err.message || 'Terputus dari server API'),
    };
  }
}
