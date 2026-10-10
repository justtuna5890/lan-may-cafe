const OrderService = require('../services/OrderService');
const { ok } = require('../utils/response');

// Tang controller: nhan request, goi service, tra response chuan. Khong chua nghiep vu.
class OrderController {
  // UC01 - SD "Tao order": OrderController.taoOrder(orderDTO) -> OrderService.xuLyTaoOrder(orderDTO)
  static async taoOrder(req, res, next) {
    try {
      const data = await OrderService.xuLyTaoOrder(req.body);
      return ok(res, data, 'Da gui order xuong bep', 201);
    } catch (err) {
      return next(err);
    }
  }

  // UC04 - goi them mon
  static async themMon(req, res, next) {
    try {
      const data = await OrderService.themMon(req.params.id, req.body && req.body.dsMon);
      return ok(res, data, 'Da goi them mon');
    } catch (err) {
      return next(err);
    }
  }

  // UC04 - sua so luong mon
  static async suaMon(req, res, next) {
    try {
      const data = await OrderService.suaMon(req.params.id, req.params.chiTietId, req.body && req.body.soLuong);
      return ok(res, data, 'Da cap nhat mon');
    } catch (err) {
      return next(err);
    }
  }

  // UC04 - huy mon
  static async huyMon(req, res, next) {
    try {
      const data = await OrderService.huyMon(req.params.id, req.params.chiTietId);
      return ok(res, data, 'Da huy mon');
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = OrderController;
