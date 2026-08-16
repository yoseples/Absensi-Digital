<?php
require_once __DIR__ . '/config.php';

// Auto-migrate guru table if missing columns or wrong nullability
try {
    $pdo->exec("ALTER TABLE guru ADD COLUMN IF NOT EXISTS username VARCHAR(50)");
    $pdo->exec("ALTER TABLE guru ADD COLUMN IF NOT EXISTS foto LONGTEXT");
    $pdo->exec("ALTER TABLE guru MODIFY COLUMN nip VARCHAR(50) NULL");
    $pdo->exec("ALTER TABLE guru ADD UNIQUE INDEX IF NOT EXISTS idx_guru_username (username)");
} catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM guru ORDER BY nama ASC");
    $guruList = $stmt->fetchAll();

    $mapped = array_map(function($g) {
        $username = !empty($g['username']) ? $g['username'] : (!empty($g['nip']) ? $g['nip'] : '');
        return [
            'id' => (string)($g['id'] ?? $g['nip'] ?? $username),
            'nama' => $g['nama'] ?? '',
            'nip' => $g['nip'] ?? '',
            'username' => $username,
            'kelasDiampu' => $g['kelas_diampu'] ?? 'Semua',
            'kelas' => $g['kelas_diampu'] ?? 'Semua',
            'noHp' => $g['no_hp'] ?? '',
            'foto' => $g['foto'] ?? '',
            'password' => $g['password'] ?? '123456'
        ];
    }, $guruList);

    sendJson('success', 'Data guru berhasil dimuat', $mapped);
}

if ($method === 'POST') {
    // Check if input is a list of items (batch sync)
    $items = (isset($input[0]) && is_array($input[0])) ? $input : [$input];

    $pdo->beginTransaction();
    try {
        $sql = "INSERT INTO guru (nama, username, nip, kelas_diampu, no_hp, foto, password)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                nama=VALUES(nama), username=VALUES(username), nip=VALUES(nip), kelas_diampu=VALUES(kelas_diampu), no_hp=VALUES(no_hp), foto=VALUES(foto), password=VALUES(password)";
        $stmt = $pdo->prepare($sql);

        foreach ($items as $item) {
            $nama = trim($item['nama'] ?? '');
            $username = trim($item['username'] ?? $item['nip'] ?? '');
            if (empty($username) && !empty($nama)) {
                $username = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $nama));
            }
            $nip = trim($item['nip'] ?? '');
            $password = trim($item['password'] ?? '123456');

            if (empty($nama) || empty($username)) {
                if (count($items) === 1) {
                    $pdo->rollBack();
                    sendJson('error', 'Nama dan Username/NIP wajib diisi.');
                }
                continue;
            }

            $stmt->execute([
                $nama,
                $username,
                !empty($nip) ? $nip : null,
                $item['kelasDiampu'] ?? $item['kelas'] ?? 'Semua',
                $item['noHp'] ?? '',
                !empty($item['foto']) ? $item['foto'] : null,
                $password
            ]);
        }
        $pdo->commit();
        sendJson('success', 'Data guru berhasil disimpan di database MySQL');
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJson('error', 'Gagal menyimpan data guru: ' . $e->getMessage());
    }
}

if ($method === 'DELETE') {
    $nip = $_GET['nip'] ?? $_GET['username'] ?? '';
    if (empty($nip)) sendJson('error', 'NIP atau Username wajib disertakan.');

    $stmt = $pdo->prepare("DELETE FROM guru WHERE nip = ? OR username = ?");
    $stmt->execute([$nip, $nip]);

    sendJson('success', 'Data guru berhasil dihapus dari MySQL');
}


