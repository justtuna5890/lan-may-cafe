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
}

module.exports = OrderController;