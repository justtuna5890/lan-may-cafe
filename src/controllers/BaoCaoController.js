// =====================================================
// BaoCaoController - Tầng điều phối cho UC24 Báo cáo doanh thu
// Nhận request -> lấy ngày trên đường dẫn -> gọi BaoCaoService -> trả response chuẩn
// =====================================================

const BaoCaoService = require('../services/BaoCaoService'); // nghiệp vụ báo cáo (Bước 2)
const { ok } = require('../utils/response'); // hàm trả response thành công { success, data, maLoi, message }

class BaoCaoController {
  static async layBaoCao(req, res, next) { // GET /api/reports/revenue?tuNgay=2026-10-01&denNgay=2026-10-13
    try {
      const data = await BaoCaoService.layBaoCao(req.query); // req.query = các tham số sau dấu ? trên đường dẫn
      return ok(res, data); // trả về báo cáo, HTTP 200
    } catch (err) {
      return next(err); // có lỗi (ví dụ ngày sai) -> chuyển cho errorHandler trả lỗi chuẩn
    }
  }
}

module.exports = BaoCaoController; // xuất ra cho routes/index.js (Bước 4) gắn vào đường dẫn