var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var app = (0, import_express.default)();
var rawPort = process.env.PORT;
var PORT = rawPort ? isNaN(Number(rawPort)) ? rawPort : parseInt(rawPort, 10) : 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
var CONFIG_PATH = import_path.default.join(process.cwd(), "app-config.json");
var DEFAULT_CONFIG = {
  nama_sekolah: "SMA NEGERI",
  npsn: "10101234",
  alamat_sekolah: "Jl. Perintis Kemerdekaan No. 1, Lhoksukon, Aceh Utara",
  telepon_sekolah: "(0645) 91234",
  email_sekolah: "info@sman1lhoksukon.sch.id",
  no_whatsapp_pengirim: "081234567890",
  tahun_ajaran: "2025/2026",
  semester_aktif: "Ganjil",
  nama_kepala_sekolah: "Drs. H. Azhari, M.Pd.",
  nip_kepala_sekolah: "19680512 199403 1 004",
  jam_masuk_mulai: "06:30",
  jam_masuk_akhir: "07:15",
  jam_pulang_mulai: "14:00",
  jam_pulang_akhir: "16:00",
  koordinat_lat: -6.2,
  koordinat_lng: 106.816666,
  radius_meter: 100,
  logo_url: "/logo.png",
  favicon_url: "/logo.png",
  login_title: "Sistem Absensi Digital",
  login_subtitle: "Platform manajemen kehadiran siswa yang terintegrasi, real-time, dan mudah digunakan.",
  login_bg_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop",
  multi_domain_enabled: false,
  domain_tenants: []
};
function readServerConfig(reqHost, queryDomain) {
  let cfg = DEFAULT_CONFIG;
  try {
    if (import_fs.default.existsSync(CONFIG_PATH)) {
      const data = import_fs.default.readFileSync(CONFIG_PATH, "utf-8");
      cfg = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading app-config.json:", err);
  }
  if (cfg.multi_domain_enabled !== false && Array.isArray(cfg.domain_tenants) && cfg.domain_tenants.length > 0) {
    const targetDomain = (queryDomain || reqHost || "").split(":")[0].toLowerCase().trim();
    if (targetDomain) {
      const matched = cfg.domain_tenants.find((t) => {
        if (!t || !t.domain) return false;
        const d = t.domain.toLowerCase().trim();
        return targetDomain === d || targetDomain.endsWith(`.${d}`) || targetDomain.includes(d);
      });
      if (matched) {
        return {
          ...cfg,
          nama_sekolah: matched.nama_sekolah || cfg.nama_sekolah,
          logo_url: matched.logo_url || cfg.logo_url,
          favicon_url: matched.favicon_url || matched.logo_url || cfg.favicon_url,
          alamat_sekolah: matched.alamat_sekolah || cfg.alamat_sekolah,
          email_sekolah: matched.email_sekolah || cfg.email_sekolah,
          telepon_sekolah: matched.telepon_sekolah || cfg.telepon_sekolah,
          nama_kepala_sekolah: matched.nama_kepala_sekolah || cfg.nama_kepala_sekolah,
          nip_kepala_sekolah: matched.nip_kepala_sekolah || cfg.nip_kepala_sekolah,
          active_tenant_id: matched.id,
          active_domain: matched.domain
        };
      }
    }
  }
  return cfg;
}
function writeServerConfig(cfg) {
  try {
    import_fs.default.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing app-config.json:", err);
  }
}
var DATA_STORE_PATH = import_path.default.join(process.cwd(), "data-store.json");
function readDataStore() {
  try {
    if (import_fs.default.existsSync(DATA_STORE_PATH)) {
      const data = import_fs.default.readFileSync(DATA_STORE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading data-store.json:", err);
  }
  return { updatedAt: 0 };
}
function writeDataStore(data) {
  try {
    const current = readDataStore();
    const updated = {
      ...current,
      ...data,
      updatedAt: Date.now()
    };
    import_fs.default.writeFileSync(DATA_STORE_PATH, JSON.stringify(updated, null, 2), "utf-8");
    if (data.config) {
      writeServerConfig(data.config);
    }
    return updated;
  } catch (err) {
    console.error("Error writing data-store.json:", err);
    return readDataStore();
  }
}
app.get("/api/db", (req, res) => {
  const store = readDataStore();
  res.json({ success: true, data: store, updatedAt: store.updatedAt || 0 });
});
app.get("/api/db/status", (req, res) => {
  const store = readDataStore();
  res.json({ success: true, updatedAt: store.updatedAt || 0 });
});
app.post("/api/db", (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ success: false, message: "Invalid payload" });
  }
  const updated = writeDataStore(payload);
  res.json({ success: true, updatedAt: updated.updatedAt });
});
app.get("/api/app-config", (req, res) => {
  const reqHost = req.headers["x-forwarded-host"] || req.get("host") || "";
  const queryDomain = req.query.domain || req.headers["x-app-domain"] || "";
  const cfg = readServerConfig(reqHost, queryDomain);
  res.json({ success: true, config: cfg });
});
app.post("/api/app-config", (req, res) => {
  const newCfg = req.body;
  if (!newCfg || typeof newCfg !== "object") {
    return res.status(400).json({ success: false, message: "Invalid config format" });
  }
  const current = readServerConfig();
  const merged = { ...current, ...newCfg };
  writeServerConfig(merged);
  res.json({ success: true, config: merged });
});
app.post("/api/ai-wa-assistant", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: "GEMINI_API_KEY belum dikonfigurasi di server environment."
      });
    }
    const { prompt, studentList, schoolName } = req.body;
    const ai = new import_genai.GoogleGenAI({ apiKey });
    const systemInstruction = `Kamu adalah Asisten AI Chatbot Absensi Sekolah untuk ${schoolName || "Sekolah"}.
Tugasmu adalah membantu guru/admin sekolah mencari data siswa dan menyusun draft pesan WhatsApp yang sangat sopan, profesional, terstruktur, dan jelas untuk dikirim ke orang tua/wali murid atau siswa.

Data siswa terdaftar saat ini (JSON):
${JSON.stringify(studentList || []).slice(0, 15e3)}

Aturan Penting & Format Template Pesan WhatsApp:
1. Jika pengguna meminta pesan "Absen Masuk" / "Hadir":
   Format: "Halo Bpk/Ibu [Nama Orang Tua/Wali],

Informasi kehadiran siswa: Ananda *[Nama Siswa]* (Kelas [Kelas]) telah hadir dan masuk di *${schoolName || "Sekolah"}* pada hari [Hari, Tanggal] pukul [Jam] WIB. Terima kasih."

2. Jika pengguna meminta pesan "Absen Pulang":
   Format: "Halo Bpk/Ibu [Nama Orang Tua/Wali],

Informasi Kepulangan: Ananda *[Nama Siswa]* (Kelas [Kelas]) telah melakukan absen pulang dari *${schoolName || "Sekolah"}* pada hari [Hari, Tanggal] pukul [Jam] WIB. Hati-hati di jalan. Terima kasih."

3. Jika pengguna meminta pesan "Terlambat":
   Format: "Pemberitahuan Absensi: Ananda *[Nama Siswa]* (Kelas [Kelas]) tercatat datang terlambat di *${schoolName || "Sekolah"}* pada [Hari, Tanggal] pukul [Jam] WIB. Mohon perhatiannya, terima kasih."

4. Jika pengguna meminta pesan "Alpha" / "Peringatan":
   Format: "Perhatian: Ananda *[Nama Siswa]* (Kelas [Kelas]) tidak hadir di *${schoolName || "Sekolah"}* hari ini ([Hari, Tanggal]) tanpa keterangan (Alpha). Mohon konfirmasi segera kepada pihak sekolah atau Wali Kelas. Terima kasih."

5. Jika pengguna meminta pesan "Izin/Sakit":
   Format: "Halo Bpk/Ibu [Nama Orang Tua/Wali],

Kami informasikan bahwa Ananda *[Nama Siswa]* (Kelas [Kelas]) tercatat [Izin/Sakit] pada hari [Hari, Tanggal]. Semoga ananda lekas membaik/bermanfaat. Terima kasih."

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
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });
    const resultText = response.text || "";
    let parsed = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      parsed = { replyText: resultText, suggestedMessages: [] };
    }
    res.json({ success: true, ...parsed });
  } catch (err) {
    console.error("AI WA Assistant Error:", err);
    res.status(200).json({ success: false, message: err?.message || "Gagal memproses dengan AI" });
  }
});
app.get("/api/app-logo", (req, res) => {
  const reqHost = req.headers["x-forwarded-host"] || req.get("host") || "";
  const queryDomain = req.query.domain || "";
  const cfg = readServerConfig(reqHost, queryDomain);
  const logoUrl = cfg.logo_url || cfg.favicon_url || "/logo.png";
  if (logoUrl.startsWith("data:image/")) {
    try {
      const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(buffer);
      }
    } catch (e) {
      console.error("Error serving base64 logo:", e);
    }
  }
  const logoPath = import_path.default.join(process.cwd(), "public", "logo.png");
  if (import_fs.default.existsSync(logoPath)) {
    return res.sendFile(logoPath);
  }
  res.status(404).send("Logo not found");
});
app.get(["/manifest.json", "/api/manifest.json"], (req, res) => {
  const reqHost = req.headers["x-forwarded-host"] || req.get("host") || "";
  const queryDomain = req.query.domain || "";
  const cfg = readServerConfig(reqHost, queryDomain);
  const schoolName = cfg.nama_sekolah && cfg.nama_sekolah.trim() !== "" ? cfg.nama_sekolah.trim() : "SMA NEGERI";
  const pwaShortName = schoolName;
  const pwaFullName = `E-Absensi ${schoolName}`;
  const description = `Sistem Absensi Digital, Presensi QR Code & GPS ${schoolName}`;
  let logoUrl = "/logo.png";
  if (cfg.logo_url) {
    if (cfg.logo_url.startsWith("data:image/")) {
      logoUrl = "/api/app-logo";
    } else {
      logoUrl = cfg.logo_url;
    }
  }
  const manifestData = {
    short_name: pwaShortName,
    name: pwaFullName,
    description,
    icons: [
      {
        src: logoUrl,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: logoUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    id: "/",
    start_url: "./",
    scope: "./",
    background_color: "#020617",
    theme_color: "#1d4ed8",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    categories: ["education", "productivity", "utilities"]
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  return res.json(manifestData);
});
function injectOpenGraphMeta(html, req) {
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
  const queryDomain = req.query.domain || "";
  const cfg = readServerConfig(host, queryDomain);
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const baseUrl = `${proto}://${host}`;
  const fullPageUrl = `${baseUrl}${req.originalUrl || "/"}`;
  const schoolName = cfg.nama_sekolah && cfg.nama_sekolah.trim() !== "" ? cfg.nama_sekolah.trim() : "SMA NEGERI";
  const alamat = cfg.alamat_sekolah ? ` Alamat: ${cfg.alamat_sekolah}` : "";
  const title = `E-Absensi ${schoolName}`;
  const description = `Sistem Absensi Digital, Presensi QR Code & GPS ${schoolName}.${alamat}`;
  let imageUrl = "/logo.png";
  if (cfg.logo_url) {
    if (cfg.logo_url.startsWith("data:image/")) {
      imageUrl = "/api/app-logo";
    } else if (cfg.logo_url.startsWith("http://") || cfg.logo_url.startsWith("https://")) {
      imageUrl = cfg.logo_url;
    } else {
      imageUrl = cfg.logo_url;
    }
  }
  const fullImageUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://") ? imageUrl : `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  const metaBlock = `
    <!-- Dynamically Injected Open Graph / Social Media Meta Tags -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="E-Absensi ${schoolName}" />
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
  let processedHtml = html;
  processedHtml = processedHtml.replace(/<title>[\s\S]*?<\/title>/i, "");
  processedHtml = processedHtml.replace(/<meta\s+(?:name|property)=["'](?:og:|twitter:|description)[\s\S]*?\/>/gi, "");
  return processedHtml.replace("</head>", `${metaBlock}
</head>`);
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get("*all", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const indexPath = import_path.default.resolve(process.cwd(), "index.html");
        let template = import_fs.default.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const html = injectOpenGraphMeta(template, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath, { index: false }));
    app.get("*all", (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const indexPath = import_path.default.join(distPath, "index.html");
        if (import_fs.default.existsSync(indexPath)) {
          const template = import_fs.default.readFileSync(indexPath, "utf-8");
          const html = injectOpenGraphMeta(template, req);
          return res.status(200).set({ "Content-Type": "text/html" }).end(html);
        }
        res.status(404).send("index.html not found");
      } catch (err) {
        next(err);
      }
    });
  }
  if (typeof PORT === "number") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`Server running on socket/port ${PORT}`);
    });
  }
}
startServer();
//# sourceMappingURL=server.cjs.map
