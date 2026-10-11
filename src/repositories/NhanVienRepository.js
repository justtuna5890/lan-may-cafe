const { pool } = require('../config/db');
const NhanVien = require('../models/NhanVien');

// Tang du lieu cho bang nhan_vien (ERD). Chi doc/ghi, khong chua nghiep vu.
class NhanVienRepository {
  // Tra ve NhanVien hoac null
  static async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM nhan_vien WHERE username = ? LIMIT 1', [username]);
    return NhanVien.tuBanGhi(rows[0]);
  }

  // UC21 EF-1: luu so lan sai lien tiep, dat trang_thai = BI_KHOA khi du 5 lan
  static async capNhatDangNhapSai(id, soLanSai, trangThai) {
    await pool.query('UPDATE nhan_vien SET so_lan_sai = ?, trang_thai = ? WHERE id = ?', [soLanSai, trangThai, id]);
  }

  // Dang nhap dung thi dem lai tu 0
  static async datLaiSoLanSai(id) {
    await pool.query('UPDATE nhan_vien SET so_lan_sai = 0 WHERE id = ?', [id]);
  }
}

module.exports = NhanVienRepository;
