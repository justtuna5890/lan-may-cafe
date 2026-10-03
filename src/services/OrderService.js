const AppError = require('../utils/AppError');

// Tang service: nghiep vu. Thu tu goi ham phai khop Sequence Diagram.
class OrderService {
  // UC01 - theo message 2-25 cua SD "Tao order"
  static async xuLyTaoOrder(orderDTO) {
    // TODO(T3): layTrangThaiBan -> kiemTraTonKho(dsMon) -> kiemTraDieuKienOrder
    //   -> tinhTongTien -> guiOrderDenKDS (qua KDS_TIMEOUT_MS thi isSynced=false)
    //   -> luuOrder -> capNhatTrangThaiBan(banId, DANG_PHUC_VU)
    throw new AppError('CHUA_CAI_DAT', 'UC01 chua duoc cai dat', 501);
  }
}

module.exports = OrderService;
