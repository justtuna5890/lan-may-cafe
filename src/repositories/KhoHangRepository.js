const { pool } = require('../config/db');

function kiemTraSoLuong(soLuong) {
    if (!Number.isFinite(Number(soLuong)) || Number(soLuong) <= 0) {
        throw new Error('Số lượng phải là số hữu hạn lớn hơn 0');
    }
}

class KhoHangRepository {

    // Tìm nguyên liệu theo ID
    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                id,
                ten_nguyen_lieu AS tenNguyenLieu,
                don_vi_tinh AS donViTinh,
                ton_kho AS tonKho
            FROM kho_hang
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Lấy toàn bộ nguyên liệu trong kho
    static async findAll(conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                id,
                ten_nguyen_lieu AS tenNguyenLieu,
                don_vi_tinh AS donViTinh,
                ton_kho AS tonKho
            FROM kho_hang
            ORDER BY ten_nguyen_lieu
            `
        );

        return rows;
    }

    // Nhập thêm nguyên liệu
    static async nhapKho(id, soLuong, conn = pool) {
        kiemTraSoLuong(soLuong);

        const [result] = await conn.query(
            `
            UPDATE kho_hang
            SET ton_kho = ton_kho + ?
            WHERE id = ?
            `,
            [Number(soLuong), id]
        );

        return result.affectedRows > 0;
    }

    // Xuất nguyên liệu
    static async xuatKho(id, soLuong, conn = pool) {
        kiemTraSoLuong(soLuong);

        const [result] = await conn.query(
            `
            UPDATE kho_hang
            SET ton_kho = ton_kho - ?
            WHERE id = ?
              AND ton_kho >= ?
            `,
            [Number(soLuong), id, Number(soLuong)]
        );

        return result.affectedRows > 0;
    }

    // Kiểm tra tồn kho
    static async kiemTraTonKho(id, soLuong, conn = pool) {
        kiemTraSoLuong(soLuong);

        const [rows] = await conn.query(
            `
            SELECT ton_kho AS tonKho
            FROM kho_hang
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (rows.length === 0) {
            return false;
        }

        return Number(rows[0].tonKho) >= Number(soLuong);
    }
}

module.exports = KhoHangRepository;
