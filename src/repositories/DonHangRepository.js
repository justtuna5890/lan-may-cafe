const AppError = require('../utils/AppError');

class DonHangRepository {
  // Don dang phuc vu cua ban (trangThai DANG_PHUC_VU) hoac null
  static async findDangPhucVuByBan(banId) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.findDangPhucVuByBan chua cai dat', 501);
  }

  // Luu don + chi tiet, tra ve don co donHangId va chiTietId cho tung mon
  static async luuOrder(order) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.luuOrder chua cai dat', 501);
  }
}

module.exports = DonHangRepository;