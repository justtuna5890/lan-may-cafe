const bcrypt = require('bcrypt');

// Lop NhanVien theo Class Diagram: id, username, matKhau, vaiTro, dangNhap(), getThongTin()
// Bo sung cho UC21 (theo bang phan cong A1): hoTen, trangThai, soLanSai
class NhanVien {
  constructor({ id, username, matKhau, vaiTro, hoTen, trangThai, soLanSai }) {
    this.id = id;
    this.username = username;
    this.matKhau = matKhau; // bcrypt hash, khong bao gio tra ra ngoai
    this.vaiTro = vaiTro;
    this.hoTen = hoTen || username;
    this.trangThai = trangThai || NhanVien.TRANG_THAI.HOAT_DONG;
    this.soLanSai = soLanSai || 0;
  }

  // Doi 1 dong bang nhan_vien (ten cot snake_case theo ERD) thanh doi tuong NhanVien
  static tuBanGhi(row) {
    if (!row) return null;
    return new NhanVien({
      id: row.id,
      username: row.username,
      matKhau: row.mat_khau,
      vaiTro: row.vai_tro,
      hoTen: row.ho_ten,
      trangThai: row.trang_thai,
      soLanSai: row.so_lan_sai,
    });
  }

  // So khop username va mat khau (bcrypt). Tra ve true/false, khong nem loi.
  async dangNhap(username, matKhau) {
    if (username !== this.username) return false;
    return bcrypt.compare(matKhau, this.matKhau);
  }

  biKhoa() {
    return this.trangThai === NhanVien.TRANG_THAI.BI_KHOA;
  }

  biVoHieuHoa() {
    return this.trangThai === NhanVien.TRANG_THAI.VO_HIEU;
  }

  // NhanVienDTO: thong tin an toan de tra ve client (khong co matKhau)
  getThongTin() {
    return { nhanVienId: this.id, hoTen: this.hoTen, vaiTro: this.vaiTro };
  }
}

NhanVien.TRANG_THAI = Object.freeze({
  HOAT_DONG: 'HOAT_DONG',
  BI_KHOA: 'BI_KHOA', // EF-1: sai mat khau 5 lan lien tiep
  VO_HIEU: 'VO_HIEU', // EF-2: chu quan vo hieu hoa tai khoan
});

NhanVien.SO_LAN_SAI_TOI_DA = 5;

module.exports = NhanVien;
