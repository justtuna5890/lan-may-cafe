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

  // Chi tiet cua don: [{ chiTietId, monId, tenMon, soLuong, donGia, ghiChu, trangThaiCheBien }]
  // (gom ca mon DA_HUY, service tu loc)
  static async findChiTietByDon(donHangId) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.findChiTietByDon chua cai dat', 501);
  }

  // UC04: them cac mon moi vao don, tra ve cac mon vua luu (co chiTietId, trangThaiCheBien=CHO_PHA_CHE)
  static async themChiTiet(donHangId, dsMonMoi, conn) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.themChiTiet chua cai dat', 501);
  }

  // UC04: sua 1 dong chi tiet, thay doi { soLuong } hoac { trangThaiCheBien }
  static async capNhatChiTiet(chiTietId, thayDoi, conn) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.capNhatChiTiet chua cai dat', 501);
  }

  static async capNhatTongTien(donHangId, tongTien, conn) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.capNhatTongTien chua cai dat', 501);
  }

  // Dat co isSynced (false khi mon moi chua gui duoc xuong bep)
  static async capNhatDongBo(donHangId, isSynced, conn) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.capNhatDongBo chua cai dat', 501);
  }

  // conn (tuy chon): ket noi cua transaction
  static async capNhatTrangThai(donHangId, trangThai, conn) {
    throw new AppError('CHUA_CAI_DAT', 'DonHangRepository.capNhatTrangThai chua cai dat', 501);
  }
}

module.exports = DonHangRepository;
