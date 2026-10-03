const PaymentService = require('../services/PaymentService');
const { ok } = require('../utils/response');

class PaymentController {
  // UC08 - lap hoa don
  static async layHoaDon(req, res, next) {
    try {
      const data = await PaymentService.layHoaDon(req.params.id);
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  }

  // UC10 - thanh toan
  static async thanhToan(req, res, next) {
    try {
      const data = await PaymentService.processPayment(req.body);
      return ok(res, data, 'Thanh toan thanh cong');
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = PaymentController;
