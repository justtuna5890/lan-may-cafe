const AppError = require('../utils/AppError');

class PaymentService {
  // UC08 - tra HoaDonDTO (soBan, dsMon, tongTien, tienGiamGia, canThanhToan)
  static async layHoaDon(donHangId) {
    // TODO(T5)
    throw new AppError('CHUA_CAI_DAT', 'UC08 chua duoc cai dat', 501);
  }

  // UC10 - theo SD_ThanhToan:
  // findByMaGiaoDich (da co thi tra ket qua cu) -> findById -> coTheThanhToan()
  // -> tao ThanhToan -> save -> don DA_THANH_TOAN -> ban CAN_DON (1 transaction, xem config/db.js)
  static async processPayment(req) {
    // TODO(T6)
    throw new AppError('CHUA_CAI_DAT', 'UC10 chua duoc cai dat', 501);
  }
}

module.exports = PaymentService;
