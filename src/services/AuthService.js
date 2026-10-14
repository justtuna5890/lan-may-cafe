const jwt = require('jsonwebtoken'); // tạo và kiểm tra token đăng nhập
const AppError = require('../utils/AppError'); // lỗi nghiệp vụ: AppError(maLoi, message, mãHTTP)
const config = require('../config'); // khóa bí mật và thời hạn token
const NhanVien = require('../models/NhanVien'); // lớp nhân viên (so khớp mật khẩu, trạng thái)
const NhanVienRepository = require('../repositories/NhanVienRepository'); // đọc/ghi bảng nhan_vien

// Trang đầu tiên sau khi đăng nhập, theo vai trò
const TRANG_CHU = Object.freeze({
  PHUC_VU: '/tables.html',
  BARISTA: '/kitchen.html',
  THU_NGAN: '/pos.html',
  CHU_QUAN: '/dashboard.html',
});

// Mọi lỗi của UC21 gom về một bảng: mỗi mục là hàm tạo ra AppError, tránh viết lặp mã lỗi và câu thông báo
const LOI = Object.freeze({
  thieuThongTin: () => new AppError('THIEU_THONG_TIN', 'Vui lòng nhập tên đăng nhập và mật khẩu', 400),
  saiThongTin: () => new AppError('SAI_THONG_TIN', 'Sai tên đăng nhập hoặc mật khẩu', 401), // dùng chung cho sai tên và sai mật khẩu để không lộ tên nào có thật
  voHieu: () => new AppError('TAI_KHOAN_VO_HIEU', 'Tài khoản đã bị vô hiệu hóa, vui lòng liên hệ chủ quán', 403),
  biKhoa: () => new AppError('TAI_KHOAN_BI_KHOA', 'Tài khoản đã bị khóa do nhập sai mật khẩu 5 lần', 423),
  chuaDangNhap: () => new AppError('CHUA_DANG_NHAP', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401),
});

class AuthService {
  // Bước 1: kiểm tra dữ liệu gửi lên, trả về username đã bỏ dấu cách thừa
  static chuanHoaDauVao(username, matKhau) {
    const coTen = typeof username === 'string' && username.trim() !== ''; // tên phải là chữ và không trống
    const coMatKhau = typeof matKhau === 'string' && matKhau !== ''; // mật khẩu phải là chữ và không trống
    if (!coTen || !coMatKhau) throw LOI.thieuThongTin(); // thiếu một trong hai thì báo 400
    return username.trim(); // bỏ dấu cách ở đầu và cuối tên
  }

  // Bước 2: tài khoản không dùng được thì chặn ngay, kể cả khi mật khẩu đúng
  static chanTaiKhoanKhongDung(nv) {
    if (nv.biVoHieuHoa()) throw LOI.voHieu(); // chủ quán đã vô hiệu hóa
    if (nv.biKhoa()) throw LOI.biKhoa(); // đã sai 5 lần trước đó
  }

  // Bước 3: nhập sai mật khẩu thì tăng bộ đếm; đủ 5 lần thì khóa tài khoản
  static async ghiNhanSaiMatKhau(nv) {
    const soLanSai = nv.soLanSai + 1; // lần sai này cộng vào số lần đã sai
    const doKhoa = soLanSai >= NhanVien.SO_LAN_SAI_TOI_DA; // đủ 5 lần chưa
    const trangThaiMoi = doKhoa ? NhanVien.TRANG_THAI.BI_KHOA : nv.trangThai; // đủ thì chuyển sang bị khóa
    await NhanVienRepository.capNhatDangNhapSai(nv.id, soLanSai, trangThaiMoi); // lưu số lần sai và trạng thái
    return doKhoa ? LOI.biKhoa() : LOI.saiThongTin(); // trả về lỗi để nơi gọi ném ra
  }

  // Bước 4: tạo token chứa thông tin an toàn của nhân viên (không có mật khẩu)
  static taoPhienDangNhap(nv) {
    const thongTin = nv.getThongTin(); // { nhanVienId, hoTen, vaiTro }
    const token = jwt.sign(thongTin, config.jwt.secret, { expiresIn: config.jwt.expiresIn }); // ký token
    return { token, ...thongTin, trangChu: TRANG_CHU[nv.vaiTro] || '/' }; // kèm trang chủ theo vai trò
  }

  // UC21 - AuthController.dangNhap -> AuthService.dangNhap -> NhanVien.dangNhap()
  // Thứ tự: kiểm tra đầu vào -> tìm nhân viên -> chặn tài khoản không dùng được -> so mật khẩu -> tạo token
  static async dangNhap(username, matKhau) {
    const ten = AuthService.chuanHoaDauVao(username, matKhau);

    const nv = await NhanVienRepository.findByUsername(ten);
    if (!nv) throw LOI.saiThongTin(); // không có tên này

    AuthService.chanTaiKhoanKhongDung(nv);

    const matKhauDung = await nv.dangNhap(ten, matKhau); // so khớp bằng bcrypt
    if (!matKhauDung) throw await AuthService.ghiNhanSaiMatKhau(nv); // sai: ghi nhận rồi ném lỗi 401 hoặc 423

    if (nv.soLanSai > 0) await NhanVienRepository.datLaiSoLanSai(nv.id); // đăng nhập đúng thì đếm lại từ 0
    return AuthService.taoPhienDangNhap(nv);
  }

  // Dùng cho middleware verifyToken: trả về { nhanVienId, hoTen, vaiTro } hoặc ném CHUA_DANG_NHAP
  static xacThucToken(token) {
    try {
      const { nhanVienId, hoTen, vaiTro } = jwt.verify(token, config.jwt.secret); // sai chữ ký hoặc hết hạn sẽ ném lỗi
      return { nhanVienId, hoTen, vaiTro };
    } catch (err) {
      throw LOI.chuaDangNhap();
    }
  }
}

AuthService.TRANG_CHU = TRANG_CHU;

module.exports = AuthService;
