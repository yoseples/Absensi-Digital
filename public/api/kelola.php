<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = getJsonInput();

// Auto create table pengaturan_sekolah if not exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `pengaturan_sekolah` (
      `id` INT PRIMARY KEY DEFAULT 1,
      `config_json` LONGTEXT NOT NULL,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) {}

// 1. GET ALL HOLIDAYS, OPERATIONAL HOURS & APP CONFIG
if ($method === 'GET' && empty($action)) {
    $stmt1 = $pdo->query("SELECT * FROM hari_libur ORDER BY tanggal ASC");
    $holidays = $stmt1->fetchAll();

    $stmt2 = $pdo->query("SELECT * FROM pengaturan_jam WHERE id = 1");
    $jam = $stmt2->fetch() ?: [
        'jam_masuk' => '07:00:00',
        'jam_pulang' => '15:00:00',
        'toleransi_terlambat' => 15
    ];

    $cfg = null;
    try {
        $stmt3 = $pdo->query("SELECT config_json FROM pengaturan_sekolah WHERE id = 1");
        $row = $stmt3->fetch();
        if ($row && !empty($row['config_json'])) {
            $cfg = json_decode($row['config_json'], true);
        }
    } catch (PDOException $e) {}

    sendJson('success', 'Pengaturan berhasil dimuat', [
        'hariLibur' => array_map(fn($h) => ['id' => $h['id'], 'tanggal' => $h['tanggal'], 'keterangan' => $h['keterangan']], $holidays),
        'jamOperasional' => [
            'jamMasuk' => substr($jam['jam_masuk'], 0, 5),
            'jamPulang' => substr($jam['jam_pulang'], 0, 5),
            'toleransi' => (int)$jam['toleransi_terlambat']
        ],
        'config' => $cfg
    ]);
}

// 2. ADD / DELETE HOLIDAY
if ($action === 'libur' && $method === 'POST') {
    $items = (isset($input[0]) && is_array($input[0])) ? $input : [$input];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO hari_libur (tanggal, keterangan) VALUES (?, ?) ON DUPLICATE KEY UPDATE keterangan = VALUES(keterangan)");
        foreach ($items as $item) {
            $tanggal = trim($item['tanggal'] ?? '');
            $keterangan = trim($item['keterangan'] ?? '');
            if (!empty($tanggal) && !empty($keterangan)) {
                $stmt->execute([$tanggal, $keterangan]);
            }
        }
        $pdo->commit();
        sendJson('success', 'Hari libur berhasil disimpan di MySQL');
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJson('error', 'Gagal menyimpan hari libur: ' . $e->getMessage());
    }
}

if ($action === 'libur' && $method === 'DELETE') {
    $tanggal = $_GET['tanggal'] ?? '';
    if (empty($tanggal)) sendJson('error', 'Tanggal libur wajib diisi.');

    $stmt = $pdo->prepare("DELETE FROM hari_libur WHERE tanggal = ?");
    $stmt->execute([$tanggal]);

    sendJson('success', 'Hari libur berhasil dihapus');
}

// 3. SAVE OPERATIONAL HOURS
if ($action === 'jam' && $method === 'POST') {
    $jamMasuk = trim($input['jamMasuk'] ?? '07:00');
    $jamPulang = trim($input['jamPulang'] ?? '15:00');
    $toleransi = (int)($input['toleransi'] ?? 15);

    $stmt = $pdo->prepare("INSERT INTO pengaturan_jam (id, jam_masuk, jam_pulang, toleransi_terlambat) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE jam_masuk = VALUES(jam_masuk), jam_pulang = VALUES(jam_pulang), toleransi_terlambat = VALUES(toleransi_terlambat)");
    $stmt->execute([$jamMasuk . ':00', $jamPulang . ':00', $toleransi]);

    sendJson('success', 'Jam operasional berhasil disimpan di MySQL');
}

// 4. SAVE APP CONFIG JSON TO MYSQL
if ($action === 'config' && $method === 'POST') {
    $json = json_encode($input, JSON_UNESCAPED_UNICODE);
    if (!$json) sendJson('error', 'Format config JSON tidak valid.');

    $stmt = $pdo->prepare("INSERT INTO pengaturan_sekolah (id, config_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)");
    $stmt->execute([$json]);

    sendJson('success', 'Pengaturan sekolah berhasil disimpan di database MySQL');
}
