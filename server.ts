import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const rawPort = process.env.PORT;
const PORT: number | string = rawPort ? (isNaN(Number(rawPort)) ? rawPort : parseInt(rawPort, 10)) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Path to persistent server app config
const CONFIG_PATH = path.join(process.cwd(), 'app-config.json');

// Default school configuration
const DEFAULT_CONFIG = {
  nama_sekolah: 'SMA NEGERI',
  judul_aplikasi: 'Absensi',
  npsn: '10101234',
  alamat_sekolah: 'Jl. Perintis Kemerdekaan No. 1, Lhoksukon, Aceh Utara',
  telepon_sekolah: '(0645) 91234',
  email_sekolah: 'info@sman1lhoksukon.sch.id',
  no_whatsapp_pengirim: '081234567890',
  tahun_ajaran: '2025/2026',
  semester_aktif: 'Ganjil',
  nama_kepala_sekolah: 'Drs. H. Azhari, M.Pd.',
  nip_kepala_sekolah: '19680512 199403 1 004',
  jam_masuk_mulai: '06:30',
  jam_masuk_akhir: '07:15',
  jam_pulang_mulai: '14:00',
  jam_pulang_akhir: '16:00',
  koordinat_lat: -6.200000,
  koordinat_lng: 106.816666,
  radius_meter: 100,
  logo_url: '/logo.png',
  favicon_url: '/logo.png',
  login_title: 'Sistem Absensi Digital',
  login_subtitle: 'Platform manajemen kehadiran siswa yang terintegrasi, real-time, dan mudah digunakan.',
  login_bg_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop',
  multi_domain_enabled: false,
  domain_tenants: [] as any[],
};

// Helper to read server config with multi-domain tenant resolution
function readServerConfig(reqHost?: string, queryDomain?: string) {
  let cfg = DEFAULT_CONFIG;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      cfg = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading app-config.json:', err);
  }

  // Multi-Domain Tenant Resolution
  if (cfg.multi_domain_enabled !== false && Array.isArray(cfg.domain_tenants) && cfg.domain_tenants.length > 0) {
    const targetDomain = (queryDomain || reqHost || '').split(':')[0].toLowerCase().trim();
    if (targetDomain) {
      const matched = cfg.domain_tenants.find((t: any) => {
        if (!t || !t.domain) return false;
        const d = t.domain.toLowerCase().trim();
        return targetDomain === d || targetDomain.endsWith(`.${d}`) || targetDomain.includes(d);
      });

      if (matched) {
        return {
          ...cfg,
          nama_sekolah: matched.nama_sekolah || cfg.nama_sekolah,
          judul_aplikasi: matched.judul_aplikasi || cfg.judul_aplikasi || 'Absensi',
          logo_url: matched.logo_url || cfg.logo_url,
          favicon_url: matched.favicon_url || matched.logo_url || cfg.favicon_url,
          alamat_sekolah: matched.alamat_sekolah || cfg.alamat_sekolah,
          email_sekolah: matched.email_sekolah || cfg.email_sekolah,
          telepon_sekolah: matched.telepon_sekolah || cfg.telepon_sekolah,
          nama_kepala_sekolah: matched.nama_kepala_sekolah || cfg.nama_kepala_sekolah,
          nip_kepala_sekolah: matched.nip_kepala_sekolah || cfg.nip_kepala_sekolah,
          active_tenant_id: matched.id,
          active_domain: matched.domain,
        };
      }
    }
  }

  return cfg;
}

// Helper to write server config
function writeServerConfig(cfg: any) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing app-config.json:', err);
  }
}

// Server-side persistent database store (data-store.json)
const DATA_STORE_PATH = path.join(process.cwd(), 'data-store.json');

function readDataStore(): any {
  try {
    if (fs.existsSync(DATA_STORE_PATH)) {
      const data = fs.readFileSync(DATA_STORE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading data-store.json:', err);
  }
  return { updatedAt: 0 };
}

function writeDataStore(data: any): any {
  try {
    const current = readDataStore();
    const updated = {
      ...current,
      ...data,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    if (data.config) {
      writeServerConfig(data.config);
    }
    return updated;
  } catch (err) {
    console.error('Error writing data-store.json:', err);
    return readDataStore();
  }
}

// API Routes
app.get('/api/db', (req, res) => {
  const store = readDataStore();
  res.json({ success: true, data: store, updatedAt: store.updatedAt || 0 });
});

app.get('/api/db/status', (req, res) => {
  const store = readDataStore();
  res.json({ success: true, updatedAt: store.updatedAt || 0 });
});

app.post('/api/db', (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }
  const updated = writeDataStore(payload);
  res.json({ success: true, updatedAt: updated.updatedAt });
});

app.get('/api/app-config', (req, res) => {
  const reqHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
  const queryDomain = (req.query.domain as string) || (req.headers['x-app-domain'] as string) || '';
  const cfg = readServerConfig(reqHost, queryDomain);
  res.json({ success: true, config: cfg });
});

app.post('/api/app-config', (req, res) => {
  const newCfg = req.body;
  if (!newCfg || typeof newCfg !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid config format' });
  }
  const current = readServerConfig();
  const merged = { ...current, ...newCfg };
  writeServerConfig(merged);
  res.json({ success: true, config: merged });
});

// AI Chatbot Assistant for WhatsApp messaging using Gemini 2.5 Flash
app.post('/api/ai-wa-assistant', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'GEMINI_API_KEY belum dikonfigurasi di server environment.',
      });
    }

    const { prompt, studentList, schoolName } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Kamu adalah Asisten AI Chatbot Absensi Sekolah untuk ${schoolName || 'Sekolah'}.
Tugasmu adalah membantu guru/admin sekolah mencari data siswa dan menyusun draft pesan WhatsApp yang sangat sopan, profesional, terstruktur, dan jelas untuk dikirim ke orang tua/wali murid atau siswa.

Data siswa terdaftar saat ini (JSON):
${JSON.stringify(studentList || []).slice(0, 15000)}

Aturan Penting & Format Template Pesan WhatsApp:
1. Jika pengguna meminta pesan "Absen Masuk" / "Hadir":
   Format: "Halo Bpk/Ibu [Nama Orang Tua/Wali],\n\nInformasi kehadiran siswa: Ananda *[Nama Siswa]* (Kelas [Kelas]) telah hadir dan masuk di *${schoolName || 'Sekolah'}* pada hari [Hari, Tanggal] pukul [Jam] WIB. Terima kasih."

2. Jika pengguna meminta pesan "Absen Pulang":
   Format: "Halo Bpk/Ibu [Nama Orang Tua/Wali],\n\nInformasi Kepulangan: Ananda *[Nama Siswa]* (Kelas [Kelas]) telah melakukan absen pulang dari *${schoolName || 'Sekolah'}* pada hari [Hari, Tanggal] pukul [Jam] WIB. Hati-hati di jalan. Terima kasih."

3. Jika pengguna meminta pesan "Terlambat":
   Format: "Pemberitahuan Absensi: Ananda *[Nama Siswa]* (Kelas [Kelas]) tercatat datang terlambat di *${schoolName || 'Sekolah'}* pada [Hari, Tanggal] pukul [Jam] WIB. Mohon perhatiannya, terima kasih."

4. Jika pengguna meminta pesan "Alpha" / "Peringatan":
   Format: "Perhatian: Ananda *[Nama Siswa]* (Kelas [Kelas]) tidak hadir di *${schoolName || 'Sekolah'}* hari ini ([Hari, Tanggal]) tanpa keterangan (Alpha). Mohon konfirmasi segera kepada pihak sekolah atau Wali Kelas. Terima kasih."

5. Jika pengguna meminta pesan "Izin/Sakit":
   Format: "Halo Bpk/Ibu [Nama Orang Tua/Wali],\n\nKami informasikan bahwa Ananda *[Nama Siswa]* (Kelas [Kelas]) tercatat [Izin/Sakit] pada hari [Hari, Tanggal]. Semoga ananda lekas membaik/bermanfaat. Terima kasih."

6. Kembalikan balasan dalam format JSON berikut secara akurat:
{
  "replyText": "penjelasan ramah dan singkat dari AI untuk guru",
  "suggestedMessages": [
    {
      "namaSiswa": "Nama Siswa",
      "nisn": "NISN",
      "kelas": "Kelas",
      "noHp": "Nomor HP/WA terdaftar",
      "targetType": "Orang Tua",
      "pesanWA": "Pesan WA lengkap yang sudah diformat",
      "kategori": "Absen Masuk | Absen Pulang | Terlambat | Alpha | Izin/Sakit | Pengumuman"
    }
  ]
}
7. Jika tidak ada pesan WA khusus yang perlu dibuat (misal hanya pertanyaan umum), "suggestedMessages" boleh berupa array kosong [].
8. Kembalikan HANYA format JSON yang valid.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text || '';
    let parsed = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      parsed = { replyText: resultText, suggestedMessages: [] };
    }

    res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('AI WA Assistant Error:', err);
    res.status(200).json({ success: false, message: err?.message || 'Gagal memproses dengan AI' });
  }
});

// Endpoint to serve custom uploaded school logo as a clean PNG image URL for WhatsApp scrapers
app.get('/api/app-logo', (req, res) => {
  const reqHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
  const queryDomain = (req.query.domain as string) || '';
  const cfg = readServerConfig(reqHost, queryDomain);
  const logoUrl = cfg.logo_url || cfg.favicon_url || '/logo.png';

  if (logoUrl.startsWith('data:image/')) {
    try {
      const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    } catch (e) {
      console.error('Error serving base64 logo:', e);
    }
  }

  // Fallback to static default logo.png
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  if (fs.existsSync(logoPath)) {
    return res.sendFile(logoPath);
  }
  res.status(404).send('Logo not found');
});

// Dynamic PWA Web Manifest Route (Dynamic Android & iOS Home Screen Name)
app.get(['/manifest.json', '/api/manifest.json'], (req, res) => {
  const reqHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
  const queryDomain = (req.query.domain as string) || '';
  const cfg = readServerConfig(reqHost, queryDomain);

  const schoolName = cfg.nama_sekolah && cfg.nama_sekolah.trim() !== '' 
    ? cfg.nama_sekolah.trim() 
    : 'SMA NEGERI';

  const appTitle = cfg.judul_aplikasi && cfg.judul_aplikasi.trim() !== ''
    ? cfg.judul_aplikasi.trim()
    : 'Absensi';

  const pwaShortName = schoolName;
  const pwaFullName = `${appTitle} - ${schoolName}`;
  const description = `Sistem ${appTitle} Digital, Presensi QR Code & GPS ${schoolName}`;

  let logoUrl = '/logo.png';
  if (cfg.logo_url) {
    if (cfg.logo_url.startsWith('data:image/')) {
      logoUrl = '/api/app-logo';
    } else {
      logoUrl = cfg.logo_url;
    }
  }

  const manifestData = {
    short_name: pwaShortName,
    name: pwaFullName,
    description: description,
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    id: '/',
    start_url: './',
    scope: './',
    background_color: '#020617',
    theme_color: '#1d4ed8',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    categories: ['education', 'productivity', 'utilities'],
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  return res.json(manifestData);
});

// Function to inject Open Graph & Twitter meta tags into HTML template
function injectOpenGraphMeta(html: string, req: express.Request): string {
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  const queryDomain = (req.query.domain as string) || '';
  const cfg = readServerConfig(host, queryDomain);

  // Determine host and protocol for canonical absolute URLs
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const baseUrl = `${proto}://${host}`;
  const fullPageUrl = `${baseUrl}${req.originalUrl || '/'}`;

  const schoolName = cfg.nama_sekolah && cfg.nama_sekolah.trim() !== '' 
    ? cfg.nama_sekolah.trim() 
    : 'SMA NEGERI';

  const appTitle = cfg.judul_aplikasi && cfg.judul_aplikasi.trim() !== ''
    ? cfg.judul_aplikasi.trim()
    : 'Absensi';

  const alamat = cfg.alamat_sekolah ? ` Alamat: ${cfg.alamat_sekolah}` : '';
  const title = `${appTitle} - ${schoolName}`;
  const description = `Sistem ${appTitle} Digital, Presensi QR Code & GPS ${schoolName}.${alamat}`;

  // Image URL resolution
  let imageUrl = '/logo.png';
  if (cfg.logo_url) {
    if (cfg.logo_url.startsWith('data:image/')) {
      imageUrl = '/api/app-logo';
    } else if (cfg.logo_url.startsWith('http://') || cfg.logo_url.startsWith('https://')) {
      imageUrl = cfg.logo_url;
    } else {
      imageUrl = cfg.logo_url;
    }
  }

  const fullImageUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
    ? imageUrl
    : `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;

  const metaBlock = `
    <!-- Dynamically Injected Open Graph / Social Media Meta Tags -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${appTitle} - ${schoolName}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${fullPageUrl}" />
    <meta property="og:image" content="${fullImageUrl}" />
    <meta property="og:image:secure_url" content="${fullImageUrl}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${fullImageUrl}" />
  `;

  // Replace existing title and meta tags if present, or inject before </head>
  let processedHtml = html;

  // Strip hardcoded title and og/twitter tags from head to prevent duplication
  processedHtml = processedHtml.replace(/<title>[\s\S]*?<\/title>/i, '');
  processedHtml = processedHtml.replace(/<meta\s+(?:name|property)=["'](?:og:|twitter:|description)[\s\S]*?\/>/gi, '');

  // Inject our dynamic meta block before </head>
  return processedHtml.replace('</head>', `${metaBlock}\n</head>`);
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.get('*all', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const html = injectOpenGraphMeta(template, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    app.get('*all', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const template = fs.readFileSync(indexPath, 'utf-8');
          const html = injectOpenGraphMeta(template, req);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        }
        res.status(404).send('index.html not found');
      } catch (err) {
        next(err);
      }
    });
  }

  if (typeof PORT === 'number') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`Server running on socket/port ${PORT}`);
    });
  }
}

startServer();
