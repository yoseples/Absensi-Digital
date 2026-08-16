<?php
require_once __DIR__ . '/config.php';

// Auto-migrate siswa table if missing password, foto, or indexes
try {
    $pdo->exec("ALTER TABLE siswa ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123456'");
    $pdo->exec("ALTER TABLE siswa ADD COLUMN IF NOT EXISTS foto LONGTEXT");
    $pdo->exec("ALTER TABLE siswa ADD UNIQUE INDEX IF NOT EXISTS idx_siswa_nisn (nisn)");
} catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

if ($method === 'GET') {
    // List all siswa
    $stmt = $pdo->query("SELECT * FROM siswa ORDER BY kelas ASC, nama ASC");
    $siswaList = $stmt->fetchAll();

    // Map database snake_case keys to camelCase for React
    $mapped = array_map(function($s) {
        return [
            'id' => (string)($s['id'] ?? $s['nisn']),
            'nama' => $s['nama'] ?? '',
            'nisn' => (string)($s['nisn'] ?? ''),
            'kelas' => $s['kelas'] ?? '',
            'password' => $s['password'] ?? '123456',
            'jenisKelamin' => $s['jenis_kelamin'] ?? 'Laki-laki',
            'tanggalLahir' => $s['tanggal_lahir'] ?? '',
            'agama' => $s['agama'] ?? 'Islam',
            'namaAyah' => $s['nama_ayah'] ?? '',
            'namaIbu' => $s['nama_ibu'] ?? '',
            'noHp' => $s['no_hp'] ?? '',
            'alamat' => $s['alamat'] ?? '',
            'foto' => $s['foto'] ?? null
        ];
    }, $siswaList);

    sendJson('success', 'Data siswa berhasil dimuat', $mapped);
}

if ($method === 'POST') {
    $action = $_GET['action'] ?? 'save';

    if ($action === 'update_profile') {
        $nisn = trim(str_replace("'", '', $input['nisn'] ?? ''));
        if (empty($nisn)) sendJson('error', 'NISN tidak valid.');

        $updates = [];
        $params = [];

        if (isset($input['foto'])) {
            $updates[] = "foto = ?";
            $params[] = $input['foto'];
        }
        if (isset($input['nama'])) {
            $updates[] = "nama = ?";
            $params[] = $input['nama'];
        }
        if (isset($input['kelas'])) {
            $updates[] = "kelas = ?";
            $params[] = $input['kelas'];
        }
        if (isset($input['password']) && !empty(trim($input['password']))) {
            $updates[] = "password = ?";
            $params[] = trim($input['password']);
        }

        if (empty($updates)) sendJson('error', 'Tidak ada field yang diperbarui.');

        $params[] = $nisn;
        $sql = "UPDATE siswa SET " . implode(", ", $updates) . " WHERE nisn = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        sendJson('success', 'Profil dan password siswa di MySQL berhasil diperbarui');
    }

    // Support single item or batch array sync
    $items = (isset($input[0]) && is_array($input[0])) ? $input : [$input];

    $pdo->beginTransaction();
    try {
        $sql = "INSERT INTO siswa (nama, nisn, kelas, jenis_kelamin, tanggal_lahir, agama, nama_ayah, nama_ibu, no_hp, alamat, foto, password)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                nama=VALUES(nama), kelas=VALUES(kelas), jenis_kelamin=VALUES(jenis_kelamin),
                tanggal_lahir=VALUES(tanggal_lahir), agama=VALUES(agama), nama_ayah=VALUES(nama_ayah),
                nama_ibu=VALUES(nama_ibu), no_hp=VALUES(no_hp), alamat=VALUES(alamat), foto=VALUES(foto),
                password=VALUES(password)";
        $stmt = $pdo->prepare($sql);

        foreach ($items as $item) {
            $nama = trim($item['nama'] ?? '');
            $nisn = trim(str_replace("'", '', $item['nisn'] ?? ''));
            $kelas = trim($item['kelas'] ?? '');
            $password = trim($item['password'] ?? '123456');
            if (empty($password)) $password = '123456';

            if (empty($nama) || empty($nisn) || empty($kelas)) {
                if (count($items) === 1) {
                    $pdo->rollBack();
                    sendJson('error', 'Nama, NISN, dan Kelas wajib diisi.');
                }
                continue;
            }

            // Sanitize tanggal_lahir to valid YYYY-MM-DD or default date to avoid MySQL DATE format error
            $rawDate = trim($item['tanggalLahir'] ?? $item['tanggal_lahir'] ?? '');
            $tanggalLahir = (!empty($rawDate) && $rawDate !== '0000-00-00' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDate))
                ? $rawDate
                : date('Y-m-d');

            // Normalize jenisKelamin
            $jk = $item['jenisKelamin'] ?? $item['jenis_kelamin'] ?? 'Laki-laki';
            if ($jk === 'L' || $jk === 'Laki-laki') {
                $jk = 'Laki-laki';
            } else if ($jk === 'P' || $jk === 'Perempuan') {
                $jk = 'Perempuan';
            } else {
                $jk = 'Laki-laki';
            }

            $stmt->execute([
                $nama,
                $nisn,
                $kelas,
                $jk,
                $tanggalLahir,
                $item['agama'] ?? 'Islam',
                $item['namaAyah'] ?? $item['nama_ayah'] ?? '',
                $item['namaIbu'] ?? $item['nama_ibu'] ?? '',
                $item['noHp'] ?? $item['no_hp'] ?? '',
                $item['alamat'] ?? '',
                !empty($item['foto']) ? $item['foto'] : null,
                $password
            ]);
        }
        $pdo->commit();
        sendJson('success', 'Data siswa berhasil disimpan di database MySQL');
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJson('error', 'Gagal menyimpan data siswa: ' . $e->getMessage());
    }
}

if ($method === 'DELETE') {
    $nisn = trim(str_replace("'", '', $_GET['nisn'] ?? ''));
    if (empty($nisn)) sendJson('error', 'NISN wajib disertakan.');

    $stmt = $pdo->prepare("DELETE FROM siswa WHERE nisn = ?");
    $stmt->execute([$nisn]);

    sendJson('success', 'Siswa berhasil dihapus dari database MySQL');
}



