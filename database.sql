-- ============================================================
-- DATABASE SCHEMA & SEED DATA UNTUK APLIKASI ABSENSI SEKOLAH
-- SMA NEGERI
-- Siap di-import langsung ke phpMyAdmin / MySQL cPanel / Hostinger
-- (Tanpa query 'CREATE DATABASE' / 'USE' untuk mencegah Error #1044 Access Denied)
-- ============================================================

-- 1. Tabel Admin
CREATE TABLE IF NOT EXISTS `admin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `admin` (`username`, `password`, `nama`) VALUES
('admin', 'admin123', 'Administrator Utama')
ON DUPLICATE KEY UPDATE `nama`=`nama`;

-- 2. Tabel Guru
CREATE TABLE IF NOT EXISTS `guru` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `nip` VARCHAR(50) DEFAULT NULL,
  `kelas_diampu` VARCHAR(20) DEFAULT 'Semua',
  `no_hp` VARCHAR(20),
  `foto` LONGTEXT,
  `password` VARCHAR(255) NOT NULL DEFAULT '123456',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `guru` (`nama`, `username`, `nip`, `kelas_diampu`, `no_hp`, `password`) VALUES
('Budi Setiawan, S.Pd', 'budi', '198501012010011001', 'X-A', '081234567890', 'guru123'),
('Siti Rahma, M.Pd', 'siti', '198802022012022002', 'X-B', '081398765432', 'guru123'),
('Ahmad Fauzi, S.Si', 'fauzi', '199003032015031003', 'XI-A', '085211223344', 'guru123')
ON DUPLICATE KEY UPDATE `nama`=`nama`;

-- 3. Tabel Siswa
CREATE TABLE IF NOT EXISTS `siswa` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(100) NOT NULL,
  `nisn` VARCHAR(30) NOT NULL UNIQUE,
  `kelas` VARCHAR(20) NOT NULL,
  `jenis_kelamin` ENUM('Laki-laki', 'Perempuan') DEFAULT 'Laki-laki',
  `tanggal_lahir` DATE,
  `agama` VARCHAR(30) DEFAULT 'Islam',
  `nama_ayah` VARCHAR(100),
  `nama_ibu` VARCHAR(100),
  `no_hp` VARCHAR(20),
  `alamat` TEXT,
  `foto` LONGTEXT,
  `password` VARCHAR(255) NOT NULL DEFAULT '123456',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `siswa` (`nama`, `nisn`, `kelas`, `jenis_kelamin`, `tanggal_lahir`, `agama`, `nama_ayah`, `nama_ibu`, `no_hp`, `alamat`, `foto`) VALUES
('Ahmad Rizky Pratama', '0051234567', 'X-A', 'Laki-laki', '2008-05-12', 'Islam', 'Budi Santoso', 'Siti Aminah', '081234567890', 'Jl. Merdeka No. 45, Lhoksukon, Aceh Utara', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop'),
('Siti Nurhaliza', '0052345678', 'X-A', 'Perempuan', '2008-08-20', 'Islam', 'Rahmat Hidayat', 'Dewi Rahmawati', '081398765432', 'Jl. Sudirman No. 12, Lhoksukon, Aceh Utara', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop'),
('Budi Santoso', '0053456789', 'X-B', 'Laki-laki', '2008-02-14', 'Islam', 'Joko Widodo', 'Kartini', '085211223344', 'Jl. Banda Aceh-Medan Km. 300, Lhoksukon', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop'),
('Dewi Lestari', '0054567890', 'X-B', 'Perempuan', '2008-11-05', 'Islam', 'Bambang', 'Sri Wahyuni', '082155667788', 'Jl. Cot Girek No. 3, Lhoksukon', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop'),
('Eko Prasetyo', '0055678901', 'XI-A', 'Laki-laki', '2007-04-18', 'Islam', 'Supriyanto', 'Endang Lestari', '081988776655', 'Jl. Perintis Kemerdekaan No. 101, Lhoksukon', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop'),
('Fiona Putri Maharani', '0056789012', 'XI-A', 'Perempuan', '2007-09-30', 'Islam', 'Hendra Gunawan', 'Maria Ulfa', '081277665544', 'Jl. Pembangunan No. 22, Lhoksukon', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop')
ON DUPLICATE KEY UPDATE `nama`=`nama`;

-- 4. Tabel Absensi
CREATE TABLE IF NOT EXISTS `absensi` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL,
  `nisn` VARCHAR(30) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `kelas` VARCHAR(20) NOT NULL,
  `jam_datang` TIME DEFAULT NULL,
  `jam_pulang` TIME DEFAULT NULL,
  `status` ENUM('Hadir', 'Izin', 'Sakit', 'Alpa') DEFAULT 'Hadir',
  `keterangan` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_daily_absen` (`tanggal`, `nisn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Hari Libur
CREATE TABLE IF NOT EXISTS `hari_libur` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL UNIQUE,
  `keterangan` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `hari_libur` (`tanggal`, `keterangan`) VALUES
('2026-08-17', 'HUT Kemerdekaan RI'),
('2026-12-25', 'Hari Raya Natal')
ON DUPLICATE KEY UPDATE `keterangan`=`keterangan`;

-- 6. Tabel Pengaturan Jam Operasional
CREATE TABLE IF NOT EXISTS `pengaturan_jam` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `jam_masuk` TIME DEFAULT '07:00:00',
  `jam_pulang` TIME DEFAULT '15:00:00',
  `toleransi_terlambat` INT DEFAULT 15
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `pengaturan_jam` (`id`, `jam_masuk`, `jam_pulang`, `toleransi_terlambat`) VALUES
(1, '07:00:00', '15:00:00', 15)
ON DUPLICATE KEY UPDATE `jam_masuk`='07:00:00';

-- 7. Tabel Pengaturan Sekolah
CREATE TABLE IF NOT EXISTS `pengaturan_sekolah` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `config_json` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
