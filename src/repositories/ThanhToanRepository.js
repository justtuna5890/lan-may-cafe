const AppError = require('../utils/AppError');

// Bang thanh_toan. An thay phan SQL that; ma_giao_dich can UNIQUE (chong thu trung)
class ThanhToanRepository {
  // Tra ve { maGiaoDich, donHangId, phuongThuc, soTienThanhToan, tienKhachDua, tienThoi } hoac null
  static async findByMaGiaoDich(maGiaoDich) {
    throw new AppError('CHUA_CAI_DAT', 'ThanhToanRepository.findByMaGiaoDich chua cai dat', 501);
  }

  // Ghi 1 ban ghi thanh toan. conn la ket noi cua transaction (xem config/db.js withTransaction).
  // Trung ma_giao_dich thi nem loi MySQL co code 'ER_DUP_ENTRY'.
  static async save(thanhToan, conn) {
    throw new AppError('CHUA_CAI_DAT', 'ThanhToanRepository.save chua cai dat', 501);
  }
}

module.exports = ThanhToanRepository;
