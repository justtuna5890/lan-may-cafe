const bcrypt = require('bcrypt'); // so khớp mật khẩu với bản băm đã lưu

// Các trạng thái của tài khoản; khớp ENUM trang_thai của bảng nhan_vien
const TRANG_THAI = Object.freeze({
  HOAT_DONG: 'HOAT_DONG',
  BI_KHOA: 'BI_KHOA', // EF-1: sai mật khẩu 5 lần liên tiếp
  VO_HIEU: 'VO_HIEU', // EF-2: chủ quán vô hiệu hóa tài khoản
});

const SO_LAN_SAI_TOI_DA = 5; // sai đủ số lần này thì khóa tài khoản

// Lớp NhanVien theo Class Diagram: id, username, matKhau, vaiTro, dangNhap(), getThongTin()
// Bổ sung cho UC21 (theo bảng phân công A1): hoTen, trangThai, soLanSai
class NhanVien {
  constructor({ id, username, matKhau, vaiTro, hoTen, trangThai, soLanSai }) {
    this.id = id;
    this.username = username;
    this.matKhau = matKhau; // bản băm bcrypt, không bao giờ trả ra ngoài
    this.vaiTro = vaiTro;
    this.hoTen = hoTen || username; // chưa có họ tên thì dùng tên đăng nhập
    this.trangThai = trangThai || TRANG_THAI.HOAT_DONG; // mặc định là đang hoạt động
    this.soLanSai = soLanSai || 0; // số lần sai liên tiếp, mặc định 0
  }

  // Đổi 1 dòng bảng nhan_vien (tên cột snake_case theo ERD) thành đối tượng NhanVien
  static tuBanGhi(row) {
    if (!row) return null; // không có dòng thì trả null để nơi gọi biết "không tìm thấy"
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

  // So khớp username và mật khẩu (bcrypt). Trả về true/false, không ném lỗi.
  async dangNhap(username, matKhau) {
    const dungTen = username === this.username; // tên phải khớp trước
    return dungTen && bcrypt.compare(matKhau, this.matKhau); // chỉ tốn công bcrypt khi tên đã đúng
  }

  biKhoa() {
    return this.trangThai === TRANG_THAI.BI_KHOA;
  }

  biVoHieuHoa() {
    return this.trangThai === TRANG_THAI.VO_HIEU;
  }

  // NhanVienDTO: thông tin an toàn để trả về client (không có matKhau)
  getThongTin() {
    return { nhanVienId: this.id, hoTen: this.hoTen, vaiTro: this.vaiTro };
  }
}

NhanVien.TRANG_THAI = TRANG_THAI;
NhanVien.SO_LAN_SAI_TOI_DA = SO_LAN_SAI_TOI_DA;

module.exports = NhanVien;
