<?php
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$input = getJsonInput();

// 1. TEST CONNECTION STATUS
if ($action === 'test') {
    sendJson('success', 'Koneksi database MySQL cPanel Berhasil!', [
        'database' => $db_name,
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'PHP Server'
    ]);
}

// 2. LOGIN
if ($action === 'login') {
    $role = $input['role'] ?? 'siswa';
    
    if ($role === 'siswa') {
        $nisn = trim($input['nisn'] ?? '');
        $password = trim($input['password'] ?? '');
        if (empty($nisn)) sendJson('error', 'Masukkan NISN siswa.');

        $stmt = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ?");
        $stmt->execute([$nisn]);
        $siswa = $stmt->fetch();

        if ($siswa) {
            $dbPass = !empty($siswa['password']) ? $siswa['password'] : '123456';
            if (!empty($password) && $password !== $dbPass) {
                sendJson('error', 'Password siswa salah. Password default: 123456');
            }

            sendJson('success', 'Login Siswa Berhasil', [
                'role' => 'siswa',
                'nama' => $siswa['nama'],
                'nisn' => $siswa['nisn'],
                'kelas' => $siswa['kelas'],
                'foto' => $siswa['foto'],
                'password' => $dbPass,
                'token' => 'tok_siswa_' . $siswa['nisn'] . '_' . time()
            ]);
        } else {
            sendJson('error', "NISN '$nisn' tidak ditemukan. Silakan registrasi terlebih dahulu.");
        }
    } elseif ($role === 'guru') {
        $nip = trim($input['nip'] ?? '');
        $password = trim($input['password'] ?? '');

        if (empty($nip) || empty($password)) sendJson('error', 'NIP dan Password harus diisi.');

        $stmt = $pdo->prepare("SELECT * FROM guru WHERE nip = ? AND password = ?");
        $stmt->execute([$nip, $password]);
        $guru = $stmt->fetch();

        if ($guru) {
            sendJson('success', 'Login Guru Berhasil', [
                'role' => 'guru',
                'nama' => $guru['nama'],
                'nip' => $guru['nip'],
                'kelas' => $guru['kelas_diampu'],
                'token' => 'tok_guru_' . $guru['nip'] . '_' . time()
            ]);
        } else {
            sendJson('error', 'NIP atau Password Guru salah.');
        }
    } else {
        // Admin
        $username = trim($input['username'] ?? '');
        $password = trim($input['password'] ?? '');

        if (empty($username) || empty($password)) sendJson('error', 'Username dan Password harus diisi.');

        $stmt = $pdo->prepare("SELECT * FROM admin WHERE username = ? AND password = ?");
        $stmt->execute([$username, $password]);
        $admin = $stmt->fetch();

        if ($admin) {
            sendJson('success', 'Login Admin Berhasil', [
                'role' => 'admin',
                'nama' => $admin['nama'],
                'username' => $admin['username'],
                'token' => 'tok_admin_' . time()
            ]);
        } else {
            sendJson('error', 'Username atau Password Admin salah.');
        }
    }
}

// 3. REGISTRASI MANDIRI SISWA
if ($action === 'register') {
    $nama = trim($input['nama'] ?? '');
    $nisn = trim($input['nisn'] ?? '');
    $kelas = trim($input['kelas'] ?? '');

    if (empty($nama) || empty($nisn) || empty($kelas)) {
        sendJson('error', 'Nama, NISN, dan Kelas wajib diisi.');
    }

    // Check duplicate
    $check = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
    $check->execute([$nisn]);
    if ($check->fetch()) {
        sendJson('error', "NISN '$nisn' sudah terdaftar dalam database MySQL.");
    }

    $password = trim($input['password'] ?? '123456');
    if (empty($password)) $password = '123456';

    $sql = "INSERT INTO siswa (nama, nisn, kelas, jenis_kelamin, tanggal_lahir, agama, nama_ayah, nama_ibu, no_hp, alamat, foto, password) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $nama,
        $nisn,
        $kelas,
        $input['jenisKelamin'] ?? 'Laki-laki',
        $input['tanggalLahir'] ?? date('Y-m-d'),
        $input['agama'] ?? 'Islam',
        $input['namaAyah'] ?? '',
        $input['namaIbu'] ?? '',
        $input['noHp'] ?? '',
        $input['alamat'] ?? '',
        $input['foto'] ?? null,
        $password
    ]);

    sendJson('success', 'Registrasi mandiri berhasil!', [
        'role' => 'siswa',
        'nama' => $nama,
        'nisn' => $nisn,
        'kelas' => $kelas,
        'token' => 'tok_siswa_' . $nisn . '_' . time()
    ]);
}

sendJson('error', 'Action tidak valid.');
