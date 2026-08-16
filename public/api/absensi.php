<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = getJsonInput();

// 1. PROCESS SCAN QR CODE
if ($action === 'scan' && $method === 'POST') {
    $nisn = trim($input['nisn'] ?? '');
    if (empty($nisn)) sendJson('error', 'Kode QR / NISN tidak terbaca.');

    // Find student in MySQL
    $stmt = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ?");
    $stmt->execute([$nisn]);
    $siswa = $stmt->fetch();

    if (!$siswa) {
        sendJson('error', "Siswa dengan NISN '$nisn' tidak terdaftar dalam database MySQL.");
    }

    $today = date('Y-m-d');
    $nowTime = date('H:i:s');

    // Check if holiday
    $chkHoliday = $pdo->prepare("SELECT keterangan FROM hari_libur WHERE tanggal = ?");
    $chkHoliday->execute([$today]);
    $holiday = $chkHoliday->fetch();

    if ($holiday) {
        sendJson('error', "Hari ini libur (" . $holiday['keterangan'] . "). Tidak ada kegiatan absensi.");
    }

    // Get Jam Operasional
    $getJam = $pdo->query("SELECT * FROM pengaturan_jam WHERE id = 1");
    $jamConfig = $getJam->fetch() ?: ['jam_masuk' => '07:00:00', 'jam_pulang' => '15:00:00', 'toleransi_terlambat' => 15];

    // Check existing daily record
    $chkAbsen = $pdo->prepare("SELECT * FROM absensi WHERE tanggal = ? AND nisn = ?");
    $chkAbsen->execute([$today, $nisn]);
    $existing = $chkAbsen->fetch();

    if (!$existing) {
        // DATANG
        $jamMasukLimit = strtotime($jamConfig['jam_masuk']) + ($jamConfig['toleransi_terlambat'] * 60);
        $status = (time() > $jamMasukLimit) ? 'Hadir' : 'Hadir'; // Boleh disesuaikan
        $ket = (time() > $jamMasukLimit) ? 'Terlambat' : 'Tepat Waktu';

        $ins = $pdo->prepare("INSERT INTO absensi (tanggal, nisn, nama, kelas, jam_datang, status, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $ins->execute([$today, $nisn, $siswa['nama'], $siswa['kelas'], $nowTime, 'Hadir', $ket]);

        sendJson('success', "Absen Datang Berhasil: {$siswa['nama']}", [
            'type' => 'datang',
            'nama' => $siswa['nama'],
            'kelas' => $siswa['kelas'],
            'jamDatang' => substr($nowTime, 0, 5),
            'message' => 'ABSEN DATANG BERHASIL (' . $ket . ')'
        ]);
    } else {
        // PULANG
        if ($existing['jam_pulang']) {
            sendJson('error', "Siswa {$siswa['nama']} sudah melakukan Absen Pulang hari ini pada " . substr($existing['jam_pulang'], 0, 5));
        }

        $upd = $pdo->prepare("UPDATE absensi SET jam_pulang = ? WHERE id = ?");
        $upd->execute([$nowTime, $existing['id']]);

        sendJson('success', "Absen Pulang Berhasil: {$siswa['nama']}", [
            'type' => 'pulang',
            'nama' => $siswa['nama'],
            'kelas' => $siswa['kelas'],
            'jamPulang' => substr($nowTime, 0, 5),
            'message' => 'ABSEN PULANG BERHASIL'
        ]);
    }
}

// 1b. BATCH SYNC ABSENSI (POST ARRAY / SYNC ACTION)
if ($method === 'POST' && $action !== 'scan') {
    $items = (isset($input[0]) && is_array($input[0])) ? $input : [$input];

    // Ensure unique constraint exists on absensi (tanggal, nisn)
    try {
        $pdo->exec("ALTER TABLE absensi ADD UNIQUE INDEX IF NOT EXISTS unique_daily_absen (tanggal, nisn)");
    } catch (Exception $e) {}

    $pdo->beginTransaction();
    try {
        $sql = "INSERT INTO absensi (tanggal, nisn, nama, kelas, jam_datang, jam_pulang, status, keterangan)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                nama=VALUES(nama), kelas=VALUES(kelas),
                jam_datang=COALESCE(VALUES(jam_datang), jam_datang),
                jam_pulang=COALESCE(VALUES(jam_pulang), jam_pulang),
                status=VALUES(status), keterangan=VALUES(keterangan)";
        $stmt = $pdo->prepare($sql);

        foreach ($items as $item) {
            $tanggal = trim($item['tanggal'] ?? '');
            $nisn = trim(str_replace("'", '', $item['nisn'] ?? ''));
            $nama = trim($item['nama'] ?? '');
            $kelas = trim($item['kelas'] ?? '');

            if (empty($tanggal) || empty($nisn) || empty($nama)) continue;

            $jamDatang = !empty($item['jamDatang']) ? $item['jamDatang'] : (!empty($item['jam_datang']) ? $item['jam_datang'] : null);
            $jamPulang = !empty($item['jamPulang']) ? $item['jamPulang'] : (!empty($item['jam_pulang']) ? $item['jam_pulang'] : null);
            $status = !empty($item['status']) ? $item['status'] : 'Hadir';
            $keterangan = $item['keterangan'] ?? '';

            $stmt->execute([
                $tanggal,
                $nisn,
                $nama,
                $kelas,
                $jamDatang,
                $jamPulang,
                $status,
                $keterangan
            ]);
        }
        $pdo->commit();
        sendJson('success', 'Data absensi berhasil disinkronisasi di MySQL');
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJson('error', 'Gagal sinkronisasi data absensi: ' . $e->getMessage());
    }
}

// 2. GET TODAY ABSENSI LOG
if ($action === 'today' && $method === 'GET') {
    $today = date('Y-m-d');
    $kelas = $_GET['kelas'] ?? '';

    if (!empty($kelas)) {
        $stmt = $pdo->prepare("SELECT * FROM absensi WHERE tanggal = ? AND kelas = ? ORDER BY created_at DESC");
        $stmt->execute([$today, $kelas]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM absensi WHERE tanggal = ? ORDER BY created_at DESC");
        $stmt->execute([$today]);
    }
    $list = $stmt->fetchAll();

    $mapped = array_map(function($a) {
        return [
            'id' => $a['id'],
            'tanggal' => $a['tanggal'],
            'nisn' => $a['nisn'],
            'nama' => $a['nama'],
            'kelas' => $a['kelas'],
            'jamDatang' => $a['jam_datang'] ? substr($a['jam_datang'], 0, 5) : null,
            'jamPulang' => $a['jam_pulang'] ? substr($a['jam_pulang'], 0, 5) : null,
            'status' => $a['status'],
            'keterangan' => $a['keterangan']
        ];
    }, $list);

    sendJson('success', 'Data absensi hari ini berhasil dimuat', $mapped);
}

// 3. GET REPORT BY RANGE & KELAS
if ($action === 'report' && $method === 'GET') {
    $start = $_GET['start'] ?? date('Y-m-d');
    $end = $_GET['end'] ?? date('Y-m-d');
    $kelas = $_GET['kelas'] ?? '';

    $sql = "SELECT * FROM absensi WHERE tanggal BETWEEN ? AND ?";
    $params = [$start, $end];

    if (!empty($kelas)) {
        $sql .= " AND kelas = ?";
        $params[] = $kelas;
    }

    $sql .= " ORDER BY tanggal DESC, nama ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $list = $stmt->fetchAll();

    $mapped = array_map(function($a) {
        return [
            'id' => $a['id'],
            'tanggal' => $a['tanggal'],
            'nisn' => $a['nisn'],
            'nama' => $a['nama'],
            'kelas' => $a['kelas'],
            'jamDatang' => $a['jam_datang'] ? substr($a['jam_datang'], 0, 5) : null,
            'jamPulang' => $a['jam_pulang'] ? substr($a['jam_pulang'], 0, 5) : null,
            'status' => $a['status'],
            'keterangan' => $a['keterangan']
        ];
    }, $list);

    sendJson('success', 'Laporan rekap absensi berhasil dimuat', $mapped);
}

sendJson('error', 'Action absensi tidak dikenal.');
