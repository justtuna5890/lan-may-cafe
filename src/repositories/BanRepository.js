const { pool } = require('../config/db');

class BanRepository {

    // Tìm bàn theo ID
    static async findById(id) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                so_ban AS soBan,
                trang_thai AS trangThai
            FROM ban
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Cập nhật trạng thái bàn
    static async capNhatTrangThai(id, trangThai) {
        const [result] = await pool.query(
            `
            UPDATE ban
            SET trang_thai = ?
            WHERE id = ?
            `,
            [trangThai, id]
        );

        return result.affectedRows > 0;
    }
}

module.exports = BanRepository;
