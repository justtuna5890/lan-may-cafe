-- ============================================================
-- LÀN MÂY CAFE
-- A2 - SEED DATA
-- MySQL 8.0
-- Phù hợp với schema.sql đã bổ sung is_synced và ngay_tao
-- ============================================================
USE lan_may_cafe;

SET
    NAMES utf8mb4;

-- ============================================================
-- 1. NHAN_VIEN
-- Password test dự kiến: 123456
-- ============================================================
INSERT INTO
    nhan_vien (
        id,
        username,
        mat_khau,
        ho_ten,
        vai_tro,
        trang_thai,
        so_lan_sai
    )
VALUES
    (
        'nv-001',
        'phucvu01',
        '$2b$10$VXnS585ISxsI7DldPj5RCu85dHUWJXM5PfRYELfkpHBa9IsIGFDe6',
        'Nguyễn Văn Phục Vụ',
        'PHUC_VU',
        'HOAT_DONG',
        0
    ),
    (
        'nv-002',
        'barista01',
        '$2b$10$VXnS585ISxsI7DldPj5RCu85dHUWJXM5PfRYELfkpHBa9IsIGFDe6',
        'Nguyễn Văn Barista',
        'BARISTA',
        'HOAT_DONG',
        0
    ),
    (
        'nv-003',
        'thungan01',
        '$2b$10$VXnS585ISxsI7DldPj5RCu85dHUWJXM5PfRYELfkpHBa9IsIGFDe6',
        'Nguyễn Văn Thu Ngân',
        'THU_NGAN',
        'HOAT_DONG',
        0
    ),
    (
        'nv-004',
        'chutquan01',
        '$2b$10$VXnS585ISxsI7DldPj5RCu85dHUWJXM5PfRYELfkpHBa9IsIGFDe6',
        'Nguyễn Văn Chủ Quán',
        'CHU_QUAN',
        'HOAT_DONG',
        0
    ),
    (
        'nv-005',
        'blocked01',
        '$2b$10$VXnS585ISxsI7DldPj5RCu85dHUWJXM5PfRYELfkpHBa9IsIGFDe6',
        'Nguyễn Văn Bị Khóa',
        'PHUC_VU',
        'BI_KHOA',
        5
    );

-- ============================================================
-- 2. BAN
-- 12 bàn, có đủ 4 trạng thái
-- ============================================================
INSERT INTO
    ban (id, so_ban, trang_thai)
VALUES
    ('ban-01', 'B01', 'TRONG'),
    ('ban-02', 'B02', 'TRONG'),
    ('ban-03', 'B03', 'DANG_PHUC_VU'),
    ('ban-04', 'B04', 'DANG_PHUC_VU'),
    ('ban-05', 'B05', 'CAN_DON'),
    ('ban-06', 'B06', 'CAN_DON'),
    ('ban-07', 'B07', 'DAT_TRUOC'),
    ('ban-08', 'B08', 'DAT_TRUOC'),
    ('ban-09', 'B09', 'TRONG'),
    ('ban-10', 'B10', 'TRONG'),
    ('ban-11', 'B11', 'TRONG'),
    ('ban-12', 'B12', 'TRONG');

-- ============================================================
-- 3. KHACH_HANG
-- ============================================================
INSERT INTO
    khach_hang (id, ho_ten, so_dien_thoai, email)
VALUES
    (
        'kh-001',
        'Trần Văn An',
        '0900000001',
        'an@example.com'
    ),
    (
        'kh-002',
        'Nguyễn Thị Lan',
        '0900000002',
        'lan@example.com'
    ),
    (
        'kh-003',
        'Lê Minh Tuấn',
        '0900000003',
        'tuan@example.com'
    ),
    (
        'kh-004',
        'Phạm Hoàng Sơn',
        '0900000004',
        'son@example.com'
    );

-- ============================================================
-- 4. MON_AN
-- 15 món
-- Bạc xỉu đang tạm hết
-- ============================================================
INSERT INTO
    mon_an (id, ten_mon, gia, trang_thai)
VALUES
    ('mon-01', 'Cà phê đen', 25000, 'CON_HANG'),
    ('mon-02', 'Cà phê sữa', 30000, 'CON_HANG'),
    ('mon-03', 'Bạc xỉu', 35000, 'TAM_HET'),
    ('mon-04', 'Trà đào', 40000, 'CON_HANG'),
    ('mon-05', 'Trà chanh', 25000, 'CON_HANG'),
    ('mon-06', 'Trà sữa', 35000, 'CON_HANG'),
    ('mon-07', 'Matcha Latte', 45000, 'CON_HANG'),
    ('mon-08', 'Chocolate đá', 40000, 'CON_HANG'),
    ('mon-09', 'Bánh Tiramisu', 45000, 'CON_HANG'),
    ('mon-10', 'Bánh Croissant', 30000, 'CON_HANG'),
    ('mon-11', 'Cà phê americano', 40000, 'CON_HANG'),
    ('mon-12', 'Espresso', 30000, 'CON_HANG'),
    ('mon-13', 'Trà vải', 40000, 'CON_HANG'),
    ('mon-14', 'Trà dâu', 40000, 'CON_HANG'),
    ('mon-15', 'Bánh cookies', 20000, 'CON_HANG');

-- ============================================================
-- 5. KHO_HANG
-- 10 nguyên liệu, kho-10 có tồn kho bằng 0
-- ============================================================
INSERT INTO
    kho_hang (id, ten_nguyen_lieu, don_vi_tinh, ton_kho)
VALUES
    ('kho-01', 'Cà phê hạt', 'gram', 5000),
    ('kho-02', 'Sữa đặc', 'ml', 3000),
    ('kho-03', 'Sữa tươi', 'ml', 5000),
    ('kho-04', 'Trà đào', 'gram', 2000),
    ('kho-05', 'Trà đen', 'gram', 3000),
    ('kho-06', 'Bột matcha', 'gram', 1000),
    ('kho-07', 'Chocolate', 'gram', 2000),
    ('kho-08', 'Bột mì', 'gram', 5000),
    ('kho-09', 'Dâu tây', 'gram', 1500),
    ('kho-10', 'Siro bạc xỉu', 'ml', 0);

-- ============================================================
-- 6. CONG_THUC_MON
-- ============================================================
INSERT INTO
    cong_thuc_mon (id, mon_an_id, kho_hang_id, so_luong)
VALUES
    -- Cà phê đen
    ('ctm-001', 'mon-01', 'kho-01', 20),
    -- Cà phê sữa
    ('ctm-002', 'mon-02', 'kho-01', 20),
    ('ctm-003', 'mon-02', 'kho-02', 20),
    -- Bạc xỉu
    ('ctm-004', 'mon-03', 'kho-03', 100),
    ('ctm-005', 'mon-03', 'kho-10', 30),
    -- Trà đào
    ('ctm-006', 'mon-04', 'kho-04', 20),
    -- Trà chanh
    ('ctm-007', 'mon-05', 'kho-05', 10),
    -- Trà sữa
    ('ctm-008', 'mon-06', 'kho-05', 15),
    ('ctm-009', 'mon-06', 'kho-03', 100),
    -- Matcha
    ('ctm-010', 'mon-07', 'kho-06', 10),
    ('ctm-011', 'mon-07', 'kho-03', 100),
    -- Chocolate
    ('ctm-012', 'mon-08', 'kho-07', 20),
    ('ctm-013', 'mon-08', 'kho-03', 100),
    -- Tiramisu
    ('ctm-014', 'mon-09', 'kho-08', 100),
    -- Croissant
    ('ctm-015', 'mon-10', 'kho-08', 80),
    -- Americano
    ('ctm-016', 'mon-11', 'kho-01', 20),
    -- Espresso
    ('ctm-017', 'mon-12', 'kho-01', 18),
    -- Trà vải
    ('ctm-018', 'mon-13', 'kho-05', 15),
    -- Trà dâu
    ('ctm-019', 'mon-14', 'kho-09', 50),
    -- Cookies
    ('ctm-020', 'mon-15', 'kho-08', 40);

-- ============================================================
-- 7. DON_HANG
-- 4 đơn hàng
-- is_synced:
-- TRUE  = đã đồng bộ với KDS
-- FALSE = chưa đồng bộ với KDS
-- ============================================================
INSERT INTO
    don_hang (
        id,
        ban_id,
        khach_hang_id,
        nhan_vien_id,
        tong_tien,
        tien_giam_gia,
        trang_thai,
        is_synced,
        ngay_tao
    )
VALUES
    (
        'dh-001',
        'ban-03',
        'kh-001',
        'nv-001',
        85000,
        0,
        'DANG_PHUC_VU',
        TRUE,
        '2026-10-08 08:00:00'
    ),
    (
        'dh-002',
        'ban-04',
        'kh-002',
        'nv-001',
        100000,
        0,
        'HOAN_THANH',
        TRUE,
        '2026-10-08 08:15:00'
    ),
    (
        'dh-003',
        'ban-05',
        'kh-003',
        'nv-003',
        60000,
        0,
        'DA_THANH_TOAN',
        TRUE,
        '2026-10-08 08:30:00'
    ),
    (
        'dh-004',
        'ban-06',
        'kh-004',
        'nv-001',
        70000,
        0,
        'DANG_PHUC_VU',
        TRUE,
        '2026-10-08 08:45:00'
    );

-- ============================================================
-- 8. CHI_TIET_DON
-- Có đủ trạng thái chế biến để kiểm thử UC15 / UC16
-- ============================================================
INSERT INTO
    chi_tiet_don (
        id,
        don_hang_id,
        mon_an_id,
        so_luong,
        don_gia,
        ghi_chu,
        trang_thai_che_bien,
        ngay_tao
    )
VALUES
    -- Đơn 001
    (
        'ct-001',
        'dh-001',
        'mon-02',
        2,
        30000,
        'Ít đá',
        'DANG_LAM',
        '2026-10-08 08:00:10'
    ),
    (
        'ct-002',
        'dh-001',
        'mon-01',
        1,
        25000,
        'Không đường',
        'CHO_PHA_CHE',
        '2026-10-08 08:00:20'
    ),
    -- Đơn 002
    (
        'ct-003',
        'dh-002',
        'mon-02',
        2,
        30000,
        NULL,
        'DA_XONG',
        '2026-10-08 08:15:10'
    ),
    (
        'ct-004',
        'dh-002',
        'mon-04',
        1,
        40000,
        'Ít ngọt',
        'DA_XONG',
        '2026-10-08 08:15:20'
    ),
    -- Đơn 003
    -- Không sử dụng Bạc xỉu vì mon-03 đang TAM_HET
    (
        'ct-005',
        'dh-003',
        'mon-02',
        1,
        30000,
        NULL,
        'DA_XONG',
        '2026-10-08 08:30:10'
    ),
    (
        'ct-006',
        'dh-003',
        'mon-12',
        1,
        30000,
        NULL,
        'DA_XONG',
        '2026-10-08 08:30:20'
    ),
    -- Đơn 004
    (
        'ct-007',
        'dh-004',
        'mon-04',
        1,
        40000,
        NULL,
        'DANG_LAM',
        '2026-10-08 08:45:10'
    ),
    (
        'ct-008',
        'dh-004',
        'mon-02',
        1,
        30000,
        'Khách đổi ý',
        'DA_HUY',
        '2026-10-08 08:45:20'
    );

-- ============================================================
-- 9. THANH_TOAN
-- Một giao dịch thanh toán thành công
-- ============================================================
INSERT INTO
    thanh_toan (
        id,
        don_hang_id,
        phuong_thuc,
        so_tien,
        tien_khach_dua,
        tien_thoi,
        ma_giao_dich,
        trang_thai,
        nhan_vien_id
    )
VALUES
    (
        'tt-001',
        'dh-003',
        'TIEN_MAT',
        60000,
        70000,
        10000,
        'GD-20261008-001',
        'THANH_CONG',
        'nv-003'
    );

-- ============================================================
-- KIỂM TRA SỐ LƯỢNG DỮ LIỆU
-- ============================================================
SELECT
    'nhan_vien' AS bang,
    COUNT(*) AS so_luong
FROM
    nhan_vien
UNION ALL
SELECT
    'ban',
    COUNT(*)
FROM
    ban
UNION ALL
SELECT
    'khach_hang',
    COUNT(*)
FROM
    khach_hang
UNION ALL
SELECT
    'don_hang',
    COUNT(*)
FROM
    don_hang
UNION ALL
SELECT
    'chi_tiet_don',
    COUNT(*)
FROM
    chi_tiet_don
UNION ALL
SELECT
    'thanh_toan',
    COUNT(*)
FROM
    thanh_toan
UNION ALL
SELECT
    'mon_an',
    COUNT(*)
FROM
    mon_an
UNION ALL
SELECT
    'kho_hang',
    COUNT(*)
FROM
    kho_hang
UNION ALL
SELECT
    'cong_thuc_mon',
    COUNT(*)
FROM
    cong_thuc_mon;

-- ============================================================
-- KIỂM TRA TRẠNG THÁI ĐỒNG BỘ ĐƠN HÀNG
-- ============================================================
SELECT
    id AS donHangId,
    trang_thai AS trangThai,
    is_synced AS isSynced,
    ngay_tao AS ngayTao
FROM
    don_hang
ORDER BY
    ngay_tao ASC;

-- ============================================================
-- KIỂM TRA RIÊNG DỮ LIỆU UC15 / UC16
-- Sắp xếp theo thời gian tạo món (FIFO)
-- ============================================================
SELECT
    ct.id AS chiTietId,
    ct.don_hang_id AS donHangId,
    d.is_synced AS isSynced,
    d.ngay_tao AS ngayTaoDon,
    ct.ngay_tao AS ngayTaoMon,
    b.so_ban AS soBan,
    m.id AS monId,
    m.ten_mon AS tenMon,
    ct.so_luong AS soLuong,
    ct.don_gia AS donGia,
    ct.ghi_chu AS ghiChu,
    ct.trang_thai_che_bien AS trangThaiCheBien
FROM
    chi_tiet_don ct
    JOIN don_hang d ON d.id = ct.don_hang_id
    JOIN mon_an m ON m.id = ct.mon_an_id
    LEFT JOIN ban b ON b.id = d.ban_id
ORDER BY
    ct.ngay_tao ASC,
    ct.id ASC;

-- ============================================================
-- KIỂM TRA NGUYÊN LIỆU CÓ TỒN KHO BẰNG 0
-- ============================================================
SELECT
    id,
    ten_nguyen_lieu,
    don_vi_tinh,
    ton_kho
FROM
    kho_hang
WHERE
    ton_kho = 0;

-- ============================================================
-- KIỂM TRA MÓN TẠM HẾT
-- ============================================================
SELECT
    id,
    ten_mon,
    gia,
    trang_thai
FROM
    mon_an
WHERE
    trang_thai = 'TAM_HET';
