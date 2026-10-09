const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

class NhanVienRepository {

    // Tìm nhân viên theo ID
    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
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
    static async findByUsername(username, conn = pool) {
        const [rows] = await conn.query(
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
    static async dangNhap(username, matKhau, conn = pool) {
        const nhanVien = await this.findByUsername(username, conn);
        if (!nhanVien) {
            return null;
        }

        const dungMatKhau = await bcrypt.compare(matKhau, nhanVien.matKhau);
        return dungMatKhau ? nhanVien : null;
    }
}

module.exports = NhanVienRepository;
