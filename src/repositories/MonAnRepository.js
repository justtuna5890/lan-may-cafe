const { pool } = require('../config/db');

class MonAnRepository {

    // Tìm món ăn theo ID
    static async findById(id) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                ten_mon AS tenMon,
                gia,
                trang_thai AS trangThai
            FROM mon_an
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Lấy danh sách tất cả món ăn
    static async findAll() {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                ten_mon AS tenMon,
                gia,
                trang_thai AS trangThai
            FROM mon_an
            ORDER BY ten_mon
            `
        );

        return rows;
    }

    // Cập nhật giá món ăn
    static async capNhatGia(id, gia) {
        const [result] = await pool.query(
            `
            UPDATE mon_an
            SET gia = ?
            WHERE id = ?
            `,
            [gia, id]
        );

        return result.affectedRows > 0;
    }

    // Cập nhật trạng thái món ăn
    static async capNhatTrangThai(id, trangThai) {
        const [result] = await pool.query(
            `
            UPDATE mon_an
            SET trang_thai = ?
            WHERE id = ?
            `,
            [trangThai, id]
        );

        return result.affectedRows > 0;
    }
}

module.exports = MonAnRepository;