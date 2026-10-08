const { pool } = require('../config/db');

class NhanVienRepository {

    // Tìm nhân viên theo ID
    static async findById(id) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                username,
                mat_khau AS matKhau,
                ho_ten AS hoTen,
                vai_tro AS vaiTro,
                trang_thai AS trangThai,
                so_lan_sai AS soLanSai
            FROM nhan_vien
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Tìm nhân viên theo username
    static async findByUsername(username) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                username,
                mat_khau AS matKhau,
                ho_ten AS hoTen,
                vai_tro AS vaiTro,
                trang_thai AS trangThai,
                so_lan_sai AS soLanSai
            FROM nhan_vien
            WHERE username = ?
            LIMIT 1
            `,
            [username]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Kiểm tra đăng nhập
    static async dangNhap(username, matKhau) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                username,
                mat_khau AS matKhau,
                ho_ten AS hoTen,
                vai_tro AS vaiTro,
                trang_thai AS trangThai,
                so_lan_sai AS soLanSai
            FROM nhan_vien
            WHERE username = ?
              AND mat_khau = ?
            LIMIT 1
            `,
            [username, matKhau]
        );

        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = NhanVienRepository;