const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const config = require('../config');
const NhanVien = require('../models/NhanVien');
const NhanVienRepository = require('../repositories/NhanVienRepository');

// Trang dau tien sau khi dang nhap, theo vai tro
const TRANG_CHU = Object.freeze({
  PHUC_VU: '/tables.html',
  BARISTA: '/kitchen.html',
  THU_NGAN: '/pos.html',
  CHU_QUAN: '/dashboard.html',
});

const SAI_THONG_TIN = 'Sai tên đăng nhập hoặc mật khẩu';

class AuthService {
  // UC21 - AuthController.dangNhap -> AuthService.dangNhap -> NhanVien.dangNhap()
  static async dangNhap(username, matKhau) {
    if (typeof username !== 'string' || !username.trim() || typeof matKhau !== 'string' || !matKhau) {
      throw new AppError('THIEU_THONG_TIN', 'Vui lòng nhập tên đăng nhập và mật khẩu', 400);
    }

    const nv = await NhanVienRepository.findByUsername(username.trim());
    // Khong tiet lo sai o nao (username hay mat khau)
    if (!nv) throw new AppError('SAI_THONG_TIN', SAI_THONG_TIN, 401);

    if (nv.biVoHieuHoa()) {
      throw new AppError('TAI_KHOAN_VO_HIEU', 'Tài khoản đã bị vô hiệu hóa, vui lòng liên hệ chủ quán', 403);
    }
    if (nv.biKhoa()) {
      throw new AppError('TAI_KHOAN_BI_KHOA', 'Tài khoản đã bị khóa do nhập sai mật khẩu 5 lần', 423);
    }

    const dung = await nv.dangNhap(username.trim(), matKhau);
    if (!dung) {
      const soLanSai = nv.soLanSai + 1;
      if (soLanSai >= NhanVien.SO_LAN_SAI_TOI_DA) {
        await NhanVienRepository.capNhatDangNhapSai(nv.id, soLanSai, NhanVien.TRANG_THAI.BI_KHOA);
        throw new AppError('TAI_KHOAN_BI_KHOA', 'Tài khoản đã bị khóa do nhập sai mật khẩu 5 lần', 423);
      }
      await NhanVienRepository.capNhatDangNhapSai(nv.id, soLanSai, nv.trangThai);
      throw new AppError('SAI_THONG_TIN', SAI_THONG_TIN, 401);
    }

    if (nv.soLanSai > 0) await NhanVienRepository.datLaiSoLanSai(nv.id);

    const thongTin = nv.getThongTin();
    const token = jwt.sign(thongTin, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    return { token, ...thongTin, trangChu: TRANG_CHU[nv.vaiTro] || '/' };
  }

  // Dung cho middleware verifyToken: tra ve { nhanVienId, hoTen, vaiTro } hoac nem CHUA_DANG_NHAP
  static xacThucToken(token) {
    try {
      const { nhanVienId, hoTen, vaiTro } = jwt.verify(token, config.jwt.secret);
      return { nhanVienId, hoTen, vaiTro };
    } catch (err) {
      throw new AppError('CHUA_DANG_NHAP', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401);
    }
  }
}

AuthService.TRANG_CHU = TRANG_CHU;

module.exports = AuthService;
