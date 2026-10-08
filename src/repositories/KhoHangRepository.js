const { pool } = require('../config/db');

class KhoHangRepository {

    // Tìm nguyên liệu theo ID
    static async findById(id) {
        const [rows] = await pool.query(
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
    static async findAll() {
        const [rows] = await pool.query(
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
    static async nhapKho(id, soLuong) {
        const [result] = await pool.query(
            `
            UPDATE kho_hang
            SET ton_kho = ton_kho + ?
            WHERE id = ?
            `,
            [soLuong, id]
        );

        return result.affectedRows > 0;
    }

    // Xuất nguyên liệu
    static async xuatKho(id, soLuong) {
        const [result] = await pool.query(
            `
            UPDATE kho_hang
            SET ton_kho = ton_kho - ?
            WHERE id = ?
              AND ton_kho >= ?
            `,
            [soLuong, id, soLuong]
        );

        return result.affectedRows > 0;
    }

    // Kiểm tra tồn kho
    static async kiemTraTonKho(id, soLuong) {
        const [rows] = await pool.query(
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