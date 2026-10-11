const { pool } = require('../config/db');

class BanRepository {
    // Danh sach ban cho so do ban (GET /tables)
    static async findAll(conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id AS banId,
        so_ban AS tenBan,
        trang_thai AS trangThai
      FROM ban
      ORDER BY so_ban ASC
      `
        );

        return rows;
    }

    // Tìm bàn theo ID
    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS banId,
        so_ban AS soBan,
        so_ban AS tenBan,
        trang_thai AS trangThai
      FROM ban
      WHERE id = ?
      LIMIT 1
      `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Cập nhật trạng thái bàn.
    // Có thể truyền connection để chạy trong transaction.
    static async capNhatTrangThai(id, trangThai, conn = pool) {
        if (!id) {
            throw new Error('Thiếu mã bàn');
        }

        if (typeof trangThai !== 'string' || !trangThai) {
            throw new Error('Trạng thái bàn không hợp lệ');
        }

        const [result] = await conn.query(
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
