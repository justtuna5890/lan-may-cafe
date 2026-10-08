-- ============================================================
-- LÀN MÂY CAFE
-- A1 - DATABASE SCHEMA
-- 9 TABLES
-- ============================================================
DROP DATABASE IF EXISTS lan_may_cafe;

CREATE DATABASE lan_may_cafe CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lan_may_cafe;

SET
    NAMES utf8mb4;

SET
    FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. NHAN_VIEN
-- ============================================================
CREATE TABLE nhan_vien (
    id VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    ho_ten VARCHAR(100) NOT NULL,
    vai_tro ENUM ('THU_NGAN', 'BARISTA', 'CHU_QUAN', 'PHUC_VU') NOT NULL,
    trang_thai ENUM ('HOAT_DONG', 'BI_KHOA', 'VO_HIEU') NOT NULL DEFAULT 'HOAT_DONG',
    so_lan_sai INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_nhan_vien_username (username),
    CONSTRAINT chk_nhan_vien_so_lan_sai CHECK (so_lan_sai >= 0)
) ENGINE = InnoDB;

-- ============================================================
-- 2. BAN
-- ============================================================
CREATE TABLE ban (
    id VARCHAR(36) NOT NULL,
    so_ban VARCHAR(20) NOT NULL,
    trang_thai ENUM ('TRONG', 'DANG_PHUC_VU', 'CAN_DON', 'DAT_TRUOC') NOT NULL DEFAULT 'TRONG',
    ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ban_so_ban (so_ban)
) ENGINE = InnoDB;

-- ============================================================
-- 3. KHACH_HANG
-- ============================================================
CREATE TABLE khach_hang (
    id VARCHAR(36) NOT NULL,
    ho_ten VARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_khach_hang_so_dien_thoai (so_dien_thoai),
    UNIQUE KEY uk_khach_hang_email (email)
) ENGINE = InnoDB;

-- ============================================================
-- 4. DON_HANG
-- ============================================================
CREATE TABLE don_hang (
    id VARCHAR(36) NOT NULL,
    ban_id VARCHAR(36) NULL,
    khach_hang_id VARCHAR(36) NULL,
    nhan_vien_id VARCHAR(36) NULL,
    tong_tien DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tien_giam_gia DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    trang_thai ENUM ('DANG_PHUC_VU', 'HOAN_THANH', 'DA_THANH_TOAN') NOT NULL DEFAULT 'DANG_PHUC_VU',
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_don_hang_ban (ban_id),
    KEY idx_don_hang_khach_hang (khach_hang_id),
    KEY idx_don_hang_nhan_vien (nhan_vien_id),
    CONSTRAINT fk_don_hang_ban FOREIGN KEY (ban_id) REFERENCES ban (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_don_hang_khach_hang FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_don_hang_nhan_vien FOREIGN KEY (nhan_vien_id) REFERENCES nhan_vien (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_don_hang_tong_tien CHECK (tong_tien >= 0),
    CONSTRAINT chk_don_hang_giam_gia CHECK (tien_giam_gia >= 0)
) ENGINE = InnoDB;

-- ============================================================
-- 5. MON_AN
-- ============================================================
CREATE TABLE mon_an (
    id VARCHAR(36) NOT NULL,
    ten_mon VARCHAR(100) NOT NULL,
    gia DECIMAL(12, 2) NOT NULL,
    trang_thai ENUM ('CON_HANG', 'TAM_HET') NOT NULL DEFAULT 'CON_HANG',
    PRIMARY KEY (id),
    CONSTRAINT chk_mon_an_gia CHECK (gia >= 0)
) ENGINE = InnoDB;

-- ============================================================
-- 6. CHI_TIET_DON
-- ============================================================
CREATE TABLE chi_tiet_don (
    id VARCHAR(36) NOT NULL,
    don_hang_id VARCHAR(36) NOT NULL,
    mon_an_id VARCHAR(36) NOT NULL,
    so_luong INT NOT NULL,
    don_gia DECIMAL(12, 2) NOT NULL,
    ghi_chu VARCHAR(255) NULL,
    trang_thai_che_bien ENUM ('CHO_PHA_CHE', 'DANG_LAM', 'DA_XONG', 'DA_HUY') NOT NULL DEFAULT 'CHO_PHA_CHE',
    PRIMARY KEY (id),
    KEY idx_ctd_don_hang (don_hang_id),
    KEY idx_ctd_mon_an (mon_an_id),
    CONSTRAINT fk_ctd_don_hang FOREIGN KEY (don_hang_id) REFERENCES don_hang (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ctd_mon_an FOREIGN KEY (mon_an_id) REFERENCES mon_an (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_ctd_so_luong CHECK (so_luong > 0),
    CONSTRAINT chk_ctd_don_gia CHECK (don_gia >= 0)
) ENGINE = InnoDB;

-- ============================================================
-- 7. THANH_TOAN
-- ============================================================
CREATE TABLE thanh_toan (
    id VARCHAR(36) NOT NULL,
    don_hang_id VARCHAR(36) NOT NULL,
    phuong_thuc ENUM ('TIEN_MAT', 'QR') NOT NULL,
    so_tien DECIMAL(12, 2) NOT NULL,
    tien_khach_dua DECIMAL(12, 2) NULL,
    tien_thoi DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ma_giao_dich VARCHAR(100) NOT NULL,
    trang_thai ENUM ('CHO_XU_LY', 'THANH_CONG', 'THAT_BAI', 'DA_HUY') NOT NULL DEFAULT 'CHO_XU_LY',
    nhan_vien_id VARCHAR(36) NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_thanh_toan_ma_giao_dich (ma_giao_dich),
    KEY idx_thanh_toan_don_hang (don_hang_id),
    KEY idx_thanh_toan_nhan_vien (nhan_vien_id),
    CONSTRAINT fk_thanh_toan_don_hang FOREIGN KEY (don_hang_id) REFERENCES don_hang (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_thanh_toan_nhan_vien FOREIGN KEY (nhan_vien_id) REFERENCES nhan_vien (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_thanh_toan_so_tien CHECK (so_tien >= 0),
    CONSTRAINT chk_thanh_toan_tien_thoi CHECK (tien_thoi >= 0)
) ENGINE = InnoDB;

-- ============================================================
-- 8. KHO_HANG
-- ============================================================
CREATE TABLE kho_hang (
    id VARCHAR(36) NOT NULL,
    ten_nguyen_lieu VARCHAR(100) NOT NULL,
    don_vi_tinh VARCHAR(30) NOT NULL,
    ton_kho DOUBLE NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT chk_kho_hang_ton_kho CHECK (ton_kho >= 0)
) ENGINE = InnoDB;

-- ============================================================
-- 9. CONG_THUC_MON
-- ============================================================
CREATE TABLE cong_thuc_mon (
    id VARCHAR(36) NOT NULL,
    mon_an_id VARCHAR(36) NOT NULL,
    kho_hang_id VARCHAR(36) NOT NULL,
    so_luong DOUBLE NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cong_thuc_mon (mon_an_id, kho_hang_id),
    KEY idx_ctm_mon_an (mon_an_id),
    KEY idx_ctm_kho_hang (kho_hang_id),
    CONSTRAINT fk_ctm_mon_an FOREIGN KEY (mon_an_id) REFERENCES mon_an (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ctm_kho_hang FOREIGN KEY (kho_hang_id) REFERENCES kho_hang (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_ctm_so_luong CHECK (so_luong > 0)
) ENGINE = InnoDB;

SET
    FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- KIỂM TRA
-- ============================================================
SHOW TABLES;