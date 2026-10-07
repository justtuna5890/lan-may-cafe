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

  // Tra ve { donHangId, banId, trangThai, tongTien, tienGiamGia, isSynced } hoac null
  static async findById(donHangId) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.findById chua cai dat', 501);
  }

  // Chi tiet cua don: [{ tenMon, soLuong, donGia, trangThaiCheBien }] (gom ca mon DA_HUY, service tu loc)
  static async findChiTietByDon(donHangId) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.findChiTietByDon chua cai dat', 501);
  }

  // conn (tuy chon): ket noi cua transaction
  static async capNhatTrangThai(donHangId, trangThai, conn) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.capNhatTrangThai chua cai dat', 501);
  }
}

module.exports = DonHangRepository;
