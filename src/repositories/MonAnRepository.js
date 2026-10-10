const { pool } = require('../config/db');

class MonAnRepository {
    // Kiểm tra giá món ăn
    static kiemTraGia(gia) {
        const giaSo = Number(gia);

        if (!Number.isFinite(giaSo) || giaSo < 0) {
            throw new Error('Giá món ăn không hợp lệ');
        }
    }

    // Kiểm tra trạng thái món ăn
    static kiemTraTrangThai(trangThai) {
        if (!['CON_HANG', 'TAM_HET'].includes(trangThai)) {
            throw new Error('Trạng thái món ăn không hợp lệ');
        }
    }

    // Tìm món ăn theo ID
    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS monId,
        ten_mon AS tenMon,
        gia,
        trang_thai AS trangThai
      FROM mon_an
      WHERE id = ?
      LIMIT 1
      `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        const mon = rows[0];

        return {
            ...mon,
            gia: Number(mon.gia),
        };
    }

    // Lấy danh sách tất cả món ăn
    static async findAll(conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS monId,
        ten_mon AS tenMon,
        gia,
        trang_thai AS trangThai
      FROM mon_an
      ORDER BY ten_mon ASC
      `
        );

        return rows.map((mon) => ({
            ...mon,
            gia: Number(mon.gia),
        }));
    }

    // Cập nhật giá món ăn
    static async capNhatGia(id, gia, conn = pool) {
        if (!id) {
            throw new Error('Thiếu mã món ăn');
        }

        this.kiemTraGia(gia);

        const [result] = await conn.query(
            `
      UPDATE mon_an
      SET gia = ?
      WHERE id = ?
      `,
            [Number(gia), id]
        );

        return result.affectedRows > 0;
    }

    // Cập nhật trạng thái món ăn
    static async capNhatTrangThai(id, trangThai, conn = pool) {
        if (!id) {
            throw new Error('Thiếu mã món ăn');
        }

        this.kiemTraTrangThai(trangThai);

        const [result] = await conn.query(
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