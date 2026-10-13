// =====================================================
// MenuController - Tầng điều phối (Controller) cho UC22 Quản lý menu
// -----------------------------------------------------
// Nhiệm vụ: nhận request từ trình duyệt -> lấy dữ liệu gửi lên (req.body, req.params)
// -> gọi MenuService xử lý -> trả response chuẩn { success, data, maLoi, message }.
// KHÔNG chứa luật nghiệp vụ (luật nằm ở MenuService, Bước 2).
// Có lỗi thì next(err) để errorHandler (src/middlewares/errorHandler.js) trả lỗi chuẩn.
// =====================================================

const MenuService = require('../services/MenuService');
// ok(res, data, message, status): hàm dùng chung để trả response thành công
const { ok } = require('../utils/response');

class MenuController {
  // GET /api/menu-items - xem toàn bộ thực đơn
  static async layDanhSach(req, res, next) {
    try {
      return ok(res, await MenuService.layDanhSach());
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/menu-items - thêm món mới
  // req.body ví dụ: { "tenMon": "Cà phê muối", "gia": 35000 }
  // Thành công trả HTTP 201 (Created = đã tạo mới)
  static async themMon(req, res, next) {
    try {
      const data = await MenuService.themMon(req.body);
      return ok(res, data, 'Đã thêm món vào thực đơn', 201);
    } catch (err) {
      return next(err);
    }
  }

  // PATCH /api/menu-items/:id - sửa giá và/hoặc bật/tắt bán 1 món
  // req.params.id = mã món nằm trên đường dẫn, ví dụ /api/menu-items/mon-01
  // req.body ví dụ: { "gia": 30000 } hoặc { "trangThai": "TAM_HET" }
  static async capNhatMon(req, res, next) {
    try {
      const data = await MenuService.capNhatMon(req.params.id, req.body);
      return ok(res, data, 'Đã cập nhật món');
    } catch (err) {
      return next(err);
    }
  }
}

// Xuất ra để routes/index.js (Bước 4) gắn vào đường dẫn API
module.exports = MenuController;